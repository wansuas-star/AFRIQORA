/**
 * AFRIQORA - Secure Local CDSE Credential Configuration & Test Utility
 * 
 * Securely prompts for Copernicus Data Space Ecosystem credentials locally,
 * updates backend/.env with proper Windows CRLF line endings, and tests authentication.
 * 
 * Never prints or logs secrets.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const primaryEnvPath = path.join(backendDir, '.env');
const altEnvPath = path.resolve('C:/Users/hp/Documents/AFRIQORA/backend/.env');

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    let input = '';

    process.stdout.write(question);

    const onData = (char) => {
      char = char.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f':
        case '\b':
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
          break;
        default:
          input += char;
          break;
      }
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', onData);

      rl.question('', () => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        rl.close();
        console.log('');
        resolve(input.trim());
      });
    } else {
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

function promptRegular(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function writeEnvToFile(filePath, updates) {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const existingMap = new Map();
  const outputLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      outputLines.push(line);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        outputLines.push(key + '=' + updates[key]);
        existingMap.set(key, true);
      } else {
        outputLines.push(line);
      }
    } else {
      outputLines.push(line);
    }
  }

  for (const key of Object.keys(updates)) {
    if (!existingMap.has(key)) {
      outputLines.push(key + '=' + updates[key]);
    }
  }

  const finalContent = outputLines.join('\r\n') + '\r\n';
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('✔ Successfully saved credentials to ' + filePath + ' with Windows CRLF endings.');
}

function updateEnvFiles(updates) {
  writeEnvToFile(primaryEnvPath, updates);
  if (fs.existsSync(path.dirname(altEnvPath))) {
    try {
      writeEnvToFile(altEnvPath, updates);
    } catch (e) {
      // alt path optional
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('AFRIQORA: SECURE COPERNICUS (CDSE) CREDENTIAL CONFIGURATION');
  console.log('================================================================\n');

  const envUsername = process.env.CDSE_INPUT_USERNAME;
  const envPassword = process.env.CDSE_INPUT_PASSWORD;
  const envClientId = process.env.CDSE_INPUT_CLIENT_ID;
  const envClientSecret = process.env.CDSE_INPUT_CLIENT_SECRET;

  const updates = {};

  if (envClientId && envClientSecret) {
    console.log('Using supplied OAuth2 Client Credentials from environment.');
    updates['CDSE_CLIENT_ID'] = envClientId;
    updates['CDSE_CLIENT_SECRET'] = envClientSecret;
  } else if (envUsername && envPassword) {
    console.log('Using supplied Copernicus Account Credentials from environment.');
    updates['CDSE_USERNAME'] = envUsername;
    updates['CDSE_PASSWORD'] = envPassword;
  } else if (!process.stdin.isTTY && process.env.CI) {
    console.log('Non-interactive environment detected without credentials.');
    console.log('Skipping prompt and verifying current configuration.');
  } else {
    console.log('Select Authentication Method:');
    console.log('  [1] Copernicus User Account (Email & Password - Recommended)');
    console.log('  [2] OAuth2 Client Credentials (Client ID & Client Secret)');
    
    const choice = await promptRegular('Enter choice [1 or 2, default=1]: ') || '1';

    if (choice === '2') {
      const clientId = await promptRegular('Enter CDSE_CLIENT_ID: ');
      const clientSecret = await promptHidden('Enter CDSE_CLIENT_SECRET (hidden): ');
      if (!clientId || !clientSecret) {
        console.error('Error: Client ID and Client Secret cannot be empty.');
        process.exit(1);
      }
      updates['CDSE_CLIENT_ID'] = clientId;
      updates['CDSE_CLIENT_SECRET'] = clientSecret;
    } else {
      const username = await promptRegular('Enter CDSE_USERNAME (Copernicus Email): ');
      const password = await promptHidden('Enter CDSE_PASSWORD (hidden): ');
      if (!username || !password) {
        console.error('Error: Username and Password cannot be empty.');
        process.exit(1);
      }
      updates['CDSE_USERNAME'] = username;
      updates['CDSE_PASSWORD'] = password;
    }

    updateEnvFiles(updates);
  }

  console.log('\nTesting Copernicus CDSE OAuth2 Authentication...');
  
  // Dynamically load provider
  const dotenv = require(path.join(backendDir, 'node_modules', 'dotenv'));
  dotenv.config({ path: primaryEnvPath, override: true });

  const { CopernicusCDSEProvider } = require(path.join(backendDir, 'dist', 'modules', 'satellite', 'providers', 'copernicus.provider'));
  const provider = new CopernicusCDSEProvider();

  try {
    const token = await provider.getAccessToken();
    console.log('✔ CDSE OAuth2 Token Negotiation: SUCCESS');

    const health = await provider.healthCheck();
    if (health.ok && health.authenticated) {
      console.log('✔ CDSE OData Catalogue Probe: SUCCESS (Latency: ' + health.latencyMs + 'ms)');
      console.log('\n🎉 Copernicus Data Space Ecosystem is fully authenticated and operational!');
    } else {
      console.error('✘ CDSE OData Probe Warning:', health.status);
    }
  } catch (err) {
    console.error('✘ Authentication Result:', err.message);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  });
}

module.exports = { updateEnvFiles };
