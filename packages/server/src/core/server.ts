import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { WebSocketServer } from 'ws';
import winston from 'winston';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { createServer } from 'http';
import type { Server } from 'http';

import type { ServerConfig } from '@glassmcp/shared';
import { ServerConfigSchema, createErrorResponse, generateRequestId, ErrorCode } from '@glassmcp/shared';
import { AuthService } from '../auth/auth-service';
import { PluginManager } from '../plugins/plugin-manager';
import { LoggerService } from '../utils/logger';
import { setupRoutes } from '../api/routes';
import { WebSocketManager } from './websocket-manager';

export class MCPServer {
  private app: express.Application;
  private server: Server;
  private wsServer: WebSocketServer;
  private config: ServerConfig;
  private logger: winston.Logger;
  private authService: AuthService;
  private pluginManager: PluginManager;
  private wsManager: WebSocketManager;
  private isStarted = false;

  constructor(config: Partial<ServerConfig> = {}) {
    // Validate and merge configuration
    this.config = ServerConfigSchema.parse({
      ...ServerConfigSchema.parse({}), // Apply defaults
      ...config,
    });

    // Initialize logger
    this.logger = LoggerService.createLogger(this.config.logging.level);

    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);

    // Initialize WebSocket server
    this.wsServer = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });    // Initialize services
    this.authService = new AuthService(this.config, this.logger);
    this.pluginManager = new PluginManager(new LoggerService(this.config.logging.level));
    this.wsManager = new WebSocketManager(this.wsServer, this.authService, this.logger);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
        },
      },
    }));

    // CORS - only allow localhost
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        // Only allow localhost requests
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));    // Rate limiting
    if (this.config.rateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs,
        max: this.config.rateLimit.max,
        message: createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many requests, please try again later',
          'rate-limit'
        ),
        standardHeaders: true,
        legacyHeaders: false,
      });

      const speedLimiter = slowDown({
        windowMs: this.config.rateLimit.windowMs,
        delayAfter: Math.floor(this.config.rateLimit.max * 0.7),
        delayMs: 500,
      });

      this.app.use(limiter);
      this.app.use(speedLimiter);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      const requestId = generateRequestId();
      req.requestId = requestId;
      
      this.logger.info('Request received', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      next();
    });

    // Authentication middleware (exclude public routes)
    this.app.use('/api', this.authService.authenticate.bind(this.authService));
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // Status endpoint (no auth required)
    this.app.get('/status', (_req, res) => {
      res.json({
        server: 'GlassMCP',
        version: process.env.npm_package_version || '1.0.0',
        platform: process.platform,
        nodeVersion: process.version,
        plugins: this.pluginManager.getLoadedPlugins(),
        connections: this.wsManager.getConnectionCount(),
      });
    });

    // API documentation
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'GlassMCP API',
          version: '1.0.0',
          description: 'Machine Control Protocol server for Windows automation',
        },
        servers: [
          {
            url: `http://${this.config.host}:${this.config.port}`,
            description: 'Local server',
          },
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
        security: [
          {
            BearerAuth: [],
          },
        ],
      },
      apis: ['./src/api/**/*.ts'], // Path to the API files
    };

    const swaggerSpec = swaggerJSDoc(swaggerOptions);
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // API routes
    setupRoutes(this.app, this.pluginManager);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json(
        createErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          `Route ${req.method} ${req.originalUrl} not found`,
          req.requestId || generateRequestId()
        )
      );
    });
  }

  private setupErrorHandlers(): void {
    // Express error handler
    this.app.use((
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId = req.requestId || generateRequestId();
      
      this.logger.error('Unhandled error', {
        requestId,
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
      });

      // Don't expose internal errors in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;

      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          message,
          requestId
        )
      );
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection', {
        reason: String(reason),
        promise: String(promise),
      });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      
      // Graceful shutdown
      this.stop().then(() => {
        process.exit(1);
      }).catch(() => {
        process.exit(1);
      });
    });
  }

  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Server is already started');
    }

    try {
      // Initialize auth service
      await this.authService.initialize();

      // Load plugins
      await this.pluginManager.initialize();

      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isStarted = true;

      this.logger.info('GlassMCP server started', {
        host: this.config.host,
        port: this.config.port,
        plugins: this.pluginManager.getLoadedPlugins().length,
      });

    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.logger.info('Stopping GlassMCP server...');

    try {
      // Close WebSocket connections
      this.wsManager.closeAll();

      // Stop HTTP server
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Unload plugins
      await this.pluginManager.destroy();

      this.isStarted = false;
      this.logger.info('GlassMCP server stopped');

    } catch (error) {
      this.logger.error('Error stopping server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  public isRunning(): boolean {
    return this.isStarted;
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getLogger(): winston.Logger {
    return this.logger;
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        token: string;
        permissions?: string[];
      };
    }
  }
}
