# GlassMCP Server - Machine Control Protocol for Windows

## Overview

GlassMCP is a secure Machine Control Protocol server that enables AI agents to
control Windows system operations through a REST/WebSocket API. It serves as the
OS-level equivalent of Playwright for browsers, allowing GitHub Copilot and
other AI tools to automate system tasks safely and efficiently.

## Quick Start

### Installation

```bash
# Install globally
npm install -g @codai/mcp-server

# Or run directly
npx @codai/mcp-server
```

### Start Server

```bash
# Start with default settings
mcp-server start

# Start on custom port with token
mcp-server start --port 7700 --token-file ~/.mcp-token

# Start playground mode for testing
mcp-server playground
```

### Basic Usage

```typescript
import { MCPClient } from '@codai/mcp-server/sdk';

const client = new MCPClient({
  baseUrl: 'http://localhost:7700',
  token: 'your-token-here',
});

// Focus a window
await client.window.focus({ title: 'Visual Studio Code' });

// Type some text
await client.keyboard.type({ text: 'Hello from GlassMCP!' });

// Move mouse and click
await client.mouse.move({ x: 100, y: 200 });
await client.mouse.click();
```

## API Reference

### Window Control

```typescript
// Focus window by title
await client.window.focus({ title: 'Calculator' });

// List all windows
const windows = await client.window.list();

// Resize window
await client.window.resize({
  title: 'Notepad',
  width: 800,
  height: 600,
});
```

### Keyboard Input

```typescript
// Type text
await client.keyboard.type({ text: 'Hello World' });

// Press keys
await client.keyboard.press({ key: 'Enter' });

// Key combinations
await client.keyboard.shortcut({ keys: ['Ctrl', 'C'] });
```

### Mouse Control

```typescript
// Move cursor
await client.mouse.move({ x: 500, y: 300 });

// Click at current position
await client.mouse.click();

// Click at specific position
await client.mouse.click({ x: 100, y: 200, button: 'right' });

// Drag operation
await client.mouse.drag({
  from: { x: 100, y: 100 },
  to: { x: 200, y: 200 },
});
```

### System Operations

```typescript
// Execute command
const result = await client.system.exec({
  command: 'dir',
  args: ['C:\\'],
});

// PowerShell command
await client.system.shell({
  command: 'Get-Process | Where-Object {$_.Name -eq "notepad"}',
  shell: 'powershell',
});
```

### Clipboard Operations

```typescript
// Get clipboard content
const content = await client.clipboard.get();

// Set clipboard text
await client.clipboard.set({ text: 'Copy this text' });
```

### File System

```typescript
// Read file
const content = await client.filesystem.read({
  path: 'C:\\temp\\file.txt',
});

// Write file
await client.filesystem.write({
  path: 'C:\\temp\\output.txt',
  content: 'File content here',
});

// List directory
const files = await client.filesystem.list({
  path: 'C:\\Users\\Username\\Documents',
});
```

## Security

### Authentication

- Uses local token file (`~/.mcp-token`) for authentication
- Token auto-generated on first run
- All requests must include valid bearer token

### Safety Features

- Rate limiting to prevent abuse
- Command validation and sanitization
- Audit logging of all operations
- Configurable file system access restrictions
- Process execution sandboxing

### Security Best Practices

1. **Keep token secure** - Never commit tokens to version control
2. **Use HTTPS** - Enable TLS for production use
3. **Restrict access** - Configure firewall to allow localhost only
4. **Monitor logs** - Review audit logs regularly
5. **Update regularly** - Keep GlassMCP updated to latest version

## GitHub Copilot Integration

### Setup in VS Code

1. Install GlassMCP: `npm install -g @codai/mcp-server`
2. Start server: `mcp-server start`
3. Use in Copilot Chat: `@glassmcp focus window "Calculator"`

### Example Copilot Commands

```
# Window management
@glassmcp focus the Calculator window
@glassmcp minimize all Notepad windows
@glassmcp resize Chrome to 1024x768

# Text input
@glassmcp type "Hello World" in the active window
@glassmcp press Ctrl+S to save the file
@glassmcp copy the selected text

# System operations
@glassmcp run "notepad.exe" to open Notepad
@glassmcp list all running processes
@glassmcp execute PowerShell command "Get-Date"

# File operations
@glassmcp read the file at C:\temp\notes.txt
@glassmcp create a new file with some content
@glassmcp copy file from source to destination
```

### Custom Workflows

Create custom Copilot workflows by combining multiple operations:

```typescript
// Example: Open and setup development environment
async function setupDevEnvironment() {
  // Open VS Code
  await client.system.exec({ command: 'code', args: ['.'] });

  // Wait for window to appear
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Focus VS Code window
  await client.window.focus({ title: 'Visual Studio Code' });

  // Open terminal
  await client.keyboard.shortcut({ keys: ['Ctrl', '`'] });

  // Start development server
  await client.keyboard.type({ text: 'npm run dev' });
  await client.keyboard.press({ key: 'Enter' });
}
```

## Configuration

### Server Configuration

```json
{
  "server": {
    "port": 7700,
    "host": "localhost",
    "tokenFile": "~/.mcp-token",
    "logLevel": "info"
  },
  "security": {
    "rateLimit": {
      "windowMs": 60000,
      "max": 100
    },
    "allowedPaths": ["C:\\Users\\%USERNAME%\\Documents", "C:\\temp"]
  },
  "plugins": {
    "window": { "enabled": true },
    "keyboard": { "enabled": true },
    "mouse": { "enabled": true },
    "system": { "enabled": true, "restricted": true },
    "clipboard": { "enabled": true },
    "filesystem": { "enabled": true, "restricted": true }
  }
}
```

### Environment Variables

```bash
MCP_PORT=7700
MCP_HOST=localhost
MCP_TOKEN_FILE=~/.mcp-token
MCP_LOG_LEVEL=info
MCP_CONFIG_FILE=~/.mcp-config.json
```

## Troubleshooting

### Common Issues

**Server won't start**

- Check if port 7700 is available
- Verify Node.js version (requires 18+)
- Check firewall settings

**Authentication failures**

- Verify token file exists at `~/.mcp-token`
- Check token format (should be 64-character hex string)
- Ensure token matches between client and server

**Commands not working**

- Check Windows API permissions
- Verify PowerShell execution policy
- Review audit logs for error details

**Performance issues**

- Monitor system resource usage
- Check rate limiting configuration
- Review concurrent connection limits

### Debug Mode

```bash
# Start server with debug logging
mcp-server start --log-level debug

# View audit logs
mcp-server logs --tail

# Test connection
mcp-server status
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Submit pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/codai/glassmcp.git
cd glassmcp

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build project
pnpm build
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [glassmcp.dev](https://glassmcp.dev)
- **Issues**: [GitHub Issues](https://github.com/codai/glassmcp/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/codai/glassmcp/discussions)
- **Discord**: [GlassMCP Community](https://discord.gg/glassmcp)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**⚠️ Security Notice**: GlassMCP provides powerful system control capabilities.
Always review commands before execution and maintain secure token management
practices.
