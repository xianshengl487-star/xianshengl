import fs from 'node:fs/promises';
import path from 'node:path';

export interface SnapshotInfo {
  id: string;
  path: string;
  createdAt: string;
  reason: string;
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.name === 'snapshots' && path.basename(src) === 'editor') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

export async function createSnapshot(projectDir: string, reason: string): Promise<string> {
  const safeReason = reason.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(projectDir, 'editor/snapshots', `${timestamp}_${safeReason}`);
  await fs.mkdir(target, { recursive: true });
  for (const name of ['blockforge.project.json', 'editor']) {
    const src = path.join(projectDir, name);
    try {
      const stat = await fs.stat(src);
      if (stat.isDirectory()) await copyDir(src, path.join(target, name));
      else await fs.copyFile(src, path.join(target, name));
    } catch {}
  }
  return target;
}

export async function listSnapshots(projectDir: string): Promise<SnapshotInfo[]> {
  const root = path.join(projectDir, 'editor/snapshots');
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const snapshots = entries
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const match = entry.name.match(/^(.+?)_(.+)$/);
        return {
          id: entry.name,
          path: path.join(root, entry.name),
          createdAt: match?.[1]?.replace(/-/g, ':').replace('T', ' ').replace('Z', '') || entry.name,
          reason: match?.[2] || 'snapshot'
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
    return snapshots;
  } catch {
    return [];
  }
}

async function replaceDir(src: string, dest: string): Promise<void> {
  await fs.rm(dest, { recursive: true, force: true });
  await copyDir(src, dest);
}

function assertSnapshotPath(projectDir: string, snapshotId: string): string {
  const snapshotsRoot = path.resolve(projectDir, 'editor/snapshots');
  const snapshotPath = path.resolve(snapshotsRoot, snapshotId);
  if (!snapshotPath.startsWith(snapshotsRoot + path.sep)) {
    throw new Error('无效的快照 id。');
  }
  return snapshotPath;
}

export async function restoreSnapshot(projectDir: string, snapshotId: string): Promise<void> {
  const snapshotPath = assertSnapshotPath(projectDir, snapshotId);
  await fs.stat(snapshotPath);
  await createSnapshot(projectDir, 'before_restore');

  const projectFile = path.join(snapshotPath, 'blockforge.project.json');
  try {
    await fs.copyFile(projectFile, path.join(projectDir, 'blockforge.project.json'));
  } catch {}

  const editorSnapshot = path.join(snapshotPath, 'editor');
  for (const name of ['project.json', 'elements', 'logic', 'variables', 'resources', 'templates', 'plugins', 'ai']) {
    const src = path.join(editorSnapshot, name);
    const dest = path.join(projectDir, 'editor', name);
    try {
      const stat = await fs.stat(src);
      if (stat.isDirectory()) await replaceDir(src, dest);
      else {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
      }
    } catch {}
  }
}
