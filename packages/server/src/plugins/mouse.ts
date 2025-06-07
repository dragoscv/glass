import { exec } from 'child_process';
import { promisify } from 'util';
import type { PluginInterface, MouseMoveRequest, MouseClickRequest, MouseScrollRequest, MouseInput } from '@glassmcp/shared';

const execAsync = promisify(exec);

export class MousePlugin implements PluginInterface {
  public readonly name = 'mouse';
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
      'move_cursor',
      'click',
      'scroll',
      'drag',
      'get_position',
    ];
  }

  async moveCursor(request: MouseMoveRequest): Promise<void> {
    const { x, y, duration = 100 } = request;
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(${x}, ${y})
      Start-Sleep -Milliseconds ${duration}
    `;

    await execAsync(`powershell -Command "${script}"`);
  }

  async click(request: MouseClickRequest): Promise<void> {
    const { button = 'left', x, y, clickCount = 1 } = request;
    
    let script = '';
    
    // Move to position if specified
    if (x !== undefined && y !== undefined) {
      script += `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(${x}, ${y})
        Start-Sleep -Milliseconds 10
      `;
    }

    // Add mouse click simulation
    script += `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseClick {
          [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
          public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
          
          public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
          public const uint MOUSEEVENTF_LEFTUP = 0x04;
          public const uint MOUSEEVENTF_RIGHTDOWN = 0x08;
          public const uint MOUSEEVENTF_RIGHTUP = 0x10;
          public const uint MOUSEEVENTF_MIDDLEDOWN = 0x20;
          public const uint MOUSEEVENTF_MIDDLEUP = 0x40;
        }
"@
    `;

    for (let i = 0; i < clickCount; i++) {
      switch (button) {
        case 'left':
          script += `
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
          `;
          break;
        case 'right':
          script += `
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
          `;
          break;
        case 'middle':
          script += `
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
          `;
          break;
      }
      
      if (i < clickCount - 1) {
        script += 'Start-Sleep -Milliseconds 50';
      }
    }

    await execAsync(`powershell -Command "${script}"`);
  }

  async scroll(request: MouseScrollRequest): Promise<void> {
    const { direction, amount = 3, x, y } = request;
    
    let script = '';
    
    // Move to position if specified
    if (x !== undefined && y !== undefined) {
      script += `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(${x}, ${y})
        Start-Sleep -Milliseconds 10
      `;
    }

    // Add scroll simulation
    script += `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseScroll {
          [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
          public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
          
          public const uint MOUSEEVENTF_WHEEL = 0x0800;
          public const uint MOUSEEVENTF_HWHEEL = 0x01000;
        }
"@
    `;

    const scrollAmount = amount * 120; // Standard scroll wheel delta
    
    for (let i = 0; i < amount; i++) {
      switch (direction) {
        case 'up':
          script += `[MouseScroll]::mouse_event([MouseScroll]::MOUSEEVENTF_WHEEL, 0, 0, ${scrollAmount}, 0)`;
          break;
        case 'down':
          script += `[MouseScroll]::mouse_event([MouseScroll]::MOUSEEVENTF_WHEEL, 0, 0, ${-scrollAmount}, 0)`;
          break;
        case 'left':
          script += `[MouseScroll]::mouse_event([MouseScroll]::MOUSEEVENTF_HWHEEL, 0, 0, ${-scrollAmount}, 0)`;
          break;
        case 'right':
          script += `[MouseScroll]::mouse_event([MouseScroll]::MOUSEEVENTF_HWHEEL, 0, 0, ${scrollAmount}, 0)`;
          break;
      }
      
      if (i < amount - 1) {
        script += 'Start-Sleep -Milliseconds 50';
      }
    }

    await execAsync(`powershell -Command "${script}"`);
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $pos = [System.Windows.Forms.Cursor]::Position
      Write-Output "$($pos.X),$($pos.Y)"
    `;

    const { stdout } = await execAsync(`powershell -Command "${script}"`);    const [x, y] = stdout.trim().split(',').map(Number);
    
    return { x: x || 0, y: y || 0 };
  }  async sendInput(input: MouseInput): Promise<void> {
    const { x, y, button = 'left', action, scrollDelta } = input;
    
    switch (action) {
      case 'move':
        await this.moveCursor({ x, y, duration: 100 });
        break;
      case 'click':
        await this.click({ button, x, y, clickCount: 1 });
        break;
      case 'scroll':
        if (scrollDelta !== undefined) {
          const direction = scrollDelta > 0 ? 'up' : 'down';
          await this.scroll({ direction, amount: Math.abs(scrollDelta), x, y });
        }
        break;
      case 'down':
      case 'up':
        // For more precise control, we'd need to implement separate mouse down/up
        // For now, we'll use click as fallback
        await this.click({ button, x, y, clickCount: 1 });
        break;
    }
  }
}
