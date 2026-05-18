import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  compatibleBlockForge: string;
  compatibleMinecraft: string[];
  compatibleLoaders: string[];
  description: string;
  features: string[];
  allowExecutableCode: boolean;
}

export interface InstalledTemplate {
  manifest: TemplateManifest;
  installedPath: string;
  installedAt: string;
}

export function validateTemplateManifest(manifest: TemplateManifest): string[] {
  const errors: string[] = [];
  for (const key of ['id', 'name', 'version', 'author'] as const) {
    if (!manifest[key]) errors.push(`manifest.${key} 为必填项`);
  }
  if (manifest.allowExecutableCode) errors.push('当前版本不允许导入包含可执行代码的模板包。');
  return errors;
}

function templatesDir(projectDir: string): string {
  return path.join(projectDir, 'editor/templates');
}

export async function readTemplateManifestFromZip(zipFile: string): Promise<TemplateManifest> {
  const zip = await JSZip.loadAsync(await fs.readFile(zipFile));
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('模板包缺少 manifest.json。');
  return JSON.parse(await manifestEntry.async('string')) as TemplateManifest;
}

export async function importTemplatePackage(projectDir: string, sourceFile: string): Promise<InstalledTemplate> {
  const manifest = await readTemplateManifestFromZip(sourceFile);
  const errors = validateTemplateManifest(manifest);
  if (errors.length) throw new Error(errors.join('\n'));
  const safeName = `${manifest.id}-${manifest.version}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const dir = path.join(templatesDir(projectDir), safeName);
  await fs.mkdir(dir, { recursive: true });
  const zipTarget = path.join(dir, `${safeName}.bftemplate.zip`);
  const manifestTarget = path.join(dir, 'manifest.json');
  await fs.copyFile(sourceFile, zipTarget);
  await fs.writeFile(manifestTarget, JSON.stringify(manifest, null, 2), 'utf8');
  const installed: InstalledTemplate = { manifest, installedPath: dir, installedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, 'installed.json'), JSON.stringify(installed, null, 2), 'utf8');
  return installed;
}

export async function listTemplates(projectDir: string): Promise<InstalledTemplate[]> {
  try {
    const entries = await fs.readdir(templatesDir(projectDir), { withFileTypes: true });
    const out: InstalledTemplate[] = [];
    for (const entry of entries.filter(item => item.isDirectory())) {
      try {
        out.push(JSON.parse(await fs.readFile(path.join(templatesDir(projectDir), entry.name, 'installed.json'), 'utf8')) as InstalledTemplate);
      } catch {}
    }
    return out.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  } catch {
    return [];
  }
}
