import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type winston from 'winston';

import type { ServerConfig } from '@glassmcp/shared';
import { createErrorResponse, ErrorCode, generateRequestId } from '@glassmcp/shared';

export class AuthService {
  private token: string | null = null;
  private tokenFile: string;

  constructor(
    config: ServerConfig,
    private logger: winston.Logger
  ) {
    this.tokenFile = config.tokenFile || join(homedir(), '.mcp-token');
  }

  public async initialize(): Promise<void> {
    try {
      // Try to load existing token
      await this.loadToken();
    } catch (error) {
      // Generate new token if file doesn't exist
      this.logger.info('Generating new authentication token');
      await this.generateToken();
    }
  }

  private async loadToken(): Promise<void> {
    try {
      const tokenData = await fs.readFile(this.tokenFile, 'utf-8');
      const parsed = JSON.parse(tokenData);
      
      if (parsed.token && typeof parsed.token === 'string') {
        this.token = parsed.token;
        this.logger.info('Authentication token loaded', {
          tokenFile: this.tokenFile,
        });
      } else {
        throw new Error('Invalid token format');
      }
    } catch (error) {
      this.logger.debug('Could not load token file', {
        tokenFile: this.tokenFile,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async generateToken(): Promise<void> {
    // Generate a secure random token
    this.token = randomBytes(32).toString('hex');
    
    const tokenData = {
      token: this.token,
      created: new Date().toISOString(),
      description: 'GlassMCP authentication token',
    };

    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokenData, null, 2), 'utf-8');
      
      // Set restrictive permissions on Windows
      if (process.platform === 'win32') {
        // On Windows, we can't easily set file permissions via Node.js
        // The file in the user's home directory should be reasonably secure
        this.logger.warn('Token file created. Please ensure only you have access to this file.', {
          tokenFile: this.tokenFile,
        });
      }

      this.logger.info('New authentication token generated', {
        tokenFile: this.tokenFile,
        token: `${this.token.substring(0, 8)}...`, // Log only first 8 chars
      });
    } catch (error) {
      this.logger.error('Failed to save token file', {
        tokenFile: this.tokenFile,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async validateToken(providedToken: string): Promise<boolean> {
    if (!this.token) {
      this.logger.warn('No token available for validation');
      return false;
    }

    const isValid = providedToken === this.token;
    
    if (!isValid) {
      this.logger.warn('Invalid token provided', {
        providedToken: `${providedToken.substring(0, 8)}...`,
      });
    }

    return isValid;
  }

  public authenticate(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.requestId || generateRequestId();

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      this.logger.warn('No authorization header provided', { requestId });
      res.status(401).json(
        createErrorResponse(
          ErrorCode.AUTHENTICATION_FAILED,
          'Authorization header required',
          requestId
        )
      );
      return;
    }

    // Expect "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      this.logger.warn('Invalid authorization header format', { requestId });
      res.status(401).json(
        createErrorResponse(
          ErrorCode.AUTHENTICATION_FAILED,
          'Invalid authorization header format. Expected: Bearer <token>',
          requestId
        )
      );
      return;
    }    const token = parts[1];
    
    if (!token) {
      res.status(401).json(
        createErrorResponse(
          ErrorCode.AUTHENTICATION_FAILED,
          'Token is required in authorization header',
          requestId
        )
      );
      return;
    }
    
    // Validate token asynchronously
    this.validateToken(token)
      .then((isValid) => {
        if (isValid) {
          // Add user info to request
          req.user = {
            token: token,
            permissions: [], // Future: implement role-based permissions
          };
          next();
        } else {
          res.status(401).json(
            createErrorResponse(
              ErrorCode.INVALID_TOKEN,
              'Invalid authentication token',
              requestId
            )
          );
        }
      })
      .catch((error) => {
        this.logger.error('Token validation error', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
        
        res.status(500).json(
          createErrorResponse(
            ErrorCode.INTERNAL_ERROR,
            'Authentication service error',
            requestId
          )
        );
      });
  }

  public getToken(): string | null {
    return this.token;
  }

  public getTokenFile(): string {
    return this.tokenFile;
  }

  public async regenerateToken(): Promise<string> {
    await this.generateToken();
    return this.token!;
  }
}
