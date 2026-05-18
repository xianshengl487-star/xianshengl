import type { LogicNode, NodePort } from '../../shared/types/logic';

type NodeDefinition = {
  title: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  params?: Record<string, unknown>;
  required?: string[];
};

const execIn: NodePort = { id: 'exec_in', name: '执行', type: 'exec' };
const execOut: NodePort = { id: 'exec_out', name: '继续', type: 'exec' };
const trueOut: NodePort = { id: 'true_out', name: '是', type: 'exec' };
const falseOut: NodePort = { id: 'false_out', name: '否', type: 'exec' };

function base() {
  return { diagnostics: [], position: { x: 80, y: 80 }, params: {}, required: [] };
}

function event(title: string): NodeDefinition {
  return { title, outputs: [{ id: 'exec_out', name: '执行', type: 'exec' }] };
}

function action(title: string, params: Record<string, unknown> = {}, required: string[] = []): NodeDefinition {
  return { title, inputs: [execIn], outputs: [execOut], params, required };
}

function condition(title: string, params: Record<string, unknown> = {}, required: string[] = []): NodeDefinition {
  return { title, inputs: [execIn], outputs: [trueOut, falseOut], params, required };
}

export const nodeDefinitions: Record<string, NodeDefinition> = {
  'event.item_right_click': event('事件：右键物品'),
  'event.block_right_click': event('事件：右键方块'),
  'event.player_tick': event('事件：玩家每刻更新'),
  'event.player_join': event('事件：玩家进入世界'),
  'event.player_hurt': event('事件：玩家受到伤害'),
  'event.living_death': event('事件：实体死亡'),
  'event.block_break': event('事件：破坏方块'),
  'event.block_place': event('事件：放置方块'),
  'event.world_tick': event('事件：世界每刻更新'),

  'condition.player_xp_level_at_least': condition('判断：经验等级至少为', { level: 10 }, ['level']),
  'condition.player_has_item': condition('判断：玩家拥有物品', { item: 'minecraft:stick', count: 1 }, ['item']),
  'condition.cooldown_ready': condition('判断：冷却结束', { cooldownId: 'default' }, ['cooldownId']),
  'condition.variable_equals': condition('变量：等于', { variable: '', value: '0' }, ['variable']),
  'condition.variable_greater_or_equal': condition('变量：大于等于', { variable: '', value: 0 }, ['variable']),
  'condition.nbt_has_key': condition('NBT：存在标签', { target: 'held_item', key: 'blockforge_tag' }, ['key']),
  'condition.nbt_string_equals': condition('NBT：文本等于', { target: 'held_item', key: 'blockforge_tag', value: 'value' }, ['key']),
  'condition.nbt_number_gte': condition('NBT：数字大于等于', { target: 'held_item', key: 'blockforge_number', value: 1 }, ['key']),
  'condition.block_is': condition('世界：目标方块是', { block: 'minecraft:stone' }, ['block']),
  'condition.biome_is': condition('世界：当前生物群系是', { biome: 'minecraft:plains' }, ['biome']),
  'condition.entity_type_is': condition('实体：类型是', { entityType: 'minecraft:zombie' }, ['entityType']),

  'action.send_message': action('发送聊天消息', { text: 'Hello ${counter}' }, ['text']),
  'action.consume_item': action('消耗物品', { item: 'minecraft:stick', count: 1 }, ['item', 'count']),
  'action.consume_xp_level': action('消耗经验等级', { amount: 10 }, ['amount']),
  'action.execute_command': action('执行命令', { command: 'say hello' }, ['command']),
  'action.start_cooldown': action('启动冷却', { cooldownId: 'default', ticks: 100 }, ['cooldownId', 'ticks']),
  'action.variable_set': action('变量：设置值', { variable: '', value: '0' }, ['variable']),
  'action.variable_add': action('变量：增加数字', { variable: '', amount: 1 }, ['variable', 'amount']),
  'action.nbt_set_string': action('NBT：写入文本', { target: 'held_item', key: 'blockforge_tag', value: 'value' }, ['key']),
  'action.nbt_set_number': action('NBT：写入数字', { target: 'held_item', key: 'blockforge_number', value: 1 }, ['key']),
  'action.nbt_set_boolean': action('NBT：写入布尔', { target: 'held_item', key: 'blockforge_flag', value: true }, ['key']),
  'action.nbt_remove': action('NBT：删除标签', { target: 'held_item', key: 'blockforge_tag' }, ['key']),
  'action.give_item': action('游戏：给予物品', { item: 'minecraft:diamond', count: 1 }, ['item', 'count']),
  'action.give_effect': action('游戏：给予药水效果', { effect: 'minecraft:speed', seconds: 5, amplifier: 1 }, ['effect']),
  'action.play_sound': action('游戏：播放音效', { sound: 'minecraft:block.amethyst_block.chime', volume: 1, pitch: 1 }, ['sound']),
  'action.spawn_particle': action('游戏：生成粒子', { particle: 'minecraft:enchanted_hit', count: 16 }, ['particle']),
  'action.set_block': action('世界：设置脚下方块', { block: 'minecraft:ice' }, ['block']),
  'action.summon_entity': action('世界：召唤实体', { entityType: 'minecraft:snow_golem', count: 1 }, ['entityType'])
};

export function createNode(nodeType: string): LogicNode {
  const definition = nodeDefinitions[nodeType];
  if (!definition) throw new Error(`未知节点类型：${nodeType}`);
  const nodeId = `node_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
  return {
    ...base(),
    nodeId,
    nodeType,
    title: definition.title,
    inputs: definition.inputs || [],
    outputs: definition.outputs || [],
    params: { ...(definition.params || {}) },
    required: [...(definition.required || [])]
  };
}

export const builtInNodeTypes = Object.keys(nodeDefinitions);
