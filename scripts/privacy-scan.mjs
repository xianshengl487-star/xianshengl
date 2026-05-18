import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'artifacts']);
const ignoredPathParts = [
  `${path.sep}generated${path.sep}forge${path.sep}`,
  `${path.sep}exports${path.sep}`,
  `${path.sep}logs${path.sep}`,
  `${path.sep}editor${path.sep}snapshots${path.sep}`
];
const ignoredFileNames = new Set([
  'texture-editor-draft.json',
  'model-editor-draft.json'
]);

const patterns = [
  { name: 'API Key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Windows user path', regex: /C:\\Users\\[A-Za-z0-9_.-]+/g },
  { name: 'WeChat temp id', regex: new RegExp('wx' + 'id_' + '[A-Za-z0-9_]+', 'g') },
  { name: 'Email address', regex: /(?<!\\)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { name: 'Inline apiKey value', regex: /\bapiKey\s*[:=]\s*["'][^"']{8,}["']/g }
];

function shouldSkip(filePath) {
  const relative = path.relative(root, filePath);
  const parts = relative.split(path.sep);
  if (parts.some(part => ignoredDirs.has(part))) return true;
  if (ignoredFileNames.has(path.basename(filePath))) return true;
  return ignoredPathParts.some(part => filePath.includes(part));
}

async function walk(dir, files = []) {
  if (shouldSkip(dir)) return files;
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if (shouldSkip(full)) continue;
    const info = await stat(full);
    if (info.isDirectory()) await walk(full, files);
    else if (info.isFile() && info.size <= 2_000_000) files.push(full);
  }
  return files;
}

const findings = [];
for (const file of await walk(root)) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  if (/\.(png|jpg|jpeg|gif|webp|jar|zip|asar|ico)$/i.test(relative)) continue;
  const content = await readFile(file, 'utf8').catch(() => '');
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content))) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ type: pattern.name, file: relative, line });
    }
  }
}

if (findings.length > 0) {
  console.error('Privacy scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding.type}: ${finding.file}:${finding.line}`);
  }
  process.exit(1);
}

console.log('Privacy scan passed: no obvious API keys, emails, user paths, or temporary IDs found in scanned source files.');
