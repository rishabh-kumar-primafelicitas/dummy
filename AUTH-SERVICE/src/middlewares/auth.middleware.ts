import { Request, Response, NextFunction } from "express";
import { JWTUtil } from "@utils/jwt.util";
import { DeviceUtil } from "@utils/device.util";
import { AuthService } from "@services/auth.service";
import { AuthRepository } from "@repositories/auth.repository";
import { UnauthorizedError } from "@utils/errors/index";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    roleId: string;
  };
  session?: {
    id: string;
    deviceId: string;
  };
}

const authService = new AuthService();
const authRepository = new AuthRepository();

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token required");
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const payload = JWTUtil.verifyToken(token);

    if (payload.type !== "access") {
      throw new UnauthorizedError("Invalid token type");
    }

    // Validate session using service
    const sessionData = await authService.validateSession(
      payload.sessionId,
      token
    );

    if (!sessionData) {
      throw new UnauthorizedError("Invalid or expired session");
    }

    // Refresh device fingerprint if device exists
    if (sessionData.session.deviceId) {
      const deviceInfo = DeviceUtil.parseDeviceInfo(req);
      await authRepository.refreshDeviceFingerprint(
        sessionData.session.deviceId as any,
        deviceInfo.fingerprint
      );
    }
    // Attach user and session to request
    req.user = sessionData.user;
    req.session = sessionData.session;

    next();
  } catch (error) {
    next(error);
  }
};
