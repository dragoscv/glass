import type { SystemInfo, ProcessInfo } from '@glassmcp/shared';
import type { GlassMCPClient } from '../client';

export class SystemPlugin {
  constructor(private client: GlassMCPClient) {}

  async getInfo(): Promise<SystemInfo> {
    const response = await this.client.request<SystemInfo>('GET', '/api/system/info');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get system info');
    }
    
    return response.data!;
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    const response = await this.client.request<ProcessInfo[]>('GET', '/api/system/processes');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get processes');
    }
    
    return response.data || [];
  }

  async killProcess(pid: number): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/system/kill-process', { pid });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to kill process');
    }
    
    return response.data?.success || false;
  }

  async executeCommand(command: string, args?: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const response = await this.client.request<{ stdout: string; stderr: string; exitCode: number }>('POST', '/api/system/execute', { 
      command, 
      args 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to execute command');
    }
    
    return response.data!;
  }

  async runPowerShell(script: string): Promise<{ output: string; error?: string }> {
    const response = await this.client.request<{ output: string; error?: string }>('POST', '/api/system/powershell', { 
      script 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to run PowerShell script');
    }
    
    return response.data!;
  }

  async screenshot(options?: { 
    fullscreen?: boolean; 
    x?: number; 
    y?: number; 
    width?: number; 
    height?: number; 
  }): Promise<string> {
    const response = await this.client.request<{ image: string }>('POST', '/api/system/screenshot', options);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to take screenshot');
    }
    
    return response.data?.image || '';
  }

  async sleep(ms: number): Promise<void> {
    await this.client.request('POST', '/api/system/sleep', { duration: ms });
  }

  async shutdown(force?: boolean): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/system/shutdown', { force });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to shutdown system');
    }
    
    return response.data?.success || false;
  }

  async restart(force?: boolean): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/system/restart', { force });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to restart system');
    }
    
    return response.data?.success || false;
  }
}
