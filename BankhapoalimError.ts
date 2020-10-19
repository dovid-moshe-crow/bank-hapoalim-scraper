export enum ErrorType {
  LoginError = "LoginError",
  NetworkError = "NetworkError",
  GeneralError = "GeneralError",
}

export class BankhapoalimError extends Error {
  errorType: ErrorType;
  constructor(message: string, errorType: ErrorType) {
    super(message);
    this.errorType = errorType;
  }
}
