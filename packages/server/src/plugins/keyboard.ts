import { exec } from 'child_process';
import { promisify } from 'util';
import type { PluginInterface, KeyboardTypeRequest, KeyboardPressRequest, KeyboardInput } from '@glassmcp/shared';

const execAsync = promisify(exec);

export class KeyboardPlugin implements PluginInterface {
  public readonly name = 'keyboard';
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
      'type_text',
      'press_key',
      'send_keys',
      'virtual_keyboard',
    ];
  }

  async typeText(request: KeyboardTypeRequest): Promise<void> {
    const { text, delay = 50 } = request;
    
    // Escape special characters for PowerShell
    const escapedText = text.replace(/["`$]/g, '`$&');
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
      Start-Sleep -Milliseconds ${delay}
    `;

    await execAsync(`powershell -Command "${script}"`);
  }

  async pressKey(request: KeyboardPressRequest): Promise<void> {
    const { key, modifiers = [], delay = 50 } = request;
    
    let keyCombo = '';
    
    // Handle modifiers
    if (modifiers.includes('ctrl')) keyCombo += '^';
    if (modifiers.includes('alt')) keyCombo += '%';
    if (modifiers.includes('shift')) keyCombo += '+';
    if (modifiers.includes('win')) keyCombo += '^{ESC}'; // Windows key approximation
    
    // Handle special keys
    const specialKeys: Record<string, string> = {
      'enter': '{ENTER}',
      'return': '{ENTER}',
      'tab': '{TAB}',
      'space': ' ',
      'escape': '{ESC}',
      'backspace': '{BACKSPACE}',
      'delete': '{DELETE}',
      'home': '{HOME}',
      'end': '{END}',
      'pageup': '{PGUP}',
      'pagedown': '{PGDN}',
      'up': '{UP}',
      'down': '{DOWN}',
      'left': '{LEFT}',
      'right': '{RIGHT}',
      'insert': '{INSERT}',
      'f1': '{F1}',
      'f2': '{F2}',
      'f3': '{F3}',
      'f4': '{F4}',
      'f5': '{F5}',
      'f6': '{F6}',
      'f7': '{F7}',
      'f8': '{F8}',
      'f9': '{F9}',
      'f10': '{F10}',
      'f11': '{F11}',
      'f12': '{F12}',
    };

    const keyCode = specialKeys[key.toLowerCase()] || key;
    keyCombo += keyCode;

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${keyCombo}")
      Start-Sleep -Milliseconds ${delay}
    `;

    await execAsync(`powershell -Command "${script}"`);
  }
  async sendInput(input: KeyboardInput): Promise<void> {
    const { key, modifiers = [], action } = input;
    
    if (action === 'press') {
      await this.pressKey({ key, modifiers, delay: 50 });
    } else {
      // For down/up actions, we'll use the press action as fallback
      // More sophisticated implementation would require Win32 API calls
      await this.pressKey({ key, modifiers, delay: 50 });
    }
  }

  async sendKeys(keys: string): Promise<void> {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${keys}")
    `;

    await execAsync(`powershell -Command "${script}"`);
  }
}
