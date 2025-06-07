#!/usr/bin/env node

import { MCPServer } from './core/server.js';
import { LoggerService } from './utils/logger.js';
import type { ServerConfig } from '@glassmcp/shared';

const logger = new LoggerService();

async function main() {
  try {
    const config: ServerConfig = {
      port: parseInt(process.env.MCP_PORT || '3000'),
      host: process.env.MCP_HOST || '0.0.0.0',
      auth: {
        type: 'apikey',
        apiKey: process.env.MCP_API_KEY || 'default-key-change-in-production',
      },
      cors: {
        origin: process.env.MCP_CORS_ORIGINS ? process.env.MCP_CORS_ORIGINS.split(',') : ['*'],
        credentials: true,
      },
      rateLimit: {
        windowMs: parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.MCP_RATE_LIMIT_MAX || '100'),
      },
      logging: {
        level: (process.env.MCP_LOG_LEVEL as any) || 'info',
        file: process.env.MCP_LOG_FILE_PATH,
      },
    };

    const server = new MCPServer(config);
    
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    await server.start();
    logger.info(`GlassMCP server started on ${config.host}:${config.port}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
