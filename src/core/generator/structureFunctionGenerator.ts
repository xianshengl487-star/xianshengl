import type { ProjectModel } from '../../shared/types/project';
import type { StructureElement, StructureKind } from '../../shared/types/elements';

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, next));
}

function blockId(project: ProjectModel, value: unknown, fallback: string): string {
  const id = String(value || fallback).trim();
  if (!id) return fallback;
  if (id.includes(':')) return id;
  return `${project.modId}:${id}`;
}

function fill(commands: string[], x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, block: string, mode = '') {
  commands.push(`fill ~${x1} ~${y1} ~${z1} ~${x2} ~${y2} ~${z2} ${block}${mode ? ` ${mode}` : ''}`);
}

function set(commands: string[], x: number, y: number, z: number, block: string) {
  commands.push(`setblock ~${x} ~${y} ~${z} ${block}`);
}

function addLights(commands: string[], x1: number, x2: number, z1: number, z2: number, y: number, block: string) {
  set(commands, x1 + 1, y, z1 + 1, block);
  set(commands, x2 - 1, y, z1 + 1, block);
  set(commands, x1 + 1, y, z2 - 1, block);
  set(commands, x2 - 1, y, z2 - 1, block);
}

function addWindows(commands: string[], x1: number, x2: number, z1: number, z2: number, glass: string) {
  const midX = Math.floor((x1 + x2) / 2);
  const midZ = Math.floor((z1 + z2) / 2);
  set(commands, x1, 2, midZ, glass);
  set(commands, x2, 2, midZ, glass);
  set(commands, midX - 2, 2, z2, glass);
  set(commands, midX + 2, 2, z2, glass);
}

function addDoor(commands: string[], z: number, doorBlock: string) {
  set(commands, 0, 1, z, 'minecraft:air');
  set(commands, 0, 2, z, 'minecraft:air');
  set(commands, 0, 1, z, `${doorBlock}[facing=south,half=lower]`);
  set(commands, 0, 2, z, `${doorBlock}[facing=south,half=upper]`);
}

function generateCottage(project: ProjectModel, structure: StructureElement, commands: string[]) {
  const props = structure.properties;
  const width = clampInt(props.width, 9, 5, 31);
  const depth = clampInt(props.depth, 9, 5, 31);
  const height = clampInt(props.height, 5, 3, 16);
  const x1 = -Math.floor(width / 2);
  const x2 = x1 + width - 1;
  const z1 = 1;
  const z2 = z1 + depth - 1;
  const floor = blockId(project, props.floorBlock, 'minecraft:spruce_planks');
  const wall = blockId(project, props.wallBlock, 'minecraft:stone_bricks');
  const roof = blockId(project, props.roofBlock, 'minecraft:spruce_planks');
  const accent = blockId(project, props.accentBlock, 'minecraft:stripped_spruce_log');
  const glass = blockId(project, props.glassBlock, 'minecraft:glass_pane');
  const door = blockId(project, props.doorBlock, 'minecraft:spruce_door');
  const torch = blockId(project, props.torchBlock, 'minecraft:lantern');

  fill(commands, x1, 0, z1, x2, 0, z2, floor);
  fill(commands, x1, 1, z1, x2, height, z2, wall, props.hollow === false ? '' : 'hollow');
  if (props.hollow !== false) fill(commands, x1 + 1, 1, z1 + 1, x2 - 1, height - 1, z2 - 1, 'minecraft:air');
  fill(commands, x1 - 1, height + 1, z1 - 1, x2 + 1, height + 1, z2 + 1, roof);
  fill(commands, x1, height + 2, z1, x2, height + 2, z2, roof);
  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) fill(commands, x, 1, z, x, height, z, accent);
  addDoor(commands, z1, door);
  addWindows(commands, x1, x2, z1, z2, glass);
  if (props.includeInterior) {
    set(commands, x2 - 2, 1, z2 - 2, 'minecraft:crafting_table');
    set(commands, x1 + 2, 1, z2 - 2, 'minecraft:furnace[facing=north]');
    set(commands, x1 + 2, 1, z1 + 2, 'minecraft:red_bed[facing=east]');
  }
  if (props.includeLights) addLights(commands, x1, x2, z1, z2, height, torch);
  if (props.includeLootChest) set(commands, x2 - 2, 1, z1 + 2, 'minecraft:chest[facing=south]');
}

function generateTower(project: ProjectModel, structure: StructureElement, commands: string[]) {
  const props = structure.properties;
  const width = clampInt(props.width, 7, 5, 21);
  const height = clampInt(props.height, 13, 5, 32);
  const x1 = -Math.floor(width / 2);
  const x2 = x1 + width - 1;
  const z1 = 1;
  const z2 = z1 + width - 1;
  const floor = blockId(project, props.floorBlock, 'minecraft:stone_bricks');
  const wall = blockId(project, props.wallBlock, 'minecraft:cobbled_deepslate');
  const accent = blockId(project, props.accentBlock, 'minecraft:polished_deepslate');
  const glass = blockId(project, props.glassBlock, 'minecraft:glass_pane');
  fill(commands, x1, 0, z1, x2, 0, z2, floor);
  fill(commands, x1, 1, z1, x2, height, z2, wall, props.hollow === false ? '' : 'hollow');
  if (props.hollow !== false) fill(commands, x1 + 1, 1, z1 + 1, x2 - 1, height - 1, z2 - 1, 'minecraft:air');
  fill(commands, x1 - 1, height + 1, z1 - 1, x2 + 1, height + 1, z2 + 1, accent);
  for (let y = 2; y < height; y += 3) {
    set(commands, x1, y, Math.floor((z1 + z2) / 2), glass);
    set(commands, x2, y, Math.floor((z1 + z2) / 2), glass);
  }
  addDoor(commands, z1, blockId(project, props.doorBlock, 'minecraft:iron_door'));
  if (props.includeLights) addLights(commands, x1, x2, z1, z2, height - 1, blockId(project, props.torchBlock, 'minecraft:lantern'));
}

function generatePlatform(project: ProjectModel, structure: StructureElement, commands: string[]) {
  const props = structure.properties;
  const width = clampInt(props.width, 13, 3, 32);
  const depth = clampInt(props.depth, 13, 3, 32);
  const x1 = -Math.floor(width / 2);
  const x2 = x1 + width - 1;
  const z1 = 1;
  const z2 = z1 + depth - 1;
  const floor = blockId(project, props.floorBlock, 'minecraft:smooth_stone');
  const accent = blockId(project, props.accentBlock, 'minecraft:stone_brick_wall');
  fill(commands, x1, 0, z1, x2, 0, z2, floor);
  fill(commands, x1, 1, z1, x2, 1, z1, accent);
  fill(commands, x1, 1, z2, x2, 1, z2, accent);
  fill(commands, x1, 1, z1, x1, 1, z2, accent);
  fill(commands, x2, 1, z1, x2, 1, z2, accent);
  if (props.includeLights) addLights(commands, x1, x2, z1, z2, 2, blockId(project, props.torchBlock, 'minecraft:lantern'));
}

function generateWall(project: ProjectModel, structure: StructureElement, commands: string[]) {
  const props = structure.properties;
  const width = clampInt(props.width, 17, 5, 64);
  const height = clampInt(props.height, 5, 2, 20);
  const x1 = -Math.floor(width / 2);
  const x2 = x1 + width - 1;
  const wall = blockId(project, props.wallBlock, 'minecraft:stone_bricks');
  const accent = blockId(project, props.accentBlock, 'minecraft:chiseled_stone_bricks');
  fill(commands, x1, 0, 1, x2, height, 1, wall);
  for (let x = x1; x <= x2; x += 4) fill(commands, x, 0, 1, x, height + 1, 1, accent);
  fill(commands, -1, 1, 1, 1, 3, 1, 'minecraft:air');
}

function generateArena(project: ProjectModel, structure: StructureElement, commands: string[]) {
  const props = structure.properties;
  const width = clampInt(props.width, 19, 7, 48);
  const depth = clampInt(props.depth, 19, 7, 48);
  const x1 = -Math.floor(width / 2);
  const x2 = x1 + width - 1;
  const z1 = 1;
  const z2 = z1 + depth - 1;
  const floor = blockId(project, props.floorBlock, 'minecraft:smooth_sandstone');
  const wall = blockId(project, props.wallBlock, 'minecraft:sandstone_wall');
  const accent = blockId(project, props.accentBlock, 'minecraft:cut_sandstone');
  fill(commands, x1, 0, z1, x2, 0, z2, floor);
  fill(commands, x1, 1, z1, x2, 3, z2, wall, 'hollow');
  fill(commands, x1 + 1, 1, z1 + 1, x2 - 1, 3, z2 - 1, 'minecraft:air');
  fill(commands, -2, 1, z1, 2, 3, z1, 'minecraft:air');
  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) fill(commands, x, 1, z, x, 5, z, accent);
  if (props.includeLights) addLights(commands, x1, x2, z1, z2, 4, blockId(project, props.torchBlock, 'minecraft:lantern'));
}

export function structureFunctionCommands(project: ProjectModel, structure: StructureElement): string[] {
  const kind = (structure.properties.structureKind || 'cottage') as StructureKind;
  const commands = [
    `# BlockForge structure: ${structure.id}`,
    '# Stand where the front center of the structure should appear, then run this function.'
  ];
  if (kind === 'tower') generateTower(project, structure, commands);
  else if (kind === 'platform') generatePlatform(project, structure, commands);
  else if (kind === 'wall') generateWall(project, structure, commands);
  else if (kind === 'arena') generateArena(project, structure, commands);
  else generateCottage(project, structure, commands);
  commands.push(`say Generated structure ${project.modId}:${structure.id}`);
  return commands;
}
