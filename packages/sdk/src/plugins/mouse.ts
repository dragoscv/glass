import type { MouseInput } from '@glassmcp/shared';
import type { GlassMCPClient } from '../client';

export class MousePlugin {
  constructor(private client: GlassMCPClient) {}

  async sendInput(input: MouseInput): Promise<boolean> {
    const response = await this.client.request<{ success: boolean }>('POST', '/api/mouse/send', input);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send mouse input');
    }
    
    return response.data?.success || false;
  }

  async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    return this.sendInput({
      x,
      y,
      button,
      action: 'click'
    });
  }

  async doubleClick(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    await this.click(x, y, button);
    await this.delay(100);
    return this.click(x, y, button);
  }

  async move(x: number, y: number): Promise<boolean> {
    return this.sendInput({
      x,
      y,
      action: 'move'
    });
  }

  async scroll(x: number, y: number, delta: number): Promise<boolean> {
    return this.sendInput({
      x,
      y,
      action: 'scroll',
      scrollDelta: delta
    });
  }

  async mouseDown(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    return this.sendInput({
      x,
      y,
      button,
      action: 'down'
    });
  }

  async mouseUp(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    return this.sendInput({
      x,
      y,
      button,
      action: 'up'
    });
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    await this.mouseDown(fromX, fromY, button);
    await this.move(toX, toY);
    return this.mouseUp(toX, toY, button);
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    const response = await this.client.request<{ x: number; y: number }>('GET', '/api/mouse/position');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get mouse position');
    }
    
    return response.data || { x: 0, y: 0 };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
