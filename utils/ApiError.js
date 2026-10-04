/**
 * Operational error with an HTTP status code.
 * Throw (or pass to next()) anywhere in controllers/services;
 * errorHandler.js turns it into a JSON response.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code (e.g. 404, 422)
   * @param {string} message Human-readable message
   * @param {*} [details] Optional machine-readable details (e.g. validation errors)
   */
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}
