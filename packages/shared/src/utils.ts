import type { ApiResponse } from './types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>
): ApiResponse {
  const error = {
    code,
    message,
    ...(details && { details }),
  };

  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate that a path is safe for file operations
 */
export function validatePath(path: string): boolean {
  // Prevent path traversal attacks
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
    return false;
  }

  // Prevent access to system directories
  const blockedPaths = [
    '/windows/',
    '/system32/',
    '/program files/',
    '/program files (x86)/',
    'c:/windows/',
    'c:/system32/',
    'c:/program files/',
    'c:/program files (x86)/',
  ];

  const lowerPath = normalizedPath.toLowerCase();
  return !blockedPaths.some(blocked => lowerPath.includes(blocked));
}

/**
 * Sanitize command string to prevent injection
 */
export function sanitizeCommand(command: string): string {
  // Remove potentially dangerous characters
  return command.replace(/[;&|`$(){}[\]]/g, '');
}

/**
 * Check if a command is allowed
 */
export function isCommandAllowed(
  command: string,
  allowedCommands?: string[],
  blockedCommands?: string[]
): boolean {
  const cmd = command.toLowerCase().trim();

  // Check if explicitly blocked
  if (blockedCommands?.some(blocked => cmd.includes(blocked.toLowerCase()))) {
    return false;
  }

  // If allowlist exists, command must be in it
  if (allowedCommands && allowedCommands.length > 0) {
    return allowedCommands.some(allowed =>
      cmd.startsWith(allowed.toLowerCase())
    );
  }

  // Default: allow if not explicitly blocked
  return true;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    factor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  
  if (lastDot > lastSlash && lastDot !== -1) {
    return path.substring(lastDot + 1).toLowerCase();
  }
  
  return '';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return typeof process !== 'undefined' && process.platform === 'win32';
}

/**
 * Escape string for Windows command line
 */
export function escapeWindowsArg(arg: string): string {
  if (!/\s/.test(arg)) {
    return arg;
  }
  
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Parse Windows error code to human readable message
 */
export function parseWindowsError(code: number): string {
  const errorMessages: Record<number, string> = {
    0: 'Success',
    1: 'Invalid function',
    2: 'File not found',
    3: 'Path not found',
    5: 'Access denied',
    6: 'Invalid handle',
    8: 'Not enough memory',
    87: 'Invalid parameter',
    122: 'Data area too small',
    1400: 'Invalid window handle',
    1401: 'Invalid menu handle',
    1402: 'Invalid cursor handle',
    1403: 'Invalid accelerator table handle',
    1404: 'Invalid hook handle',
  };

  return errorMessages[code] ?? `Unknown error (code: ${code})`;
}
