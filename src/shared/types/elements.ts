import type { LoaderId } from './project';

export type ElementType = 'item' | 'block' | 'tool' | 'recipe' | 'loot_table' | 'function';

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  target?: string;
  humanAdvice?: string;
}

export interface ElementModel<TProperties = unknown> {
  schemaVersion: string;
  id: string;
  namespace: string;
  type: ElementType;
  displayName: {
    zh_cn: string;
    en_us: string;
  };
  description: string;
  icon?: string;
  tags: string[];
  enabled: boolean;
  experimental: boolean;
  targetLoaders: LoaderId[];
  mcVersions: string[];
  properties: TProperties;
  linkedResources: string[];
  linkedLogic: string[];
  generationStatus: 'draft' | 'ready' | 'error';
  diagnostics: Diagnostic[];
  createdAt: string;
  updatedAt: string;
}

export type ItemKind =
  | 'generic'
  | 'magic_wand'
  | 'weapon_sword'
  | 'weapon_axe'
  | 'tool_pickaxe'
  | 'tool_axe'
  | 'tool_shovel'
  | 'tool_hoe'
  | 'food';

export type ToolTier = 'WOOD' | 'STONE' | 'IRON' | 'GOLD' | 'DIAMOND' | 'NETHERITE';

export interface ItemProperties {
  itemKind: ItemKind;
  maxStackSize: number;
  durability?: number;
  tier?: ToolTier;
  attackDamage?: number;
  attackSpeed?: number;
  foodNutrition?: number;
  foodSaturation?: number;
  alwaysEat?: boolean;
  fireResistant?: boolean;
  creativeTab: string;
  texture?: string;
  rightClickLogic?: string;
}

export interface BlockProperties {
  hardness: number;
  resistance: number;
  soundType: string;
  lightLevel: number;
  requiresCorrectTool: boolean;
  creativeTab: string;
  textureAll?: string;
  lootTable?: string;
}

export type RecipeType = 'shaped' | 'shapeless' | 'smelting';

export interface RecipeProperties {
  recipeType: RecipeType;
  category: string;
  pattern?: string[];
  key?: Record<string, string>;
  ingredients?: string[];
  input?: string;
  result: string;
  count: number;
  experience?: number;
  cookingTime?: number;
}

export interface LootTableProperties {
  targetBlock: string;
  drop: string;
  minCount: number;
  maxCount: number;
}

export interface FunctionProperties {
  commands: string;
}

export type ItemElement = ElementModel<ItemProperties> & { type: 'item' };
export type BlockElement = ElementModel<BlockProperties> & { type: 'block' };
export type RecipeElement = ElementModel<RecipeProperties> & { type: 'recipe' };
export type LootTableElement = ElementModel<LootTableProperties> & { type: 'loot_table' };
export type FunctionElement = ElementModel<FunctionProperties> & { type: 'function' };
