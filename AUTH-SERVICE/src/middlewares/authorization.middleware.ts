import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { ForbiddenError } from "errors/index";
import { AuthRepository } from "@repositories/auth.repository";
import { RoleName } from "@models/interfaces/IRole";
import { Types } from "mongoose";

const authRepository = new AuthRepository();

export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    // Get user's role
    const role = await authRepository.findRoleById(
      new Types.ObjectId(req.user.roleId)
    );

    if (!role || role.name !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenError("Super admin access required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
