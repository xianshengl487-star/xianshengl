import fs from 'node:fs/promises';
import path from 'node:path';
import type { LogicGraph } from '../../shared/types/logic';
import { createNode } from './nodeRegistry';

function nowId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}

export function createDefaultLogicGraph(name = 'Right click item logic', boundElement = 'item:ice_wand'): LogicGraph {
  const event = createNode('event.item_right_click');
  const xp = createNode('condition.player_xp_level_at_least');
  const cooldown = createNode('condition.cooldown_ready');
  const consume = createNode('action.consume_xp_level');
  const command = createNode('action.execute_command');
  const startCooldown = createNode('action.start_cooldown');
  const denied = createNode('action.send_message');

  event.position = { x: 40, y: 120 };
  xp.position = { x: 250, y: 80 };
  cooldown.position = { x: 480, y: 80 };
  consume.position = { x: 720, y: 40 };
  command.position = { x: 920, y: 40 };
  startCooldown.position = { x: 1140, y: 40 };
  denied.position = { x: 720, y: 220 };

  xp.params.level = 10;
  cooldown.params.cooldownId = 'ice_wand';
  consume.params.amount = 10;
  command.params.command = 'effect give @p minecraft:slowness 3 1';
  startCooldown.params.cooldownId = 'ice_wand';
  startCooldown.params.ticks = 100;
  denied.params.text = '需要 10 级经验，并且冷却已经结束。';

  return {
    schemaVersion: '0.1.0',
    graphId: `logic_${nowId()}`,
    name,
    eventType: 'item_right_click',
    boundElement,
    enabled: true,
    targetLoaders: ['forge'],
    nodes: [event, xp, cooldown, consume, command, startCooldown, denied],
    edges: [
      { id: 'edge_event_xp', source: event.nodeId, sourceHandle: 'exec_out', target: xp.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_xp_cooldown', source: xp.nodeId, sourceHandle: 'true_out', target: cooldown.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_cooldown_consume', source: cooldown.nodeId, sourceHandle: 'true_out', target: consume.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_consume_command', source: consume.nodeId, sourceHandle: 'exec_out', target: command.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_command_cooldown', source: command.nodeId, sourceHandle: 'exec_out', target: startCooldown.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_xp_denied', source: xp.nodeId, sourceHandle: 'false_out', target: denied.nodeId, targetHandle: 'exec_in', type: 'exec' },
      { id: 'edge_cooldown_denied', source: cooldown.nodeId, sourceHandle: 'false_out', target: denied.nodeId, targetHandle: 'exec_in', type: 'exec' }
    ],
    variables: [],
    resources: [],
    diagnostics: [],
    generatedCodeCache: {},
    editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
  };
}

export async function saveLogicGraph(projectDir: string, graph: LogicGraph): Promise<void> {
  const file = path.join(projectDir, 'editor/logic', `${graph.graphId}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(graph, null, 2), 'utf8');
}

export async function loadLogicGraphs(projectDir: string): Promise<LogicGraph[]> {
  const dir = path.join(projectDir, 'editor/logic');
  try {
    const files = (await fs.readdir(dir)).filter(file => file.endsWith('.json'));
    const graphs: LogicGraph[] = [];
    for (const file of files) {
      graphs.push(JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as LogicGraph);
    }
    return graphs;
  } catch {
    return [];
  }
}
