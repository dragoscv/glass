import { z } from 'zod';

// Base API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    })
    .optional(),
  timestamp: z.string(),
  requestId: z.string(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
};

// Window Management Types
export const WindowInfoSchema = z.object({
  handle: z.number(),
  title: z.string(),
  className: z.string(),
  processId: z.number(),
  processName: z.string(),
  isVisible: z.boolean(),
  isMinimized: z.boolean(),
  isMaximized: z.boolean(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

export type WindowInfo = z.infer<typeof WindowInfoSchema>;

export const WindowFocusRequestSchema = z.object({
  title: z.string().optional(),
  handle: z.number().optional(),
  processName: z.string().optional(),
});

export type WindowFocusRequest = z.infer<typeof WindowFocusRequestSchema>;

export const WindowResizeRequestSchema = z.object({
  handle: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
});

export type WindowResizeRequest = z.infer<typeof WindowResizeRequestSchema>;

export const WindowMoveRequestSchema = z.object({
  handle: z.number(),
  x: z.number(),
  y: z.number(),
});

export type WindowMoveRequest = z.infer<typeof WindowMoveRequestSchema>;

// Keyboard Input Types
export const KeyboardTypeRequestSchema = z.object({
  text: z.string(),
  delay: z.number().min(0).max(5000).optional().default(50),
});

export type KeyboardTypeRequest = z.infer<typeof KeyboardTypeRequestSchema>;

export const KeyboardPressRequestSchema = z.object({
  key: z.string(),
  modifiers: z.array(z.enum(['ctrl', 'alt', 'shift', 'win'])).optional(),
  delay: z.number().min(0).max(5000).optional().default(50),
});

export type KeyboardPressRequest = z.infer<typeof KeyboardPressRequestSchema>;

// Mouse Control Types
export const MouseMoveRequestSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  duration: z.number().min(0).max(5000).optional().default(100),
});

export type MouseMoveRequest = z.infer<typeof MouseMoveRequestSchema>;

export const MouseClickRequestSchema = z.object({
  button: z.enum(['left', 'right', 'middle']).optional().default('left'),
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
  clickCount: z.number().min(1).max(3).optional().default(1),
});

export type MouseClickRequest = z.infer<typeof MouseClickRequestSchema>;

export const MouseScrollRequestSchema = z.object({
  direction: z.enum(['up', 'down', 'left', 'right']),
  amount: z.number().min(1).max(10).optional().default(3),
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
});

export type MouseScrollRequest = z.infer<typeof MouseScrollRequestSchema>;

// System Command Types
export const SystemExecRequestSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeout: z.number().min(100).max(300000).optional().default(30000),
  shell: z.boolean().optional().default(false),
});

export type SystemExecRequest = z.infer<typeof SystemExecRequestSchema>;

export const SystemExecResponseSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  signal: z.string().nullable(),
  timedOut: z.boolean(),
});

export type SystemExecResponse = z.infer<typeof SystemExecResponseSchema>;

export const ProcessInfoSchema = z.object({
  pid: z.number(),
  name: z.string(),
  executablePath: z.string(),
  commandLine: z.string(),
  memoryUsage: z.number(),
  cpuUsage: z.number(),
  parentPid: z.number().nullable(),
});

export type ProcessInfo = z.infer<typeof ProcessInfoSchema>;

// Clipboard Types
export const ClipboardSetRequestSchema = z.object({
  text: z.string(),
  format: z.enum(['text', 'html', 'rtf']).optional().default('text'),
});

export type ClipboardSetRequest = z.infer<typeof ClipboardSetRequestSchema>;

export const ClipboardContentSchema = z.object({
  text: z.string(),
  hasImage: z.boolean(),
  hasFiles: z.boolean(),
  formats: z.array(z.string()),
});

export type ClipboardContent = z.infer<typeof ClipboardContentSchema>;

export const ClipboardDataSchema = z.object({
  type: z.enum(['text', 'image', 'files']),
  content: z.string(), // For now, keep as string for cross-platform compatibility
  metadata: z.record(z.unknown()).optional(),
});

export type ClipboardData = z.infer<typeof ClipboardDataSchema>;

// File System Types
export const FileReadRequestSchema = z.object({
  path: z.string(),
  encoding: z.enum(['utf8', 'binary', 'base64']).optional().default('utf8'),
  maxSize: z.number().min(1).max(100 * 1024 * 1024).optional(), // 100MB max
});

export type FileReadRequest = z.infer<typeof FileReadRequestSchema>;

export const FileWriteRequestSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.enum(['utf8', 'binary', 'base64']).optional().default('utf8'),
  createDirectories: z.boolean().optional().default(false),
});

export type FileWriteRequest = z.infer<typeof FileWriteRequestSchema>;

export const FileInfoSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number(),
  isDirectory: z.boolean(),
  isFile: z.boolean(),
  created: z.string(),
  modified: z.string(),
  accessed: z.string(),
  permissions: z.object({
    readable: z.boolean(),
    writable: z.boolean(),
    executable: z.boolean(),
  }),
});

export type FileInfo = z.infer<typeof FileInfoSchema>;

export const DirectoryListRequestSchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional().default(false),
  includeHidden: z.boolean().optional().default(false),
  filter: z.string().optional(), // glob pattern
});

export type DirectoryListRequest = z.infer<typeof DirectoryListRequestSchema>;

export const FileSystemOptionsSchema = z.object({
  recursive: z.boolean().optional(),
  encoding: z.string().optional(),
  overwrite: z.boolean().optional(),
});

export type FileSystemOptions = z.infer<typeof FileSystemOptionsSchema>;

export const FileSystemOperationSchema = z.object({
  type: z.enum(['read', 'write', 'delete', 'copy', 'move', 'list']),
  path: z.string(),
  content: z.string().optional(), // Keep as string for cross-platform compatibility
  destination: z.string().optional(),
  options: FileSystemOptionsSchema.optional(),
});

export type FileSystemOperation = z.infer<typeof FileSystemOperationSchema>;

// Authentication Types
export const AuthTokenSchema = z.object({
  token: z.string().min(32),
  expiresAt: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

export const AuthConfigSchema = z.object({
  type: z.enum(['bearer', 'apikey', 'basic']),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// Server Configuration Types
export const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  tokenFile: z.string().optional(),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default('*'),
    credentials: z.boolean().default(true),
  }).default({}),
  auth: AuthConfigSchema.optional(),
  ssl: z.object({
    enabled: z.boolean().default(false),
    cert: z.string().optional(),
    key: z.string().optional(),
  }).optional(),
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100),
  }).default({}),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    file: z.string().optional(),
  }).default({}),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Input Types
export const KeyboardInputSchema = z.object({
  key: z.string(),
  modifiers: z.array(z.enum(['ctrl', 'alt', 'shift', 'win'])).optional(),
  action: z.enum(['press', 'down', 'up']),
});

export type KeyboardInput = z.infer<typeof KeyboardInputSchema>;

export const MouseInputSchema = z.object({
  x: z.number(),
  y: z.number(),
  button: z.enum(['left', 'right', 'middle']).optional(),
  action: z.enum(['click', 'move', 'scroll', 'down', 'up']),
  scrollDelta: z.number().optional(),
});

export type MouseInput = z.infer<typeof MouseInputSchema>;

// System Information Types
export const SystemInfoSchema = z.object({
  platform: z.string(),
  version: z.string(),
  architecture: z.string(),
  totalMemory: z.number(),
  freeMemory: z.number(),
  cpuUsage: z.number(),
  uptime: z.number(),
  processes: z.array(ProcessInfoSchema),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;

// Error Types
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  WINDOWS_API_ERROR = 'WINDOWS_API_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR',
}

export interface MCPError extends Error {
  code: ErrorCode;
  details: Record<string, unknown> | undefined;
  statusCode: number | undefined;
}

// WebSocket Event Types
export const WebSocketEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('window_focused'),
    data: WindowInfoSchema,
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal('window_closed'),
    data: z.object({ handle: z.number() }),
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal('process_started'),
    data: ProcessInfoSchema,
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal('process_ended'),
    data: z.object({ pid: z.number() }),
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal('clipboard_changed'),
    data: ClipboardContentSchema,
    timestamp: z.string(),
  }),
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;

// Plugin Interface
export interface PluginInterface {
  name: string;
  version: string;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  isSupported(): boolean;
  getCapabilities(): string[];
}

// API Endpoint Definitions
export const API_ENDPOINTS = {
  // Window Management
  WINDOW_LIST: '/api/window/list',
  WINDOW_FOCUS: '/api/window/focus',
  WINDOW_RESIZE: '/api/window/resize',
  WINDOW_MOVE: '/api/window/move',
  WINDOW_CLOSE: '/api/window/close',

  // Keyboard Control
  KEYBOARD_TYPE: '/api/keyboard/type',
  KEYBOARD_PRESS: '/api/keyboard/press',

  // Mouse Control
  MOUSE_MOVE: '/api/mouse/move',
  MOUSE_CLICK: '/api/mouse/click',
  MOUSE_SCROLL: '/api/mouse/scroll',

  // System Commands
  SYSTEM_EXEC: '/api/system/exec',
  SYSTEM_PROCESSES: '/api/system/processes',
  SYSTEM_KILL: '/api/system/kill',

  // Clipboard
  CLIPBOARD_GET: '/api/clipboard',
  CLIPBOARD_SET: '/api/clipboard',

  // File System
  FS_READ: '/api/fs/read',
  FS_WRITE: '/api/fs/write',
  FS_LIST: '/api/fs/list',
  FS_DELETE: '/api/fs/delete',

  // Server Management
  SERVER_STATUS: '/api/status',
  SERVER_HEALTH: '/api/health',
  SERVER_DOCS: '/docs',
} as const;
