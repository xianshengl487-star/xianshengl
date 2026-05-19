import fs from 'node:fs/promises';
import path from 'node:path';
import type { AiProjectApplyResult, AiProjectChangePlan } from '../../shared/types/ai';
import { createSnapshot } from '../snapshot/snapshotService';

const readableExtensions = new Set(['.json', '.mcfunction', '.txt', '.md']);
const maxFileBytes = 80_000;
const maxTotalBytes = 260_000;

const allowedRoots = [
  'blockforge.project.json',
  'editor/elements/',
  'editor/logic/',
  'editor/resources/',
  'editor/ui/',
  'editor/variables/',
  'editor/templates/',
  'editor/plugins/',
  'src/custom/'
];

function normalizeRelativePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '');
}

function isAllowedProjectPath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized.includes('..')) return false;
  if (normalized.startsWith('generated/') || normalized.startsWith('exports/') || normalized.startsWith('logs/')) return false;
  if (normalized.startsWith('node_modules/') || normalized.startsWith('dist/')) return false;
  return allowedRoots.some(root => normalized === root || normalized.startsWith(root));
}

function resolveProjectPath(projectDir: string, relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!isAllowedProjectPath(normalized)) throw new Error(`AI 变更路径不在允许范围内：${relativePath}`);
  const root = path.resolve(projectDir);
  const target = path.resolve(projectDir, normalized);
  if (!target.startsWith(root)) throw new Error(`AI 变更路径越界：${relativePath}`);
  return target;
}

async function walk(dir: string, root: string, out: Array<{ path: string; content: string; size: number }>): Promise<void> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    const relativePath = path.relative(root, target).replace(/\\/g, '/');
    if (!isAllowedProjectPath(relativePath)) continue;
    if (entry.isDirectory()) {
      await walk(target, root, out);
      continue;
    }
    if (!entry.isFile() || !readableExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = await fs.stat(target);
    if (stat.size > maxFileBytes) continue;
    const used = out.reduce((sum, file) => sum + file.size, 0);
    if (used + stat.size > maxTotalBytes) return;
    out.push({ path: relativePath, content: await fs.readFile(target, 'utf8'), size: stat.size });
  }
}

export async function collectProjectFilesForAi(projectDir: string): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string; size: number }> = [];
  const projectFile = path.join(projectDir, 'blockforge.project.json');
  try {
    const stat = await fs.stat(projectFile);
    if (stat.size <= maxFileBytes) files.push({ path: 'blockforge.project.json', content: await fs.readFile(projectFile, 'utf8'), size: stat.size });
  } catch {
    // New projects may not have a project file yet; ignore here.
  }
  for (const root of ['editor', 'src/custom']) {
    await walk(path.join(projectDir, root), projectDir, files);
  }
  return files.map(({ path: filePath, content }) => ({ path: filePath, content }));
}

export function validateProjectChangePlan(plan: AiProjectChangePlan): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const file of plan.files) {
    const relativePath = normalizeRelativePath(file.path);
    if (!relativePath) errors.push('存在空文件路径。');
    if (seen.has(relativePath)) errors.push(`重复修改同一文件：${relativePath}`);
    seen.add(relativePath);
    if (!isAllowedProjectPath(relativePath)) errors.push(`路径不允许：${relativePath}`);
    if (file.action === 'create_or_replace' && file.content === undefined) errors.push(`缺少文件内容：${relativePath}`);
    if (file.action === 'create_or_replace' && relativePath.endsWith('.json')) {
      try {
        JSON.parse(file.content || '');
      } catch {
        errors.push(`JSON 内容无效：${relativePath}`);
      }
    }
  }
  return errors;
}

export async function applyProjectChangePlan(projectDir: string, plan: AiProjectChangePlan): Promise<AiProjectApplyResult> {
  const errors = validateProjectChangePlan(plan);
  if (errors.length) throw new Error(`AI 变更计划未通过校验：\n${errors.join('\n')}`);
  const snapshotPath = await createSnapshot(projectDir, `before_ai_project_change_${Date.now()}`);
  const changedFiles: string[] = [];
  const deletedFiles: string[] = [];
  for (const file of plan.files) {
    const relativePath = normalizeRelativePath(file.path);
    const target = resolveProjectPath(projectDir, relativePath);
    if (file.action === 'delete') {
      await fs.rm(target, { force: true });
      deletedFiles.push(relativePath);
      continue;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content || '', 'utf8');
    changedFiles.push(relativePath);
  }
  return { snapshotPath, changedFiles, deletedFiles };
}
