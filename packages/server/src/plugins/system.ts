import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { platform, arch, totalmem, freemem, uptime } from 'os';
import type { 
  PluginInterface, 
  SystemExecRequest, 
  SystemExecResponse, 
  ProcessInfo, 
  SystemInfo 
} from '@glassmcp/shared';

const execAsync = promisify(exec);

export class SystemPlugin implements PluginInterface {
  public readonly name = 'system';
  public readonly version = '1.0.0';

  async initialize(): Promise<void> {
    // Plugin initialization logic
  }

  async destroy(): Promise<void> {
    // Plugin cleanup logic
  }

  isSupported(): boolean {
    return process.platform === 'win32';
  }

  getCapabilities(): string[] {
    return [
      'execute_command',
      'list_processes',
      'kill_process',
      'get_system_info',
      'monitor_processes',
    ];
  }

  async executeCommand(request: SystemExecRequest): Promise<SystemExecResponse> {
    const { command, args = [], cwd, timeout = 30000, shell = false } = request;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        childProcess.kill();
        resolve({
          exitCode: -1,
          stdout: '',
          stderr: 'Command timed out',
          signal: 'SIGTERM',
          timedOut: true,
        });
      }, timeout);

      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      
      const childProcess = shell 
        ? spawn('cmd', ['/c', fullCommand], { cwd })
        : spawn(command, args, { cwd });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          signal: signal || null,
          timedOut: false,
        });
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const script = `
      Get-Process | Select-Object Id, ProcessName, Path, CommandLine, WorkingSet, CPU, ParentId | 
      ConvertTo-Json -Compress
    `;

    try {
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const processes = JSON.parse(stdout);
      
      return (Array.isArray(processes) ? processes : [processes]).map((proc: any) => ({
        pid: proc.Id || 0,
        name: proc.ProcessName || '',
        executablePath: proc.Path || '',
        commandLine: proc.CommandLine || '',
        memoryUsage: proc.WorkingSet || 0,
        cpuUsage: proc.CPU || 0,
        parentPid: proc.ParentId || null,
      }));
    } catch (error) {
      console.error('Failed to list processes:', error);
      return [];
    }
  }

  async killProcess(pid: number): Promise<boolean> {
    try {
      const script = `Stop-Process -Id ${pid} -Force`;
      await execAsync(`powershell -Command "${script}"`);
      return true;
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const processes = await this.listProcesses();
    
    // Get CPU usage
    let cpuUsage = 0;
    try {
      const script = `
        Get-Counter "\\Processor(_Total)\\% Processor Time" | 
        Select-Object -ExpandProperty CounterSamples | 
        Select-Object -ExpandProperty CookedValue
      `;
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      cpuUsage = parseFloat(stdout.trim()) || 0;
    } catch (error) {
      console.error('Failed to get CPU usage:', error);
    }

    return {
      platform: platform(),
      version: process.version,
      architecture: arch(),
      totalMemory: totalmem(),
      freeMemory: freemem(),
      cpuUsage,
      uptime: uptime(),
      processes,
    };
  }

  async findProcessByName(name: string): Promise<ProcessInfo[]> {
    const processes = await this.listProcesses();
    return processes.filter(proc => 
      proc.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      const script = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue`;
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      const script = `
        Get-Process -Id ${pid} | 
        Select-Object Id, ProcessName, Path, CommandLine, WorkingSet, CPU, ParentId | 
        ConvertTo-Json -Compress
      `;
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const proc = JSON.parse(stdout);
      
      return {
        pid: proc.Id || 0,
        name: proc.ProcessName || '',
        executablePath: proc.Path || '',
        commandLine: proc.CommandLine || '',
        memoryUsage: proc.WorkingSet || 0,
        cpuUsage: proc.CPU || 0,
        parentPid: proc.ParentId || null,
      };
    } catch (error) {
      console.error(`Failed to get process info for ${pid}:`, error);
      return null;
    }
  }
}
