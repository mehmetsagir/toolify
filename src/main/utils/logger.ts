/**
 * Production-safe logger utility
 * Logs only in development mode, suppresses in production
 */

const isDevelopment = process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== undefined

export const logger = {
  /**
   * Log debug messages (development only)
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log info messages (development only)
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * Log warnings (always)
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args)
  },

  /**
   * Log errors (always)
   */
  error: (...args: unknown[]): void => {
    console.error(...args)
  },

  /**
   * Debug utility for development
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}
