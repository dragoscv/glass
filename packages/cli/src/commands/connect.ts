import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { GlassMCPClient } from '@glassmcp/sdk';
import { ConfigManager } from '../config';

export const connectCommand = new Command('connect')
  .description('Connect to GlassMCP server')
  .option('-p, --profile <name>', 'use specific profile')
  .option('-u, --url <url>', 'server URL')
  .option('-t, --token <token>', 'authentication token')
  .action(async (options) => {
    const spinner = ora('Connecting to GlassMCP server...').start();
    
    try {
      const configManager = new ConfigManager();
      const config = configManager.getProfile(options.profile);
      
      // Override with CLI options
      if (options.url) config.baseUrl = options.url;
      if (options.token) {
        config.auth = { type: 'bearer', token: options.token };
      }
      
      const client = new GlassMCPClient(config);
      await client.connect();
      
      const status = await client.getStatus();
      
      spinner.succeed('Connected successfully!');
      
      console.log(chalk.green('\n✓ Connection Status:'));
      console.log(`  Server: ${config.baseUrl}`);
      console.log(`  Version: ${status.version}`);
      console.log(`  Uptime: ${Math.round(status.uptime / 1000)}s`);
      console.log(`  Plugins: ${status.plugins.length}`);
      console.log(`  Active Connections: ${status.connections}`);
      
      if (status.plugins.length > 0) {
        console.log(chalk.blue('\n📦 Available Plugins:'));
        status.plugins.forEach(plugin => {
          console.log(`  • ${plugin.name} v${plugin.version} (${plugin.methods.length} methods)`);
        });
      }
      
      await client.disconnect();
    } catch (error) {
      spinner.fail('Connection failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
