#!/usr/bin/env node

/**
 * Check if Caddy is installed and provide installation instructions if not
 */

import { execSync } from 'child_process';
import os from 'os';

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function checkCaddy() {
  try {
    execSync('which caddy', { stdio: 'ignore' });
    console.log(`${colors.green}✓${colors.reset} Caddy is installed`);
    return true;
  } catch {
    console.error(`${colors.red}✗${colors.reset} Caddy is not installed`);
    console.log(`${colors.yellow}ℹ${colors.reset} Installation instructions:\n`);

    const platform = os.platform();

    if (platform === 'darwin') {
      console.log('  macOS:');
      console.log('    brew install caddy');
    } else if (platform === 'linux') {
      console.log('  Ubuntu/Debian:');
      console.log(
        '    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https'
      );
      console.log(
        "    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg"
      );
      console.log(
        '    echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list'
      );
      console.log('    sudo apt update && sudo apt install caddy');
      console.log('');
      console.log('  Other Linux distributions:');
      console.log('    Visit https://caddyserver.com/docs/install');
    } else if (platform === 'win32') {
      console.log('  Windows:');
      console.log('    choco install caddy');
      console.log('    or');
      console.log('    scoop install caddy');
    }

    console.log('');
    console.log(
      `For more options, visit: ${colors.yellow}https://caddyserver.com/docs/install${colors.reset}`
    );
    return false;
  }
}

// Run the check
if (!checkCaddy()) {
  process.exit(1);
}
