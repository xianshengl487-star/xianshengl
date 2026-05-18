import type { AiChatMessage, AiProjectApplyResult, AiProjectChangePlan, AiProviderConfig } from '../shared/types/ai';
import type { Diagnostic, ElementModel } from '../shared/types/elements';
import type { ProjectModel } from '../shared/types/project';
import type { ResourceIndex, ResourceItem } from '../shared/types/resources';
import type { BlockForgeIR, LogicGraph, LogicNode } from '../shared/types/logic';
import type { UiScreenModel } from '../shared/types/ui';

type SnapshotInfo = {
  id: string;
  path: string;
  createdAt: string;
  reason: string;
};

type InstalledTemplate = {
  manifest: {
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
  };
  installedPath: string;
  installedAt: string;
};

type ProjectOpenResult = { projectDir: string; project: ProjectModel } | null;
type ElementSet = {
  items: ElementModel[];
  blocks: ElementModel[];
  recipes: ElementModel[];
  lootTables: ElementModel[];
  functions: ElementModel[];
  mobEffects: ElementModel[];
  potions: ElementModel[];
  enchantments: ElementModel[];
};

type AppSettings = {
  autoBuildAfterGenerate: boolean;
  backgroundColor: string;
  completedProjects: Array<{
    id: string;
    name: string;
    modId: string;
    projectDir: string;
    status: 'completed' | 'polish' | 'archived';
    notes: string;
    updatedAt: string;
  }>;
};

type TextureEditorDraft = {
  textureName: string;
  textureUsage: 'item_texture' | 'block_texture';
  textureOwner: string;
  textureSize: 16 | 32 | 64;
  textureColor: string;
  textureTool: 'pencil' | 'eraser' | 'fill' | 'eyedropper';
  texturePixels: string[];
  updatedAt?: string;
};

type ModelEditorDraft = {
  modelName: string;
  modelUsage: 'item_model' | 'block_model';
  modelOwner: string;
  modelJson: string;
  updatedAt?: string;
};

type PrivacyScanResult = {
  ok: boolean;
  rootDir: string;
  scannedFiles: number;
  findings: Array<{
    type: string;
    file: string;
    line: number;
  }>;
};

declare global {
  interface Window {
    blockforge?: {
      version: string;
      project: {
        create(payload: { projectDir: string; displayName: string; modId?: string; packageName?: string; author?: string; description?: string }): Promise<ProjectOpenResult>;
        createSample(payload: { projectDir: string }): Promise<ProjectOpenResult>;
        open(payload?: { projectDir?: string }): Promise<ProjectOpenResult>;
        readRecent(): Promise<string[]>;
        exportZip(payload: { projectDir: string; outputFile?: string }): Promise<string>;
      };
      settings: {
        read(): Promise<AppSettings>;
        save(payload: { settings: AppSettings }): Promise<AppSettings>;
      };
      appCommands: {
        onCommand(callback: (command: string) => void): () => void;
      };
      elements: {
        createItem(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createBlock(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createRecipe(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createLootTable(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createFunction(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createMobEffect(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createPotion(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        createEnchantment(payload: { projectDir: string; id: string; zhName: string }): Promise<ElementModel>;
        save(payload: { projectDir: string; element: ElementModel }): Promise<ElementSet>;
        duplicate(payload: { projectDir: string; element: ElementModel; newId: string; zhName?: string }): Promise<{ copied: ElementModel; elements: ElementSet }>;
        delete(payload: { projectDir: string; type: ElementModel['type']; id: string }): Promise<ElementSet>;
        list(payload: { projectDir: string; folder?: string }): Promise<ElementSet | ElementModel[]>;
      };
      resources: {
        importTexture(payload: { projectDir: string; sourceFile?: string; usage: 'item_texture' | 'block_texture'; ownerElement: string }): Promise<unknown>;
        saveTexture(payload: { projectDir: string; pngDataUrl: string; usage: 'item_texture' | 'block_texture'; ownerElement: string; textureName?: string }): Promise<unknown>;
        importModel(payload: { projectDir: string; sourceFile?: string; usage: 'item_model' | 'block_model'; ownerElement: string; modelName?: string }): Promise<unknown>;
        saveModel(payload: { projectDir: string; jsonText: string; usage: 'item_model' | 'block_model'; ownerElement: string; modelName?: string }): Promise<unknown>;
        duplicate(payload: { projectDir: string; resourceId: string; newName?: string }): Promise<ResourceItem>;
        delete(payload: { projectDir: string; resourceId: string }): Promise<ResourceIndex>;
        readIndex(payload: { projectDir: string }): Promise<ResourceIndex>;
        checkMissing(payload: { projectDir: string }): Promise<Diagnostic[]>;
        readContent(payload: { projectDir: string; resourceId: string }): Promise<string>;
      };
      textureEditor: {
        openWindow(payload: { projectDir: string }): Promise<boolean>;
        readDraft(payload: { projectDir: string }): Promise<TextureEditorDraft | null>;
        saveDraft(payload: { projectDir: string; draft: TextureEditorDraft }): Promise<string>;
      };
      modelEditor: {
        openWindow(payload: { projectDir: string }): Promise<boolean>;
        readDraft(payload: { projectDir: string }): Promise<ModelEditorDraft | null>;
        saveDraft(payload: { projectDir: string; draft: ModelEditorDraft }): Promise<string>;
      };
      generate: {
        forge(payload: { projectDir: string }): Promise<{ root: string; copiedResources: number; resourceDiagnostics: Diagnostic[] }>;
      };
      build: {
        forgeJar(payload: { projectDir: string }): Promise<unknown>;
        onLog(callback: (line: string) => void): () => void;
      };
      logic: {
        createDefault(payload: { boundElement?: string; name?: string }): Promise<LogicGraph>;
        createNode(payload: { nodeType: string }): Promise<LogicNode>;
        nodeTypes(): Promise<string[]>;
        save(payload: { projectDir: string; graph: LogicGraph }): Promise<LogicGraph[]>;
        load(payload: { projectDir: string }): Promise<LogicGraph[]>;
        validate(payload: { graph: LogicGraph }): Promise<Diagnostic[]>;
        compileToIR(payload: { graph: LogicGraph }): Promise<BlockForgeIR>;
        previewForge(payload: { projectDir: string; graph: LogicGraph }): Promise<string>;
      };
      ui: {
        createDefault(payload?: { name?: string }): Promise<UiScreenModel>;
        save(payload: { projectDir: string; screen: UiScreenModel }): Promise<UiScreenModel>;
        load(payload: { projectDir: string }): Promise<UiScreenModel[]>;
      };
      ai: {
        readConfig(): Promise<AiProviderConfig>;
        saveConfig(payload: { config: AiProviderConfig }): Promise<AiProviderConfig>;
        testConnection(payload: { config?: AiProviderConfig }): Promise<boolean>;
        listModels(payload: { config?: AiProviderConfig }): Promise<string[]>;
        chat(payload: { config?: AiProviderConfig; messages: AiChatMessage[]; context: Record<string, unknown> }): Promise<string>;
        createLogicDraft(payload: { config?: AiProviderConfig; prompt: string; context: Record<string, unknown> }): Promise<unknown>;
        createProjectChangePlan(payload: { projectDir: string; config?: AiProviderConfig; prompt: string; context: Record<string, unknown> }): Promise<{ plan: AiProjectChangePlan; validationErrors: string[]; scannedFiles: string[] }>;
        applyProjectChangePlan(payload: { projectDir: string; plan: AiProjectChangePlan }): Promise<AiProjectApplyResult>;
        saveChatTranscript(payload: { projectDir: string; messages: AiChatMessage[] }): Promise<string>;
      };
      snapshots: {
        create(payload: { projectDir: string; reason: string }): Promise<string>;
        list(payload: { projectDir: string }): Promise<SnapshotInfo[]>;
        restore(payload: { projectDir: string; snapshotId: string }): Promise<SnapshotInfo[]>;
      };
      templates: {
        import(payload: { projectDir: string; sourceFile?: string }): Promise<InstalledTemplate | null>;
        list(payload: { projectDir: string }): Promise<InstalledTemplate[]>;
      };
      privacy: {
        scan(): Promise<PrivacyScanResult>;
      };
      system: {
        openPath(payload: { targetPath: string }): Promise<boolean>;
      };
    };
  }
}

export {};
