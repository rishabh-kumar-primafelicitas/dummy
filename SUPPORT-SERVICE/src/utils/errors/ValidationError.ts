import { AppError } from "./AppErrors";

export class ValidationError extends AppError {
  public validationErrors: Record<string, string>;

  constructor(
    validationErrors: Record<string, string>,
    message: string = "Validation failed",
    statusCode: number = 400
  ) {
    super(message, statusCode, true);
    this.name = "ValidationError";
    this.validationErrors = validationErrors;

    // Include validation details in stack for development
    if (process.env.NODE_ENV === "development") {
      this.stack = `${this.stack}\nValidation Details: ${JSON.stringify(validationErrors, null, 2)}`;
    }
  }
}