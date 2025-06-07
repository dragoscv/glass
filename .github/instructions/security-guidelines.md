---
applyTo: "**"
---

# Security Guidelines for GlassMCP

This document outlines comprehensive security guidelines for the GlassMCP server project, ensuring safe system-level automation while maintaining usability for AI agents.

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                  │
│  • Input Validation  • Rate Limiting  • Logging    │
├─────────────────────────────────────────────────────┤
│                 Authentication Layer                │
│  • Token Auth  • Request Signing  • Session Mgmt   │
├─────────────────────────────────────────────────────┤
│                Authorization Layer                  │
│  • Permission Checks  • Resource Limits  • ACLs    │
├─────────────────────────────────────────────────────┤
│                  Transport Layer                    │
│  • TLS Encryption  • Local Binding  • Firewalling  │
└─────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### Token-Based Authentication

```typescript
interface AuthToken {
  id: string;
  secret: string;
  permissions: Permission[];
  expiresAt: Date;
  createdAt: Date;
  lastUsed?: Date;
}

interface Permission {
  resource: string;    // 'window', 'filesystem', 'system'
  actions: string[];   // ['read', 'write', 'execute']
  restrictions?: {
    paths?: string[];       // Allowed file paths
    processes?: string[];   // Allowed processes
    rateLimits?: RateLimit;
  };
}
```

### Token Management
```typescript
class TokenManager {
  private tokens = new Map<string, AuthToken>();
  
  async generateToken(permissions: Permission[]): Promise<string> {
    const token: AuthToken = {
      id: crypto.randomUUID(),
      secret: crypto.randomBytes(32).toString('hex'),
      permissions,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    };
    
    this.tokens.set(token.id, token);
    await this.saveTokenToFile(token);
    
    return token.secret;
  }
  
  async validateToken(tokenSecret: string): Promise<AuthToken | null> {
    const token = Array.from(this.tokens.values())
      .find(t => t.secret === tokenSecret);
    
    if (!token || token.expiresAt < new Date()) {
      return null;
    }
    
    token.lastUsed = new Date();
    return token;
  }
}
```

### Permission Checking
```typescript
class PermissionChecker {
  static async checkPermission(
    token: AuthToken,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    const permission = token.permissions.find(p => p.resource === resource);
    if (!permission || !permission.actions.includes(action)) {
      return false;
    }
    
    // Check resource-specific restrictions
    if (resource === 'filesystem' && context?.path) {
      return this.checkFileAccess(permission, context.path);
    }
    
    if (resource === 'system' && context?.command) {
      return this.checkCommandAccess(permission, context.command);
    }
    
    return true;
  }
  
  private static checkFileAccess(permission: Permission, path: string): boolean {
    if (!permission.restrictions?.paths) return true;
    
    const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
    return permission.restrictions.paths.some(allowedPath => 
      normalizedPath.startsWith(allowedPath.toLowerCase().replace(/\\/g, '/'))
    );
  }
}
```

## Input Validation & Sanitization

### Request Validation
```typescript
import { z } from 'zod';

// Window focus request schema
const WindowFocusSchema = z.object({
  title: z.string()
    .min(1, 'Window title cannot be empty')
    .max(200, 'Window title too long')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid characters in window title'),
  exact: z.boolean().optional().default(false)
});

// File system request schema
const FileSystemSchema = z.object({
  path: z.string()
    .min(1, 'Path cannot be empty')
    .max(260, 'Path too long') // Windows MAX_PATH
    .refine(path => !path.includes('..'), 'Path traversal not allowed')
    .refine(path => !path.match(/[<>:"|?*]/), 'Invalid path characters'),
  content: z.string().optional(),
  encoding: z.enum(['utf8', 'utf16le', 'base64']).optional().default('utf8')
});

// System command schema
const SystemCommandSchema = z.object({
  command: z.string()
    .min(1, 'Command cannot be empty')
    .max(500, 'Command too long')
    .refine(cmd => !cmd.includes('&'), 'Command chaining not allowed')
    .refine(cmd => !cmd.includes('|'), 'Pipe operations not allowed'),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeout: z.number().min(1).max(300).optional().default(30) // 30 second timeout
});
```

### Path Sanitization
```typescript
class PathSanitizer {
  private static readonly DANGEROUS_PATHS = [
    'c:\\windows\\system32',
    'c:\\windows\\syswow64',
    'c:\\program files',
    'c:\\program files (x86)',
    '%systemroot%',
    '%windir%'
  ];
  
  static sanitizePath(inputPath: string): string {
    // Normalize path separators
    let path = inputPath.replace(/\//g, '\\');
    
    // Remove double backslashes
    path = path.replace(/\\+/g, '\\');
    
    // Remove leading/trailing whitespace
    path = path.trim();
    
    // Resolve relative paths
    path = require('path').resolve(path);
    
    return path;
  }
  
  static isPathAllowed(path: string, allowedPaths: string[]): boolean {
    const normalizedPath = this.sanitizePath(path).toLowerCase();
    
    // Check against dangerous paths
    if (this.DANGEROUS_PATHS.some(dangerous => 
      normalizedPath.startsWith(dangerous.toLowerCase())
    )) {
      return false;
    }
    
    // Check against allowed paths
    return allowedPaths.some(allowed => 
      normalizedPath.startsWith(this.sanitizePath(allowed).toLowerCase())
    );
  }
}
```

### Command Sanitization
```typescript
class CommandSanitizer {
  private static readonly DANGEROUS_COMMANDS = [
    'format', 'del', 'rmdir', 'rd', 'erase',
    'shutdown', 'restart', 'reboot',
    'reg', 'regedit', 'regsvr32',
    'net', 'sc', 'taskkill',
    'powershell', 'cmd', 'wmic'
  ];
  
  private static readonly ALLOWED_COMMANDS = [
    'notepad', 'calc', 'mspaint',
    'explorer', 'tasklist', 'dir',
    'type', 'echo', 'findstr'
  ];
  
  static sanitizeCommand(command: string): string {
    // Remove potential injection characters
    const sanitized = command
      .replace(/[;&|`$(){}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return sanitized;
  }
  
  static isCommandAllowed(command: string): boolean {
    const baseCommand = command.split(' ')[0].toLowerCase();
    
    // Check against dangerous commands
    if (this.DANGEROUS_COMMANDS.includes(baseCommand)) {
      return false;
    }
    
    // Check against allowed commands (if whitelist mode)
    if (process.env.MCP_COMMAND_WHITELIST === 'true') {
      return this.ALLOWED_COMMANDS.includes(baseCommand);
    }
    
    return true;
  }
}
```

## Rate Limiting & Abuse Prevention

### Rate Limiting Implementation
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

class RateLimitManager {
  private limiters = new Map<string, RateLimiterMemory>();
  
  constructor() {
    // Global rate limiter
    this.limiters.set('global', new RateLimiterMemory({
      keyPrefix: 'global',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60 // Block for 60 seconds if exceeded
    }));
    
    // Per-token rate limiter
    this.limiters.set('token', new RateLimiterMemory({
      keyPrefix: 'token',
      points: 50,
      duration: 60,
      blockDuration: 300 // Block for 5 minutes
    }));
    
    // Expensive operations limiter
    this.limiters.set('expensive', new RateLimiterMemory({
      keyPrefix: 'expensive',
      points: 10,
      duration: 60,
      blockDuration: 600 // Block for 10 minutes
    }));
  }
  
  async checkRateLimit(
    type: 'global' | 'token' | 'expensive',
    key: string
  ): Promise<void> {
    const limiter = this.limiters.get(type);
    if (!limiter) return;
    
    try {
      await limiter.consume(key);
    } catch (rejRes) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds`);
    }
  }
}
```

### Resource Monitoring
```typescript
class ResourceMonitor {
  private cpuUsage = 0;
  private memoryUsage = 0;
  private activeConnections = 0;
  private commandQueue = 0;
  
  async checkResourceLimits(): Promise<void> {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();
    
    // Check CPU usage (simplified)
    if (this.cpuUsage > 80) {
      throw new Error('Server CPU usage too high');
    }
    
    // Check memory usage
    if (memory.heapUsed > 500 * 1024 * 1024) { // 500MB
      throw new Error('Server memory usage too high');
    }
    
    // Check active connections
    if (this.activeConnections > 50) {
      throw new Error('Too many active connections');
    }
    
    // Check command queue
    if (this.commandQueue > 100) {
      throw new Error('Command queue full');
    }
  }
}
```

## Audit Logging & Monitoring

### Comprehensive Audit Logging
```typescript
interface AuditLogEntry {
  timestamp: Date;
  requestId: string;
  tokenId: string;
  clientIp: string;
  userAgent?: string;
  operation: {
    plugin: string;
    action: string;
    params: any;
  };
  result: {
    success: boolean;
    error?: string;
    duration: number;
  };
  security: {
    rateLimited: boolean;
    permissionChecked: boolean;
    pathSanitized: boolean;
  };
}

class AuditLogger {
  private logStream: WriteStream;
  
  constructor(logPath: string) {
    this.logStream = createWriteStream(logPath, { flags: 'a' });
  }
  
  async logOperation(entry: AuditLogEntry): Promise<void> {
    const logLine = JSON.stringify(entry) + '\n';
    
    // Write to file
    this.logStream.write(logLine);
    
    // Send to security monitoring if configured
    if (process.env.MCP_SECURITY_WEBHOOK) {
      await this.sendToSecurityMonitoring(entry);
    }
    
    // Alert on suspicious activity
    if (this.isSuspiciousActivity(entry)) {
      await this.alertSuspiciousActivity(entry);
    }
  }
  
  private isSuspiciousActivity(entry: AuditLogEntry): boolean {
    // Multiple failed authentication attempts
    if (!entry.result.success && entry.operation.action === 'authenticate') {
      return true;
    }
    
    // Rapid-fire requests
    if (entry.security.rateLimited) {
      return true;
    }
    
    // Attempts to access restricted paths
    if (entry.operation.plugin === 'filesystem' && 
        entry.operation.params.path?.includes('system32')) {
      return true;
    }
    
    return false;
  }
}
```

### Security Metrics
```typescript
class SecurityMetrics {
  private metrics = {
    totalRequests: 0,
    failedAuthentications: 0,
    rateLimitHits: 0,
    permissionDenials: 0,
    suspiciousActivities: 0,
    fileAccessAttempts: 0,
    systemCommandExecutions: 0
  };
  
  incrementMetric(metric: keyof typeof this.metrics): void {
    this.metrics[metric]++;
  }
  
  getSecurityReport(): SecurityReport {
    const now = new Date();
    const period = 24 * 60 * 60 * 1000; // 24 hours
    
    return {
      timestamp: now,
      period: '24h',
      metrics: { ...this.metrics },
      alerts: this.generateAlerts(),
      recommendations: this.generateRecommendations()
    };
  }
  
  private generateAlerts(): string[] {
    const alerts: string[] = [];
    
    if (this.metrics.failedAuthentications > 10) {
      alerts.push('High number of failed authentication attempts');
    }
    
    if (this.metrics.rateLimitHits > 50) {
      alerts.push('High number of rate limit violations');
    }
    
    if (this.metrics.suspiciousActivities > 5) {
      alerts.push('Multiple suspicious activities detected');
    }
    
    return alerts;
  }
}
```

## Secure Configuration

### Configuration Schema
```typescript
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().min(1024).max(65535).default(7700),
    host: z.string().default('127.0.0.1'),
    tls: z.object({
      enabled: z.boolean().default(false),
      cert: z.string().optional(),
      key: z.string().optional()
    }).optional()
  }),
  security: z.object({
    tokenFile: z.string().default('~/.mcp-token'),
    tokenExpiry: z.number().default(24 * 60 * 60 * 1000), // 24 hours
    maxTokens: z.number().default(10),
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      requestsPerMinute: z.number().default(100),
      burstLimit: z.number().default(200)
    }),
    allowedPaths: z.array(z.string()).default([
      '~/Documents',
      '~/Desktop',
      'C:\\temp'
    ]),
    blockedCommands: z.array(z.string()).default([
      'format', 'shutdown', 'reboot', 'del'
    ])
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    auditLog: z.string().default('~/.mcp-audit.log'),
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    maxFiles: z.number().default(5)
  })
});
```

### Environment Variables
```bash
# Security settings
MCP_TOKEN_FILE=~/.mcp-token
MCP_TOKEN_EXPIRY=86400000
MCP_MAX_TOKENS=10
MCP_RATE_LIMIT_ENABLED=true
MCP_RATE_LIMIT_RPM=100

# Network settings
MCP_HOST=127.0.0.1
MCP_PORT=7700
MCP_TLS_ENABLED=false
MCP_TLS_CERT_PATH=
MCP_TLS_KEY_PATH=

# File system security
MCP_ALLOWED_PATHS=~/Documents,~/Desktop,C:\temp
MCP_BLOCKED_COMMANDS=format,shutdown,reboot,del
MCP_COMMAND_WHITELIST=false

# Logging
MCP_LOG_LEVEL=info
MCP_AUDIT_LOG=~/.mcp-audit.log
MCP_SECURITY_WEBHOOK=

# Monitoring
MCP_METRICS_ENABLED=true
MCP_HEALTH_CHECK_INTERVAL=30000
```

## Incident Response

### Security Incident Detection
```typescript
class IncidentDetector {
  private readonly INCIDENT_PATTERNS = [
    {
      name: 'Brute Force Attack',
      pattern: /failed authentication/gi,
      threshold: 5,
      timeWindow: 60000 // 1 minute
    },
    {
      name: 'Path Traversal Attempt',
      pattern: /\.\./g,
      threshold: 1,
      timeWindow: 1000
    },
    {
      name: 'Command Injection Attempt',
      pattern: /[;&|`$()]/g,
      threshold: 1,
      timeWindow: 1000
    }
  ];
  
  async detectIncident(logEntry: AuditLogEntry): Promise<SecurityIncident | null> {
    for (const pattern of this.INCIDENT_PATTERNS) {
      if (this.matchesPattern(logEntry, pattern)) {
        return {
          type: pattern.name,
          timestamp: new Date(),
          severity: this.calculateSeverity(pattern.name),
          details: logEntry,
          recommendations: this.getRecommendations(pattern.name)
        };
      }
    }
    
    return null;
  }
  
  private getRecommendations(incidentType: string): string[] {
    const recommendations = {
      'Brute Force Attack': [
        'Temporarily block the source IP',
        'Increase token expiry time',
        'Enable additional authentication factors'
      ],
      'Path Traversal Attempt': [
        'Review and restrict allowed paths',
        'Implement stricter path validation',
        'Monitor file system access patterns'
      ],
      'Command Injection Attempt': [
        'Review command whitelist',
        'Implement stricter input validation',
        'Consider disabling system command execution'
      ]
    };
    
    return recommendations[incidentType] || ['Review security logs', 'Update security policies'];
  }
}
```

### Automated Response
```typescript
class IncidentResponse {
  async respondToIncident(incident: SecurityIncident): Promise<void> {
    // Log the incident
    await this.logIncident(incident);
    
    // Automatic actions based on severity
    switch (incident.severity) {
      case 'critical':
        await this.shutdownServer();
        await this.notifyAdministrators(incident);
        break;
        
      case 'high':
        await this.blockSuspiciousToken(incident.details.tokenId);
        await this.notifyAdministrators(incident);
        break;
        
      case 'medium':
        await this.increaseRateLimiting();
        await this.logSecurityEvent(incident);
        break;
        
      case 'low':
        await this.logSecurityEvent(incident);
        break;
    }
  }
  
  private async blockSuspiciousToken(tokenId: string): Promise<void> {
    // Add token to blocklist
    await this.tokenManager.revokeToken(tokenId);
    
    // Log the action
    console.warn(`Token ${tokenId} has been revoked due to suspicious activity`);
  }
}
```

## Security Testing

### Penetration Testing Scenarios
```typescript
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without tokens', async () => {
      const response = await request(app)
        .post('/api/window/focus')
        .send({ title: 'Test' });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .post('/api/window/focus')
        .set('Authorization', 'Bearer invalid-token')
        .send({ title: 'Test' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Input Validation', () => {
    it('should reject path traversal attempts', async () => {
      const response = await request(app)
        .post('/api/filesystem/read')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ path: '../../../windows/system32/config/sam' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Path traversal');
    });
    
    it('should reject command injection attempts', async () => {
      const response = await request(app)
        .post('/api/system/exec')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ command: 'dir; shutdown /s /t 0' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid command');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(101).fill(null).map(() =>
        request(app)
          .post('/api/window/list')
          .set('Authorization', `Bearer ${validToken}`)
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

## Security Checklist

### Pre-deployment Security Review

✅ **Authentication & Authorization**
- [ ] Token generation uses cryptographically secure random numbers
- [ ] Tokens have appropriate expiration times
- [ ] Permission system is properly implemented
- [ ] Authorization checks are performed on all endpoints

✅ **Input Validation**
- [ ] All inputs are validated using Zod schemas
- [ ] Path traversal protection is implemented
- [ ] Command injection prevention is in place
- [ ] SQL injection protection (if applicable)

✅ **Rate Limiting**
- [ ] Global rate limiting is configured
- [ ] Per-token rate limiting is implemented
- [ ] Expensive operations have additional limits
- [ ] Rate limit headers are returned

✅ **Logging & Monitoring**
- [ ] Comprehensive audit logging is implemented
- [ ] Security events are properly logged
- [ ] Log rotation is configured
- [ ] Monitoring alerts are set up

✅ **Configuration Security**
- [ ] Default configuration is secure
- [ ] Sensitive data is not logged
- [ ] Environment variables are properly validated
- [ ] File permissions are restrictive

✅ **Network Security**
- [ ] Server binds to localhost only by default
- [ ] TLS is available for production use
- [ ] CORS is properly configured
- [ ] Security headers are set

✅ **Error Handling**
- [ ] Errors don't leak sensitive information
- [ ] Stack traces are not exposed in production
- [ ] Error messages are user-friendly
- [ ] Failed operations are logged

This comprehensive security framework ensures that GlassMCP operates safely while providing powerful system automation capabilities for AI agents.
