import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultProject, type LoaderId, type ProjectModel } from '../../shared/types/project';

export function toModId(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || 'my_mod';
}

export function isValidModId(modId: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(modId);
}

export const projectDirs = [
  'editor/elements/blocks',
  'editor/elements/items',
  'editor/elements/tools',
  'editor/elements/recipes',
  'editor/elements/loot_tables',
  'editor/elements/functions',
  'editor/elements/mob_effects',
  'editor/elements/potions',
  'editor/elements/enchantments',
  'editor/logic',
  'editor/variables',
  'editor/resources/textures/item',
  'editor/resources/textures/block',
  'editor/resources/models',
  'editor/resources/models/item',
  'editor/resources/models/block',
  'editor/resources/sounds',
  'editor/resources/lang',
  'editor/resources/functions',
  'editor/templates',
  'editor/ai',
  'editor/snapshots',
  'generated/forge',
  'generated/fabric',
  'generated/paper',
  'generated/datapack',
  'generated/resourcepack',
  'src/custom',
  'exports',
  'logs'
];

export interface CreateProjectOptions {
  modId?: string;
  packageName?: string;
  author?: string;
  description?: string;
  primaryLoader?: LoaderId;
}

export async function ensureProjectStructure(baseDir: string): Promise<void> {
  await fs.mkdir(baseDir, { recursive: true });
  for (const dir of projectDirs) await fs.mkdir(path.join(baseDir, dir), { recursive: true });
}

export async function createProject(baseDir: string, displayName: string, options: CreateProjectOptions = {}): Promise<ProjectModel> {
  const modId = options.modId?.trim() || toModId(displayName);
  if (!isValidModId(modId)) throw new Error(`无效的 mod id：${modId}`);
  const project = createDefaultProject(displayName, modId, options.primaryLoader || 'forge');
  project.packageName = options.packageName?.trim() || project.packageName;
  project.author = options.author?.trim() || project.author;
  project.description = options.description?.trim() || project.description;
  await ensureProjectStructure(baseDir);
  await fs.writeFile(path.join(baseDir, 'blockforge.project.json'), JSON.stringify(project, null, 2), 'utf8');
  await fs.writeFile(path.join(baseDir, 'editor/project.json'), JSON.stringify(project, null, 2), 'utf8');
  await fs.writeFile(path.join(baseDir, 'editor/resources/index.json'), JSON.stringify({ schemaVersion: '0.1.0', resources: [] }, null, 2), 'utf8');
  return project;
}

export async function readProject(projectDir: string): Promise<ProjectModel> {
  const raw = await fs.readFile(path.join(projectDir, 'blockforge.project.json'), 'utf8');
  const parsed = JSON.parse(raw) as Partial<ProjectModel>;
  const primaryLoader = parsed.primaryLoader || parsed.targetLoaders?.[0] || 'forge';
  return {
    ...createDefaultProject(parsed.displayName || 'BlockForge Project', parsed.modId || path.basename(projectDir), primaryLoader),
    ...parsed,
    targetLoaders: parsed.targetLoaders?.length ? parsed.targetLoaders : [primaryLoader],
    primaryLoader
  } as ProjectModel;
}

export async function writeProject(projectDir: string, project: ProjectModel): Promise<void> {
  const next = { ...project, updatedAt: new Date().toISOString() };
  await ensureProjectStructure(projectDir);
  await fs.writeFile(path.join(projectDir, 'blockforge.project.json'), JSON.stringify(next, null, 2), 'utf8');
  await fs.writeFile(path.join(projectDir, 'editor/project.json'), JSON.stringify(next, null, 2), 'utf8');
}
