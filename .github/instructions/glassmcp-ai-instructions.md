---
applyTo: "**"
---

# GlassMCP AI Agent Instructions

This document provides specific instructions for AI agents (GitHub Copilot, Claude, etc.) when working with the GlassMCP server project.

## Project Context

GlassMCP is a Machine Control Protocol server that enables AI agents to control Windows system operations through a secure REST/WebSocket API. It serves as the OS-level equivalent of Playwright for browsers.

## Key Technologies

- **TypeScript**: Strict type checking enabled
- **Node.js**: Version 18+ required
- **pnpm**: Package manager and workspace tool
- **Fastify**: Web framework for REST/WebSocket APIs
- **Vitest**: Testing framework
- **tsup**: Build tool based on esbuild
- **node-ffi-napi**: Windows API integration

## Project Structure

```
glass/
├── packages/
│   ├── server/           # Main MCP server
│   ├── sdk/             # Client SDK
│   └── cli/             # CLI tool
├── apps/
│   └── playground/      # Testing playground
├── docs/                # Documentation
└── .github/             # CI/CD and instructions
```

## Core Modules

### 1. Window Control (`packages/server/src/plugins/window/`)
- Focus windows by title or handle
- List all visible windows
- Resize, minimize, maximize, close operations
- Multi-monitor support

### 2. Keyboard Control (`packages/server/src/plugins/keyboard/`)
- Text input simulation
- Key press and release
- Keyboard shortcuts and combinations
- Special key handling (function keys, etc.)

### 3. Mouse Control (`packages/server/src/plugins/mouse/`)
- Cursor movement and positioning
- Click operations (left, right, middle)
- Drag and drop operations
- Scroll wheel simulation

### 4. System Control (`packages/server/src/plugins/system/`)
- Process execution and management
- PowerShell command execution
- Service start/stop operations
- System information retrieval

### 5. Clipboard Operations (`packages/server/src/plugins/clipboard/`)
- Get/set text content
- Image content handling
- Clear clipboard operations
- Format detection

### 6. File System (`packages/server/src/plugins/filesystem/`)
- File read/write operations
- Directory operations
- Path validation and security
- Permission checking

## Security Guidelines

### Authentication
- All API calls require Bearer token authentication
- Token stored in local file (`~/.mcp-token`)
- Token validation on every request
- Rate limiting per token

### Input Validation
- Use Zod schemas for all input validation
- Sanitize file paths to prevent traversal attacks
- Validate command parameters before execution
- Escape special characters in system commands

### Access Control
- Implement configurable path restrictions for file operations
- Sandbox system command execution
- Log all operations for audit trail
- Implement permission levels for different operations

## API Design Patterns

### Request/Response Format
```typescript
// Request
interface ApiRequest<T = unknown> {
  id?: string;
  timestamp?: number;
  data: T;
}

// Response
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}
```

### Error Handling
```typescript
// Standard error codes
enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### Plugin Interface
```typescript
interface MCPPlugin {
  name: string;
  version: string;
  enabled: boolean;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  handleCommand(command: string, params: unknown): Promise<unknown>;
}
```

## Development Guidelines

### Code Style
- Use strict TypeScript configuration
- Prefer async/await over Promises
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Follow conventional commit messages

### Testing Strategy
- Unit tests for all plugin functions
- Integration tests for API endpoints
- Mock Windows APIs in test environment
- E2E tests for complete workflows
- Performance tests for critical operations

### Error Handling
- Always wrap Windows API calls in try-catch
- Provide meaningful error messages
- Log errors with context information
- Implement retry logic for transient failures
- Graceful degradation when possible

## Windows Integration

### FFI Usage
```typescript
import ffi from 'ffi-napi';
import ref from 'ref-napi';

const user32 = ffi.Library('user32', {
  'FindWindowW': ['pointer', ['pointer', 'pointer']],
  'SetForegroundWindow': ['bool', ['pointer']],
  'GetWindowTextW': ['int', ['pointer', 'pointer', 'int']]
});
```

### PowerShell Integration
```typescript
import { PowerShell } from 'node-powershell';

const ps = new PowerShell({
  executionPolicy: 'Bypass',
  noProfile: true
});
```

### Error Handling for Windows APIs
```typescript
async function safeWindowsApiCall<T>(
  operation: () => T,
  fallback?: () => T
): Promise<T> {
  try {
    return operation();
  } catch (error) {
    if (fallback) {
      return fallback();
    }
    throw new MCPError(ErrorCode.SYSTEM_ERROR, 'Windows API call failed', error);
  }
}
```

## Performance Optimization

### Caching Strategy
- Cache window handles and titles
- Implement command result caching where appropriate
- Use memory-efficient data structures
- Clean up resources promptly

### Async Operations
- Make all operations non-blocking
- Use worker threads for CPU-intensive tasks
- Implement timeout mechanisms
- Provide progress updates for long operations

### Resource Management
- Monitor memory usage
- Clean up native resources
- Implement connection pooling
- Use graceful shutdown procedures

## Testing Guidelines

### Unit Tests
```typescript
import { describe, it, expect, vi } from 'vitest';
import { WindowPlugin } from '../src/plugins/window';

describe('WindowPlugin', () => {
  it('should focus window by title', async () => {
    const plugin = new WindowPlugin();
    const mockFindWindow = vi.fn().mockReturnValue(123);
    
    // Mock Windows API calls
    vi.mock('ffi-napi', () => ({
      Library: () => ({
        FindWindowW: mockFindWindow
      })
    }));
    
    await plugin.focusWindow({ title: 'Test Window' });
    expect(mockFindWindow).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

describe('API Integration', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });
  
  it('should authenticate with valid token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/window/focus',
      headers: {
        authorization: 'Bearer valid-token'
      },
      payload: { title: 'Test' }
    });
    
    expect(response.statusCode).toBe(200);
  });
});
```

## CLI Development

### Command Structure
```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('mcp-server')
  .description('GlassMCP Server CLI')
  .version('1.0.0');

program
  .command('start')
  .description('Start the MCP server')
  .option('-p, --port <port>', 'server port', '7700')
  .option('-t, --token-file <file>', 'token file path', '~/.mcp-token')
  .action(async (options) => {
    // Implementation
  });
```

### Playground Mode
```typescript
import inquirer from 'inquirer';

async function playgroundMode() {
  while (true) {
    const { command } = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'Select command to test:',
        choices: [
          'Window Focus',
          'Type Text',
          'Mouse Click',
          'System Command',
          'Exit'
        ]
      }
    ]);
    
    if (command === 'Exit') break;
    
    await executePlaygroundCommand(command);
  }
}
```

## GitHub Copilot Integration

### Command Parsing
When integrating with GitHub Copilot, parse natural language commands into API calls:

```typescript
// Example: "focus the Calculator window"
const parseCommand = (input: string): ApiCommand => {
  if (input.includes('focus') && input.includes('window')) {
    const titleMatch = input.match(/focus.*?(?:window|app)\s+["']?([^"']+)["']?/i);
    if (titleMatch) {
      return {
        plugin: 'window',
        action: 'focus',
        params: { title: titleMatch[1] }
      };
    }
  }
  // Add more parsing logic...
};
```

### Response Formatting
Format responses for Copilot context:

```typescript
const formatResponse = (result: ApiResponse): string => {
  if (result.success) {
    return `✅ Command executed successfully: ${result.data}`;
  } else {
    return `❌ Command failed: ${result.error?.message}`;
  }
};
```

## Deployment and Publishing

### NPM Package Structure
```json
{
  "name": "@codai/mcp-server",
  "version": "1.0.0",
  "bin": {
    "mcp-server": "./dist/cli/index.js"
  },
  "main": "./dist/server/index.js",
  "types": "./dist/server/index.d.ts",
  "exports": {
    ".": "./dist/server/index.js",
    "./sdk": "./dist/sdk/index.js"
  }
}
```

### CI/CD Pipeline
- Run tests on all pushes
- Build and publish on version tags
- Generate and upload OpenAPI specs
- Create GitHub releases with changelogs

## Troubleshooting Guide

### Common Issues
1. **Windows API Access**: Ensure Node.js is running with appropriate permissions
2. **Token Authentication**: Verify token file exists and is readable
3. **Port Conflicts**: Check if port 7700 is available
4. **PowerShell Policies**: May need to adjust execution policies

### Debug Logging
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

logger.debug('Windows API call', { function: 'FindWindowW', params: [title] });
```

## Best Practices Summary

✅ **Do:**
- Always validate inputs with Zod schemas
- Use TypeScript strict mode
- Implement comprehensive error handling
- Log all operations for debugging
- Test on multiple Windows versions
- Follow security best practices
- Use async/await consistently
- Document all public APIs

❌ **Don't:**
- Execute untrusted system commands
- Skip input validation
- Ignore Windows API errors
- Use synchronous operations
- Hardcode file paths
- Expose sensitive information in logs
- Skip authentication checks
- Leave resources uncleaned

This document should guide AI agents in understanding and working effectively with the GlassMCP codebase while maintaining security, performance, and code quality standards.
