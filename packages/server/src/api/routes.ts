import express from 'express';
import { z } from 'zod';
import type { PluginManager } from '../plugins/plugin-manager';
import { 
  WindowFocusRequestSchema,
  WindowResizeRequestSchema,
  WindowMoveRequestSchema,
  KeyboardTypeRequestSchema,
  KeyboardPressRequestSchema,
  MouseMoveRequestSchema,
  MouseClickRequestSchema,
  MouseScrollRequestSchema,
  SystemExecRequestSchema,
  ClipboardSetRequestSchema,
  FileReadRequestSchema,
  FileWriteRequestSchema,
  DirectoryListRequestSchema
} from '@glassmcp/shared';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '@glassmcp/shared';
import type { WindowPlugin } from '../plugins/window';
import type { KeyboardPlugin } from '../plugins/keyboard';
import type { MousePlugin } from '../plugins/mouse';
import type { SystemPlugin } from '../plugins/system';
import type { ClipboardPlugin } from '../plugins/clipboard';
import type { FilesystemPlugin } from '../plugins/filesystem';

// Middleware for validating request body
function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(createErrorResponse(
          'INVALID_REQUEST',
          'Invalid request body',
          generateRequestId(),
          { validation: error.errors }
        ));
        return;
      }
      res.status(400).json(createErrorResponse(
        'INVALID_REQUEST',
        'Invalid request body',
        generateRequestId()
      ));
    }
  };
}

export function setupRoutes(app: express.Application, pluginManager: PluginManager): void {
  
  // Window Management Routes
  app.get('/api/window/list', async (_req, res) => {
    try {
      const windowPlugin = pluginManager.getPlugin<WindowPlugin>('window');
      if (!windowPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Window plugin not found', generateRequestId()));
      }
      const windows = await windowPlugin.listWindows();
      return res.json(createSuccessResponse(windows, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/window/focus', validateBody(WindowFocusRequestSchema), async (req, res) => {
    try {
      const windowPlugin = pluginManager.getPlugin<WindowPlugin>('window');
      if (!windowPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Window plugin not found', generateRequestId()));
      }
      await windowPlugin.focusWindow(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/window/resize', validateBody(WindowResizeRequestSchema), async (req, res) => {
    try {
      const windowPlugin = pluginManager.getPlugin<WindowPlugin>('window');
      if (!windowPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Window plugin not found', generateRequestId()));
      }
      await windowPlugin.resizeWindow(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/window/move', validateBody(WindowMoveRequestSchema), async (req, res) => {
    try {
      const windowPlugin = pluginManager.getPlugin<WindowPlugin>('window');
      if (!windowPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Window plugin not found', generateRequestId()));
      }
      await windowPlugin.moveWindow(req.body.handle, req.body.x, req.body.y);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/window/close', async (req, res) => {
    try {
      const handle = parseInt(req.body.handle);
      if (isNaN(handle)) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Invalid window handle', generateRequestId()));
      }

      const windowPlugin = pluginManager.getPlugin<WindowPlugin>('window');
      if (!windowPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Window plugin not found', generateRequestId()));
      }

      await windowPlugin.closeWindow(handle);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // Keyboard Control Routes
  app.post('/api/keyboard/type', validateBody(KeyboardTypeRequestSchema), async (req, res) => {
    try {
      const keyboardPlugin = pluginManager.getPlugin<KeyboardPlugin>('keyboard');
      if (!keyboardPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Keyboard plugin not found', generateRequestId()));
      }
      await keyboardPlugin.typeText(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/keyboard/press', validateBody(KeyboardPressRequestSchema), async (req, res) => {
    try {
      const keyboardPlugin = pluginManager.getPlugin<KeyboardPlugin>('keyboard');
      if (!keyboardPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Keyboard plugin not found', generateRequestId()));
      }
      await keyboardPlugin.pressKey(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // Mouse Control Routes
  app.post('/api/mouse/move', validateBody(MouseMoveRequestSchema), async (req, res) => {
    try {
      const mousePlugin = pluginManager.getPlugin<MousePlugin>('mouse');
      if (!mousePlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Mouse plugin not found', generateRequestId()));
      }
      await mousePlugin.moveCursor(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/mouse/click', validateBody(MouseClickRequestSchema), async (req, res) => {
    try {
      const mousePlugin = pluginManager.getPlugin<MousePlugin>('mouse');
      if (!mousePlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Mouse plugin not found', generateRequestId()));
      }
      await mousePlugin.click(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/mouse/scroll', validateBody(MouseScrollRequestSchema), async (req, res) => {
    try {
      const mousePlugin = pluginManager.getPlugin<MousePlugin>('mouse');
      if (!mousePlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Mouse plugin not found', generateRequestId()));
      }
      await mousePlugin.scroll(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // System Control Routes
  app.post('/api/system/exec', validateBody(SystemExecRequestSchema), async (req, res) => {
    try {
      const systemPlugin = pluginManager.getPlugin<SystemPlugin>('system');
      if (!systemPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'System plugin not found', generateRequestId()));
      }
      const result = await systemPlugin.executeCommand(req.body);
      return res.json(createSuccessResponse(result, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.get('/api/system/info', async (_req, res) => {
    try {
      const systemPlugin = pluginManager.getPlugin<SystemPlugin>('system');
      if (!systemPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'System plugin not found', generateRequestId()));
      }
      const info = await systemPlugin.getSystemInfo();
      return res.json(createSuccessResponse(info, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // Clipboard Routes
  app.get('/api/clipboard', async (_req, res) => {
    try {
      const clipboardPlugin = pluginManager.getPlugin<ClipboardPlugin>('clipboard');
      if (!clipboardPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Clipboard plugin not found', generateRequestId()));
      }
      const content = await clipboardPlugin.getContent();
      return res.json(createSuccessResponse(content, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/clipboard', validateBody(ClipboardSetRequestSchema), async (req, res) => {
    try {
      const clipboardPlugin = pluginManager.getPlugin<ClipboardPlugin>('clipboard');
      if (!clipboardPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Clipboard plugin not found', generateRequestId()));
      }
      await clipboardPlugin.setContent(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // File System Routes
  app.post('/api/filesystem/read', validateBody(FileReadRequestSchema), async (req, res) => {
    try {
      const filesystemPlugin = pluginManager.getPlugin<FilesystemPlugin>('filesystem');
      if (!filesystemPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Filesystem plugin not found', generateRequestId()));
      }
      const content = await filesystemPlugin.readFile(req.body);
      return res.json(createSuccessResponse(content, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/filesystem/write', validateBody(FileWriteRequestSchema), async (req, res) => {
    try {
      const filesystemPlugin = pluginManager.getPlugin<FilesystemPlugin>('filesystem');
      if (!filesystemPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Filesystem plugin not found', generateRequestId()));
      }
      await filesystemPlugin.writeFile(req.body);
      return res.json(createSuccessResponse(null, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  app.post('/api/filesystem/list', validateBody(DirectoryListRequestSchema), async (req, res) => {
    try {
      const filesystemPlugin = pluginManager.getPlugin<FilesystemPlugin>('filesystem');
      if (!filesystemPlugin) {
        return res.status(404).json(createErrorResponse('RESOURCE_NOT_FOUND', 'Filesystem plugin not found', generateRequestId()));
      }
      const files = await filesystemPlugin.listDirectory(req.body);
      return res.json(createSuccessResponse(files, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });

  // Plugin information route
  app.get('/api/plugins', (_req, res) => {
    try {      const plugins = pluginManager.getAllPlugins().map(plugin => ({
        name: plugin.name,
        version: plugin.version,
        capabilities: plugin.getCapabilities(),
        supported: plugin.isSupported(),
      }));
      return res.json(createSuccessResponse(plugins, generateRequestId()));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse('OPERATION_FAILED', error.message, generateRequestId()));
    }
  });
}
