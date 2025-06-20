import { Request } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AuthRepository } from "@repositories/auth.repository";
import { DeviceUtil } from "@utils/device.util";
import { JWTUtil } from "@utils/jwt.util";
import { IUser, UserStatus } from "@models/interfaces/IUser";
import { DeviceType } from "@models/interfaces/IDevice";
import { RoleName } from "@models/interfaces/IRole";
import { config } from "configs/server.config";
import { Types } from "mongoose";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@utils/errors/index.js";
import { AirLyftService } from "./airlyft.service";
import { logger } from "@utils/logger.util";
import { BrevoService } from "./brevo.service";
import { PasswordUtil } from "@utils/password.util";
import axios from "axios";
import { User } from "@models/user.model";
import { ValidationError } from "@utils/errors/validation.error";
export interface SignupData {
  username: string;
  // email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  created?: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    statusCode?: number;
    status: string;
    emailVerified: boolean;
    roleId: number;
    roleName: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    // expiresIn: number;
  };
  // device: {
  //   id: string;
  //   name: string;
  //   trusted: boolean;
  // };
}

export class AuthService {
  private authRepository: AuthRepository;
  private airLyftService: AirLyftService;
  private brevoService: BrevoService;

  constructor() {
    this.authRepository = new AuthRepository();
    this.airLyftService = new AirLyftService();
    this.brevoService = new BrevoService();
  }

  private async updatePlayerLoginActivity(userId: string): Promise<void> {
    try {
      const questServiceUrl =
        config?.questServiceUrl ||
        process.env.QUEST_SERVICE_URL ||
        "http://localhost:4089";

      await axios.post(
        `${questServiceUrl}/api/v1/user-activity`,
        {
          userId,
          activityType: "LOGIN",
        },
        {
          timeout: 5000, // 5 second timeout
        }
      );

      logger.debug(`Player login activity updated for user ${userId}`);
    } catch (error: any) {
      // Log error but don't fail the signup/login process
      logger.error(
        `Failed to update player login activity for user ${userId}:`,
        error.message
      );
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user =
      await this.authRepository.findUserByEmailVerificationToken(token);

    if (!user) {
      throw new NotFoundError("Invalid or expired verification token.");
    }

    if (user.emailVerified) {
      return { message: "Email already verified." };
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new UnauthorizedError("Verification token has expired.");
    }

    const status = await this.authRepository.findUserStatusByCode(1);

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    if ((user.status as any).name === UserStatus.INACTIVE) {
      user.status = status?._id as Types.ObjectId;
    }
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);
    return { message: "Email verified successfully." };
  }

  async refreshToken(
    refreshToken: string,
    req: Request
  ): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = JWTUtil.verifyToken(refreshToken);

      if (payload.type !== "refresh") {
        throw new UnauthorizedError("Invalid token type");
      }

      // Find session
      const session = await this.authRepository.findSessionByIdAndRefreshToken(
        new Types.ObjectId(payload.sessionId),
        refreshToken
      );

      if (!session || !session.isValid) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }

      // Update device fingerprint and session activity
      const deviceInfo = DeviceUtil.parseDeviceInfo(req);
      if (session.deviceId) {
        await this.authRepository.refreshDeviceFingerprint(
          session.deviceId,
          deviceInfo.fingerprint
        );
      }

      // Generate new access token
      const newAccessToken = JWTUtil.generateAccessToken(
        session.userId,
        session._id as Types.ObjectId,
        session.deviceId as Types.ObjectId
      );

      // Update session with new token
      await this.authRepository.updateSessionToken(
        session._id as Types.ObjectId,
        newAccessToken,
        new Date(Date.now() + config.jwt.accessTokenExpireMs)
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const payload = JWTUtil.verifyToken(accessToken);

      const session = await this.authRepository.findSessionByIdAndToken(
        new Types.ObjectId(payload.sessionId),
        accessToken
      );

      if (session) {
        await this.authRepository.revokeSession(
          session._id as Types.ObjectId,
          "User logout"
        );
      }

      return { message: "Logged out successfully" };
    } catch (error) {
      // Even if token is invalid, return success for security
      return { message: "Logged out successfully" };
    }
  }

  async validateSession(
    sessionId: string,
    token: string
  ): Promise<{
    user: { id: string; username: string; email: string; roleId: string };
    session: { id: string; deviceId: string };
  } | null> {
    try {
      const session = await this.authRepository.findSessionByIdAndToken(
        new Types.ObjectId(sessionId),
        token
      );

      if (!session || !session.isValid) {
        return null;
      }

      // Get user WITHOUT population for auth middleware
      const user = await User.findById(session.userId).select("-password -__v");
      if (!user) {
        return null;
      }

      // Update session activity
      await this.authRepository.updateSessionActivity(
        session._id as Types.ObjectId
      );

      return {
        user: {
          id: (user._id as Types.ObjectId).toString(),
          username: user.username,
          email: user.email || "",
          roleId: (user.roleId as Types.ObjectId).toString(),
        },
        session: {
          id: (session._id as Types.ObjectId).toString(),
          deviceId: session.deviceId?.toString() || "",
        },
      };
    } catch (error) {
      return null;
    }
  }

  async forgotPassword(
    resetToken: string,
    email: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw new NotFoundError("User with this email does not exist");
    }

    if ((user.status as any).name !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is not active");
    }

    if (user.emailVerified === false) {
      throw new UnauthorizedError("Email is not verified");
    }

    if (user?.email !== email) {
      throw new UnauthorizedError("Email does not match the user's email");
    }

    // Find OTP record with valid reset token
    const otpRecord = await this.authRepository.findValidResetToken(
      resetToken,
      user?._id as Types.ObjectId,
      user?.email as string
    );
    if (!otpRecord) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new UnauthorizedError(
        "Password must be at least 6 characters long"
      );
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    // Clean up OTP record
    await this.authRepository.deleteOtpRecord(otpRecord._id as Types.ObjectId);

    // Revoke all active sessions for security
    await this.authRepository.revokeUserActiveSessions(
      user._id as Types.ObjectId,
      "Password reset"
    );

    logger.info(`Password reset completed for user: ${user.email}`);
    return { message: "Password reset successfully" };
  }

  async verifyOtp(
    email: string,
    otp: string
  ): Promise<{ resetToken: string; message: string }> {
    // Find user by email
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError("User with this email does not exist");
    }

    // Find valid OTP record
    const otpRecord = await this.authRepository.findValidOtpByEmail(email);
    if (!otpRecord) {
      throw new UnauthorizedError("Invalid or expired OTP");
    }

    // Verify OTP
    const isValidOtp = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValidOtp) {
      throw new UnauthorizedError("Invalid OTP");
    }

    // Generate password reset token (15-minute expiry)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(
      resetToken,
      config.security.bcryptRounds
    );
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update OTP record with reset token and mark as used
    await this.authRepository.updateOtpWithResetToken(
      otpRecord._id as Types.ObjectId,
      resetToken,
      resetTokenHash,
      resetTokenExpiresAt
    );

    // Send OTP via email
    try {
      await this.brevoService.sendOtpVerifiedEmail(user.email!, user.username);
      logger.info(`OTP verfied confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.log("Error sending OTP verification email:", emailError);
      logger.error(`Failed to send OTP verification email to ${user.email}`, {
        error: emailError,
      });
      throw new InternalServerError("Failed to send OTP verification email");
    }

    return {
      resetToken,
      message: "OTP verified successfully.",
    };
  }

  async signup(signupData: SignupData, req: Request): Promise<AuthResponse> {
    // Check if username already exists
    const existingUser = await this.authRepository.findUserByUsername(
      signupData.username
    );

    if (existingUser) {
      // If user exists, check password
      const isPasswordValid = await existingUser.comparePassword(
        signupData.password
      );

      if (!isPasswordValid) {
        throw new UnauthorizedError(
          "Username already exists with a different password. Please use the correct password or choose a different username."
        );
      }

      // If password matches, proceed with login flow
      // Check if user is locked
      if (existingUser.isLocked()) {
        throw new UnauthorizedError(
          "Account is locked due to multiple failed login attempts"
        );
      }

      // Check if user status is active
      if ((existingUser.status as any).name !== "ACTIVE") {
        throw new UnauthorizedError("Account is not active");
      }

      // Reset login attempts on successful login
      if (existingUser.loginAttempts && existingUser.loginAttempts > 0) {
        await existingUser.resetLoginAttempts();
      }

      // Parse device info
      const deviceInfo = DeviceUtil.parseDeviceInfo(req);

      // Check if device exists
      let device = await this.authRepository.findDeviceByUserAndFingerprint(
        existingUser._id as Types.ObjectId,
        deviceInfo.fingerprint
      );

      if (!device) {
        // Create new device
        device = await this.authRepository.createDevice({
          userId: existingUser._id as Types.ObjectId,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType as DeviceType,
          os: deviceInfo.os,
          osVersion: deviceInfo.osVersion,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          fingerprint: deviceInfo.fingerprint,
          ipAddress: deviceInfo.ipAddress,
          trusted: false,
          isActive: true,
        });
      }

      // Deactivate all existing sessions for this user
      await this.authRepository.revokeUserActiveSessions(
        existingUser._id as Types.ObjectId,
        "New login session"
      );

      // Create new session
      const session = await this.authRepository.createSession({
        userId: existingUser._id as Types.ObjectId,
        deviceId: device._id as Types.ObjectId,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        isActive: true,
        lastActivityAt: new Date(),
        refreshTokenExpiresAt: new Date(
          Date.now() + config.jwt.refreshTokenExpireMs
        ),
        accessTokenExpiresAt: new Date(
          Date.now() + config.jwt.accessTokenExpireMs
        ),
        accessToken: "",
        refreshToken: "",
      });

      // Generate tokens
      const accessToken = JWTUtil.generateAccessToken(
        existingUser._id as Types.ObjectId,
        session._id as Types.ObjectId,
        device._id as Types.ObjectId
      );
      const refreshToken = JWTUtil.generateRefreshToken(
        existingUser._id as Types.ObjectId,
        session._id as Types.ObjectId,
        device._id as Types.ObjectId
      );

      // Update session with tokens
      session.accessToken = accessToken;
      session.refreshToken = refreshToken;
      await this.authRepository.updateSession(session);

      // Update last login
      await this.authRepository.updateUserLastLogin(
        existingUser._id as Types.ObjectId
      );

      // Get role info
      const role = await this.authRepository.findRoleById(
        existingUser.roleId as Types.ObjectId
      );

      const roleNameKey = Object.keys(RoleName).find(
        (key) => RoleName[key as keyof typeof RoleName] === role?.name
      ) as string;

      if (role?.name === RoleName.PLAYER) {
        this.updatePlayerLoginActivity(
          (existingUser._id as Types.ObjectId).toString()
        );
      }

      return {
        created: false,
        user: {
          id: (existingUser._id as Types.ObjectId).toString(),
          username: existingUser.username,
          email: existingUser.email || "",
          status: (existingUser.status as any).name,
          statusCode: (existingUser.status as any).code,
          emailVerified: existingUser.emailVerified,
          roleId: role?.roleId || 0,
          roleName: roleNameKey,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    }

    // If user doesn't exist, create new user
    // Get default role
    const defaultRole = await this.authRepository.findRoleByName(
      RoleName.PLAYER
    );
    if (!defaultRole) {
      throw new InternalServerError("Default role not found");
    }

    // Get active status
    const activeStatus = await this.authRepository.findUserStatusByCode(1);
    if (!activeStatus) {
      throw new InternalServerError("Active status not found");
    }

    // Create user
    const user = await this.authRepository.createUser({
      username: signupData.username,
      password: signupData.password,
      roleId: defaultRole._id as Types.ObjectId,
      status: activeStatus._id as Types.ObjectId,
      emailVerified: false,
    });

    if (!user) {
      throw new InternalServerError("Failed to create user");
    }

    try {
      // Get AirLyft authorization token
      const airLyftToken = await this.airLyftService.getAuthorizationToken(
        user._id as string
      );

      // Update user with AirLyft token
      await this.authRepository.updateUserAirLyftToken(
        user._id as Types.ObjectId,
        airLyftToken
      );
    } catch (error) {
      // Delete user if AirLyft fails
      await this.authRepository.deleteUser(user._id as Types.ObjectId);

      logger.error("Failed to get AirLyft authorization token", {
        error,
        userId: user._id,
      });

      throw new InternalServerError(
        "Failed to get AirLyft authorization token"
      );
    }

    // Parse device info
    const deviceInfo = DeviceUtil.parseDeviceInfo(req);

    // Create device
    const device = await this.authRepository.createDevice({
      userId: user._id as Types.ObjectId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType as DeviceType,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      fingerprint: deviceInfo.fingerprint,
      ipAddress: deviceInfo.ipAddress,
      trusted: false,
      isActive: true,
    });

    // Create new session
    const session = await this.authRepository.createSession({
      userId: user._id as Types.ObjectId,
      deviceId: device._id as Types.ObjectId,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      isActive: true,
      lastActivityAt: new Date(),
      refreshTokenExpiresAt: new Date(
        Date.now() + config.jwt.refreshTokenExpireMs
      ),
      accessTokenExpiresAt: new Date(
        Date.now() + config.jwt.accessTokenExpireMs
      ),
      accessToken: "",
      refreshToken: "",
    });

    // Generate tokens
    const accessToken = JWTUtil.generateAccessToken(
      user._id as Types.ObjectId,
      session._id as Types.ObjectId,
      device._id as Types.ObjectId
    );
    const refreshToken = JWTUtil.generateRefreshToken(
      user._id as Types.ObjectId,
      session._id as Types.ObjectId,
      device._id as Types.ObjectId
    );

    // Update session with tokens
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    await this.authRepository.updateSession(session);

    // Update last login
    await this.authRepository.updateUserLastLogin(user._id as Types.ObjectId);

    // Get user with populated data
    const createdUser = await this.authRepository.findUserById(
      user._id as Types.ObjectId
    );
    if (!createdUser) {
      throw new InternalServerError("Failed to retrieve created user");
    }

    // Get role info
    const role = await this.authRepository.findRoleById(
      createdUser.roleId as Types.ObjectId
    );

    const roleNameKey = Object.keys(RoleName).find(
      (key) => RoleName[key as keyof typeof RoleName] === role?.name
    ) as string;

    if (role?.name === RoleName.PLAYER) {
      this.updatePlayerLoginActivity((user._id as Types.ObjectId).toString());
    }

    return {
      created: true,
      user: {
        id: (createdUser._id as Types.ObjectId).toString(),
        username: createdUser.username,
        email: createdUser.email || "",
        status: (createdUser.status as any).name,
        statusCode: (createdUser.status as any).code,
        emailVerified: createdUser.emailVerified,
        roleId: role?.roleId || 0,
        roleName: roleNameKey,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(loginData: LoginData, req: Request): Promise<AuthResponse> {
    // Find user by email
    const user = await this.authRepository.findUserByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if user is locked
    if (user.isLocked()) {
      throw new UnauthorizedError(
        "Account is locked due to multiple failed login attempts"
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(loginData.password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check user status using populated data
    if ((user.status as any).name !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    const role = await this.authRepository.findRoleById(
      user.roleId as Types.ObjectId
    );

    if (!role) {
      throw new InternalServerError("User role not found");
    }

    if (!role.isActive) {
      throw new UnauthorizedError("User role is not active");
    }

    // Parse device info
    const deviceInfo = DeviceUtil.parseDeviceInfo(req);

    // Find or create device
    let device = await this.authRepository.findDeviceByUserAndFingerprint(
      user._id as Types.ObjectId,
      deviceInfo.fingerprint
    );

    if (!device) {
      device = await this.authRepository.createDevice({
        userId: user._id as Types.ObjectId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType as DeviceType,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        fingerprint: deviceInfo.fingerprint,
        ipAddress: deviceInfo.ipAddress,
        trusted: false,
        isActive: true,
      });
    } else {
      await this.authRepository.updateDeviceLastUsed(
        device._id as Types.ObjectId
      );
    }

    // Revoke existing active sessions for this user (single device login)
    await this.authRepository.revokeUserActiveSessions(
      user._id as Types.ObjectId,
      "New login session"
    );

    // Create new session
    const session = await this.authRepository.createSession({
      userId: user._id as Types.ObjectId,
      deviceId: device._id as Types.ObjectId,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      isActive: true,
      lastActivityAt: new Date(),
      refreshTokenExpiresAt: new Date(
        Date.now() + config.jwt.refreshTokenExpireMs
      ),
      accessTokenExpiresAt: new Date(
        Date.now() + config.jwt.accessTokenExpireMs
      ),
      accessToken: "", // Will be set below
      refreshToken: "", // Will be set below
    });

    // Generate tokens
    const accessToken = JWTUtil.generateAccessToken(
      user._id as Types.ObjectId,
      session._id as Types.ObjectId,
      device._id as Types.ObjectId
    );
    const refreshToken = JWTUtil.generateRefreshToken(
      user._id as Types.ObjectId,
      session._id as Types.ObjectId,
      device._id as Types.ObjectId
    );

    // Update session with tokens
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    await this.authRepository.updateSession(session);

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await this.authRepository.updateUserLastLogin(user._id as Types.ObjectId);

    // Find the enum key corresponding to the role name
    let roleNameKey = Object.keys(RoleName).find(
      (key) => RoleName[key as keyof typeof RoleName] === role.name
    ) as string;

    if (role?.name === RoleName.PLAYER) {
      this.updatePlayerLoginActivity((user._id as Types.ObjectId).toString());
    }

    return {
      user: {
        id: (user._id as Types.ObjectId).toString(),
        username: user.username,
        email: user.email!,
        status: (user.status as any).name,
        statusCode: (user.status as any).code,
        emailVerified: user.emailVerified,
        roleId: role?.roleId,
        roleName: roleNameKey,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async createSupportManager(userData: {
    username: string;
    email: string;
  }): Promise<{
    message: string;
    user: {
      id: string;
      username: string;
      email: string;
      roleId: number;
      roleName: string;
      status: string;
      statusCode: number;
    };
  }> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmailOrUsername(
      userData.email,
      userData.username
    );

    if (existingUser) {
      throw new ConflictError(
        "User with this email or username already exists"
      );
    }

    // Get support manager role
    const supportManagerRole = await this.authRepository.findRoleByName(
      RoleName.SUPPORT_MANAGER
    );

    if (!supportManagerRole) {
      throw new InternalServerError("Support manager role not found");
    }

    if (!supportManagerRole.isActive) {
      throw new UnauthorizedError("Support manager role is not active");
    }

    // Get active status
    const activeStatus = await this.authRepository.findUserStatusByCode(1);
    if (!activeStatus) {
      throw new InternalServerError("Active status not found");
    }

    const password = PasswordUtil.generateRandomPassword();
    console.log(`Generated password for new support manager: ${password}`);
    logger.info(
      `Generated password for new support manager with email: ${userData.email}: ${password}`
    );

    // Create user with support manager role
    const newUser = await this.authRepository.createUser({
      username: userData.username,
      email: userData.email,
      password: password,
      roleId: supportManagerRole._id as Types.ObjectId,
      status: activeStatus._id as Types.ObjectId,
      emailVerified: true, // Support managers are pre-verified
    });

    if (newUser) {
      try {
        // Send welcome email with credentials
        await this.brevoService.sendSupportManagerWelcomeEmail(
          newUser.email!,
          newUser.username,
          password
        );
        logger.info(`Welcome email sent to ${newUser.email}`);
      } catch (emailError) {
        await this.authRepository.deleteUser(newUser._id as Types.ObjectId);

        console.error("Error sending welcome email:", emailError);

        logger.error(`Failed to send welcome email to ${newUser.email}`, {
          error: emailError,
        });
        throw new InternalServerError("Failed to send welcome email");
      }
    }

    // Get created user with populated data
    const createdUser = await this.authRepository.findUserById(
      newUser._id as Types.ObjectId
    );
    if (!createdUser) {
      throw new InternalServerError("Failed to retrieve created user");
    }

    return {
      message: "Support manager created successfully",
      user: {
        id: (createdUser._id as Types.ObjectId).toString(),
        username: createdUser.username,
        email: createdUser.email!,
        roleId: supportManagerRole.roleId,
        roleName: "SUPPORT_MANAGER",
        status: (createdUser.status as any).name,
        statusCode: (createdUser.status as any).code,
      },
    };
  }

  async getUserById(
    userId: string,
    secure: boolean
  ): Promise<{
    id: string;
    username: string;
    email: string;
    status: string;
    statusCode: number;
    emailVerified: boolean;
    roleId: number;
    roleName: string;
    walletAddress?: string | null;
    walletConnected?: boolean;
    profilePicture?: string | null;
    lastLoginAt?: Date | null;
    airLyftAuthToken?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }> {
    const user = await this.authRepository.findUserById(
      new Types.ObjectId(userId)
    );
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get role details if not populated
    let roleData = user.roleId;
    // if (
    //   typeof user.roleId === "string" ||
    //   user.roleId instanceof Types.ObjectId
    // ) {
    //   roleData = await this.authRepository.findRoleById(
    //     user.roleId as Types.ObjectId
    //   );
    // }

    // Find the enum key corresponding to the role name
    const roleNameKey = Object.keys(RoleName).find(
      (key) =>
        RoleName[key as keyof typeof RoleName] === (roleData as any)?.name
    ) as string;

    const userData = {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
      email: user.email || "",
      status: (user.status as any).name,
      statusCode: (user.status as any).code,
      emailVerified: user.emailVerified,
      roleId: (roleData as any)?.roleId || 0,
      roleName: roleNameKey || (roleData as any)?.name || "",
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (secure) {
      return {
        ...userData,
        walletAddress: user.walletAddress,
        walletConnected: user.walletConnected,
        profilePicture: user.profilePicture,
        airLyftAuthToken: user.airLyftAuthToken || null,
      };
    }

    return userData;
  }

  async sendPasswordResetOtp(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError("User with this email does not exist");
    }

    // Check if user account is active
    if ((user.status as any).name !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is not active");
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpHash = await bcrypt.hash(otp, config.security.bcryptRounds);

    // Set OTP expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update or create OTP record for this user
    await this.authRepository.upsertOtp({
      userId: user._id as Types.ObjectId,
      email: user.email!,
      otpHash,
      expiresAt,
    });

    // Send OTP via email
    try {
      await this.brevoService.sendPasswordResetOtp(
        user.email!,
        user.username,
        otp
      );
      logger.info(`Password reset OTP sent to ${user.email}`);
    } catch (emailError) {
      console.log("Error sending OTP email:", emailError);
      logger.error(`Failed to send OTP email to ${user.email}`, {
        error: emailError,
      });
      throw new InternalServerError("Failed to send OTP email");
    }

    return { message: "OTP sent to your email address" };
  }

  async checkUsername(username: string): Promise<{
    message: string;
    data: {
      showPassword: boolean;
      confirmShowPassword: boolean;
      userExists: boolean;
    };
  }> {
    // Check if username already exists
    const existingUser = await this.authRepository.findUserByUsername(username);

    if (existingUser) {
      return {
        message: "Username already exists",
        data: {
          showPassword: true,
          confirmShowPassword: false,
          userExists: true,
        },
      };
    }

    return {
      message: "Username is available",
      data: {
        showPassword: true,
        confirmShowPassword: true,
        userExists: false,
      },
    };
  }

  async getAllSupportManager(options?: {
    page?: number;
    limit?: number;
    skip?: number;
    search?: string;
    statusCode?: number;
  }): Promise<{
    data: IUser[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    if (!options) {
      // Legacy behavior - return all without pagination
      const supportManagers = await this.authRepository.getAllSuportManager();
      return { data: supportManagers };
    }

    const { page = 1, limit = 10, skip = 0, search = "", statusCode } = options;

    // Validate status code exists in database
    if (statusCode !== undefined) {
      const isValid = await this.authRepository.validateStatusCode(statusCode);
      if (!isValid) {
        throw new ValidationError(
          { status: "Invalid status code provided" },
          "Invalid status code"
        );
      }
    }

    const result = await this.authRepository.getAllSuportManager({
      page,
      limit,
      skip,
      search,
      statusCode,
    });

    return {
      data: result.data,
      pagination: result.pagination,
    };
  }

  async getAllPlayers(options?: {
    page?: number;
    limit?: number;
    skip?: number;
    search?: string;
    statusCode?: number;
  }): Promise<{
    data: IUser[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    if (!options) {
      // Legacy behavior - return all without pagination
      const players = await this.authRepository.getAllPlayers();
      return { data: players };
    }

    const { page = 1, limit = 10, skip = 0, search = "", statusCode } = options;

    // Validate status code exists in database
    if (statusCode !== undefined) {
      const isValid = await this.authRepository.validateStatusCode(statusCode);
      if (!isValid) {
        throw new ValidationError(
          { status: "Invalid status code provided" },
          "Invalid status code"
        );
      }
    }

    const result = await this.authRepository.getAllPlayers({
      page,
      limit,
      skip,
      search,
      statusCode,
    });

    return {
      data: result.data,
      pagination: result.pagination,
    };
  }

  async deleteSupportManager(userId: string): Promise<void> {
    const objId = new Types.ObjectId(userId);
    const user = await this.authRepository.findUserById(objId);
    if (!user) {
      throw new NotFoundError("Support Manager not found");
    }

    const role = await this.authRepository.findRoleById(
      user.roleId as Types.ObjectId
    );
    if (role?.name !== RoleName.SUPPORT_MANAGER) {
      throw new ConflictError("User is not a support manager");
    }

    // soft‐delete by status
    await this.authRepository.softDeleteUser(objId);
  }

  async deletePlayer(userId: string): Promise<void> {
    const objId = new Types.ObjectId(userId);
    const user = await this.authRepository.findUserById(objId);
    if (!user) {
      throw new NotFoundError("Player not found");
    }

    const role = await this.authRepository.findRoleById(
      user.roleId as Types.ObjectId
    );
    if (role?.name !== RoleName.PLAYER) {
      throw new ConflictError("User is not a player");
    }

    // soft‐delete by status
    await this.authRepository.softDeleteUser(objId);
  }
}
