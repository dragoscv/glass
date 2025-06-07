# GlassMCP Project Plan

## 🎯 Project Overview

**GlassMCP** is a Machine Control Protocol server for Windows that enables AI
agents to control system-level operations similar to how Playwright controls
browsers. This tool will be used by GitHub Copilot Chat extension in VS Code to
issue system-level automation commands.

## 📋 Project Specifications

- **Package Name**: `@codai/mcp-server`
- **Server Port**: `localhost:7700`
- **Authentication**: Local token file (`~/.mcp-token`)
- **APIs**: REST + WebSocket
- **Platform**: Windows (with potential for cross-platform expansion)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        GlassMCP Server                     │
├─────────────────────────────────────────────────────────────┤
│  REST API          │  WebSocket API       │  OpenAPI Docs  │
│  (HTTP/HTTPS)      │  (Real-time)        │  (/docs)       │
├─────────────────────────────────────────────────────────────┤
│                    Plugin Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  Window    │  Keyboard  │  Mouse   │  System  │  Clipboard │
│  Manager   │  Control   │  Control │  Control │  Manager   │
├─────────────────────────────────────────────────────────────┤
│                   Windows Integration Layer                │
│  node-ffi-napi  │  PowerShell  │  AutoHotkey  │  NirCmd   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
glass/
├── packages/
│   ├── server/                     # Main MCP server
│   │   ├── src/
│   │   │   ├── core/              # Core server logic
│   │   │   ├── plugins/           # Control modules
│   │   │   ├── api/               # REST/WebSocket APIs
│   │   │   ├── auth/              # Authentication
│   │   │   ├── windows/           # Windows integration
│   │   │   └── types/             # TypeScript definitions
│   │   ├── tests/                 # Unit tests
│   │   └── package.json
│   ├── sdk/                       # Client SDK
│   │   ├── src/
│   │   │   ├── client.ts          # Main client class
│   │   │   ├── types.ts           # Type definitions
│   │   │   └── index.ts           # Public API
│   │   └── package.json
│   └── cli/                       # CLI tool
│       ├── src/
│       │   ├── commands/          # CLI commands
│       │   ├── playground/        # Interactive testing
│       │   └── index.ts
│       └── package.json
├── apps/
│   └── playground/                # Web-based testing interface
├── docs/                          # Documentation
├── tools/                         # Build and dev tools
├── .github/                       # CI/CD and AI instructions
└── package.json                   # Root workspace config
```

## 🔧 Core Features

### 1. Control Modules

#### Window Management

- `window.focus({ title: string })` - Focus window by title
- `window.list()` - List all windows
- `window.minimize({ title: string })` - Minimize window
- `window.maximize({ title: string })` - Maximize window
- `window.close({ title: string })` - Close window
- `window.resize({ title: string, width: number, height: number })` - Resize
  window

#### Keyboard Control

- `keyboard.type({ text: string })` - Type text
- `keyboard.press({ key: string })` - Press single key
- `keyboard.shortcut({ keys: string[] })` - Key combinations
- `keyboard.hold({ key: string })` - Hold key down
- `keyboard.release({ key: string })` - Release held key

#### Mouse Control

- `mouse.move({ x: number, y: number })` - Move cursor
- `mouse.click({ x?: number, y?: number, button?: 'left' | 'right' | 'middle' })` -
  Click
- `mouse.doubleClick({ x?: number, y?: number })` - Double click
- `mouse.drag({ from: {x: number, y: number}, to: {x: number, y: number} })` -
  Drag
- `mouse.scroll({ x?: number, y?: number, direction: 'up' | 'down' | 'left' | 'right', amount: number })` -
  Scroll

#### System Control

- `system.exec({ command: string, args?: string[], cwd?: string })` - Execute
  command
- `system.shell({ command: string, shell?: 'cmd' | 'powershell' })` - Run shell
  command
- `system.process.list()` - List running processes
- `system.process.kill({ pid: number | name: string })` - Kill process
- `system.service.start({ name: string })` - Start Windows service
- `system.service.stop({ name: string })` - Stop Windows service

#### Clipboard Operations

- `clipboard.get()` - Get clipboard content
- `clipboard.set({ text: string })` - Set clipboard text
- `clipboard.setImage({ path: string })` - Set clipboard image
- `clipboard.clear()` - Clear clipboard

#### File System Operations

- `filesystem.read({ path: string })` - Read file
- `filesystem.write({ path: string, content: string })` - Write file
- `filesystem.exists({ path: string })` - Check if file exists
- `filesystem.mkdir({ path: string })` - Create directory
- `filesystem.rmdir({ path: string })` - Remove directory
- `filesystem.copy({ from: string, to: string })` - Copy file/directory
- `filesystem.move({ from: string, to: string })` - Move file/directory
- `filesystem.delete({ path: string })` - Delete file/directory
- `filesystem.list({ path: string })` - List directory contents

### 2. Security Features

- **Token Authentication**: Local token file (`~/.mcp-token`)
- **Rate Limiting**: Prevent abuse with configurable limits
- **Command Validation**: Sanitize and validate all inputs
- **Audit Logging**: Log all commands for security review
- **Sandboxing**: Restrict file system access to configured paths
- **Permission System**: Granular permissions for different operations

### 3. API Features

- **REST API**: HTTP endpoints for all operations
- **WebSocket API**: Real-time bidirectional communication
- **OpenAPI Spec**: Auto-generated documentation at `/docs`
- **Client SDK**: Auto-generated TypeScript client
- **Error Handling**: Comprehensive error responses with codes
- **Request/Response Logging**: Detailed logging for debugging

## 🛠️ Technical Stack

### Core Technologies

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm
- **Build Tool**: tsup (esbuild-based)
- **Testing**: Vitest
- **Documentation**: OpenAPI 3.0

### Windows Integration

- **Primary**: node-ffi-napi for Windows API calls
- **Secondary**: PowerShell subprocess execution
- **Tertiary**: AutoHotkey scripts for complex input
- **Fallback**: NirCmd for various system operations

### Development Tools

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Git Hooks**: Husky with commitlint
- **Type Checking**: TypeScript strict mode
- **Testing**: Vitest with coverage reporting

## 📦 Package Configuration

### Dependencies

```json
{
  "dependencies": {
    "fastify": "^4.24.3",
    "@fastify/websocket": "^8.3.1",
    "@fastify/swagger": "^8.12.0",
    "@fastify/swagger-ui": "^2.1.0",
    "ffi-napi": "^4.0.3",
    "ref-napi": "^3.0.3",
    "node-powershell": "^5.0.1",
    "clipboardy": "^3.0.0",
    "commander": "^11.1.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.12",
    "zod": "^3.22.4",
    "pino": "^8.16.2",
    "pino-pretty": "^10.2.3"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "tsup": "^7.2.0",
    "vitest": "^0.34.6",
    "@types/node": "^20.8.10",
    "eslint": "^8.52.0",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "prettier": "^3.0.3",
    "husky": "^8.0.3",
    "commitlint": "^18.2.0",
    "@commitlint/config-conventional": "^18.1.0"
  }
}
```

## 🚀 Implementation Phases

### Phase 1: Project Setup (Week 1)

- [x] Initialize pnpm workspace
- [x] Configure TypeScript with strict settings
- [x] Set up ESLint, Prettier, Husky
- [x] Create basic project structure
- [x] Set up Vitest testing framework

### Phase 2: Core Architecture (Week 2)

- [ ] Implement plugin system architecture
- [ ] Create base server with Fastify
- [ ] Set up authentication system
- [ ] Implement OpenAPI documentation
- [ ] Create basic WebSocket support

### Phase 3: Windows Integration (Week 3)

- [ ] Set up node-ffi-napi for Windows APIs
- [ ] Create PowerShell integration layer
- [ ] Implement AutoHotkey script execution
- [ ] Add NirCmd fallback support
- [ ] Create Windows API type definitions

### Phase 4: Control Modules (Week 4-5)

- [ ] Implement window management
- [ ] Add keyboard control
- [ ] Create mouse control
- [ ] Build system control
- [ ] Add clipboard operations
- [ ] Implement file system operations

### Phase 5: CLI and Testing (Week 6)

- [ ] Create CLI tool with commands
- [ ] Implement playground mode
- [ ] Add comprehensive unit tests
- [ ] Create integration tests
- [ ] Set up E2E testing

### Phase 6: SDK and Documentation (Week 7)

- [ ] Generate client SDK
- [ ] Create comprehensive documentation
- [ ] Add usage examples
- [ ] Write security guidelines
- [ ] Create integration guides

### Phase 7: Publishing and CI/CD (Week 8)

- [ ] Set up GitHub Actions
- [ ] Configure NPM publishing
- [ ] Add automated testing
- [ ] Create release workflow
- [ ] Set up monitoring

## 🧪 Testing Strategy

### Unit Tests

- All control modules
- Authentication system
- API endpoints
- Error handling
- Validation logic

### Integration Tests

- Full API workflows
- Plugin system integration
- Windows API integration
- WebSocket communication
- File system operations

### E2E Tests

- CLI functionality
- Complete user workflows
- Error scenarios
- Performance testing
- Security testing

### Test Coverage Goals

- **Unit Tests**: 90% coverage
- **Integration Tests**: 80% coverage
- **E2E Tests**: Critical paths covered
- **Security Tests**: All auth flows

## 🔒 Security Considerations

### Authentication

- Local token file with secure generation
- Token rotation capabilities
- Request signature validation
- Rate limiting per token

### Input Validation

- Zod schemas for all inputs
- Path traversal prevention
- Command injection prevention
- SQL injection prevention (if applicable)

### System Access

- Configurable file system restrictions
- Process execution sandboxing
- Network access limitations
- Registry access controls

### Audit and Logging

- All commands logged with timestamps
- User agent and source tracking
- Failed authentication attempts
- System resource usage monitoring

## 📊 Performance Requirements

### Response Times

- **Simple Commands**: < 100ms
- **Complex Commands**: < 500ms
- **File Operations**: < 1s
- **System Commands**: < 2s

### Resource Usage

- **Memory**: < 100MB idle, < 500MB active
- **CPU**: < 5% idle, < 25% active
- **Disk**: Minimal temporary files
- **Network**: Local only, no external calls

### Scalability

- Support for 10+ concurrent connections
- Queue system for command execution
- Graceful degradation under load
- Resource cleanup and garbage collection

## 🌟 Future Enhancements

### Cross-Platform Support

- macOS implementation
- Linux implementation
- Unified API across platforms
- Platform-specific optimizations

### Advanced Features

- Screen capture and OCR
- Image recognition and clicking
- Advanced window management
- System monitoring and alerts
- Plugin marketplace

### Integration Improvements

- Visual Studio Code extension
- GitHub Actions integration
- Docker containerization
- Cloud deployment options

## 📈 Success Metrics

### Functionality

- All core commands implemented and tested
- 99.9% API uptime
- < 0.1% error rate
- Full TypeScript type coverage

### Usability

- Complete documentation
- Working examples
- CLI playground functional
- SDK generated and tested

### Security

- No security vulnerabilities
- Proper authentication
- Audit logging functional
- Rate limiting effective

### Performance

- All response time targets met
- Resource usage within limits
- Stress testing passed
- Memory leaks resolved

## 🎯 Ready for GitHub Copilot Integration

The project will be designed specifically for GitHub Copilot Chat integration:

1. **NPX Execution**: `npx @codai/mcp-server` to start
2. **Copilot Commands**: Natural language to API translation
3. **Safety First**: Secure by default with user confirmation
4. **Rich Feedback**: Detailed responses for AI context
5. **Example Integrations**: Pre-built Copilot workflows

This comprehensive plan ensures GlassMCP will be a robust, secure, and
extensible system control platform for AI agents.
