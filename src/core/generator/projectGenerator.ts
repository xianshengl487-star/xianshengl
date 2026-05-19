import type { BlockElement, EnchantmentElement, FunctionElement, ItemElement, LootTableElement, MobEffectElement, PotionElement, RecipeElement, ToolElement } from '../../shared/types/elements';
import type { BlockForgeIR } from '../../shared/types/logic';
import type { ProjectModel } from '../../shared/types/project';
import { generateFabricProject } from './fabric/fabricGenerator';
import { generateForgeProject } from './forge/forgeGenerator';
import { generatePaperProject } from './paper/paperGenerator';

export interface ProjectGenerateInput {
  projectDir: string;
  project: ProjectModel;
  items?: ItemElement[];
  tools?: ToolElement[];
  blocks?: BlockElement[];
  recipes?: RecipeElement[];
  lootTables?: LootTableElement[];
  functions?: FunctionElement[];
  mobEffects?: MobEffectElement[];
  potions?: PotionElement[];
  enchantments?: EnchantmentElement[];
  logicIR?: BlockForgeIR[];
}

export async function generateProjectArtifacts(input: ProjectGenerateInput): Promise<{ root: string; copiedResources: number; preview: string }> {
  const common = {
    projectDir: input.projectDir,
    project: input.project
  };
  const itemList = [...(input.items || []), ...(input.tools || [])];
  if (input.project.primaryLoader === 'fabric') {
    return generateFabricProject({
      ...common,
      items: itemList,
      blocks: input.blocks || [],
      recipes: input.recipes || [],
      lootTables: input.lootTables || [],
      functions: input.functions || [],
      mobEffects: input.mobEffects || [],
      potions: input.potions || [],
      enchantments: input.enchantments || [],
      logicIR: input.logicIR || []
    });
  }
  if (input.project.primaryLoader === 'paper') {
    return generatePaperProject({
      ...common,
      recipes: input.recipes || [],
      lootTables: input.lootTables || [],
      functions: input.functions || []
    });
  }
  return generateForgeProject({
    ...common,
    items: itemList,
    blocks: input.blocks || [],
    recipes: input.recipes || [],
    lootTables: input.lootTables || [],
    functions: input.functions || [],
    mobEffects: input.mobEffects || [],
    potions: input.potions || [],
    enchantments: input.enchantments || [],
    logicIR: input.logicIR || []
  });
}
