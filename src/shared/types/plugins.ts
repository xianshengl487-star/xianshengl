import type { ElementModel } from './elements';
import type { LoaderId } from './project';

export type PluginViewTarget =
  | 'home'
  | 'design'
  | 'elements'
  | 'resources'
  | 'logic'
  | 'ui'
  | 'forge'
  | 'ai'
  | 'plugins'
  | 'manage'
  | 'settings';

export type PluginPromptTarget = 'chat' | 'logic' | 'texture' | 'model' | 'feature' | 'project';
export type PluginTone = 'grass' | 'stone' | 'ore' | 'redstone' | 'plank';
export type PluginActionKind = 'open_view' | 'set_ai_prompt' | 'create_element_blueprint' | 'open_external_doc';
export type PluginElementKind = ElementModel['type'];

export interface PluginElementBlueprint {
  id: string;
  label: string;
  kind: PluginElementKind;
  elementId: string;
  zhName: string;
  description?: string;
  properties?: Record<string, unknown>;
}

export interface PluginAiPrompt {
  id: string;
  label: string;
  target: PluginPromptTarget;
  prompt: string;
  description?: string;
}

export interface PluginWorkbenchCard {
  id: string;
  title: string;
  description: string;
  tone?: PluginTone;
  actionId?: string;
  tags?: string[];
}

export interface PluginDocLink {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface PluginAction {
  id: string;
  label: string;
  description: string;
  kind: PluginActionKind;
  targetView?: PluginViewTarget;
  promptTarget?: PluginPromptTarget;
  prompt?: string;
  blueprint?: PluginElementBlueprint;
  url?: string;
}

export interface PluginContributions {
  cards?: PluginWorkbenchCard[];
  actions?: PluginAction[];
  aiPrompts?: PluginAiPrompt[];
  elementBlueprints?: PluginElementBlueprint[];
  docs?: PluginDocLink[];
}

export interface BlockForgePluginManifest {
  kind: 'blockforge.plugin';
  schemaVersion: '0.1.0';
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  compatibleBlockForge: string;
  compatibleMinecraft: string[];
  compatibleLoaders: LoaderId[];
  tags: string[];
  safety: 'declarative';
  allowExecutableCode?: boolean;
  contributes: PluginContributions;
}

export interface InstalledPlugin {
  manifest: BlockForgePluginManifest;
  installedPath: string;
  installedAt: string;
  enabled: boolean;
  source: 'zip' | 'builtin' | 'folder';
}
