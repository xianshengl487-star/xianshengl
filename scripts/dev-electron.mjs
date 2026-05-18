import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const children = new Set();

function bin(name) {
  return path.join(root, 'node_modules', '.bin', isWindows ? `${name}.cmd` : name);
}

function spawnTool(command, args, env = process.env, stdio = 'inherit') {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio,
    shell: isWindows
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function runOnce(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnTool(command, args);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) return;
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for renderer dev server at ${url}`);
}

function cleanup() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});
process.on('exit', cleanup);

console.log('[BlockForge] Compiling Electron main process...');
await runOnce(bin('tsc'), ['-p', 'tsconfig.main.json']);

let viteStarted = false;
if (!(await isReachable(devUrl))) {
  console.log(`[BlockForge] Starting renderer dev server at ${devUrl}...`);
  spawnTool(bin('vite'), ['--host', '127.0.0.1'], process.env, 'inherit');
  viteStarted = true;
} else {
  console.log(`[BlockForge] Reusing renderer dev server at ${devUrl}.`);
}

await waitForUrl(devUrl);

console.log('[BlockForge] Launching Electron desktop app...');
const electron = spawnTool(bin('electron'), ['.'], {
  ...process.env,
  NODE_ENV: 'development',
  VITE_DEV_SERVER_URL: devUrl
});

electron.on('exit', code => {
  if (viteStarted) cleanup();
  process.exit(code ?? 0);
});
