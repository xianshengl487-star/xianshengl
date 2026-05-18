export type LoaderId = 'forge' | 'fabric';

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

export function createDefaultProject(displayName: string, modId: string): ProjectModel {
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
    targetLoaders: ['forge'],
    primaryLoader: 'forge',
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
