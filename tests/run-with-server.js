const { spawn } = require('child_process');
const fetch = require('node-fetch');

const PORT = process.env.TEST_PORT || '4010';
const BASE = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHealthy() {
  try {
    const res = await fetch(BASE + '/health', { method: 'GET' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) return true;
    await sleep(200);
  }
  return false;
}

function runNodeScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(code == null ? 1 : code));
  });
}

async function main() {
  const testScript = process.argv[2];
  if (!testScript) {
    console.error('Usage: node tests/run-with-server.js <test-script-path>');
    process.exit(2);
  }

  const hadExistingServer = await isHealthy();
  let serverProc = null;

  if (!hadExistingServer) {
    serverProc = spawn(process.execPath, ['server/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });

    const ready = await waitForHealth(15000);
    if (!ready) {
      if (serverProc && !serverProc.killed) {
        try { serverProc.kill(); } catch (e) {}
      }
      console.error(`Test server failed to start at ${BASE}`);
      process.exit(3);
    }
  }

  const code = await runNodeScript(testScript, { BASE });

  if (serverProc && !serverProc.killed) {
    try { serverProc.kill(); } catch (e) {}
  }

  process.exit(code);
}

main().catch((err) => {
  console.error('Test runner error', err);
  process.exit(99);
});
