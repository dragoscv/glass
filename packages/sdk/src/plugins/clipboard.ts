import type { ClipboardData } from '@glassmcp/shared';
import type { GlassMCPClient } from '../client';

export class ClipboardPlugin {
  constructor(private client: GlassMCPClient) {}

  async getText(): Promise<string> {
    const response = await this.client.request<{ text: string }>('GET', '/api/clipboard/text');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get clipboard text');
    }
    
    return response.data?.text || '';
  }

  async setText(text: string): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/clipboard/text', { text });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to set clipboard text');
    }
    
    return response.data?.success || false;
  }

  async getImage(): Promise<string> {
    const response = await this.client.request<{ image: string }>('GET', '/api/clipboard/image');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get clipboard image');
    }
    
    return response.data?.image || '';
  }

  async setImage(imageData: string): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/clipboard/image', { 
      image: imageData 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to set clipboard image');
    }
    
    return response.data?.success || false;
  }

  async getFiles(): Promise<string[]> {
    const response = await this.client.request<{ files: string[] }>('GET', '/api/clipboard/files');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get clipboard files');
    }
    
    return response.data?.files || [];
  }

  async setFiles(files: string[]): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/clipboard/files', { files });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to set clipboard files');
    }
    
    return response.data?.success || false;
  }

  async clear(): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/clipboard/clear');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear clipboard');
    }
    
    return response.data?.success || false;
  }

  async getData(): Promise<ClipboardData> {
    const response = await this.client.request<ClipboardData>('GET', '/api/clipboard/data');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get clipboard data');
    }
    
    return response.data!;
  }

  async hasText(): Promise<boolean> {
    const response = await this.client.request<{ hasText: boolean }>('GET', '/api/clipboard/has-text');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to check clipboard for text');
    }
    
    return response.data?.hasText || false;
  }

  async hasImage(): Promise<boolean> {
    const response = await this.client.request<{ hasImage: boolean }>('GET', '/api/clipboard/has-image');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to check clipboard for image');
    }
    
    return response.data?.hasImage || false;
  }

  async hasFiles(): Promise<boolean> {
    const response = await this.client.request<{ hasFiles: boolean }>('GET', '/api/clipboard/has-files');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to check clipboard for files');
    }
    
    return response.data?.hasFiles || false;
  }
}
