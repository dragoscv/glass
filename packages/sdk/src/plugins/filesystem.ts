import type { GlassMCPClient } from '../client';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  created: string;
  modified: string;
  accessed: string;
}

export class FileSystemPlugin {
  constructor(private client: GlassMCPClient) {}

  async readFile(path: string, encoding: 'utf8' | 'binary' | 'base64' = 'utf8'): Promise<string> {
    const response = await this.client.request<{ content: string }>('POST', '/api/filesystem/read', { 
      path, 
      encoding 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to read file');
    }
    
    return response.data?.content || '';
  }

  async writeFile(path: string, content: string, encoding: 'utf8' | 'binary' | 'base64' = 'utf8'): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/write', { 
      path, 
      content, 
      encoding 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to write file');
    }
    
    return response.data?.success || false;
  }

  async deleteFile(path: string): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/delete', { path });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete file');
    }
    
    return response.data?.success || false;
  }

  async copyFile(source: string, destination: string, overwrite = false): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/copy', { 
      source, 
      destination, 
      overwrite 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to copy file');
    }
    
    return response.data?.success || false;
  }

  async moveFile(source: string, destination: string, overwrite = false): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/move', { 
      source, 
      destination, 
      overwrite 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to move file');
    }
    
    return response.data?.success || false;
  }

  async listDirectory(path: string): Promise<FileInfo[]> {
    const response = await this.client.request<{ files: FileInfo[] }>('POST', '/api/filesystem/list', { path });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to list directory');
    }
    
    return response.data?.files || [];
  }

  async createDirectory(path: string, recursive = false): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/mkdir', { 
      path, 
      recursive 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create directory');
    }
    
    return response.data?.success || false;
  }

  async deleteDirectory(path: string, recursive = false): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/filesystem/rmdir', { 
      path, 
      recursive 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete directory');
    }
    
    return response.data?.success || false;
  }

  async exists(path: string): Promise<boolean> {
    const response = await this.client.request<{ exists: boolean }>('POST', '/api/filesystem/exists', { path });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to check if path exists');
    }
    
    return response.data?.exists || false;
  }

  async getStats(path: string): Promise<FileInfo> {
    const response = await this.client.request<FileInfo>('POST', '/api/filesystem/stats', { path });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get file stats');
    }
    
    return response.data!;
  }

  async watch(path: string, callback: (event: string, filename: string) => void): Promise<() => void> {
    // This would typically use WebSocket for real-time updates
    // For now, we'll return a simple polling mechanism
    const interval = setInterval(async () => {
      try {
        // Poll for changes - this is a simplified implementation
        // In a real implementation, you'd use WebSocket events
        const exists = await this.exists(path);
        if (!exists) {
          callback('unlink', path);
        }
      } catch (error) {
        // Handle error silently for now
      }
    }, 1000);

    return () => clearInterval(interval);
  }
}
