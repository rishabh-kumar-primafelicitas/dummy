import { Types } from "mongoose";
import { User } from "@models/user.model";
import { Device } from "@models/device.model";
import { Session } from "@models/session.model";
import { Role } from "@models/role.model";
import { IUser } from "@models/interfaces/IUser";
import { IDevice, DeviceType } from "@models/interfaces/IDevice";
import { ISession } from "@models/interfaces/ISession";
import { IRole, RoleName } from "@models/interfaces/IRole";
import { Otp } from "@models/otp.model";
import { IOtp } from "@models/interfaces/IOtp";
import bcrypt from "bcryptjs";
import { RegexUtil } from "@utils/regex.util";
import { UserStatus } from "@models/user.status.model";

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  roleId: Types.ObjectId;
  status: Types.ObjectId;
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
    return User.findOne({ email })
      .select("+password")
      .populate("status", "code name")
      .populate("roleId", "name roleId");
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
    return User.findOne({ username })
      .select("+password")
      .populate("status", "code name")
      .populate("roleId", "name roleId");
  }

  async findUserById(userId: Types.ObjectId): Promise<IUser | null> {
    return User.findById(userId)
      .select("+airLyftAuthToken -__v")
      .populate("status", "code name")
      .populate("roleId", "name roleId");
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
    const inactiveStatus = await this.findUserStatusByName("INACTIVE");
    if (inactiveStatus) {
      await User.updateOne({ _id: id }, { status: inactiveStatus._id });
    }
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
    statusCode?: number;
  }): Promise<any> {
    const supportManagerRole = await Role.findOne({
      name: RoleName.SUPPORT_MANAGER,
    });

    if (!supportManagerRole) {
      return options
        ? {
            data: [],
            pagination: {
              total: 0,
              page: options.page || 1,
              limit: options.limit || 10,
              pages: 0,
            },
          }
        : [];
    }

    // Get deleted status to always exclude it
    const deletedStatus = await this.findUserStatusByName("DELETED");

    // Build base match stage
    const baseMatch: any = {
      roleId: supportManagerRole._id,
    };

    // Handle status filtering
    if (options?.statusCode) {
      // Get status ObjectId for the provided status code
      const statusObjectId = await this.getStatusObjectIdByCode(
        options.statusCode
      );
      if (statusObjectId) {
        // Check if the requested status is DELETED
        if (deletedStatus && statusObjectId.equals(deletedStatus._id)) {
          // If someone tries to filter by DELETED status, return empty results
          baseMatch._id = { $exists: false }; // This will match no documents
        } else {
          // Filter by specific status (automatically excludes deleted)
          baseMatch.status = statusObjectId;
        }
      }
    } else {
      // No specific status requested - exclude deleted users
      baseMatch.status = { $ne: deletedStatus?._id };
    }

    // Add search conditions if provided
    if (options?.search && options.search.length > 0) {
      const searchRegex = RegexUtil.createSearchRegex(options.search);
      baseMatch.$or = [{ username: searchRegex }, { email: searchRegex }];
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match stage
      { $match: baseMatch },

      // Lookup status
      {
        $lookup: {
          from: "user_statuses",
          localField: "status",
          foreignField: "_id",
          as: "statusInfo",
        },
      },

      // Project only the required fields
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          status: { $arrayElemAt: ["$statusInfo.name", 0] },
          statusCode: { $arrayElemAt: ["$statusInfo.code", 0] },
          createdAt: 1,
          updatedAt: 1,
          lastLoginAt: 1,
        },
      },

      // Sort
      { $sort: { createdAt: -1 } },
    ];

    if (!options) {
      // Legacy behavior - return all support managers
      const supportManagers = await User.aggregate(pipeline);
      return supportManagers;
    }

    const { page = 1, limit = 10, skip = 0 } = options;

    // Get total count using the same match conditions
    const countPipeline = [{ $match: baseMatch }, { $count: "total" }];

    const countResult = await User.aggregate(countPipeline);
    const totalDocuments = countResult[0]?.total || 0;

    // Add pagination to main pipeline
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const supportManagers = await User.aggregate(pipeline);

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
    statusCode?: number;
  }): Promise<any> {
    const playerRole = await Role.findOne({
      name: RoleName.PLAYER,
    });

    if (!playerRole) {
      return options
        ? {
            data: [],
            pagination: {
              total: 0,
              page: options.page || 1,
              limit: options.limit || 10,
              pages: 0,
            },
          }
        : [];
    }

    // Get deleted status to always exclude it
    const deletedStatus = await this.findUserStatusByName("DELETED");

    // Build base match stage
    const baseMatch: any = {
      roleId: playerRole._id,
    };

    // Handle status filtering
    if (options?.statusCode) {
      // Get status ObjectId for the provided status code
      const statusObjectId = await this.getStatusObjectIdByCode(
        options.statusCode
      );
      if (statusObjectId) {
        // Check if the requested status is DELETED
        if (deletedStatus && statusObjectId.equals(deletedStatus._id)) {
          // If someone tries to filter by DELETED status, return empty results
          baseMatch._id = { $exists: false }; // This will match no documents
        } else {
          // Filter by specific status (automatically excludes deleted)
          baseMatch.status = statusObjectId;
        }
      }
    } else {
      // No specific status requested - exclude deleted users
      baseMatch.status = { $ne: deletedStatus?._id };
    }

    // Add search conditions if provided
    if (options?.search && options.search.length > 0) {
      const searchRegex = RegexUtil.createSearchRegex(options.search);
      baseMatch.$or = [{ username: searchRegex }, { email: searchRegex }];
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match stage
      { $match: baseMatch },

      // Lookup status
      {
        $lookup: {
          from: "user_statuses",
          localField: "status",
          foreignField: "_id",
          as: "statusInfo",
        },
      },

      // Project to exclude unwanted fields and temporary arrays
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          status: { $arrayElemAt: ["$statusInfo.name", 0] },
          statusCode: { $arrayElemAt: ["$statusInfo.code", 0] },
          createdAt: 1,
          updatedAt: 1,
          lastLoginAt: 1,
        },
      },

      // Sort
      { $sort: { createdAt: -1 } },
    ];

    if (!options) {
      // Legacy behavior - return all players
      const players = await User.aggregate(pipeline);
      return players;
    }

    const { page = 1, limit = 10, skip = 0 } = options;

    // Get total count using the same match conditions
    const countPipeline = [{ $match: baseMatch }, { $count: "total" }];

    const countResult = await User.aggregate(countPipeline);
    const totalDocuments = countResult[0]?.total || 0;

    // Add pagination to main pipeline
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const players = await User.aggregate(pipeline);

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

  // Helper method to get single status ObjectId by code
  async getStatusObjectIdByCode(
    statusCode: number
  ): Promise<Types.ObjectId | null> {
    const status = await UserStatus.findOne({
      code: statusCode,
      isActive: true,
    }).select("_id");

    return status ? (status._id as Types.ObjectId) : null;
  }

  // Helper method to validate single status code
  async validateStatusCode(statusCode: number): Promise<boolean> {
    const status = await UserStatus.findOne({
      code: statusCode,
      isActive: true,
      name: { $ne: "DELETED" }, // Don't allow DELETED status to be considered valid
    });

    return !!status;
  }

  async findUserStatusByCode(code: number): Promise<any> {
    return await UserStatus.findOne({ code, isActive: true });
  }

  async findUserStatusByName(name: string): Promise<any> {
    return await UserStatus.findOne({
      name: name.toUpperCase(),
      isActive: true,
    });
  }
}
