#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { takeScreenshots } from './utils/screenshotter';
import { ScreenshotConfig, View, Interaction } from './types';
import { spawn } from 'child_process';
import readline from 'readline';
import { detectExpoRoutes } from './utils/routeDetector';
import inquirer from 'inquirer';

const program = new Command();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptYesNo = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question(`${question} (Y/n): `, (answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes' || normalizedAnswer === '');
    });
  });
};

const runCommand = (command: string, args: string[]): Promise<number> => {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    let childProcess;
    
    if (isWindows) {
      childProcess = spawn('cmd.exe', ['/c', command, ...args], { 
        stdio: 'inherit',
        shell: true
      });
    } else {
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
  .version('0.3.0');

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
      
      let views: View[] = [
        {
          name: 'Home',
          path: '/'
        },
        {
          name: 'Form with Input',
          path: '/form',
          interactions: [
            {
              type: 'type',
              selector: 'input[placeholder="First Name"]',
              text: 'Jace'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 500
            } as Interaction,
            {
              type: 'type',
              selector: 'input[placeholder="Last Name"]',
              text: 'Sleeman'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 1000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        },
        {
          name: 'Button Click',
          path: '/buttons',
          interactions: [
            {
              type: 'click',
              selector: 'div.css-view-175oi2r[tabindex="0"]'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 2000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        },
        {
          name: 'Complex Interaction Example',
          path: '/complex-form',
          interactions: [
            {
              type: 'type',
              selector: 'input[placeholder="First Name"]',
              text: 'Jace'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 300
            } as Interaction,
            {
              type: 'type',
              selector: 'input[placeholder="Last Name"]',
              text: 'Sleeman'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 300
            } as Interaction,
            {
              type: 'click',
              selector: 'div[tabindex="0"].css-view-175oi2r[style*="background-color: rgb(53, 122, 189)"]'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 2000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        }
      ];
      
      const isExpoRouterProject = await fs.pathExists(path.join(process.cwd(), 'app')) || 
                                 await fs.pathExists(path.join(process.cwd(), 'src/app'));
      
      if (isExpoRouterProject) {
        const shouldAutoDetectRoutes = await promptYesNo('Do you want us to automatically detect all routes for you?');
        
        if (shouldAutoDetectRoutes) {
          let appDir = './app';
          if (!await fs.pathExists(appDir)) {
            appDir = './src/app';
            if (!await fs.pathExists(appDir)) {
              console.log(chalk.yellow('Could not find app directory. Using default routes.'));
            }
          }
          
          if (await fs.pathExists(appDir)) {
            const detectedRoutes = await detectExpoRoutes(appDir);
            
            if (detectedRoutes.length > 0) {
              console.log(chalk.green(`Detected ${detectedRoutes.length} routes:`));
              detectedRoutes.forEach((route, index) => {
                console.log(chalk.blue(`${index + 1}. ${route.name}: ${route.path}`));
              });
              
              const selectionOptions = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'routeSelectionOption',
                  message: 'How would you like to select routes?',
                  choices: [
                    { name: 'Select specific routes interactively', value: 'select' },
                    { name: 'Use all detected routes', value: 'all' },
                    { name: 'Use default routes', value: 'default' }
                  ]
                }
              ]);
              
              if (selectionOptions.routeSelectionOption === 'select') {
                const selectedRoutes = await selectRoutesInteractively(detectedRoutes);
                
                if (selectedRoutes.length > 0) {
                  views = selectedRoutes;
                  console.log(chalk.green(`Selected ${views.length} routes for configuration.`));
                } else {
                  console.log(chalk.yellow('No routes selected. Using default routes.'));
                }
              } else if (selectionOptions.routeSelectionOption === 'all') {
                views = detectedRoutes;
                console.log(chalk.green('Using all detected routes for configuration.'));
              } else {
                console.log(chalk.yellow('Using default routes.'));
              }
            } else {
              console.log(chalk.yellow('No routes detected. Using default routes.'));
            }
          }
        }
      }
      
      const defaultConfig: ScreenshotConfig = {
        views,
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
            scrollY: 500  
          },
          {
            width: 1280,
            height: 800,
            name: 'Tablet Full Page',
            fullPage: true  
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
        useDeviceFrame: false  
      };
      
      await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
      console.log(chalk.green('Created expo-screenshotter.json'));
      console.log(chalk.blue('Edit this file to configure your screenshot settings'));
      
      const isExpoProject = await fs.pathExists(path.join(process.cwd(), 'app.json')) || 
                            await fs.pathExists(path.join(process.cwd(), 'app.config.js'));
      
      if (isExpoProject) {
        console.log(chalk.yellow('\nIMPORTANT: This tool requires web support for your Expo app.'));
        console.log(chalk.yellow('You will need react-native-web installed to capture screenshots.'));
        
        const shouldInstallDeps = await promptYesNo('Would you like to install the required web dependencies now?');
        
        if (shouldInstallDeps) {
          console.log(chalk.blue('\nInstalling react-native-web...'));
          try {
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

process.on('exit', () => {
  if (rl.listenerCount('line') > 0) {
    rl.close();
  }
});

const selectRoutesInteractively = async (routes: View[]): Promise<View[]> => {
  console.log(chalk.yellow('Use arrow keys to navigate, space to select routes, and enter to confirm:'));
  
  const { selectedRoutes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedRoutes',
      message: 'Select routes:',
      choices: routes.map((route, index) => ({
        name: `${index + 1}. ${route.name}: ${route.path}`,
        value: route,
        checked: false
      })),
      pageSize: 10
    }
  ]);
  
  return selectedRoutes;
}; 