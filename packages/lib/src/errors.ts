export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Not allowed") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}
