import fs from 'node:fs/promises';
import path from 'node:path';
import type { UiScreenModel } from '../../shared/types/ui';

const uiDir = (projectDir: string) => path.join(projectDir, 'editor', 'ui');

function safeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || `screen_${Date.now()}`;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function normalizeScreen(screen: UiScreenModel): UiScreenModel {
  return {
    schemaVersion: '0.1.0',
    id: safeId(screen.id || screen.name),
    name: String(screen.name || screen.id || '新界面'),
    width: Math.max(80, Number(screen.width || 176)),
    height: Math.max(60, Number(screen.height || 166)),
    background: String(screen.background || '#c6c6c6'),
    widgets: Array.isArray(screen.widgets)
      ? screen.widgets.map((widget, index) => ({
        id: String(widget.id || `widget_${index}_${Date.now()}`),
        type: widget.type === 'button' || widget.type === 'image' || widget.type === 'slot' ? widget.type : 'label',
        x: Math.max(0, Number(widget.x || 0)),
        y: Math.max(0, Number(widget.y || 0)),
        width: Math.max(8, Number(widget.width || 60)),
        height: Math.max(8, Number(widget.height || 18)),
        text: String(widget.text || ''),
        texture: widget.texture ? String(widget.texture) : undefined,
        action: widget.action ? String(widget.action) : undefined
      }))
      : [],
    updatedAt: new Date().toISOString()
  };
}

export function createDefaultUiScreen(name = '新界面'): UiScreenModel {
  const id = safeId(name);
  return {
    schemaVersion: '0.1.0',
    id,
    name,
    width: 176,
    height: 166,
    background: '#c6c6c6',
    widgets: [
      { id: `label_${Date.now()}`, type: 'label', x: 12, y: 10, width: 88, height: 18, text: '标题文本' },
      { id: `button_${Date.now()}`, type: 'button', x: 56, y: 132, width: 64, height: 20, text: '按钮', action: 'close' }
    ],
    updatedAt: new Date().toISOString()
  };
}

export async function saveUiScreen(projectDir: string, screen: UiScreenModel): Promise<UiScreenModel> {
  const normalized = normalizeScreen(screen);
  await fs.mkdir(uiDir(projectDir), { recursive: true });
  await fs.writeFile(path.join(uiDir(projectDir), `${normalized.id}.json`), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

export async function loadUiScreens(projectDir: string): Promise<UiScreenModel[]> {
  await fs.mkdir(uiDir(projectDir), { recursive: true });
  const entries = await fs.readdir(uiDir(projectDir), { withFileTypes: true });
  const screens: UiScreenModel[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const parsed = await readJson<UiScreenModel>(path.join(uiDir(projectDir), entry.name));
    if (parsed) screens.push(normalizeScreen(parsed));
  }
  return screens.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
