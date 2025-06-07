export { MCPServer } from './core/server.js';
export { AuthService } from './auth/auth-service.js';
export { LoggerService } from './utils/logger.js';
export { WebSocketManager } from './core/websocket-manager.js';
export { PluginManager } from './plugins/plugin-manager.js';

// Plugin exports
export { WindowPlugin } from './plugins/window.js';
export { KeyboardPlugin } from './plugins/keyboard.js';
export { MousePlugin } from './plugins/mouse.js';
export { SystemPlugin } from './plugins/system.js';
export { ClipboardPlugin } from './plugins/clipboard.js';
export { FilesystemPlugin } from './plugins/filesystem.js';

// Re-export shared types for convenience
export type * from '@glassmcp/shared';
