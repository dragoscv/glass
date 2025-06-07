import type { KeyboardInput } from '@glassmcp/shared';
import type { GlassMCPClient } from '../client';

export class KeyboardPlugin {
  constructor(private client: GlassMCPClient) {}

  async sendKey(input: KeyboardInput): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/keyboard/send', input);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send keyboard input');
    }
    
    return response.data?.success || false;
  }

  async type(text: string, delay?: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/keyboard/type', { 
      text, 
      delay 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to type text');
    }
    
    return response.data?.success || false;
  }

  async sendShortcut(keys: string[]): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/keyboard/shortcut', { 
      keys 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send keyboard shortcut');
    }
    
    return response.data?.success || false;
  }

  async pressKey(key: string, modifiers?: string[]): Promise<boolean> {
    return this.sendKey({
      key,
      modifiers: modifiers as any,
      action: 'press'
    });
  }

  async keyDown(key: string, modifiers?: string[]): Promise<boolean> {
    return this.sendKey({
      key,
      modifiers: modifiers as any,
      action: 'down'
    });
  }

  async keyUp(key: string, modifiers?: string[]): Promise<boolean> {
    return this.sendKey({
      key,
      modifiers: modifiers as any,
      action: 'up'
    });
  }
}
