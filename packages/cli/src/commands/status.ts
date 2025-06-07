import { Command } from 'commander';
import chalk from 'chalk';
import { GlassMCPClient } from '@glassmcp/sdk';
import { ConfigManager } from '../config';

export const statusCommand = new Command('status')
  .description('Check server status')
  .option('-p, --profile <name>', 'use specific profile')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getProfile(options.profile);
      
      const client = new GlassMCPClient(config);
      await client.connect();
      
      const status = await client.getStatus();
      
      console.log(chalk.green('🔗 GlassMCP Server Status\n'));
      
      console.log(`${chalk.blue('Server:')} ${config.baseUrl}`);
      console.log(`${chalk.blue('Status:')} ${chalk.green('Online')}`);
      console.log(`${chalk.blue('Version:')} ${status.version}`);
      console.log(`${chalk.blue('Uptime:')} ${Math.round(status.uptime / 1000)}s`);
      console.log(`${chalk.blue('Connections:')} ${status.connections}`);
      
      if (status.plugins.length > 0) {
        console.log(chalk.blue('\n📦 Loaded Plugins:'));
        status.plugins.forEach(plugin => {
          console.log(`  ${chalk.green('•')} ${plugin.name} ${chalk.gray(`v${plugin.version}`)}`);
          console.log(`    ${chalk.gray(`${plugin.methods.length} methods available`)}`);
        });
      }
      
      await client.disconnect();
    } catch (error) {
      console.log(chalk.red('❌ Server Status: Offline\n'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
