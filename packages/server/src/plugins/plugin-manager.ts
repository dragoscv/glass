import { LoggerService } from '../utils/logger';
import type { PluginInterface } from '@glassmcp/shared';

export class PluginManager {
  private plugins: Map<string, PluginInterface> = new Map();
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }
  async initialize(): Promise<void> {
    this.logger.info('Initializing plugin manager');
    
    // Load built-in plugins
    await this.loadBuiltinPlugins();
    
    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  async loadPlugins(): Promise<void> {
    return this.initialize();
  }

  async unloadPlugins(): Promise<void> {
    return this.destroy();
  }

  getLoadedPlugins(): PluginInterface[] {
    return this.getAllPlugins();
  }

  private async loadBuiltinPlugins(): Promise<void> {
    try {
      // Dynamic imports for built-in plugins
      const { WindowPlugin } = await import('./window');
      const { KeyboardPlugin } = await import('./keyboard');
      const { MousePlugin } = await import('./mouse');
      const { SystemPlugin } = await import('./system');
      const { ClipboardPlugin } = await import('./clipboard');
      const { FilesystemPlugin } = await import('./filesystem');

      const plugins = [
        new WindowPlugin(),
        new KeyboardPlugin(),
        new MousePlugin(),
        new SystemPlugin(),
        new ClipboardPlugin(),
        new FilesystemPlugin(),
      ];

      for (const plugin of plugins) {
        if (plugin.isSupported()) {
          await plugin.initialize();
          this.plugins.set(plugin.name, plugin);
          this.logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
        } else {
          this.logger.warn(`Plugin ${plugin.name} is not supported on this platform`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load built-in plugins:', error);
      throw error;
    }
  }

  getPlugin<T extends PluginInterface>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  getAllPlugins(): PluginInterface[] {
    return Array.from(this.plugins.values());
  }

  getPluginCapabilities(): Record<string, string[]> {
    const capabilities: Record<string, string[]> = {};
    
    for (const [name, plugin] of this.plugins) {
      capabilities[name] = plugin.getCapabilities();
    }
    
    return capabilities;
  }

  async destroy(): Promise<void> {
    this.logger.info('Destroying plugin manager');
    
    for (const [name, plugin] of this.plugins) {
      try {
        await plugin.destroy();
        this.logger.debug(`Destroyed plugin: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to destroy plugin ${name}:`, error);
      }
    }
    
    this.plugins.clear();
  }
}
