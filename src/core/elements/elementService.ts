import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  BlockElement,
  ElementModel,
  EnchantmentElement,
  FunctionElement,
  ItemElement,
  LootTableElement,
  MobEffectElement,
  PotionElement,
  RecipeElement,
  StructureElement,
  ToolElement
} from '../../shared/types/elements';
import type { ProjectModel } from '../../shared/types/project';

function now() { return new Date().toISOString(); }
function enName(id: string) { return id.replace(/_/g, ' '); }
function baseElement(project: ProjectModel, id: string, zhName: string) {
  return {
    schemaVersion: '0.1.0',
    id,
    namespace: project.namespace,
    displayName: { zh_cn: zhName, en_us: enName(id) },
    description: '',
    tags: [],
    enabled: true,
    experimental: false,
    targetLoaders: [project.primaryLoader],
    mcVersions: ['1.20.1'],
    linkedResources: [],
    linkedLogic: [],
    generationStatus: 'ready' as const,
    diagnostics: [],
    createdAt: now(),
    updatedAt: now()
  };
}

export function createItem(project: ProjectModel, id: string, zhName: string): ItemElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'item',
    properties: {
      itemKind: 'generic',
      maxStackSize: 64,
      rarity: 'common',
      tier: 'IRON',
      attackDamage: 4,
      attackSpeed: -2.4,
      useDuration: 32,
      useAnimation: 'none',
      enchantmentValue: 1,
      canRepair: true,
      ammoItem: '',
      ammoPerShot: 1,
      magazineSize: 1,
      reloadTicks: 20,
      projectileDamage: 2,
      projectileSpeed: 3,
      projectileSpread: 1,
      shotCount: 1,
      foodNutrition: 4,
      foodSaturation: 0.3,
      foodIsMeat: false,
      alwaysEat: false,
      fireResistant: false,
      creativeTab: `${project.modId}_tab`,
      model: ''
    },
  };
}

export function createTool(project: ProjectModel, id: string, zhName: string): ToolElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'tool',
    properties: {
      itemKind: 'tool_pickaxe',
      maxStackSize: 1,
      rarity: 'uncommon',
      tier: 'IRON',
      attackDamage: 1,
      attackSpeed: -2.8,
      useDuration: 32,
      useAnimation: 'none',
      enchantmentValue: 2,
      canRepair: true,
      ammoItem: '',
      ammoPerShot: 1,
      magazineSize: 1,
      reloadTicks: 20,
      projectileDamage: 2,
      projectileSpeed: 3,
      projectileSpread: 1,
      shotCount: 1,
      creativeTab: `${project.modId}_tab`,
      model: ''
    },
  };
}

export function createBlock(project: ProjectModel, id: string, zhName: string): BlockElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'block',
    properties: { hardness: 3, resistance: 3, soundType: 'STONE', lightLevel: 0, requiresCorrectTool: true, creativeTab: `${project.modId}_tab`, model: '' },
  };
}

export function createMobEffect(project: ProjectModel, id: string, zhName: string): MobEffectElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'mob_effect',
    properties: {
      category: 'beneficial',
      color: '#7dd3fc',
      instant: false,
      ambient: false,
      visible: true,
      showIcon: true,
      description: 'BlockForge 自定义状态效果'
    }
  };
}

export function createPotion(project: ProjectModel, id: string, zhName: string): PotionElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'potion',
    properties: {
      potionKind: 'drinkable',
      basePotion: 'minecraft:awkward',
      effects: [],
      color: '#7dd3fc',
      creativeTab: `${project.modId}_tab`
    }
  };
}

export function createEnchantment(project: ProjectModel, id: string, zhName: string): EnchantmentElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'enchantment',
    properties: {
      rarity: 'rare',
      maxLevel: 3,
      minCost: 1,
      maxCost: 25,
      treasureOnly: false,
      curse: false,
      discoverable: true,
      slots: ['mainhand'],
      description: 'BlockForge 自定义附魔',
      incompatibleWith: []
    }
  };
}

export function createRecipe(project: ProjectModel, id: string, zhName: string): RecipeElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'recipe',
    properties: {
      recipeType: 'shapeless',
      category: 'misc',
      ingredients: [`${project.modId}:example_item`],
      result: `${project.modId}:${id}`,
      count: 1
    }
  };
}

export function createLootTable(project: ProjectModel, id: string, zhName: string): LootTableElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'loot_table',
    properties: {
      targetBlock: id,
      drop: `${project.modId}:${id}`,
      minCount: 1,
      maxCount: 1
    }
  };
}

export function createFunctionElement(project: ProjectModel, id: string, zhName: string): FunctionElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'function',
    properties: {
      commands: 'say Hello from BlockForge'
    }
  };
}

export function createStructure(project: ProjectModel, id: string, zhName: string): StructureElement {
  return {
    ...baseElement(project, id, zhName),
    type: 'structure',
    properties: {
      structureKind: 'cottage',
      width: 9,
      depth: 9,
      height: 5,
      floorBlock: 'minecraft:spruce_planks',
      wallBlock: 'minecraft:stone_bricks',
      roofBlock: 'minecraft:spruce_stairs',
      accentBlock: 'minecraft:stripped_spruce_log',
      glassBlock: 'minecraft:glass_pane',
      doorBlock: 'minecraft:spruce_door',
      torchBlock: 'minecraft:lantern',
      hollow: true,
      includeInterior: true,
      includeLights: true,
      includeLootChest: false
    }
  };
}

export function folderForElementType(type: ElementModel['type']): string {
  if (type === 'block') return 'blocks';
  if (type === 'item') return 'items';
  if (type === 'tool') return 'tools';
  if (type === 'recipe') return 'recipes';
  if (type === 'loot_table') return 'loot_tables';
  if (type === 'function') return 'functions';
  if (type === 'mob_effect') return 'mob_effects';
  if (type === 'potion') return 'potions';
  if (type === 'enchantment') return 'enchantments';
  if (type === 'structure') return 'structures';
  return `${type}s`;
}

export async function saveElement(projectDir: string, element: ElementModel): Promise<void> {
  const folder = folderForElementType(element.type);
  const target = path.join(projectDir, 'editor/elements', folder, `${element.id}.json`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify({ ...element, updatedAt: now() }, null, 2), 'utf8');
}

function sanitizeElementId(value: string): string {
  const id = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  if (!id) throw new Error('元素 ID 不能为空。');
  return id;
}

function elementPath(projectDir: string, type: ElementModel['type'], id: string): string {
  return path.join(projectDir, 'editor/elements', folderForElementType(type), `${id}.json`);
}

export async function deleteElement(projectDir: string, type: ElementModel['type'], id: string): Promise<void> {
  await fs.rm(elementPath(projectDir, type, sanitizeElementId(id)), { force: true });
}

export async function duplicateElement(projectDir: string, element: ElementModel, newId: string, zhName?: string): Promise<ElementModel> {
  const id = sanitizeElementId(newId);
  const target = elementPath(projectDir, element.type, id);
  try {
    await fs.stat(target);
    throw new Error(`元素 ${id} 已存在。`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const timestamp = now();
  const copy = {
    ...element,
    id,
    displayName: {
      ...element.displayName,
      zh_cn: zhName?.trim() || `${element.displayName.zh_cn} 副本`,
      en_us: enName(id)
    },
    linkedResources: [],
    linkedLogic: [],
    diagnostics: [],
    createdAt: timestamp,
    updatedAt: timestamp
  } as ElementModel;
  await saveElement(projectDir, copy);
  return copy;
}

export async function loadElements<T extends ElementModel<unknown>>(projectDir: string, folder: string): Promise<T[]> {
  const dir = path.join(projectDir, 'editor/elements', folder);
  try {
    const files = await fs.readdir(dir);
    const out: T[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      out.push(JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as T);
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadElementSet(projectDir: string) {
  const [items, tools, blocks, recipes, lootTables, functions, mobEffects, potions, enchantments, structures] = await Promise.all([
    loadElements<ItemElement>(projectDir, 'items'),
    loadElements<ToolElement>(projectDir, 'tools'),
    loadElements<BlockElement>(projectDir, 'blocks'),
    loadElements<RecipeElement>(projectDir, 'recipes'),
    loadElements<LootTableElement>(projectDir, 'loot_tables'),
    loadElements<FunctionElement>(projectDir, 'functions'),
    loadElements<MobEffectElement>(projectDir, 'mob_effects'),
    loadElements<PotionElement>(projectDir, 'potions'),
    loadElements<EnchantmentElement>(projectDir, 'enchantments'),
    loadElements<StructureElement>(projectDir, 'structures')
  ]);
  return { items, tools, blocks, recipes, lootTables, functions, mobEffects, potions, enchantments, structures };
}
