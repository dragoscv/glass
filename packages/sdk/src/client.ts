import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';
import type { 
  GlassMCPClientConfig, 
  ClientEventMap, 
  RestResponse, 
  WebSocketMessage,
  ServerStatus 
} from './types';
import { 
  WindowPlugin, 
  KeyboardPlugin, 
  MousePlugin, 
  SystemPlugin, 
  ClipboardPlugin, 
  FileSystemPlugin 
} from './plugins';

export class GlassMCPClient extends EventEmitter<ClientEventMap> {
  private http: AxiosInstance;
  private ws: WebSocket | null = null;
  private config: GlassMCPClientConfig;
  private isConnected = false;
  private retryCount = 0;

  // Plugin instances
  public readonly window: WindowPlugin;
  public readonly keyboard: KeyboardPlugin;
  public readonly mouse: MousePlugin;
  public readonly system: SystemPlugin;
  public readonly clipboard: ClipboardPlugin;
  public readonly filesystem: FileSystemPlugin;

  constructor(config: GlassMCPClientConfig) {
    super();
    this.config = {
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableWebSocket: true,
      ...config,
    };    // Initialize HTTP client
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GlassMCP-SDK/1.0.0',
      },
    });

    // Add auth interceptor
    this.setupAuthInterceptor();

    // Initialize plugins
    this.window = new WindowPlugin(this);
    this.keyboard = new KeyboardPlugin(this);
    this.mouse = new MousePlugin(this);
    this.system = new SystemPlugin(this);
    this.clipboard = new ClipboardPlugin(this);
    this.filesystem = new FileSystemPlugin(this);
  }

  private setupAuthInterceptor(): void {
    if (!this.config.auth) return;

    this.http.interceptors.request.use((config) => {
      const auth = this.config.auth!;
      
      switch (auth.type) {
        case 'bearer':
          if (auth.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
          }
          break;
        case 'apikey':
          if (auth.apiKey) {
            config.headers['X-API-Key'] = auth.apiKey;
          }
          break;
        case 'basic':
          if (auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            config.headers.Authorization = `Basic ${credentials}`;
          }
          break;
      }
      
      return config;
    });
  }

  public async connect(): Promise<void> {
    try {
      // Test HTTP connection
      const response = await this.http.get<RestResponse<ServerStatus>>('/api/status');
      
      if (!response.data.success) {
        throw new Error(`Connection failed: ${response.data.error}`);
      }

      this.isConnected = true;
      this.retryCount = 0;
      this.emit('connected');
      this.emit('auth:success');

      // Connect WebSocket if enabled
      if (this.config.enableWebSocket && this.config.websocketUrl) {
        await this.connectWebSocket();
      }
    } catch (error) {
      this.isConnected = false;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
      this.emit('auth:failure', errorObj);
      
      if (this.retryCount < (this.config.retryAttempts || 3)) {
        this.retryCount++;
        await this.delay(this.config.retryDelay || 1000);
        return this.connect();
      }
      
      throw errorObj;
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.websocketUrl) return;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.config.websocketUrl!);
        
        // Add auth to WebSocket URL
        if (this.config.auth?.type === 'bearer' && this.config.auth.token) {
          wsUrl.searchParams.set('token', this.config.auth.token);
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.on('open', () => {
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleWebSocketMessage(message);
          } catch (error) {
            this.emit('error', new Error(`Invalid WebSocket message: ${error}`));
          }
        });

        this.ws.on('close', () => {
          this.emit('disconnected');
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'window:changed':
        this.emit('window:changed', message.payload as any);
        break;
      case 'system:notification':
        this.emit('system:notification', message.payload as string);
        break;
      default:
        // Handle other message types
        break;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected');
  }

  public async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<RestResponse<T>> {
    try {
      const response = await this.http.request<RestResponse<T>>({
        method,
        url: path,
        data,
        ...config,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as RestResponse<T>;
      }
      
      throw error;
    }
  }

  public async getStatus(): Promise<ServerStatus> {
    const response = await this.request<ServerStatus>('GET', '/api/status');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get server status');
    }
    
    return response.data!;
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  public getConfig(): GlassMCPClientConfig {
    return { ...this.config };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
