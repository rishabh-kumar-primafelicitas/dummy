import { AuthService } from "@services/auth.service";
import { AuthenticatedRequest } from "middlewares/auth.middleware";
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@utils/async.handler.util";
import { ValidationError } from "@utils/errors/validation.error";

const authService = new AuthService();

export class AuthController {
  signup = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { username, password } = req.body;

      const errors: Record<string, string> = {};
      if (!username) errors.username = "Username is required";
      if (!password) errors.password = "Password is required";

      // Basic validation
      if (username && username.length < 3) {
        errors.username = "Username must be at least 3 characters";
      }
      if (password && password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const result = await authService.signup({ username, password }, req);
      res.status(result.created ? 201 : 200).json({
        status: true,
        message: "Login successful",
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    }
  );

  login = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { email, password } = req.body;

      const errors: Record<string, string> = {};
      if (!email) errors.email = "Email is required";
      if (!password) errors.password = "Password is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const result = await authService.login({ email, password }, req);
      res.status(200).json({
        status: true,
        message: "Login successful",
        data: result,
      });
    }
  );

  refreshToken = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError(
          { refreshToken: "Refresh token is required" },
          "Missing required fields"
        );
      }

      const result = await authService.refreshToken(refreshToken, req);
      res.status(200).json({
        status: true,
        data: result,
      });
    }
  );

  logout = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7) || "";

      const result = await authService.logout(token);
      res.status(200).json({
        status: true,
        ...result,
      });
    }
  );

  me = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      if (!req.user || !req.user.id) {
        throw new ValidationError(
          { user: "User not authenticated" },
          "Authentication required"
        );
      }

      const user = await authService.getUserById(req.user.id as string);

      res.status(200).json({
        status: true,
        message: "User retrieved successfully",
        data: { user },
      });
    }
  );

  publicMe = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      if (!req.headers || !req.headers.userid) {
        throw new ValidationError(
          { user: "User id is required" },
          "User id is required"
        );
      }

      const userId = req.headers.userid;
      const user = await authService.getUserById(userId as string);

      res.status(200).json({
        status: true,
        message: "User retrieved successfully",
        data: { user },
      });
    }
  );

  createSupportManager = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { username, email } = req.body;

      const errors: Record<string, string> = {};
      if (!username) errors.username = "Username is required";
      if (!email) errors.email = "Email is required";

      // Basic validation
      if (username && username.length < 3) {
        errors.username = "Username must be at least 3 characters";
      }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = "Please provide a valid email";
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Validation failed");
      }

      const result = await authService.createSupportManager({
        username,
        email,
      });

      res.status(201).json({
        status: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    }
  );

  verifyEmail = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { token } = req.params;

      if (!token) {
        throw new ValidationError(
          { token: "Verification token is required" },
          "Missing verification token"
        );
      }

      const result = await authService.verifyEmail(token);
      res.status(200).json({
        status: true,
        message: result.message,
      });
    }
  );

  sendPasswordResetOtp = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { email } = req.body;

      if (!email) {
        throw new ValidationError(
          { email: "Email is required" },
          "Missing required fields"
        );
      }

      // Basic email validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError(
          { email: "Please provide a valid email address" },
          "Invalid email format"
        );
      }

      const result = await authService.sendPasswordResetOtp(email);
      res.status(200).json({
        status: true,
        message: result.message,
      });
    }
  );

  verifyOtp = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { email, otp } = req.body;

      const errors: Record<string, string> = {};
      if (!email) errors.email = "Email is required";
      if (!otp) errors.otp = "OTP is required";

      // Basic validation
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = "Please provide a valid email address";
      }
      if (otp && !/^\d{4}$/.test(otp)) {
        errors.otp = "OTP must be a 4-digit number";
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Validation failed");
      }
      console.log("Email:", email, "OTP:", otp);

      const result = await authService.verifyOtp(email, otp);
      res.status(200).json({
        status: true,
        message: result.message,
        data: {
          resetToken: result.resetToken,
        },
      });
    }
  );

  forgotPassword = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { resetToken, email, newPassword } = req.body;

      const errors: Record<string, string> = {};
      if (!resetToken) errors.resetToken = "Reset token is required";
      if (!newPassword) errors.newPassword = "New password is required";

      // Basic validation
      if (newPassword && newPassword.length < 6) {
        errors.newPassword = "Password must be at least 6 characters long";
      }

      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = "Please provide a valid email address";
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Validation failed");
      }

      const result = await authService.forgotPassword(
        resetToken,
        email,
        newPassword
      );
      res.status(200).json({
        status: true,
        message: result.message,
      });
    }
  );

  checkUsername = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { username } = req.body;

      if (!username) {
        throw new ValidationError(
          { username: "Username is required" },
          "Missing required fields"
        );
      }

      // Basic validation
      if (username.length < 3) {
        throw new ValidationError(
          { username: "Username must be at least 3 characters" },
          "Invalid username"
        );
      }

      const result = await authService.checkUsername(username);
      res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
      });
    }
  );

  getAllSupportManager = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<any> => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      // Extract search term
      const searchTerm = req.query.search
        ? (req.query.search as string).trim()
        : "";

      // Parse single status code from query parameter
      let statusCode: number | undefined;
      if (req.query.status) {
        const statusParam = parseInt(req.query.status as string, 10);

        if (isNaN(statusParam) || statusParam <= 0) {
          throw new ValidationError(
            { status: "Status must be a valid positive number" },
            "Invalid status code"
          );
        }

        statusCode = statusParam;
      }

      const options: any = {
        page,
        limit,
        skip,
        search: searchTerm,
      };

      if (statusCode !== undefined) {
        options.statusCode = statusCode;
      }

      const result = await authService.getAllSupportManager(options);

      res.status(200).json({
        status: true,
        message: "Support managers retrieved successfully",
        data: result.data.length === 0 ? null : result.data,
        pagination: result.pagination,
      });
    }
  );

  getAllPlayers = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<any> => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      // Extract search term
      const searchTerm = req.query.search
        ? (req.query.search as string).trim()
        : "";

      // Parse single status code from query parameter
      let statusCode: number | undefined;
      if (req.query.status) {
        const statusParam = parseInt(req.query.status as string, 10);

        if (isNaN(statusParam) || statusParam <= 0) {
          throw new ValidationError(
            { status: "Status must be a valid positive number" },
            "Invalid status code"
          );
        }

        statusCode = statusParam;
      }

      const options: any = {
        page,
        limit,
        skip,
        search: searchTerm,
      };

      if (statusCode !== undefined) {
        options.statusCode = statusCode;
      }

      const result = await authService.getAllPlayers(options);

      res.status(200).json({
        status: true,
        message: "Players retrieved successfully",
        data: result.data.length === 0 ? null : result.data,
        pagination: result.pagination,
      });
    }
  );

  deleteSupportManager = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError(
          { id: "Support manager ID is required" },
          "Missing required fields"
        );
      }
      await authService.deleteSupportManager(id);
      res.status(200).json({
        status: true,
        message: "Support manager deleted successfully",
      });
    }
  );

  deletePlayer = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError(
          { id: "Player ID is required" },
          "Missing required fields"
        );
      }
      await authService.deletePlayer(id);
      res.status(200).json({
        status: true,
        message: "Player deleted successfully",
      });
    }
  );
}
