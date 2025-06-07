import type { WebSocketServer, WebSocket } from 'ws';
import type winston from 'winston';
import type { AuthService } from '../auth/auth-service';
import type { WebSocketEvent } from '@glassmcp/shared';
import { generateRequestId } from '@glassmcp/shared';

interface AuthenticatedWebSocket extends WebSocket {
  isAuthenticated?: boolean;
  token?: string;
  connectionId?: string;
}

export class WebSocketManager {
  private connections = new Map<string, AuthenticatedWebSocket>();

  constructor(
    private wsServer: WebSocketServer,
    private authService: AuthService,
    private logger: winston.Logger
  ) {
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wsServer.on('connection', (ws: AuthenticatedWebSocket, req) => {
      const connectionId = generateRequestId();
      ws.connectionId = connectionId;

      this.logger.info('WebSocket connection attempt', {
        connectionId,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
      });

      // Authentication required
      ws.send(JSON.stringify({
        type: 'auth_required',
        message: 'Please provide authentication token',
      }));

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          this.logger.warn('Invalid WebSocket message', {
            connectionId,
            error: error instanceof Error ? error.message : String(error),
          });
          
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }));
        }
      });

      ws.on('close', () => {
        this.logger.info('WebSocket connection closed', { connectionId });
        this.connections.delete(connectionId);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', {
          connectionId,
          error: error.message,
        });
      });
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: unknown): Promise<void> {
    if (!ws.connectionId) return;

    if (!ws.isAuthenticated) {
      // Handle authentication
      if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'auth') {
        await this.handleAuthentication(ws, message);
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required',
        }));
      }
      return;
    }

    // Handle authenticated messages
    switch ((message as { type: string }).type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe':
        // Handle event subscriptions
        this.handleSubscription(ws, message);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type',
        }));
    }
  }

  private async handleAuthentication(ws: AuthenticatedWebSocket, message: unknown): Promise<void> {
    try {
      const authMessage = message as { token?: string };
      
      if (!authMessage.token) {
        ws.send(JSON.stringify({
          type: 'auth_failed',
          message: 'Token required',
        }));
        return;
      }

      const isValid = await this.authService.validateToken(authMessage.token);
      
      if (isValid) {
        ws.isAuthenticated = true;
        ws.token = authMessage.token;
        
        if (ws.connectionId) {
          this.connections.set(ws.connectionId, ws);
        }

        ws.send(JSON.stringify({
          type: 'auth_success',
          message: 'Authentication successful',
        }));

        this.logger.info('WebSocket authenticated', {
          connectionId: ws.connectionId,
        });
      } else {
        ws.send(JSON.stringify({
          type: 'auth_failed',
          message: 'Invalid token',
        }));
        
        // Close connection after failed auth
        setTimeout(() => ws.close(), 1000);
      }
    } catch (error) {
      this.logger.error('WebSocket authentication error', {
        connectionId: ws.connectionId,
        error: error instanceof Error ? error.message : String(error),
      });

      ws.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Authentication error',
      }));
    }
  }

  private handleSubscription(ws: AuthenticatedWebSocket, message: unknown): void {
    // Handle event subscription logic
    const subscriptionMessage = message as { events?: string[] };
    
    ws.send(JSON.stringify({
      type: 'subscription_success',
      events: subscriptionMessage.events || [],
    }));
  }

  public broadcast(event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    
    this.connections.forEach((ws, connectionId) => {
      if (ws.isAuthenticated && ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          this.logger.warn('Failed to send WebSocket message', {
            connectionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
  }

  public closeAll(): void {
    this.connections.forEach((ws, connectionId) => {
      try {
        ws.close();
      } catch (error) {
        this.logger.warn('Error closing WebSocket connection', {
          connectionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
    
    this.connections.clear();
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }
}
