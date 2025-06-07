import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { GlassMCPClient } from '@glassmcp/sdk';
import { ConfigManager } from '../config';

export const playgroundCommand = new Command('playground')
  .description('Interactive playground for testing GlassMCP')
  .option('-p, --profile <name>', 'use specific profile')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getProfile(options.profile);
      
      const client = new GlassMCPClient(config);
      await client.connect();
      
      console.log(chalk.green('🎮 GlassMCP Interactive Playground'));
      console.log(chalk.gray('Type "exit" to quit\n'));
      
      const status = await client.getStatus();
      console.log(`Connected to server v${status.version}`);
      console.log(`Available plugins: ${status.plugins.map(p => p.name).join(', ')}\n`);
      
      let running = true;
      
      while (running) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: '🪟 Window Management', value: 'window' },
              { name: '⌨️ Keyboard Input', value: 'keyboard' },
              { name: '🖱️ Mouse Input', value: 'mouse' },
              { name: '💻 System Operations', value: 'system' },
              { name: '📋 Clipboard Management', value: 'clipboard' },
              { name: '📁 File System Operations', value: 'filesystem' },
              { name: '📊 Server Status', value: 'status' },
              { name: '❌ Exit', value: 'exit' }
            ]
          }
        ]);
        
        switch (action) {
          case 'window':
            await handleWindowOperations(client);
            break;
          case 'keyboard':
            await handleKeyboardOperations(client);
            break;
          case 'mouse':
            await handleMouseOperations(client);
            break;
          case 'system':
            await handleSystemOperations(client);
            break;
          case 'clipboard':
            await handleClipboardOperations(client);
            break;
          case 'filesystem':
            await handleFilesystemOperations(client);
            break;
          case 'status':
            await showStatus(client);
            break;
          case 'exit':
            running = false;
            break;
        }
        
        if (running) {
          console.log(); // Add spacing
        }
      }
      
      await client.disconnect();
      console.log(chalk.green('👋 Goodbye!'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function handleWindowOperations(client: GlassMCPClient): Promise<void> {
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'Window operation:',
      choices: [
        { name: 'List all windows', value: 'list' },
        { name: 'Get active window', value: 'active' },
        { name: 'Focus window', value: 'focus' },
        { name: 'Minimize window', value: 'minimize' },
        { name: 'Maximize window', value: 'maximize' },
        { name: 'Close window', value: 'close' }
      ]
    }
  ]);
  
  try {
    switch (operation) {
      case 'list':
        const windows = await client.window.list();
        console.log(chalk.blue('\n📋 Windows:'));
        windows.forEach((win, i) => {
          console.log(`  ${i + 1}. ${win.title} (${win.processName}) - Handle: ${win.handle}`);
        });
        break;
        
      case 'active':
        const activeWindow = await client.window.getActive();
        if (activeWindow) {
          console.log(chalk.blue('\n🎯 Active Window:'));
          console.log(`  Title: ${activeWindow.title}`);
          console.log(`  Process: ${activeWindow.processName}`);
          console.log(`  Handle: ${activeWindow.handle}`);
        } else {
          console.log(chalk.yellow('No active window found'));
        }
        break;
        
      // Add other window operations...
      default:
        console.log(chalk.yellow('Operation not implemented yet'));
    }
  } catch (error) {
    console.error(chalk.red('Window operation failed:'), error instanceof Error ? error.message : String(error));
  }
}

async function handleKeyboardOperations(client: GlassMCPClient): Promise<void> {
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'Keyboard operation:',
      choices: [
        { name: 'Type text', value: 'type' },
        { name: 'Send key combination', value: 'shortcut' },
        { name: 'Press single key', value: 'key' }
      ]
    }
  ]);
  
  try {
    switch (operation) {
      case 'type':
        const { text } = await inquirer.prompt([
          { type: 'input', name: 'text', message: 'Text to type:' }
        ]);
        await client.keyboard.type(text);
        console.log(chalk.green('✅ Text typed successfully'));
        break;
        
      default:
        console.log(chalk.yellow('Operation not implemented yet'));
    }
  } catch (error) {
    console.error(chalk.red('Keyboard operation failed:'), error instanceof Error ? error.message : String(error));
  }
}

async function handleMouseOperations(_client: GlassMCPClient): Promise<void> {
  console.log(chalk.yellow('Mouse operations not implemented yet'));
}

async function handleSystemOperations(_client: GlassMCPClient): Promise<void> {
  console.log(chalk.yellow('System operations not implemented yet'));
}

async function handleClipboardOperations(_client: GlassMCPClient): Promise<void> {
  console.log(chalk.yellow('Clipboard operations not implemented yet'));
}

async function handleFilesystemOperations(_client: GlassMCPClient): Promise<void> {
  console.log(chalk.yellow('Filesystem operations not implemented yet'));
}

async function showStatus(client: GlassMCPClient): Promise<void> {
  const status = await client.getStatus();
  console.log(chalk.blue('\n📊 Server Status:'));
  console.log(`  Version: ${status.version}`);
  console.log(`  Uptime: ${Math.round(status.uptime / 1000)}s`);
  console.log(`  Connections: ${status.connections}`);
  console.log(`  Plugins: ${status.plugins.map(p => p.name).join(', ')}`);
}
