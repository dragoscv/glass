import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { 
  connectCommand, 
  statusCommand, 
  playgroundCommand
} from './commands';

const program = new Command();

// ASCII Art Banner
console.log(
  chalk.cyan(
    figlet.textSync('GlassMCP', { 
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    })
  )
);

console.log(chalk.gray('Machine Control Protocol CLI'));
console.log(chalk.gray('Version 1.0.0\n'));

program
  .name('glassmcp')
  .description('Command-line interface for GlassMCP - Machine Control Protocol')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <path>', 'path to config file')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--server <url>', 'server URL (overrides config)')
  .option('--token <token>', 'authentication token (overrides config)');

// Commands
program.addCommand(connectCommand);
program.addCommand(statusCommand);
program.addCommand(playgroundCommand);

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
  writeOut: (str) => process.stdout.write(str),
});

program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

// Parse arguments and run
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { program };
