#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { takeScreenshots } from './utils/screenshotter';
import { ScreenshotConfig } from './types';
import { spawn } from 'child_process';
import readline from 'readline';

const program = new Command();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for yes/no questions
const promptYesNo = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question(`${question} (Y/n): `, (answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes' || normalizedAnswer === '');
    });
  });
};

// Helper function to run a command and return its output
const runCommand = (command: string, args: string[]): Promise<number> => {
  return new Promise((resolve, reject) => {
    // On Windows, we need to use different command execution
    const isWindows = process.platform === 'win32';
    let childProcess;
    
    if (isWindows) {
      // On Windows, spawn 'cmd.exe' with '/c' flag followed by the command
      childProcess = spawn('cmd.exe', ['/c', command, ...args], { 
        stdio: 'inherit',
        shell: true
      });
    } else {
      // On Unix-like systems, spawn the command directly
      childProcess = spawn(command, args, { 
        stdio: 'inherit',
        shell: true
      });
    }
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
};

program
  .name('expo-screenshotter')
  .description('Take screenshots of Expo apps at different screen sizes')
  .version('0.1.0');

// Keep the init command for backward compatibility
program
  .command('init')
  .description('Initialize a new expo-screenshotter.json configuration file')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), 'expo-screenshotter.json');
      
      if (await fs.pathExists(configPath)) {
        console.log(chalk.yellow('expo-screenshotter.json already exists!'));
        rl.close();
        return;
      }
      
      const defaultConfig: ScreenshotConfig = {
        views: [
          {
            name: 'Home',
            path: '/'
          }
        ],
        sizes: [
          {
            width: 375,
            height: 812,
            name: 'iPhone X'
          },
          {
            width: 1280,
            height: 800,
            name: 'Tablet'
          },
          {
            width: 2560,
            height: 1440,
            name: 'Desktop'
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X Scrolled',
            scrollY: 500  // Scroll down 500 pixels
          },
          {
            width: 1280,
            height: 800,
            name: 'Tablet Full Page',
            fullPage: true  // Capture the entire page height
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: true,
              color: 'Space Black'
            }
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Gold Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: true,
              color: 'Gold'
            }
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Notch Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: false,
              color: 'Midnight'
            }
          },
          {
            width: 360,
            height: 740,
            name: 'Android with Frame',
            useDeviceFrame: true,
            deviceType: 'android'
          }
        ],
        outputDir: './screenshots',
        expoUrl: 'http://localhost:8081',
        waitTime: 2000,
        useDeviceFrame: false  // Default to not using device frames
      };
      
      await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
      console.log(chalk.green('Created expo-screenshotter.json'));
      console.log(chalk.blue('Edit this file to configure your screenshot settings'));
      
      // Check if this is an Expo project by looking for app.json or app.config.js
      const isExpoProject = await fs.pathExists(path.join(process.cwd(), 'app.json')) || 
                            await fs.pathExists(path.join(process.cwd(), 'app.config.js'));
      
      if (isExpoProject) {
        console.log(chalk.yellow('\nIMPORTANT: This tool requires web support for your Expo app.'));
        console.log(chalk.yellow('You will need react-native-web installed to capture screenshots.'));
        
        const shouldInstallDeps = await promptYesNo('Would you like to install the required web dependencies now?');
        
        if (shouldInstallDeps) {
          console.log(chalk.blue('\nInstalling react-native-web...'));
          try {
            // Use a more direct command that should work cross-platform
            await runCommand('npm', ['install', 'react-native-web']);
            console.log(chalk.green('\nSuccessfully installed web dependencies!'));
            console.log(chalk.blue('You can now run your Expo app with web support using:'));
            console.log(chalk.white('  expo start --web'));
          } catch (error) {
            console.error(chalk.red('\nFailed to install dependencies:'), error);
            console.log(chalk.yellow('Please install manually with: npm install react-native-web'));
          }
        } else {
          console.log(chalk.yellow('\nRemember to install web dependencies before capturing screenshots:'));
          console.log(chalk.white('  npm install react-native-web'));
        }
        
        console.log(chalk.blue('\nTo capture screenshots:'));
        console.log(chalk.white('1. Start your Expo app with: expo start --web'));
        console.log(chalk.white('2. Run: expo-screenshotter capture'));
      }
      
      rl.close();
    } catch (error) {
      console.error(chalk.red('Error initializing:'), error);
      rl.close();
      process.exit(1);
    }
  });

// Keep the capture command for backward compatibility
program
  .command('capture')
  .description('Capture screenshots based on the configuration')
  .option('-c, --config <path>', 'Path to configuration file', 'expo-screenshotter.json')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config);
      
      if (!await fs.pathExists(configPath)) {
        console.log(chalk.red(`Configuration file not found: ${options.config}`));
        console.log(chalk.yellow('Run "expo-screenshotter init" to create a configuration file'));
        rl.close();
        return;
      }
      
      const config = await fs.readJSON(configPath) as ScreenshotConfig;
      console.log(chalk.blue('Starting screenshot capture...'));
      
      try {
        console.log(chalk.yellow('Checking if Expo web server is running...'));
        console.log(chalk.yellow('If this hangs, make sure your Expo app is running with web support: expo start --web'));
        
        await takeScreenshots(config);
        console.log(chalk.green('Screenshots captured successfully!'));
        rl.close();
      } catch (error) {
        console.error(chalk.red('Error capturing screenshots:'), error);
        console.log(chalk.yellow('\nTips:'));
        console.log(chalk.yellow('1. Make sure your Expo app is running with: expo start --web'));
        console.log(chalk.yellow('2. Ensure you have react-native-web installed: npm install react-native-web'));
        console.log(chalk.yellow('3. Check that the expoUrl in your config matches your Expo web server URL'));
        rl.close();
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      rl.close();
      process.exit(1);
    }
  });

program.parse(process.argv);

// Close readline interface if it's still open at the end
process.on('exit', () => {
  if (rl.listenerCount('line') > 0) {
    rl.close();
  }
}); 