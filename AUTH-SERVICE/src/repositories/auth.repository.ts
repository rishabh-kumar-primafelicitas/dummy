import { Types } from "mongoose";
import { User } from "@models/user.model";
import { Device } from "@models/device.model";
import { Session } from "@models/session.model";
import { Role } from "@models/role.model";
import { IUser, UserStatus } from "@models/interfaces/IUser";
import { IDevice, DeviceType } from "@models/interfaces/IDevice";
import { ISession } from "@models/interfaces/ISession";
import { IRole, RoleName } from "@models/interfaces/IRole";
import { Otp } from "@models/otp.model";
import { IOtp } from "@models/interfaces/IOtp";
import bcrypt from "bcryptjs";
import { RegexUtil } from "@utils/regex.util";

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  roleId: Types.ObjectId;
  status: UserStatus;
  emailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
}

export interface CreateDeviceData {
  userId: Types.ObjectId;
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  fingerprint: string;
  ipAddress: string;
  trusted: boolean;
  isActive: boolean;
}

export interface CreateSessionData {
  userId: Types.ObjectId;
  deviceId: Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivityAt: Date;
  refreshTokenExpiresAt: Date;
  accessTokenExpiresAt: Date;
  accessToken: string;
  refreshToken: string;
}

export interface CreateOtpData {
  userId: Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
}

export class AuthRepository {
  // User operations
  async findUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select("+password");
  }

  async findUserByEmailOrUsername(
    email: string,
    username: string
  ): Promise<IUser | null> {
    return User.findOne({
      $or: [{ email }, { username }],
    });
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username }).select("+password");
  }

  async findUserById(userId: Types.ObjectId): Promise<IUser | null> {
    return User.findById(userId).select("+airLyftAuthToken -__v");
  }

  async findRoleById(roleId: Types.ObjectId): Promise<IRole | null> {
    return Role.findById(roleId);
  }

  async findUserByEmailVerificationToken(token: string): Promise<IUser | null> {
    return User.findOne({ emailVerificationToken: token });
  }

  async createUser(userData: CreateUserData): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async updateUserLastLogin(userId: Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }

  // Role operations
  async findRoleByName(name: RoleName): Promise<IRole | null> {
    return Role.findOne({ name });
  }

  // Device operations
  async findDeviceByUserAndFingerprint(
    userId: Types.ObjectId,
    fingerprint: string
  ): Promise<IDevice | null> {
    return Device.findOne({ userId, fingerprint });
  }

  async createDevice(deviceData: CreateDeviceData): Promise<IDevice> {
    const device = new Device(deviceData);
    return device.save();
  }

  async updateDeviceLastUsed(deviceId: Types.ObjectId): Promise<void> {
    const device = await Device.findById(deviceId);
    if (device) {
      await device.updateLastUsed();
    }
  }

  async refreshDeviceFingerprint(
    deviceId: Types.ObjectId,
    newFingerprint: string
  ): Promise<void> {
    const device = await Device.findById(deviceId);
    if (device) {
      await device.refreshFingerprint(newFingerprint);
    }
  }

  // Session operations
  async findSessionById(sessionId: Types.ObjectId): Promise<ISession | null> {
    return Session.findById(sessionId);
  }

  async findSessionByToken(token: string): Promise<ISession | null> {
    return Session.findOne({ token, isActive: true });
  }

  async findSessionByRefreshToken(
    refreshToken: string
  ): Promise<ISession | null> {
    return Session.findOne({ refreshToken, isActive: true });
  }

  async findSessionByIdAndToken(
    sessionId: Types.ObjectId,
    token: string
  ): Promise<ISession | null> {
    return Session.findOne({
      _id: sessionId,
      accessToken: token,
      isActive: true,
    });
  }

  async findSessionByIdAndRefreshToken(
    sessionId: Types.ObjectId,
    refreshToken: string
  ): Promise<ISession | null> {
    return Session.findOne({
      _id: sessionId,
      refreshToken,
      isActive: true,
    });
  }

  async createSession(sessionData: CreateSessionData): Promise<ISession> {
    const session = new Session(sessionData);
    return session.save();
  }

  async updateSession(session: ISession): Promise<ISession> {
    return session.save();
  }

  async revokeUserActiveSessions(
    userId: Types.ObjectId,
    reason: string = "New login session"
  ): Promise<void> {
    await Session.updateMany(
      { userId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      }
    );
  }

  async revokeSession(
    sessionId: Types.ObjectId,
    reason: string
  ): Promise<void> {
    const session = await Session.findById(sessionId);
    if (session) {
      await session.revoke(reason);
    }
  }

  async updateSessionActivity(sessionId: Types.ObjectId): Promise<void> {
    const session = await Session.findById(sessionId);
    if (session) {
      await session.updateActivity();
    }
  }

  async updateSessionToken(
    sessionId: Types.ObjectId,
    newToken: string,
    newExpiresAt: Date
  ): Promise<void> {
    await Session.findByIdAndUpdate(sessionId, {
      accessToken: newToken,
      accessTokenExpiresAt: newExpiresAt,
      lastActivityAt: new Date(),
    });
  }

  async updateUserAirLyftToken(
    userId: Types.ObjectId,
    token: string
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      airLyftAuthToken: token,
    });
  }

  async deleteUser(userId: Types.ObjectId): Promise<void> {
    await User.findByIdAndDelete(userId);
  }

  async softDeleteUser(id: Types.ObjectId): Promise<void> {
    await User.updateOne({ _id: id }, { status: UserStatus.INACTIVE });
  }

  // OTP operations
  async upsertOtp(otpData: CreateOtpData): Promise<IOtp> {
    return Otp.findOneAndUpdate(
      { userId: otpData.userId },
      {
        ...otpData,
        isUsed: false,
        resetToken: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
      { upsert: true, new: true }
    );
  }

  async findValidOtpByEmail(email: string): Promise<IOtp | null> {
    return Otp.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async updateOtpWithResetToken(
    otpId: Types.ObjectId,
    resetToken: string,
    resetTokenHash: string,
    resetTokenExpiresAt: Date
  ): Promise<void> {
    await Otp.findByIdAndUpdate(otpId, {
      isUsed: true,
      resetToken,
      resetTokenHash,
      resetTokenExpiresAt,
    });
  }

  async findValidResetToken(
    resetToken: string,
    userId: Types.ObjectId,
    email: string
  ): Promise<IOtp | null> {
    const otpRecord = await Otp.findOne({
      userId,
      email,
      isUsed: true,
      resetTokenHash: { $ne: null },
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (otpRecord) {
      const isValid = await bcrypt.compare(
        resetToken,
        otpRecord.resetTokenHash as string
      );
      if (isValid) {
        return otpRecord;
      }
    }

    return null;
  }

  async deleteOtpRecord(otpId: Types.ObjectId): Promise<void> {
    await Otp.findByIdAndDelete(otpId);
  }

  // Get All Support Managers with pagination and search
  async getAllSuportManager(options?: {
    page?: number;
    limit?: number;
    skip?: number;
    search?: string;
  }): Promise<any> {
    if (!options) {
      // Legacy behavior - return all support managers
      const supportManagerRole = await Role.findOne({
        name: RoleName.SUPPORT_MANAGER,
      });

      if (!supportManagerRole) {
        return [];
      }

      return await User.find({
        roleId: supportManagerRole._id,
        status: { $ne: UserStatus.DELETED },
      })
        .select("-password -__v")
        .lean();
    }

    const { page = 1, limit = 10, skip = 0, search = "" } = options;

    const supportManagerRole = await Role.findOne({
      name: RoleName.SUPPORT_MANAGER,
    });

    if (!supportManagerRole) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      };
    }

    // Build base filter
    const baseFilter = {
      roleId: supportManagerRole._id,
      status: { $ne: UserStatus.DELETED },
    } as const;

    // Create filters with proper typing using RegexUtil
    const filters =
      search.length > 0
        ? {
            ...baseFilter,
            $or: RegexUtil.createMultiFieldSearchConditions(search, [
              "username",
              "email",
            ]),
          }
        : baseFilter;

    // Get total count
    const totalDocuments = await User.countDocuments(filters);

    // Get paginated data
    const supportManagers = await User.find(filters)
      .select("-password -__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return {
      data: supportManagers,
      pagination: {
        total: totalDocuments,
        page,
        limit,
        pages: Math.ceil(totalDocuments / limit),
      },
    };
  }

  // Get All Players with pagination and search
  async getAllPlayers(options?: {
    page?: number;
    limit?: number;
    skip?: number;
    search?: string;
  }): Promise<any> {
    if (!options) {
      // Legacy behavior - return all players
      const playerRole = await Role.findOne({
        name: RoleName.PLAYER,
      });

      if (!playerRole) {
        return [];
      }

      return await User.find({
        roleId: playerRole._id,
        status: { $ne: UserStatus.DELETED },
      })
        .select("-password -__v")
        .lean();
    }

    const { page = 1, limit = 10, skip = 0, search = "" } = options;

    const playerRole = await Role.findOne({
      name: RoleName.PLAYER,
    });

    if (!playerRole) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      };
    }

    // Build base filter
    const baseFilter = {
      roleId: playerRole._id,
      status: { $ne: UserStatus.DELETED },
    } as const;

    // Create filters with proper typing using RegexUtil
    const filters =
      search.length > 0
        ? {
            ...baseFilter,
            $or: RegexUtil.createMultiFieldSearchConditions(search, [
              "username",
              "email",
            ]),
          }
        : baseFilter;

    // Get total count
    const totalDocuments = await User.countDocuments(filters);

    // Get paginated data
    const players = await User.find(filters)
      .select("-password -__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return {
      data: players,
      pagination: {
        total: totalDocuments,
        page,
        limit,
        pages: Math.ceil(totalDocuments / limit),
      },
    };
  }
}
