import type { WindowInfo } from '@glassmcp/shared';
import type { GlassMCPClient } from '../client';

export class WindowPlugin {
  constructor(private client: GlassMCPClient) {}

  async list(): Promise<WindowInfo[]> {
    const response = await this.client.request<WindowInfo[]>('GET', '/api/window/list');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to list windows');
    }
    
    return response.data || [];
  }

  async getActive(): Promise<WindowInfo | null> {
    const response = await this.client.request<WindowInfo>('GET', '/api/window/active');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get active window');
    }
    
    return response.data || null;
  }

  async focus(handle: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/focus', { handle });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to focus window');
    }
    
    return response.data?.success || false;
  }

  async minimize(handle: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/minimize', { handle });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to minimize window');
    }
    
    return response.data?.success || false;
  }

  async maximize(handle: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/maximize', { handle });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to maximize window');
    }
    
    return response.data?.success || false;
  }

  async close(handle: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/close', { handle });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to close window');
    }
    
    return response.data?.success || false;
  }

  async resize(handle: number, width: number, height: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/resize', { 
      handle, 
      width, 
      height 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to resize window');
    }
    
    return response.data?.success || false;
  }

  async move(handle: number, x: number, y: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/window/move', { 
      handle, 
      x, 
      y 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to move window');
    }
    
    return response.data?.success || false;
  }
}
