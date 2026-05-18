import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export type PrivacyFinding = {
  type: string;
  file: string;
  line: number;
};

export type PrivacyScanResult = {
  ok: boolean;
  rootDir: string;
  scannedFiles: number;
  findings: PrivacyFinding[];
};

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'artifacts']);
const ignoredFileNames = new Set([
  'texture-editor-draft.json',
  'model-editor-draft.json'
]);
const binaryExtensions = /\.(png|jpg|jpeg|gif|webp|jar|zip|asar|ico|exe|dll|class)$/i;

const patterns = [
  { name: 'API Key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Windows user path', regex: /C:\\Users\\[A-Za-z0-9_.-]+/g },
  { name: 'WeChat temp id', regex: new RegExp('wx' + 'id_' + '[A-Za-z0-9_]+', 'g') },
  { name: 'Email address', regex: /(?<!\\)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { name: 'Inline apiKey value', regex: /\bapiKey\s*[:=]\s*["'][^"']{8,}["']/g }
];

function normalizePath(value: string) {
  return value.replace(/\\/g, '/');
}

function shouldSkip(rootDir: string, filePath: string) {
  const relative = path.relative(rootDir, filePath);
  const parts = relative.split(path.sep);
  if (parts.some(part => ignoredDirs.has(part))) return true;
  if (ignoredFileNames.has(path.basename(filePath))) return true;
  const normalized = normalizePath(filePath);
  return [
    '/generated/forge/',
    '/exports/',
    '/logs/',
    '/editor/snapshots/'
  ].some(part => normalized.includes(part));
}

async function walk(rootDir: string, dir: string, files: string[] = []) {
  if (shouldSkip(rootDir, dir)) return files;
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if (shouldSkip(rootDir, full)) continue;
    const info = await stat(full);
    if (info.isDirectory()) await walk(rootDir, full, files);
    else if (info.isFile() && info.size <= 2_000_000 && !binaryExtensions.test(full)) files.push(full);
  }
  return files;
}

export async function runPrivacyScan(rootDir: string): Promise<PrivacyScanResult> {
  const resolvedRoot = path.resolve(rootDir);
  const findings: PrivacyFinding[] = [];
  const files = await walk(resolvedRoot, resolvedRoot);

  for (const file of files) {
    const content = await readFile(file, 'utf8').catch(() => '');
    const relative = normalizePath(path.relative(resolvedRoot, file));
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content))) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ type: pattern.name, file: relative, line });
      }
    }
  }

  return {
    ok: findings.length === 0,
    rootDir: resolvedRoot,
    scannedFiles: files.length,
    findings
  };
}
