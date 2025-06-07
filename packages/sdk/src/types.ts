import type { 
  AuthConfig, 
  WindowInfo, 
} from '@glassmcp/shared';

// Re-export shared types for convenience
export type {
  AuthConfig,
  WindowInfo,
  KeyboardInput,
  MouseInput,
  SystemInfo,
  ClipboardData,
  FileSystemOperation
} from '@glassmcp/shared';

export interface GlassMCPClientConfig {
  baseUrl: string;
  auth?: AuthConfig;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableWebSocket?: boolean;
  websocketUrl?: string;
}

export interface ClientEventMap {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  'auth:success': () => void;
  'auth:failure': (error: Error) => void;
  'window:changed': (window: WindowInfo) => void;
  'system:notification': (message: string) => void;
}

export interface RestResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  id?: string;
  timestamp: string;
}

export interface PluginModule {
  name: string;
  version: string;
  methods: string[];
}

export interface ServerStatus {
  online: boolean;
  version: string;
  uptime: number;
  plugins: PluginModule[];
  connections: number;
}
