export type LoaderId = 'forge' | 'fabric' | 'paper';

export function loaderShortName(loader: LoaderId): string {
  if (loader === 'fabric') return 'Fabric';
  if (loader === 'paper') return 'Paper';
  return 'Forge';
}

export function loaderDisplayName(loader: LoaderId): string {
  if (loader === 'fabric') return 'Fabric 模组';
  if (loader === 'paper') return 'Paper 插件';
  return 'Forge 模组';
}

export function loaderOutputFolder(loader: LoaderId): LoaderId {
  return loader;
}

export function loaderDeployFolder(loader: LoaderId): 'mods' | 'plugins' {
  return loader === 'paper' ? 'plugins' : 'mods';
}

export function isPluginLoader(loader: LoaderId): loader is 'paper' {
  return loader === 'paper';
}

export interface ProjectModel {
  schemaVersion: string;
  projectId: string;
  displayName: string;
  modId: string;
  namespace: string;
  packageName: string;
  author: string;
  description: string;
  minecraftVersion: string;
  javaVersion: string;
  targetLoaders: LoaderId[];
  primaryLoader: LoaderId;
  license: string;
  createdAt: string;
  updatedAt: string;
  features: {
    datapack: boolean;
    resourcepack: boolean;
    aiAssistant: boolean;
    advancedCodeMode: boolean;
  };
  paths: {
    editor: string;
    generated: string;
    exports: string;
    snapshots: string;
  };
}

export function createDefaultProject(displayName: string, modId: string, primaryLoader: LoaderId = 'forge'): ProjectModel {
  const now = new Date().toISOString();
  return {
    schemaVersion: '0.1.0',
    projectId: modId,
    displayName,
    modId,
    namespace: modId,
    packageName: `com.blockforge.${modId}`,
    author: 'user',
    description: 'A visual Minecraft mod project created by BlockForge Studio.',
    minecraftVersion: '1.20.1',
    javaVersion: '17',
    targetLoaders: [primaryLoader],
    primaryLoader,
    license: 'All Rights Reserved',
    createdAt: now,
    updatedAt: now,
    features: {
      datapack: true,
      resourcepack: true,
      aiAssistant: true,
      advancedCodeMode: true
    },
    paths: {
      editor: 'editor',
      generated: 'generated',
      exports: 'exports',
      snapshots: 'editor/snapshots'
    }
  };
}
