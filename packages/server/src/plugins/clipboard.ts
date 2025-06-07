import { exec } from 'child_process';
import { promisify } from 'util';
import type { 
  PluginInterface, 
  ClipboardSetRequest, 
  ClipboardContent, 
  ClipboardData 
} from '@glassmcp/shared';

const execAsync = promisify(exec);

export class ClipboardPlugin implements PluginInterface {
  public readonly name = 'clipboard';
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
      'get_text',
      'set_text',
      'get_content',
      'set_content',
      'monitor_changes',
    ];
  }

  async getText(): Promise<string> {
    try {
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Clipboard]::GetText()
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get clipboard text:', error);
      return '';
    }
  }

  async setText(text: string): Promise<void> {
    // Escape special characters for PowerShell
    const escapedText = text.replace(/["`$]/g, '`$&').replace(/\r?\n/g, '`n');
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText("${escapedText}")
    `;

    try {
      await execAsync(`powershell -Command "${script}"`);
    } catch (error) {
      console.error('Failed to set clipboard text:', error);
      throw error;
    }
  }

  async setContent(request: ClipboardSetRequest): Promise<void> {
    const { text, format = 'text' } = request;
    
    switch (format) {
      case 'text':
        await this.setText(text);
        break;
      case 'html':
        await this.setHtmlText(text);
        break;
      case 'rtf':
        await this.setRtfText(text);
        break;
      default:
        throw new Error(`Unsupported clipboard format: ${format}`);
    }
  }

  private async setHtmlText(html: string): Promise<void> {
    const escapedHtml = html.replace(/["`$]/g, '`$&').replace(/\r?\n/g, '`n');
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText("${escapedHtml}", [System.Windows.Forms.TextDataFormat]::Html)
    `;

    await execAsync(`powershell -Command "${script}"`);
  }

  private async setRtfText(rtf: string): Promise<void> {
    const escapedRtf = rtf.replace(/["`$]/g, '`$&').replace(/\r?\n/g, '`n');
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText("${escapedRtf}", [System.Windows.Forms.TextDataFormat]::Rtf)
    `;

    await execAsync(`powershell -Command "${script}"`);
  }

  async getContent(): Promise<ClipboardContent> {
    try {
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        $clipboard = [System.Windows.Forms.Clipboard]
        
        $result = @{
          text = if ($clipboard::ContainsText()) { $clipboard::GetText() } else { "" }
          hasImage = $clipboard::ContainsImage()
          hasFiles = $clipboard::ContainsFileDropList()
          formats = @()
        }
        
        if ($clipboard::ContainsText()) { $result.formats += "text" }
        if ($clipboard::ContainsImage()) { $result.formats += "image" }
        if ($clipboard::ContainsFileDropList()) { $result.formats += "files" }
        if ($clipboard::ContainsText([System.Windows.Forms.TextDataFormat]::Html)) { $result.formats += "html" }
        if ($clipboard::ContainsText([System.Windows.Forms.TextDataFormat]::Rtf)) { $result.formats += "rtf" }
        
        $result | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const result = JSON.parse(stdout);
      
      return {
        text: result.text || '',
        hasImage: result.hasImage || false,
        hasFiles: result.hasFiles || false,
        formats: result.formats || [],
      };
    } catch (error) {
      console.error('Failed to get clipboard content:', error);
      return {
        text: '',
        hasImage: false,
        hasFiles: false,
        formats: [],
      };
    }
  }

  async getData(type: 'text' | 'image' | 'files'): Promise<ClipboardData> {
    const content = await this.getContent();
    
    switch (type) {
      case 'text':
        return {
          type: 'text',
          content: content.text,
          metadata: {
            formats: content.formats.filter(f => f.includes('text') || f === 'html' || f === 'rtf'),
          },
        };
      case 'image':
        if (content.hasImage) {
          // For images, we'd need to implement base64 encoding
          // For now, return placeholder
          return {
            type: 'image',
            content: '', // Would contain base64 encoded image
            metadata: { hasImage: true },
          };
        }
        break;
      case 'files':
        if (content.hasFiles) {
          try {
            const script = `
              Add-Type -AssemblyName System.Windows.Forms
              $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
              $files -join "|"
            `;
            
            const { stdout } = await execAsync(`powershell -Command "${script}"`);
            const files = stdout.trim().split('|').filter(f => f.length > 0);
            
            return {
              type: 'files',
              content: JSON.stringify(files),
              metadata: { count: files.length },
            };
          } catch (error) {
            console.error('Failed to get clipboard files:', error);
          }
        }
        break;
    }
    
    return {
      type,
      content: '',
      metadata: {},
    };
  }

  async clear(): Promise<void> {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::Clear()
    `;

    try {
      await execAsync(`powershell -Command "${script}"`);
    } catch (error) {
      console.error('Failed to clear clipboard:', error);
      throw error;
    }
  }

  async hasFormat(format: string): Promise<boolean> {
    const content = await this.getContent();
    return content.formats.includes(format);
  }
}
