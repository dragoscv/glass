---
applyTo: '**'
---

# GitHub Copilot Integration Guide for GlassMCP

This document provides specific instructions for integrating GlassMCP with
GitHub Copilot Chat extension in VS Code.

## Overview

GlassMCP acts as a bridge between GitHub Copilot's natural language commands and
Windows system operations. When users type commands like "@glassmcp focus
Calculator window", Copilot translates these into API calls to the GlassMCP
server.

## Copilot Command Patterns

### Window Management

```
# Focus windows
@glassmcp focus the Calculator window
@glassmcp bring Notepad to front
@glassmcp switch to Visual Studio Code

# Window operations
@glassmcp minimize all Chrome windows
@glassmcp maximize the current window
@glassmcp close Notepad windows
@glassmcp resize VS Code to 1200x800

# Window information
@glassmcp list all open windows
@glassmcp find windows containing "Project"
@glassmcp get active window title
```

### Keyboard Input

```
# Text input
@glassmcp type "Hello World" in the active window
@glassmcp enter the text "console.log('test')"
@glassmcp paste this text: "function example() {}"

# Key combinations
@glassmcp press Ctrl+S to save
@glassmcp hit Alt+Tab to switch windows
@glassmcp press Win+R to open run dialog
@glassmcp send Ctrl+Shift+T to reopen tab

# Special keys
@glassmcp press Enter key
@glassmcp hit Escape
@glassmcp press F5 to refresh
@glassmcp send Backspace 5 times
```

### Mouse Operations

```
# Mouse movement and clicks
@glassmcp click at coordinates 500, 300
@glassmcp right-click at 100, 200
@glassmcp double-click at the center of screen
@glassmcp move mouse to 800, 600

# Drag operations
@glassmcp drag from 100,100 to 200,200
@glassmcp drag the file to the trash
@glassmcp select text by dragging from start to end

# Scroll operations
@glassmcp scroll down 5 times
@glassmcp scroll up in the current window
@glassmcp scroll right on the page
```

### System Commands

```
# Process management
@glassmcp start Notepad
@glassmcp run "code ." to open VS Code
@glassmcp execute "npm install" in terminal
@glassmcp kill process "chrome.exe"

# PowerShell commands
@glassmcp run PowerShell command "Get-Date"
@glassmcp execute PS script "Get-Process | Where-Object {$_.Name -eq 'notepad'}"
@glassmcp get system information via PowerShell

# System operations
@glassmcp list running processes
@glassmcp start Windows service "Spooler"
@glassmcp stop the Print Spooler service
```

### Clipboard Operations

```
# Clipboard management
@glassmcp copy this text to clipboard: "Hello World"
@glassmcp paste clipboard content
@glassmcp get current clipboard text
@glassmcp clear the clipboard

# Advanced clipboard
@glassmcp copy current selection
@glassmcp set clipboard to file content
@glassmcp backup clipboard content
```

### File System Operations

```
# File operations
@glassmcp read file "C:\temp\notes.txt"
@glassmcp write "Hello" to file "C:\temp\output.txt"
@glassmcp create new file at "C:\temp\test.js"
@glassmcp delete file "C:\temp\old.txt"

# Directory operations
@glassmcp list files in "C:\Users\Username\Documents"
@glassmcp create directory "C:\temp\newfolder"
@glassmcp copy folder from source to destination
@glassmcp move file to different location

# File information
@glassmcp check if file exists "C:\temp\file.txt"
@glassmcp get file size and modified date
@glassmcp find files matching pattern "*.js"
```

## Command Translation Logic

### Natural Language Processing

Copilot should parse user commands and extract:

1. **Action Verb**: focus, click, type, run, etc.
2. **Target Object**: window title, coordinates, file path, etc.
3. **Parameters**: text content, key combinations, options, etc.
4. **Context**: current window, selection, clipboard, etc.

### Translation Examples

```typescript
// User: "@glassmcp focus the Calculator window"
// Translates to:
{
  plugin: 'window',
  action: 'focus',
  params: { title: 'Calculator' }
}

// User: "@glassmcp type 'Hello World' and press Enter"
// Translates to:
[
  {
    plugin: 'keyboard',
    action: 'type',
    params: { text: 'Hello World' }
  },
  {
    plugin: 'keyboard',
    action: 'press',
    params: { key: 'Enter' }
  }
]

// User: "@glassmcp run notepad and then focus it"
// Translates to:
[
  {
    plugin: 'system',
    action: 'exec',
    params: { command: 'notepad.exe' }
  },
  {
    plugin: 'window',
    action: 'focus',
    params: { title: 'Notepad' }
  }
]
```

### Error Handling and Feedback

```typescript
// Success response formatting
const formatSuccess = (result: any) => `
✅ **Command executed successfully**
${result.message || 'Operation completed'}
${result.data ? `\nResult: ${JSON.stringify(result.data, null, 2)}` : ''}
`;

// Error response formatting
const formatError = (error: any) => `
❌ **Command failed**
Error: ${error.message}
${error.code ? `Code: ${error.code}` : ''}
${error.details ? `Details: ${error.details}` : ''}

💡 **Suggestions:**
- Check if the target window/application exists
- Verify file paths are correct and accessible
- Ensure GlassMCP server is running
- Check security permissions
`;
```

## Workflow Examples

### Development Environment Setup

```
User: "@glassmcp set up my development environment"

Copilot executes:
1. @glassmcp run "code ." to open VS Code
2. @glassmcp focus Visual Studio Code window
3. @glassmcp press Ctrl+` to open terminal
4. @glassmcp type "npm install" and press Enter
5. @glassmcp wait 30 seconds for installation
6. @glassmcp type "npm run dev" and press Enter
```

### Text Processing Workflow

```
User: "@glassmcp process the text in this file"

Copilot executes:
1. @glassmcp read file "C:\temp\input.txt"
2. @glassmcp set clipboard to processed content
3. @glassmcp focus Notepad window
4. @glassmcp press Ctrl+A to select all
5. @glassmcp press Ctrl+V to paste
6. @glassmcp press Ctrl+S to save
```

### System Maintenance Workflow

```
User: "@glassmcp clean up my system"

Copilot executes:
1. @glassmcp list running processes
2. @glassmcp kill unnecessary processes
3. @glassmcp run PowerShell "Get-ChildItem C:\temp -Recurse | Remove-Item"
4. @glassmcp execute "sfc /scannow" system file check
5. @glassmcp restart specific services if needed
```

## Safety and Security

### Command Validation

- Always validate dangerous operations with user confirmation
- Sanitize file paths and system commands
- Check permissions before file system operations
- Limit concurrent operations to prevent system overload

### User Confirmation Prompts

```
Dangerous operations that require confirmation:
- Deleting files or directories
- Killing system processes
- Modifying system settings
- Running executable files
- Accessing sensitive directories

Example prompt:
"⚠️  This command will delete files. Are you sure you want to proceed? (y/n)"
```

### Error Recovery

```typescript
// Implement retry logic for transient failures
async function executeWithRetry(command: MCPCommand, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeCommand(command);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Performance Optimization

### Command Batching

```typescript
// Batch related commands for better performance
const batchCommands = (commands: MCPCommand[]): MCPCommand[][] => {
  const batches: MCPCommand[][] = [];
  let currentBatch: MCPCommand[] = [];

  for (const command of commands) {
    if (canBatch(command, currentBatch)) {
      currentBatch.push(command);
    } else {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [command];
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};
```

### Caching Strategy

```typescript
// Cache frequently used information
const windowCache = new Map<string, WindowInfo>();
const processCache = new Map<string, ProcessInfo>();

// Cache window titles for faster lookup
async function getCachedWindows(): Promise<WindowInfo[]> {
  const cacheKey = 'windows:list';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached.data;
  }

  const windows = await client.window.list();
  cache.set(cacheKey, { data: windows, timestamp: Date.now() });

  return windows;
}
```

## Integration Testing

### Test Scenarios

```typescript
describe('Copilot Integration', () => {
  it('should handle window focus commands', async () => {
    const command = '@glassmcp focus the Calculator window';
    const parsed = parseCommand(command);

    expect(parsed).toEqual({
      plugin: 'window',
      action: 'focus',
      params: { title: 'Calculator' },
    });
  });

  it('should handle complex workflows', async () => {
    const workflow = [
      '@glassmcp run notepad',
      '@glassmcp focus Notepad window',
      '@glassmcp type "Hello World"',
      '@glassmcp save the file',
    ];

    const commands = workflow.map(parseCommand);
    const results = await executeWorkflow(commands);

    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### Mock Implementation

```typescript
// Mock MCP server for testing
class MockMCPServer {
  private responses = new Map<string, any>();

  setMockResponse(command: string, response: any) {
    this.responses.set(command, response);
  }

  async executeCommand(command: MCPCommand): Promise<any> {
    const key = `${command.plugin}.${command.action}`;
    const response = this.responses.get(key);

    if (!response) {
      throw new Error(`No mock response for ${key}`);
    }

    return response;
  }
}
```

## Documentation for Users

### Quick Start Guide

Include in VS Code extension documentation:

```markdown
## Using GlassMCP with GitHub Copilot

1. **Install GlassMCP**: `npm install -g @codai/mcp-server`
2. **Start Server**: `mcp-server start`
3. **Use in Copilot**: Type `@glassmcp` followed by your command

### Example Commands:

- `@glassmcp focus the Calculator`
- `@glassmcp type "Hello World"`
- `@glassmcp click at 500, 300`
- `@glassmcp run notepad.exe`
```

### Command Reference

Provide searchable command reference within VS Code:

```json
{
  "glassmcp.commands": [
    {
      "category": "Window Management",
      "commands": [
        {
          "pattern": "focus {window_title}",
          "description": "Focus a window by title",
          "example": "@glassmcp focus Calculator"
        }
      ]
    }
  ]
}
```

This integration guide ensures smooth interaction between GitHub Copilot and
GlassMCP, providing users with powerful system automation capabilities through
natural language commands.
