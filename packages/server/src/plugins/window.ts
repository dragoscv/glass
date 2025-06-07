import { exec } from 'child_process';
import { promisify } from 'util';
import type { WindowInfo, WindowFocusRequest, WindowResizeRequest, PluginInterface } from '@glassmcp/shared';

const execAsync = promisify(exec);

export class WindowPlugin implements PluginInterface {
  public readonly name = 'window';
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
      'list_windows',
      'focus_window',
      'resize_window',
      'move_window',
      'close_window',
      'minimize_window',
      'maximize_window',
    ];
  }
  /**
   * Get list of all windows
   */
  async listWindows(): Promise<WindowInfo[]> {
    try {
      const script = `
        Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
          $window = $_
          $handle = $window.MainWindowHandle
          $bounds = @{ x = 0; y = 0; width = 0; height = 0 }
          
          # Try to get window bounds using Windows API calls via PowerShell
          try {
            Add-Type -TypeDefinition @"
              using System;
              using System.Runtime.InteropServices;
              public class Win32 {
                [DllImport("user32.dll")]
                public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
                [DllImport("user32.dll")]
                public static extern bool IsWindowVisible(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool IsIconic(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool IsZoomed(IntPtr hWnd);
                [StructLayout(LayoutKind.Sequential)]
                public struct RECT {
                  public int Left, Top, Right, Bottom;
                }
              }
"@
            $rect = New-Object Win32+RECT
            if ([Win32]::GetWindowRect($handle, [ref]$rect)) {
              $bounds = @{
                x = $rect.Left
                y = $rect.Top
                width = $rect.Right - $rect.Left
                height = $rect.Bottom - $rect.Top
              }
            }
            
            $isVisible = [Win32]::IsWindowVisible($handle)
            $isMinimized = [Win32]::IsIconic($handle)
            $isMaximized = [Win32]::IsZoomed($handle)
          } catch {
            $isVisible = $true
            $isMinimized = $false
            $isMaximized = $false
          }
          
          @{
            handle = $handle.ToInt64()
            title = $window.MainWindowTitle
            className = "Unknown"
            processId = $window.Id
            processName = $window.ProcessName
            isVisible = $isVisible
            isMinimized = $isMinimized
            isMaximized = $isMaximized
            bounds = $bounds
          }
        } | ConvertTo-Json -Depth 3
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      
      let windows: any[] = [];
      try {
        const result = JSON.parse(stdout);
        windows = Array.isArray(result) ? result : [result];
      } catch (error) {
        throw new Error(`Failed to parse PowerShell output: ${error}`);
      }

      return windows.map(w => ({
        handle: w.handle,
        title: w.title || '',
        className: w.className || 'Unknown',
        processId: w.processId,
        processName: w.processName || '',
        isVisible: w.isVisible || true,
        isMinimized: w.isMinimized || false,
        isMaximized: w.isMaximized || false,
        bounds: w.bounds || { x: 0, y: 0, width: 0, height: 0 }
      }));
    } catch (error) {
      throw new Error(`Failed to list windows: ${error}`);
    }
  }

  /**
   * Get active window
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")]
            public static extern int GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool IsZoomed(IntPtr hWnd);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
              public int Left, Top, Right, Bottom;
            }
          }
"@
        
        $handle = [Win32]::GetForegroundWindow()
        if ($handle -eq [IntPtr]::Zero) {
          return $null
        }
        
        $processId = 0
        [Win32]::GetWindowThreadProcessId($handle, [ref]$processId)
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        $title = New-Object System.Text.StringBuilder 256
        [Win32]::GetWindowText($handle, $title, 256)
        
        $rect = New-Object Win32+RECT
        [Win32]::GetWindowRect($handle, [ref]$rect)
        
        @{
          handle = $handle.ToInt64()
          title = $title.ToString()
          className = "Unknown"
          processId = $processId
          processName = if ($process) { $process.ProcessName } else { "Unknown" }
          isVisible = [Win32]::IsWindowVisible($handle)
          isMinimized = [Win32]::IsIconic($handle)
          isMaximized = [Win32]::IsZoomed($handle)
          bounds = @{
            x = $rect.Left
            y = $rect.Top
            width = $rect.Right - $rect.Left
            height = $rect.Bottom - $rect.Top
          }
        } | ConvertTo-Json -Depth 3
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      
      if (!stdout.trim()) {
        return null;
      }

      const window = JSON.parse(stdout);
      return {
        handle: window.handle,
        title: window.title || '',
        className: window.className || 'Unknown',
        processId: window.processId,
        processName: window.processName || '',
        isVisible: window.isVisible || true,
        isMinimized: window.isMinimized || false,
        isMaximized: window.isMaximized || false,
        bounds: window.bounds || { x: 0, y: 0, width: 0, height: 0 }
      };
    } catch (error) {
      throw new Error(`Failed to get active window: ${error}`);
    }
  }
  /**
   * Focus a window by handle or other criteria
   */
  async focusWindow(request: WindowFocusRequest): Promise<boolean> {
    const { handle, title, processName } = request;
    
    let targetHandle = handle;
    
    // If handle not provided, find window by title or process name
    if (!targetHandle && (title || processName)) {
      const windows = await this.listWindows();
      const targetWindow = windows.find(w => 
        (title && w.title.includes(title)) ||
        (processName && w.processName.includes(processName))
      );
      if (targetWindow) {
        targetHandle = targetWindow.handle;
      }
    }
    
    if (!targetHandle) {
      throw new Error('Window not found');
    }
    
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
"@
        
        $handle = [IntPtr]::new(${targetHandle})
        $result1 = [Win32]::ShowWindow($handle, 9)  # SW_RESTORE
        $result2 = [Win32]::SetForegroundWindow($handle)
        $result1 -or $result2
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to focus window: ${error}`);
    }
  }

  /**
   * Minimize a window
   */
  async minimizeWindow(handle: number): Promise<boolean> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
"@
        
        $handle = [IntPtr]::new(${handle})
        [Win32]::ShowWindow($handle, 6)  # SW_MINIMIZE
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to minimize window: ${error}`);
    }
  }

  /**
   * Maximize a window
   */
  async maximizeWindow(handle: number): Promise<boolean> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
"@
        
        $handle = [IntPtr]::new(${handle})
        [Win32]::ShowWindow($handle, 3)  # SW_MAXIMIZE
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to maximize window: ${error}`);
    }
  }

  /**
   * Close a window
   */
  async closeWindow(handle: number): Promise<boolean> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool CloseWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
          }
"@
        
        $handle = [IntPtr]::new(${handle})
        # Try WM_CLOSE message first (gentler)
        $result = [Win32]::SendMessage($handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
        $true
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to close window: ${error}`);
    }
  }
  /**
   * Resize a window
   */
  async resizeWindow(request: WindowResizeRequest): Promise<boolean> {
    const { handle, width, height } = request;
    
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
          }
"@
        
        $handle = [IntPtr]::new(${handle})
        [Win32]::SetWindowPos($handle, [IntPtr]::Zero, 0, 0, ${width}, ${height}, 0x0002)  # SWP_NOMOVE
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to resize window: ${error}`);
    }
  }

  /**
   * Move a window
   */
  async moveWindow(handle: number, x: number, y: number): Promise<boolean> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
          }
"@
        
        $handle = [IntPtr]::new(${handle})
        [Win32]::SetWindowPos($handle, [IntPtr]::Zero, ${x}, ${y}, 0, 0, 0x0001)  # SWP_NOSIZE
      `;

      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'True';
    } catch (error) {
      throw new Error(`Failed to move window: ${error}`);
    }
  }
}
