import Conf from 'conf';
import type { GlassMCPClientConfig } from '@glassmcp/sdk';

export interface GlassMCPConfig extends GlassMCPClientConfig {
  profiles?: Record<string, GlassMCPClientConfig>;
  defaultProfile?: string;
}

const schema = {
  baseUrl: {
    type: 'string',
    default: 'http://localhost:3000'
  },
  auth: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['bearer', 'apikey', 'basic']
      },
      token: {
        type: 'string'
      },
      apiKey: {
        type: 'string'
      },
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    }
  },
  timeout: {
    type: 'number',
    default: 5000
  },
  retryAttempts: {
    type: 'number',
    default: 3
  },
  retryDelay: {
    type: 'number',
    default: 1000
  },
  enableWebSocket: {
    type: 'boolean',
    default: true
  },
  websocketUrl: {
    type: 'string'
  },
  profiles: {
    type: 'object',
    default: {}
  },
  defaultProfile: {
    type: 'string'
  }
} as const;

export class ConfigManager {
  private config: Conf<any>;

  constructor() {
    this.config = new Conf({
      projectName: 'glassmcp',
      schema: schema as any,
      defaults: {
        baseUrl: 'http://localhost:3000',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        enableWebSocket: true,
        profiles: {},
        defaultProfile: undefined
      }
    });
  }

  get(): GlassMCPConfig {
    return this.config.store as GlassMCPConfig;
  }

  set(key: keyof GlassMCPConfig, value: any): void {
    this.config.set(key, value);
  }
  getProfile(name?: string): GlassMCPClientConfig {
    const config = this.get();
    
    if (name) {
      const profile = config.profiles?.[name];
      if (!profile) {
        throw new Error(`Profile '${name}' not found`);
      }
      return profile;
    }    if (config.defaultProfile && config.profiles?.[config.defaultProfile]) {
      const profile = config.profiles[config.defaultProfile];
      if (!profile) {
        throw new Error(`Default profile '${config.defaultProfile}' not found`);
      }
      return profile;
    }

    // Return base config without profiles
    const { profiles, defaultProfile, ...baseConfig } = config;
    return baseConfig as GlassMCPClientConfig;
  }

  setProfile(name: string, profile: GlassMCPClientConfig): void {
    const config = this.get();
    const profiles = { ...config.profiles, [name]: profile };
    this.set('profiles', profiles);
  }

  deleteProfile(name: string): void {
    const config = this.get();
    if (!config.profiles?.[name]) {
      throw new Error(`Profile '${name}' not found`);
    }

    const profiles = { ...config.profiles };
    delete profiles[name];
    this.set('profiles', profiles);

    // Clear default if it was the deleted profile
    if (config.defaultProfile === name) {
      this.set('defaultProfile', undefined);
    }
  }

  setDefaultProfile(name: string): void {
    const config = this.get();
    if (!config.profiles?.[name]) {
      throw new Error(`Profile '${name}' not found`);
    }
    this.set('defaultProfile', name);
  }

  listProfiles(): string[] {
    const config = this.get();
    return Object.keys(config.profiles || {});
  }

  getConfigPath(): string {
    return this.config.path;
  }

  clear(): void {
    this.config.clear();
  }
}
