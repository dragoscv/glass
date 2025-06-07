---
applyTo: '**'
---

# Testing Strategy for GlassMCP

This document outlines the comprehensive testing strategy for the GlassMCP
server project, covering unit tests, integration tests, security tests, and
end-to-end testing scenarios.

## Testing Framework & Tools

### Primary Testing Stack

- **Test Runner**: Vitest (fast, ESM-native, TypeScript support)
- **Assertion Library**: Built-in Vitest assertions + custom matchers
- **Mocking**: Vitest mocks + manual mocks for Windows APIs
- **Coverage**: c8 (built into Vitest)
- **E2E Testing**: Custom test harness + real Windows API interactions

### Additional Tools

- **Supertest**: HTTP endpoint testing
- **MSW**: API mocking for integration tests
- **Playwright**: Browser automation for testing web interfaces
- **Docker**: Isolated testing environments
- **Testcontainers**: Database and service testing

## Test Structure & Organization

### Directory Structure

```
packages/
├── server/
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── window/
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── window.unit.test.ts
│   │   │   │       ├── window.integration.test.ts
│   │   │   │       └── window.security.test.ts
│   │   │   └── keyboard/
│   │   ├── api/
│   │   │   └── __tests__/
│   │   └── core/
│   │       └── __tests__/
│   ├── tests/
│   │   ├── fixtures/          # Test data and fixtures
│   │   ├── mocks/            # Mock implementations
│   │   ├── helpers/          # Test utilities
│   │   ├── integration/      # Cross-module integration tests
│   │   ├── security/         # Security-specific tests
│   │   └── e2e/             # End-to-end test scenarios
└── cli/
    └── tests/
```

### Test Categories

#### 1. Unit Tests (`*.unit.test.ts`)

- Test individual functions and methods in isolation
- Mock all external dependencies
- Fast execution (< 1ms per test)
- 90%+ code coverage target

#### 2. Integration Tests (`*.integration.test.ts`)

- Test module interactions and API endpoints
- Use real implementations where safe
- Mock only external system dependencies
- Medium execution time (< 100ms per test)

#### 3. Security Tests (`*.security.test.ts`)

- Test authentication, authorization, input validation
- Simulate attack scenarios
- Verify security controls are effective
- Include penetration testing scenarios

#### 4. E2E Tests (`*.e2e.test.ts`)

- Test complete user workflows
- Use real Windows APIs in controlled environment
- Test CLI and server integration
- Slower execution (< 10s per test)

## Mock Strategy for Windows APIs

### FFI Mock Implementation

```typescript
// tests/mocks/windows-api.ts
export class MockWindowsAPI {
  private windows = new Map<number, WindowInfo>();
  private nextHandle = 1001;

  constructor() {
    // Seed with common test windows
    this.addWindow('Calculator', 'CalcFrame');
    this.addWindow('Notepad', 'Notepad');
    this.addWindow('Visual Studio Code', 'Chrome_WidgetWin_1');
  }

  addWindow(title: string, className: string): number {
    const handle = this.nextHandle++;
    this.windows.set(handle, {
      handle,
      title,
      className,
      visible: true,
      x: 100,
      y: 100,
      width: 800,
      height: 600,
    });
    return handle;
  }

  removeWindow(handle: number): void {
    this.windows.delete(handle);
  }

  // Mock FindWindow
  findWindow(className: string | null, windowName: string | null): number {
    for (const [handle, info] of this.windows) {
      if (className && info.className !== className) continue;
      if (windowName && !info.title.includes(windowName)) continue;
      return handle;
    }
    return 0; // NULL handle
  }

  // Mock SetForegroundWindow
  setForegroundWindow(handle: number): boolean {
    return this.windows.has(handle);
  }

  // Mock GetWindowText
  getWindowText(handle: number): string {
    const window = this.windows.get(handle);
    return window?.title || '';
  }
}

// Mock FFI library
export const mockUser32 = {
  FindWindowW: vi.fn(),
  SetForegroundWindow: vi.fn(),
  GetWindowTextW: vi.fn(),
  ShowWindow: vi.fn(),
  SetWindowPos: vi.fn(),
  GetWindowRect: vi.fn(),
};

// Setup function for tests
export function setupWindowsAPIMocks(): MockWindowsAPI {
  const mockAPI = new MockWindowsAPI();

  mockUser32.FindWindowW.mockImplementation((className, windowName) => {
    const classStr = className
      ? Buffer.from(className, 'utf16le').toString()
      : null;
    const nameStr = windowName
      ? Buffer.from(windowName, 'utf16le').toString()
      : null;
    return mockAPI.findWindow(classStr, nameStr);
  });

  mockUser32.SetForegroundWindow.mockImplementation(handle => {
    return mockAPI.setForegroundWindow(handle);
  });

  mockUser32.GetWindowTextW.mockImplementation((handle, buffer, length) => {
    const text = mockAPI.getWindowText(handle);
    if (text && buffer) {
      const utf16Text = Buffer.from(text, 'utf16le');
      utf16Text.copy(buffer, 0, 0, Math.min(utf16Text.length, length * 2));
      return text.length;
    }
    return 0;
  });

  return mockAPI;
}
```

### PowerShell Mock Implementation

```typescript
// tests/mocks/powershell.ts
export class MockPowerShell {
  private commandHistory: PowerShellCommand[] = [];
  private responses = new Map<string, any>();

  setMockResponse(command: string, response: any): void {
    this.responses.set(command.toLowerCase().trim(), response);
  }

  async invoke(command: string): Promise<any> {
    this.commandHistory.push({
      command,
      timestamp: new Date(),
      success: true,
    });

    const mockResponse = this.responses.get(command.toLowerCase().trim());
    if (mockResponse) {
      return mockResponse;
    }

    // Default responses for common commands
    if (command.includes('Get-Process')) {
      return this.getMockProcessList();
    }

    if (command.includes('Get-Date')) {
      return new Date().toISOString();
    }

    return { output: `Mock response for: ${command}` };
  }

  private getMockProcessList(): ProcessInfo[] {
    return [
      { name: 'notepad', id: 1234, cpu: 0.1, memory: 15360 },
      { name: 'calculator', id: 5678, cpu: 0.0, memory: 8192 },
      { name: 'code', id: 9012, cpu: 2.5, memory: 204800 },
    ];
  }

  getCommandHistory(): PowerShellCommand[] {
    return [...this.commandHistory];
  }
}
```

## Unit Test Examples

### Window Plugin Tests

```typescript
// packages/server/src/plugins/window/__tests__/window.unit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WindowPlugin } from '../index';
import {
  setupWindowsAPIMocks,
  MockWindowsAPI,
} from '../../../tests/mocks/windows-api';

describe('WindowPlugin', () => {
  let plugin: WindowPlugin;
  let mockAPI: MockWindowsAPI;

  beforeEach(() => {
    mockAPI = setupWindowsAPIMocks();
    plugin = new WindowPlugin();
  });

  describe('focusWindow', () => {
    it('should focus window by exact title match', async () => {
      // Arrange
      const expectedHandle = mockAPI.addWindow('Calculator', 'CalcFrame');

      // Act
      const result = await plugin.focusWindow({
        title: 'Calculator',
        exact: true,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.windowHandle).toBe(expectedHandle);
      expect(mockUser32.SetForegroundWindow).toHaveBeenCalledWith(
        expectedHandle
      );
    });

    it('should focus window by partial title match', async () => {
      // Arrange
      mockAPI.addWindow('Microsoft Visual Studio Code', 'Chrome_WidgetWin_1');

      // Act
      const result = await plugin.focusWindow({
        title: 'Visual Studio',
        exact: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockUser32.SetForegroundWindow).toHaveBeenCalled();
    });

    it('should return error when window not found', async () => {
      // Act
      const result = await plugin.focusWindow({ title: 'NonExistent Window' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Window not found');
      expect(mockUser32.SetForegroundWindow).not.toHaveBeenCalled();
    });

    it('should handle Windows API errors gracefully', async () => {
      // Arrange
      const handle = mockAPI.addWindow('Test Window', 'TestClass');
      mockUser32.SetForegroundWindow.mockReturnValue(false);

      // Act
      const result = await plugin.focusWindow({ title: 'Test Window' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to focus window');
    });
  });

  describe('listWindows', () => {
    it('should return all visible windows', async () => {
      // Arrange
      mockAPI.addWindow('Window 1', 'Class1');
      mockAPI.addWindow('Window 2', 'Class2');
      mockAPI.addWindow('Window 3', 'Class3');

      // Act
      const result = await plugin.listWindows();

      // Assert
      expect(result.success).toBe(true);
      expect(result.windows).toHaveLength(6); // 3 added + 3 default
      expect(result.windows.some(w => w.title === 'Window 1')).toBe(true);
    });

    it('should filter windows by title pattern', async () => {
      // Arrange
      mockAPI.addWindow('Chrome - Tab 1', 'Chrome_WidgetWin_1');
      mockAPI.addWindow('Chrome - Tab 2', 'Chrome_WidgetWin_1');
      mockAPI.addWindow('Firefox - Tab 1', 'MozillaWindowClass');

      // Act
      const result = await plugin.listWindows({ titlePattern: 'Chrome' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.windows).toHaveLength(2);
      expect(result.windows.every(w => w.title.includes('Chrome'))).toBe(true);
    });
  });
});
```

### Keyboard Plugin Tests

```typescript
// packages/server/src/plugins/keyboard/__tests__/keyboard.unit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardPlugin } from '../index';
import { setupKeyboardMocks } from '../../../tests/mocks/keyboard';

describe('KeyboardPlugin', () => {
  let plugin: KeyboardPlugin;

  beforeEach(() => {
    setupKeyboardMocks();
    plugin = new KeyboardPlugin();
  });

  describe('typeText', () => {
    it('should send text input events', async () => {
      // Act
      const result = await plugin.typeText({ text: 'Hello World' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.charactersTyped).toBe(11);
    });

    it('should handle special characters', async () => {
      // Act
      const result = await plugin.typeText({ text: 'Test@123!@#' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.charactersTyped).toBe(11);
    });

    it('should validate text length limits', async () => {
      // Arrange
      const longText = 'a'.repeat(10001); // Exceeds limit

      // Act
      const result = await plugin.typeText({ text: longText });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Text too long');
    });
  });

  describe('pressKey', () => {
    it('should press single key', async () => {
      // Act
      const result = await plugin.pressKey({ key: 'Enter' });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should press key combination', async () => {
      // Act
      const result = await plugin.pressKey({ keys: ['Ctrl', 'C'] });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid key names', async () => {
      // Act
      const result = await plugin.pressKey({ key: 'InvalidKey' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid key');
    });
  });
});
```

## Integration Test Examples

### API Endpoint Tests

```typescript
// packages/server/tests/integration/api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { createTestToken } from '../helpers/auth';

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = buildApp({ testing: true });
    await app.ready();
    authToken = await createTestToken(['window:read', 'window:write']);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Window API', () => {
    it('should focus window via REST API', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/window/focus',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          title: 'Calculator',
          exact: true,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.windowHandle).toBeTypeOf('number');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/window/focus',
        payload: { title: 'Calculator' },
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it('should validate request payload', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/window/focus',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          title: '', // Invalid empty title
          exact: 'not-boolean', // Invalid type
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('validation');
    });
  });

  describe('WebSocket API', () => {
    it('should handle window commands via WebSocket', async done => {
      // Arrange
      const ws = new WebSocket(
        `ws://localhost:${app.server.address().port}/ws`
      );

      ws.onopen = () => {
        // Send authentication
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: authToken,
          })
        );

        // Send command
        ws.send(
          JSON.stringify({
            id: 'test-1',
            type: 'command',
            plugin: 'window',
            action: 'focus',
            params: { title: 'Calculator' },
          })
        );
      };

      ws.onmessage = event => {
        const message = JSON.parse(event.data);

        if (message.type === 'response' && message.id === 'test-1') {
          expect(message.success).toBe(true);
          ws.close();
          done();
        }
      };

      ws.onerror = error => {
        done(error);
      };
    });
  });
});
```

### Plugin Integration Tests

```typescript
// packages/server/tests/integration/plugin-workflow.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from '../../src/core/plugin-manager';
import { setupIntegrationMocks } from '../mocks/integration';

describe('Plugin Workflow Integration', () => {
  let pluginManager: PluginManager;

  beforeEach(async () => {
    setupIntegrationMocks();
    pluginManager = new PluginManager();
    await pluginManager.initialize();
  });

  it('should execute complex workflow: open app -> focus -> type text', async () => {
    // Step 1: Open application
    const openResult = await pluginManager.executeCommand({
      plugin: 'system',
      action: 'exec',
      params: { command: 'notepad.exe' },
    });
    expect(openResult.success).toBe(true);

    // Wait for application to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Focus the window
    const focusResult = await pluginManager.executeCommand({
      plugin: 'window',
      action: 'focus',
      params: { title: 'Notepad' },
    });
    expect(focusResult.success).toBe(true);

    // Step 3: Type text
    const typeResult = await pluginManager.executeCommand({
      plugin: 'keyboard',
      action: 'type',
      params: { text: 'Hello from GlassMCP!' },
    });
    expect(typeResult.success).toBe(true);

    // Step 4: Save file
    const saveResult = await pluginManager.executeCommand({
      plugin: 'keyboard',
      action: 'shortcut',
      params: { keys: ['Ctrl', 'S'] },
    });
    expect(saveResult.success).toBe(true);
  });

  it('should handle file operations workflow', async () => {
    const testContent = 'Test file content';
    const testPath = 'C:\\temp\\test-file.txt';

    // Create file
    const writeResult = await pluginManager.executeCommand({
      plugin: 'filesystem',
      action: 'write',
      params: { path: testPath, content: testContent },
    });
    expect(writeResult.success).toBe(true);

    // Read file back
    const readResult = await pluginManager.executeCommand({
      plugin: 'filesystem',
      action: 'read',
      params: { path: testPath },
    });
    expect(readResult.success).toBe(true);
    expect(readResult.data.content).toBe(testContent);

    // Copy to clipboard
    const clipboardResult = await pluginManager.executeCommand({
      plugin: 'clipboard',
      action: 'set',
      params: { text: readResult.data.content },
    });
    expect(clipboardResult.success).toBe(true);

    // Verify clipboard
    const getClipboardResult = await pluginManager.executeCommand({
      plugin: 'clipboard',
      action: 'get',
      params: {},
    });
    expect(getClipboardResult.success).toBe(true);
    expect(getClipboardResult.data.text).toBe(testContent);
  });
});
```

## Security Testing

### Authentication & Authorization Tests

```typescript
// packages/server/tests/security/auth.security.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TokenManager } from '../../src/auth/token-manager';
import { PermissionChecker } from '../../src/auth/permission-checker';

describe('Security - Authentication & Authorization', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      // Generate multiple tokens
      const tokens = await Promise.all([
        tokenManager.generateToken([]),
        tokenManager.generateToken([]),
        tokenManager.generateToken([]),
      ]);

      // Ensure all tokens are unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(3);

      // Ensure tokens are sufficiently long
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThanOrEqual(64);
      });
    });

    it('should reject expired tokens', async () => {
      // Create token with short expiry
      const token = await tokenManager.generateToken([], { expiresIn: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Validate token
      const validationResult = await tokenManager.validateToken(token);
      expect(validationResult).toBeNull();
    });

    it('should enforce token usage limits', async () => {
      const token = await tokenManager.generateToken([], { maxUsage: 3 });

      // Use token 3 times
      for (let i = 0; i < 3; i++) {
        const result = await tokenManager.validateToken(token);
        expect(result).toBeTruthy();
      }

      // 4th usage should fail
      const result = await tokenManager.validateToken(token);
      expect(result).toBeNull();
    });
  });

  describe('Permission Checking', () => {
    it('should enforce file system path restrictions', async () => {
      const token = await tokenManager.generateToken([
        {
          resource: 'filesystem',
          actions: ['read', 'write'],
          restrictions: {
            paths: ['C:\\temp\\', 'C:\\Users\\TestUser\\Documents\\'],
          },
        },
      ]);

      // Allowed path
      const allowedResult = await PermissionChecker.checkPermission(
        token,
        'filesystem',
        'read',
        { path: 'C:\\temp\\test.txt' }
      );
      expect(allowedResult).toBe(true);

      // Blocked path
      const blockedResult = await PermissionChecker.checkPermission(
        token,
        'filesystem',
        'read',
        { path: 'C:\\Windows\\System32\\config\\sam' }
      );
      expect(blockedResult).toBe(false);
    });

    it('should enforce command execution restrictions', async () => {
      const token = await tokenManager.generateToken([
        {
          resource: 'system',
          actions: ['exec'],
          restrictions: {
            allowedCommands: ['notepad.exe', 'calc.exe'],
          },
        },
      ]);

      // Allowed command
      const allowedResult = await PermissionChecker.checkPermission(
        token,
        'system',
        'exec',
        { command: 'notepad.exe' }
      );
      expect(allowedResult).toBe(true);

      // Blocked command
      const blockedResult = await PermissionChecker.checkPermission(
        token,
        'system',
        'exec',
        { command: 'shutdown.exe' }
      );
      expect(blockedResult).toBe(false);
    });
  });
});
```

### Input Validation Security Tests

```typescript
// packages/server/tests/security/input-validation.security.test.ts
import { describe, it, expect } from 'vitest';
import { validateWindowFocusRequest } from '../../src/api/validators';
import { validateFileSystemRequest } from '../../src/api/validators';
import { validateSystemCommandRequest } from '../../src/api/validators';

describe('Security - Input Validation', () => {
  describe('Path Traversal Prevention', () => {
    it('should reject path traversal attempts', () => {
      const maliciousPaths = [
        '../../../windows/system32/config/sam',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'C:\\temp\\..\\..\\windows\\system32\\hosts',
        '....//....//....//windows//system32//hosts',
      ];

      maliciousPaths.forEach(path => {
        expect(() => {
          validateFileSystemRequest({ path });
        }).toThrow(/path traversal/i);
      });
    });

    it('should allow legitimate paths', () => {
      const legitimatePaths = [
        'C:\\temp\\file.txt',
        'C:\\Users\\TestUser\\Documents\\report.pdf',
        'temp\\subfolder\\file.js',
      ];

      legitimatePaths.forEach(path => {
        expect(() => {
          validateFileSystemRequest({ path });
        }).not.toThrow();
      });
    });
  });

  describe('Command Injection Prevention', () => {
    it('should reject command injection attempts', () => {
      const maliciousCommands = [
        'dir; shutdown /s /t 0',
        'notepad.exe & del C:\\*.*',
        'calc.exe | echo "malicious"',
        'dir `shutdown /r /t 0`',
        'type file.txt && format C:',
        'echo $(rm -rf /)',
      ];

      maliciousCommands.forEach(command => {
        expect(() => {
          validateSystemCommandRequest({ command });
        }).toThrow(/invalid.*command/i);
      });
    });

    it('should allow safe commands', () => {
      const safeCommands = [
        'notepad.exe',
        'calc.exe',
        'dir C:\\temp',
        'type "file with spaces.txt"',
        'echo Hello World',
      ];

      safeCommands.forEach(command => {
        expect(() => {
          validateSystemCommandRequest({ command });
        }).not.toThrow();
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize window titles', () => {
      const maliciousTitles = [
        '<script>alert("xss")</script>',
        'javascript:alert(document.cookie)',
        '"><img src=x onerror=alert(1)>',
        "' OR 1=1 --",
      ];

      maliciousTitles.forEach(title => {
        expect(() => {
          validateWindowFocusRequest({ title });
        }).toThrow(/invalid.*title/i);
      });
    });
  });
});
```

## Performance Testing

### Load Testing

```typescript
// packages/server/tests/performance/load.performance.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Performance Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ testing: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 50;
    const startTime = performance.now();

    // Create concurrent requests
    const requests = Array(concurrentRequests)
      .fill(null)
      .map(() =>
        app.inject({
          method: 'GET',
          url: '/api/v1/window/list',
          headers: { authorization: `Bearer ${validToken}` },
        })
      );

    // Wait for all requests to complete
    const responses = await Promise.all(requests);
    const endTime = performance.now();

    // Verify all requests succeeded
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    // Check performance
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / concurrentRequests;

    expect(avgResponseTime).toBeLessThan(100); // < 100ms average
    expect(totalTime).toBeLessThan(5000); // < 5s total
  });

  it('should maintain memory usage under load', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Generate load
    for (let i = 0; i < 1000; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/keyboard/type',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { text: `Test message ${i}` },
      });
    }

    // Force garbage collection
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (< 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## E2E Testing

### CLI E2E Tests

```typescript
// packages/cli/tests/e2e/cli.e2e.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { promisify } from 'util';

describe('CLI E2E Tests', () => {
  it('should start server and handle commands', async () => {
    // Start server in background
    const serverProcess = spawn(
      'node',
      ['dist/cli/index.js', 'start', '--port', '7701'],
      {
        stdio: 'pipe',
      }
    );

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Test CLI commands
      const testCommand = spawn(
        'node',
        [
          'dist/cli/index.js',
          'exec',
          '--port',
          '7701',
          'window.focus',
          '{"title":"Calculator"}',
        ],
        { stdio: 'pipe' }
      );

      const output = await new Promise<string>((resolve, reject) => {
        let stdout = '';
        testCommand.stdout.on('data', data => {
          stdout += data.toString();
        });

        testCommand.on('close', code => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`CLI command failed with code ${code}`));
          }
        });
      });

      expect(output).toContain('success');
    } finally {
      // Clean up
      serverProcess.kill();
    }
  });

  it('should handle playground mode', async () => {
    const playgroundProcess = spawn(
      'node',
      ['dist/cli/index.js', 'playground', '--non-interactive'],
      { stdio: 'pipe' }
    );

    // Send test commands
    playgroundProcess.stdin.write('window.list\n');
    playgroundProcess.stdin.write('exit\n');

    const output = await new Promise<string>(resolve => {
      let stdout = '';
      playgroundProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      playgroundProcess.on('close', () => {
        resolve(stdout);
      });
    });

    expect(output).toContain('Available windows:');
  });
});
```

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
```

### Test Setup

```typescript
// tests/setup.ts
import { vi } from 'vitest';
import { setupGlobalMocks } from './mocks/global';

// Setup global test environment
beforeAll(() => {
  setupGlobalMocks();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
global.createTestTimeout = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

global.expectAsync = async (fn: () => Promise<any>) => {
  let error: Error | null = null;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  return expect(error);
};
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: windows-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration tests
        run: pnpm test:integration

      - name: Security tests
        run: pnpm test:security

      - name: E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true
```

This comprehensive testing strategy ensures that GlassMCP is thoroughly tested
across all layers, from individual functions to complete user workflows, with
special attention to security and performance requirements.
