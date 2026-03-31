/**
 * Logger utility for development-only logging
 * In production builds, all console.log/warn are removed via vite.config.js
 * Errors are always logged for debugging
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // Errors always log
  info: isDev ? console.info.bind(console) : () => {},
  debug: isDev ? console.debug.bind(console) : () => {},
};

export default logger;