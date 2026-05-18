import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const excludedParts = [
  'node_modules',
  '.git',
  'editor/ai',
  'logs',
  'generated/forge/build'
];

function normalize(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

function shouldExclude(relativePath: string): boolean {
  const normalized = normalize(relativePath);
  if (normalized.endsWith('.blockforge.zip')) return true;
  return excludedParts.some(part => normalized === part || normalized.startsWith(`${part}/`));
}

async function addDir(zip: JSZip, root: string, dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full);
    if (shouldExclude(relative)) continue;
    if (entry.isDirectory()) await addDir(zip, root, full);
    else zip.file(normalize(relative), await fs.readFile(full));
  }
}

export async function exportProjectZip(projectDir: string, outputFile?: string): Promise<string> {
  const zip = new JSZip();
  await addDir(zip, projectDir, projectDir);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const target = outputFile || path.join(projectDir, 'exports', `${path.basename(projectDir)}.blockforge.zip`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return target;
}
