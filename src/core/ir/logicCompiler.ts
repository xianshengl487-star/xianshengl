import type { BlockForgeIR, IRStep, LogicGraph, LogicNode, LogicVariable } from '../../shared/types/logic';
import type { Diagnostic } from '../../shared/types/elements';

function normalizeVariables(variables: unknown): LogicVariable[] {
  if (!Array.isArray(variables)) return [];
  return variables.map((value, index) => {
    if (typeof value === 'string') {
      return { id: value, name: value, type: 'number', defaultValue: 0, scope: 'local' } satisfies LogicVariable;
    }
    const next = value as Partial<LogicVariable>;
    return {
      id: String(next.id || next.name || `var_${index}`),
      name: String(next.name || next.id || `变量 ${index + 1}`),
      type: next.type === 'string' || next.type === 'boolean' ? next.type : 'number',
      defaultValue: next.defaultValue ?? (next.type === 'boolean' ? false : next.type === 'string' ? '' : 0),
      scope: next.scope === 'player_persistent' || next.scope === 'global' ? next.scope : 'local'
    };
  });
}

function isNbtNode(nodeType: string) {
  return nodeType.startsWith('action.nbt_') || nodeType.startsWith('condition.nbt_');
}

function normalizeNbtTarget(value: unknown) {
  return String(value || 'held_item');
}

function normalizeNbtKey(value: unknown) {
  return String(value || '').trim();
}

function collectVariableRefs(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const refs = new Set<string>();
  const exact = value.trim().match(/^var:([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (exact) refs.add(exact[1]);
  for (const match of value.matchAll(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) refs.add(match[1]);
  return [...refs];
}

export function validateLogicGraph(graph: LogicGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const nodeById = new Map(graph.nodes.map(node => [node.nodeId, node]));
  const variables = normalizeVariables(graph.variables);
  const variableIds = new Set(variables.map(variable => variable.id));
  const seenVariables = new Set<string>();
  for (const variable of variables) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.id)) {
      diagnostics.push({
        level: 'error',
        code: 'VARIABLE_ID_INVALID',
        message: `变量 id 不合法：${variable.id}`,
        target: variable.id,
        humanAdvice: '变量 id 只能使用英文字母、数字和下划线，并且不能以数字开头。'
      });
    }
    if (seenVariables.has(variable.id)) {
      diagnostics.push({ level: 'error', code: 'VARIABLE_DUPLICATED', message: `变量重复：${variable.id}`, target: variable.id, humanAdvice: '请给每个变量使用唯一 id。' });
    }
    seenVariables.add(variable.id);
    if (variable.scope !== 'local') {
      diagnostics.push({
        level: 'warning',
        code: 'VARIABLE_SCOPE_PREVIEW_ONLY',
        message: `变量 ${variable.id} 当前按本地过程变量生成。`,
        target: variable.id,
        humanAdvice: '玩家持久变量和全局变量已保留在模型中，首版 Forge 生成先按本地变量处理。'
      });
    }
  }
  for (const node of graph.nodes) {
    for (const key of node.required || []) {
      if (node.params[key] === undefined || node.params[key] === '') {
        diagnostics.push({
          level: 'error',
          code: 'NODE_REQUIRED_PARAM_EMPTY',
          message: `节点“${node.title}”缺少必填参数：${key}`,
          target: node.nodeId,
          humanAdvice: '打开右侧属性面板，补全这个节点需要的参数。'
        });
      }
    }
    for (const [paramKey, paramValue] of Object.entries(node.params)) {
      for (const ref of collectVariableRefs(paramValue)) {
        if (!variableIds.has(ref)) {
          diagnostics.push({
            level: 'error',
            code: 'VARIABLE_REFERENCE_NOT_FOUND',
            message: `节点“${node.title}”的参数 ${paramKey} 引用了不存在的变量：${ref}`,
            target: node.nodeId,
            humanAdvice: '请先创建这个变量，或把参数里的 ${变量id} / var:变量id 改成已有变量。'
          });
        }
      }
    }
    if (node.nodeType === 'action.execute_command' && !String(node.params.command || '').trim()) {
      diagnostics.push({ level: 'error', code: 'COMMAND_EMPTY', message: '执行命令节点的命令为空。', target: node.nodeId, humanAdvice: '请输入不带开头斜杠的 Minecraft 命令。' });
    }
    if (node.nodeType === 'condition.cooldown_ready' && !String(node.params.cooldownId || '').trim()) {
      diagnostics.push({ level: 'error', code: 'COOLDOWN_ID_EMPTY', message: '冷却判断节点缺少冷却 id。', target: node.nodeId, humanAdvice: '请使用稳定的 id，例如 ice_wand。' });
    }
    if (node.nodeType === 'action.start_cooldown' && !String(node.params.cooldownId || '').trim()) {
      diagnostics.push({ level: 'error', code: 'COOLDOWN_ID_EMPTY', message: '启动冷却节点缺少冷却 id。', target: node.nodeId, humanAdvice: '请使用和冷却判断节点相同的 id。' });
    }
    if (isNbtNode(node.nodeType)) {
      const key = normalizeNbtKey(node.params.key);
      if (!key || !/^[A-Za-z0-9_.:-]+$/.test(key)) {
        diagnostics.push({
          level: 'error',
          code: 'NBT_KEY_INVALID',
          message: `NBT 标签名不合法：${key || '空'}`,
          target: node.nodeId,
          humanAdvice: 'NBT 标签名建议只使用英文字母、数字、下划线、点、冒号或短横线，例如 blockforge_charge。'
        });
      }
      if (normalizeNbtTarget(node.params.target) !== 'held_item') {
        diagnostics.push({
          level: 'warning',
          code: 'NBT_TARGET_PREVIEW_ONLY',
          message: `NBT 目标 ${normalizeNbtTarget(node.params.target)} 当前按“手持物品”生成。`,
          target: node.nodeId,
          humanAdvice: '首版 Forge 事件生成器先支持右键事件里的手持物品 NBT；方块实体、玩家持久 NBT 会作为后续扩展。'
        });
      }
    }
    if ((node.nodeType === 'action.variable_set' || node.nodeType === 'action.variable_add' || node.nodeType === 'condition.variable_equals' || node.nodeType === 'condition.variable_greater_or_equal') && !variableIds.has(String(node.params.variable || ''))) {
      diagnostics.push({
        level: 'error',
        code: 'VARIABLE_NOT_FOUND',
        message: `节点“${node.title}”引用了不存在的变量：${String(node.params.variable || '') || '空'}`,
        target: node.nodeId,
        humanAdvice: '请先在变量面板创建变量，或把节点参数改为已有变量。'
      });
    }
    if (node.nodeType === 'action.variable_add') {
      const variable = variables.find(item => item.id === node.params.variable);
      if (variable && variable.type !== 'number') {
        diagnostics.push({ level: 'error', code: 'VARIABLE_TYPE_MISMATCH', message: `变量“${variable.name}”不是数字，不能使用“增加数字”节点。`, target: node.nodeId, humanAdvice: '请把变量类型改成数字，或改用“设置值”节点。' });
      }
    }
    if (node.nodeType === 'condition.variable_greater_or_equal') {
      const variable = variables.find(item => item.id === node.params.variable);
      if (variable && variable.type !== 'number') {
        diagnostics.push({ level: 'error', code: 'VARIABLE_TYPE_MISMATCH', message: `变量“${variable.name}”不是数字，不能比较大小。`, target: node.nodeId, humanAdvice: '只有数字变量可以使用“大于等于”判断。' });
      }
    }
  }
  const eventNodes = graph.nodes.filter(n => n.nodeType.startsWith('event.'));
  if (eventNodes.length === 0) {
    diagnostics.push({ level: 'error', code: 'LOGIC_NO_EVENT', message: '节点图缺少事件入口。', humanAdvice: '请先添加一个事件节点，例如“右键物品”。' });
  }
  if (eventNodes.length > 1) {
    diagnostics.push({ level: 'warning', code: 'LOGIC_MULTIPLE_EVENTS', message: '节点图中存在多个事件节点。', humanAdvice: '建议每张节点图只保留一个事件入口，便于稳定生成 Forge 代码。' });
  }
  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    const sourcePort = source?.outputs.find(port => port.id === edge.sourceHandle);
    const targetPort = target?.inputs.find(port => port.id === edge.targetHandle);
    if (!source || !target || !sourcePort || !targetPort) {
      diagnostics.push({ level: 'error', code: 'EDGE_INVALID_ENDPOINT', message: `连线 ${edge.id} 指向不存在的节点或端口。`, target: edge.id, humanAdvice: '请删除这条连线后重新连接。' });
      continue;
    }
    if (sourcePort.type !== targetPort.type || sourcePort.type !== edge.type) {
      diagnostics.push({ level: 'error', code: 'EDGE_PORT_TYPE_MISMATCH', message: `连线 ${edge.id} 连接了不兼容的端口类型。`, target: edge.id, humanAdvice: '请把执行端口连接到执行端口，物品端口连接到物品端口。' });
    }
  }
  const connectedTargets = new Set(graph.edges.filter(edge => edge.type === 'exec').map(edge => edge.target));
  for (const node of graph.nodes.filter(node => !node.nodeType.startsWith('event.'))) {
    if (!connectedTargets.has(node.nodeId)) {
      diagnostics.push({ level: 'warning', code: 'EXEC_FLOW_DISCONNECTED', message: `节点“${node.title}”没有接入执行流程。`, target: node.nodeId, humanAdvice: '请从事件节点或其他执行输出端口连接到它。' });
    }
  }
  return diagnostics;
}

function nodeToIRStep(node: LogicNode): IRStep | null {
  if (node.nodeType === 'condition.player_xp_level_at_least') {
    return { op: 'condition', kind: 'player_xp_level_at_least', args: { level: node.params.level ?? 10 }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.cooldown_ready') {
    return { op: 'condition', kind: 'cooldown_ready', args: { cooldownId: node.params.cooldownId ?? 'default' }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.player_has_item') {
    return { op: 'condition', kind: 'player_has_item', args: { item: node.params.item ?? 'minecraft:stick', count: node.params.count ?? 1 }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.block_is') {
    return { op: 'condition', kind: 'block_is', args: { block: node.params.block ?? 'minecraft:stone' }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.biome_is') {
    return { op: 'condition', kind: 'biome_is', args: { biome: node.params.biome ?? 'minecraft:plains' }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.entity_type_is') {
    return { op: 'condition', kind: 'entity_type_is', args: { entityType: node.params.entityType ?? 'minecraft:zombie' }, then: [], else: [] };
  }
  if (node.nodeType === 'action.send_message') {
    return { op: 'action', kind: 'send_message', args: { text: node.params.text ?? '你好' } };
  }
  if (node.nodeType === 'action.consume_item') {
    return { op: 'action', kind: 'consume_item', args: { item: node.params.item ?? 'minecraft:stick', count: node.params.count ?? 1 } };
  }
  if (node.nodeType === 'action.consume_xp_level') {
    return { op: 'action', kind: 'consume_xp_level', args: { amount: node.params.amount ?? 1 } };
  }
  if (node.nodeType === 'action.execute_command') {
    return { op: 'action', kind: 'execute_command', args: { command: node.params.command ?? 'say hello' } };
  }
  if (node.nodeType === 'action.start_cooldown') {
    return { op: 'action', kind: 'start_cooldown', args: { cooldownId: node.params.cooldownId ?? 'default', ticks: node.params.ticks ?? 100 } };
  }
  if (node.nodeType === 'action.give_item') {
    return { op: 'action', kind: 'give_item', args: { item: node.params.item ?? 'minecraft:diamond', count: node.params.count ?? 1 } };
  }
  if (node.nodeType === 'action.give_effect') {
    return { op: 'action', kind: 'give_effect', args: { effect: node.params.effect ?? 'minecraft:speed', seconds: node.params.seconds ?? 5, amplifier: node.params.amplifier ?? 1 } };
  }
  if (node.nodeType === 'action.play_sound') {
    return { op: 'action', kind: 'play_sound', args: { sound: node.params.sound ?? 'minecraft:block.amethyst_block.chime', volume: node.params.volume ?? 1, pitch: node.params.pitch ?? 1 } };
  }
  if (node.nodeType === 'action.spawn_particle') {
    return { op: 'action', kind: 'spawn_particle', args: { particle: node.params.particle ?? 'minecraft:enchanted_hit', count: node.params.count ?? 16 } };
  }
  if (node.nodeType === 'action.set_block') {
    return { op: 'action', kind: 'set_block', args: { block: node.params.block ?? 'minecraft:ice' } };
  }
  if (node.nodeType === 'action.summon_entity') {
    return { op: 'action', kind: 'summon_entity', args: { entityType: node.params.entityType ?? 'minecraft:snow_golem', count: node.params.count ?? 1 } };
  }
  if (node.nodeType === 'action.variable_set') {
    return { op: 'action', kind: 'variable_set', args: { variable: node.params.variable, value: node.params.value ?? '0' } };
  }
  if (node.nodeType === 'action.variable_add') {
    return { op: 'action', kind: 'variable_add', args: { variable: node.params.variable, amount: node.params.amount ?? 1 } };
  }
  if (node.nodeType === 'condition.variable_equals') {
    return { op: 'condition', kind: 'variable_equals', args: { variable: node.params.variable, value: node.params.value ?? '0' }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.variable_greater_or_equal') {
    return { op: 'condition', kind: 'variable_greater_or_equal', args: { variable: node.params.variable, value: node.params.value ?? 0 }, then: [], else: [] };
  }
  if (node.nodeType === 'action.nbt_set_string') {
    return { op: 'action', kind: 'nbt_set_string', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key), value: node.params.value ?? '' } };
  }
  if (node.nodeType === 'action.nbt_set_number') {
    return { op: 'action', kind: 'nbt_set_number', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key), value: node.params.value ?? 0 } };
  }
  if (node.nodeType === 'action.nbt_set_boolean') {
    return { op: 'action', kind: 'nbt_set_boolean', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key), value: node.params.value ?? false } };
  }
  if (node.nodeType === 'action.nbt_remove') {
    return { op: 'action', kind: 'nbt_remove', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key) } };
  }
  if (node.nodeType === 'condition.nbt_has_key') {
    return { op: 'condition', kind: 'nbt_has_key', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key) }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.nbt_string_equals') {
    return { op: 'condition', kind: 'nbt_string_equals', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key), value: node.params.value ?? '' }, then: [], else: [] };
  }
  if (node.nodeType === 'condition.nbt_number_gte') {
    return { op: 'condition', kind: 'nbt_number_gte', args: { target: normalizeNbtTarget(node.params.target), key: normalizeNbtKey(node.params.key), value: node.params.value ?? 0 }, then: [], else: [] };
  }
  return null;
}

export function compileGraphToIR(graph: LogicGraph): BlockForgeIR {
  const event = graph.nodes.find(n => n.nodeType.startsWith('event.'));
  const nodeById = new Map(graph.nodes.map(node => [node.nodeId, node]));
  const nextNode = (source: LogicNode, handle: string) => {
    const edge = graph.edges.find(e => e.type === 'exec' && e.source === source.nodeId && e.sourceHandle === handle);
    return edge ? nodeById.get(edge.target) : undefined;
  };
  const compileChain = (start: LogicNode | undefined, seen = new Set<string>()): IRStep[] => {
    const steps: IRStep[] = [];
    let current = start;
    while (current && !seen.has(current.nodeId)) {
      seen.add(current.nodeId);
      const step = nodeToIRStep(current);
      if (!step) break;
      if (step.op === 'condition') {
        step.then = compileChain(nextNode(current, 'true_out'), new Set(seen));
        step.else = compileChain(nextNode(current, 'false_out'), new Set(seen));
        steps.push(step);
        break;
      }
      steps.push(step);
      current = nextNode(current, 'exec_out');
    }
    return steps;
  };
  const steps = event ? compileChain(nextNode(event, 'exec_out')) : graph.nodes.map(nodeToIRStep).filter(Boolean) as IRStep[];
  return {
    irVersion: '0.1.0',
    type: 'event_logic',
    event: {
      type: event?.nodeType.replace('event.', '') || graph.eventType,
      target: graph.boundElement
    },
    variables: normalizeVariables(graph.variables),
    steps
  };
}
