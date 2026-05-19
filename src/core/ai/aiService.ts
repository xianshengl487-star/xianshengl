import type { AiChatMessage, AiModelDraft, AiModFeatureDraft, AiProjectChangePlan, AiProviderConfig, AiTextureDraft } from '../../shared/types/ai';

export type ChatMessage = AiChatMessage;

function openAiBaseUrl(config: AiProviderConfig): string {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  return baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
}

function authHeaders(config: AiProviderConfig): Record<string, string> {
  if (!config.apiKey) return { ...(config.headers || {}) };
  return {
    Authorization: `Bearer ${config.apiKey}`,
    ...(config.provider === 'mimo' ? { 'api-key': config.apiKey } : {}),
    ...(config.headers || {})
  };
}

export async function chat(config: AiProviderConfig, messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs || 60000);
  try {
    const response = await fetch(`${openAiBaseUrl(config)}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(config)
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false
      })
    });
    if (!response.ok) throw new Error(`AI 请求失败：${response.status} ${await response.text()}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

export async function testConnection(config: AiProviderConfig): Promise<boolean> {
  const reply = await chat(config, [{ role: 'user', content: 'Reply only with OK.' }]);
  return reply.toUpperCase().includes('OK');
}

export async function listModels(config: AiProviderConfig): Promise<string[]> {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const openAiUrl = openAiBaseUrl(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(config.timeoutMs || 60000, 15000));
  try {
    if (config.provider === 'ollama') {
      const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name?: string }> };
        return (data.models || []).map(model => model.name).filter(Boolean) as string[];
      }
    }
    const response = await fetch(`${openAiUrl}/models`, {
      signal: controller.signal,
      headers: authHeaders(config)
    });
    if (!response.ok) throw new Error(`模型列表读取失败：${response.status} ${await response.text()}`);
    const data = await response.json() as { data?: Array<{ id?: string }> };
    return (data.data || []).map(model => model.id).filter(Boolean) as string[];
  } finally {
    clearTimeout(timer);
  }
}

export function buildAssistantMessages(userMessages: AiChatMessage[], context: Record<string, unknown>): AiChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是 BlockForge Studio 内置的中文模组开发助手。',
        '你可以解释 Minecraft Forge、BlockForge 项目结构、元素属性、贴图、节点逻辑、NBT、构建错误和部署步骤。',
        '普通对话时不要返回 JSON，除非用户明确要求。',
        '如果涉及修改项目，请提醒用户使用“AI 工程大改”的受控计划流程。',
        '回答要简洁、可执行，优先使用中文。'
      ].join(' ')
    },
    {
      role: 'user',
      content: `当前项目上下文：\n${JSON.stringify(context, null, 2)}`
    },
    ...userMessages
  ];
}

export async function createAssistantReply(config: AiProviderConfig, messages: AiChatMessage[], context: Record<string, unknown>): Promise<string> {
  return chat(config, buildAssistantMessages(messages, context));
}

export function buildLogicDraftPrompt(userPrompt: string, availableNodes: string[], context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are the BlockForge logic graph draft generator.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must use this shape:',
        '{"type":"logic_graph_draft","name":"short name","event":"item_right_click","boundElement":"item:example","nodes":[{"id":"xp","nodeType":"condition.player_xp_level_at_least","params":{"level":10},"position":{"x":260,"y":80}}],"edges":[{"source":"event","sourceHandle":"exec_out","target":"xp","targetHandle":"exec_in","type":"exec"}]}',
        'Use only nodeType values from availableNodes.',
        'If you omit the event node from nodes, use "event" as the edge source alias and the app will create it.',
        'For condition nodes, use sourceHandle "true_out" and "false_out"; for action nodes, use "exec_out".',
        'Do not return markdown, explanations, Java, comments, or code fences.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ userPrompt, availableNodes, context }, null, 2)
    }
  ];
}

export interface LogicGraphDraft {
  type: 'logic_graph_draft';
  event: string;
  boundElement?: string;
  nodes: unknown[];
  edges: unknown[];
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function previewText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 800) || '<空响应>';
}

export function parseLogicDraft(text: string): LogicGraphDraft {
  let value: Partial<LogicGraphDraft>;
  try {
    value = JSON.parse(extractJson(text)) as Partial<LogicGraphDraft>;
  } catch (error) {
    throw new Error(`AI 响应不是有效 JSON。原始响应片段：${previewText(text)}`);
  }
  if (value.type !== 'logic_graph_draft') {
    throw new Error(`AI 响应不是 logic_graph_draft JSON 对象。原始响应片段：${previewText(text)}`);
  }
  if (!value.event || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error(`AI 草案必须包含 event、nodes 和 edges。原始响应片段：${previewText(text)}`);
  }
  return value as LogicGraphDraft;
}

export async function createLogicDraft(
  config: AiProviderConfig,
  userPrompt: string,
  availableNodes: string[],
  context: Record<string, unknown>
): Promise<LogicGraphDraft> {
  const reply = await chat(config, buildLogicDraftPrompt(userPrompt, availableNodes, context));
  return parseLogicDraft(reply);
}

function sanitizeAssetName(value: unknown, fallback: string): string {
  const raw = String(value || fallback).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  return raw || fallback;
}

function normalizeUsage(value: unknown, fallback: 'item_texture' | 'block_texture'): 'item_texture' | 'block_texture';
function normalizeUsage(value: unknown, fallback: 'item_model' | 'block_model'): 'item_model' | 'block_model';
function normalizeUsage(value: unknown, fallback: 'item_texture' | 'block_texture' | 'item_model' | 'block_model') {
  if (fallback === 'item_texture' || fallback === 'block_texture') {
    return value === 'block_texture' ? 'block_texture' : value === 'item_texture' ? 'item_texture' : fallback;
  }
  return value === 'block_model' ? 'block_model' : value === 'item_model' ? 'item_model' : fallback;
}

function normalizeTextureSize(value: unknown): 16 | 32 | 64 {
  const next = Number(value);
  if (next === 32 || next === 64) return next;
  return 16;
}

function normalizeColor(value: unknown, fallback = 'transparent'): string {
  const text = String(value || '').trim();
  if (text === 'transparent') return text;
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  return fallback;
}

function rowsToPixels(rows: unknown, palette: Record<string, unknown>, size: 16 | 32 | 64): string[] {
  if (!Array.isArray(rows)) return [];
  const pixels: string[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = String(rows[y] || '').padEnd(size, '.').slice(0, size);
    for (let x = 0; x < size; x += 1) {
      const key = row[x];
      pixels.push(normalizeColor(palette[key], key === '.' ? 'transparent' : '#000000'));
    }
  }
  return pixels;
}

function fallbackPixels(size: 16 | 32 | 64, palette: string[]): string[] {
  const colors = palette.length > 0 ? palette : ['#7dd3fc', '#e0f2fe', '#155e75', '#ffffff'];
  const center = (size - 1) / 2;
  return Array.from({ length: size * size }, (_, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    const distance = Math.abs(x - center) + Math.abs(y - center);
    if (distance > size * 0.82 && (x + y) % 2 === 0) return 'transparent';
    const band = Math.floor((x / Math.max(1, size - 1)) * colors.length);
    const highlight = y < size * 0.22 && x > size * 0.18 && x < size * 0.82;
    return highlight ? colors[Math.min(1, colors.length - 1)] : colors[Math.min(band, colors.length - 1)];
  });
}

function normalizePixels(value: unknown, size: 16 | 32 | 64, palette: string[]): string[] {
  const flat = Array.isArray(value)
    ? value.flatMap(item => Array.isArray(item) ? item : [item]).map(item => normalizeColor(item, 'transparent'))
    : [];
  const expected = size * size;
  if (flat.length >= expected) return flat.slice(0, expected);
  if (flat.length > 0) return [...flat, ...fallbackPixels(size, palette).slice(flat.length, expected)];
  return fallbackPixels(size, palette);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];
}

export function buildTextureDraftPrompt(userPrompt: string, context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are BlockForge Studio cloud texture painter for Minecraft Java mods.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must be a texture_draft.',
        'Use this compact shape:',
        '{"type":"texture_draft","textureName":"ice_wand","textureUsage":"item_texture","textureOwner":"item:ice_wand","size":16,"palette":{".":"transparent","A":"#112233","B":"#77ccff"},"rows":["................","....AABB........"],"notes":["short Chinese note"]}.',
        'Rows must contain exactly size strings and each string should be size characters. Use palette keys to draw pixel art.',
        'You may also include pixels as a flat color array, but rows are preferred.',
        'Minecraft vanilla pixel art style: readable silhouette, limited palette, clean highlights, no photo realism.',
        'Do not return markdown, explanations, comments, code fences, or binary image data.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ userPrompt, context }, null, 2)
    }
  ];
}

export function parseTextureDraft(text: string, context: Record<string, unknown>): AiTextureDraft {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(extractJson(text)) as Record<string, unknown>;
  } catch {
    throw new Error(`AI 贴图响应不是有效 JSON。原始响应片段：${previewText(text)}`);
  }
  if (value.type !== 'texture_draft') {
    throw new Error(`AI 响应不是 texture_draft 对象。原始响应片段：${previewText(text)}`);
  }
  const size = normalizeTextureSize(value.size || context.textureSize);
  const rawPalette = value.palette && typeof value.palette === 'object' && !Array.isArray(value.palette)
    ? value.palette as Record<string, unknown>
    : {};
  const palette = Object.values(rawPalette).map(item => normalizeColor(item)).filter(item => item !== 'transparent');
  const rowPixels = rowsToPixels(value.rows, rawPalette, size);
  return {
    type: 'texture_draft',
    textureName: sanitizeAssetName(value.textureName, sanitizeAssetName(context.textureName, 'ai_texture')),
    textureUsage: normalizeUsage(value.textureUsage, normalizeUsage(context.textureUsage, 'item_texture')),
    textureOwner: String(value.textureOwner || context.textureOwner || 'item:example'),
    size,
    pixels: rowPixels.length > 0 ? rowPixels : normalizePixels(value.pixels, size, palette),
    palette,
    notes: asStringArray(value.notes)
  };
}

export async function createTextureDraft(
  config: AiProviderConfig,
  userPrompt: string,
  context: Record<string, unknown>
): Promise<AiTextureDraft> {
  const reply = await chat(config, buildTextureDraftPrompt(userPrompt, context));
  return parseTextureDraft(reply, context);
}

export function buildModelDraftPrompt(userPrompt: string, context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are BlockForge Studio cloud MCPBlockbench model draft generator.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must be a blockbench_model_draft.',
        'Use this shape:',
        '{"type":"blockbench_model_draft","modelName":"ice_wand_model","modelUsage":"item_model","modelOwner":"item:ice_wand","modelJson":{"parent":"minecraft:item/generated","textures":{"layer0":"modid:item/ice_wand"}},"textureHints":["..."],"animationHints":["..."],"notes":["..."]}.',
        'modelJson must be valid Minecraft Java resource-pack model JSON that Blockbench can open/export for Forge 1.20.1.',
        'For block models, prefer elements with from/to/faces and texture variables. For item models, include parent, textures, display, and elements when useful.',
        'Use simple cubes and vanilla-compatible fields; do not invent Java code.',
        'Do not return markdown, explanations outside JSON, comments, or code fences.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ userPrompt, context }, null, 2)
    }
  ];
}

export function parseModelDraft(text: string, context: Record<string, unknown>): AiModelDraft {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(extractJson(text)) as Record<string, unknown>;
  } catch {
    throw new Error(`AI 模型响应不是有效 JSON。原始响应片段：${previewText(text)}`);
  }
  if (value.type !== 'blockbench_model_draft') {
    throw new Error(`AI 响应不是 blockbench_model_draft 对象。原始响应片段：${previewText(text)}`);
  }
  const rawModel = value.modelJson;
  const modelJson = typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel || {}, null, 2);
  let parsed: unknown;
  try {
    parsed = JSON.parse(modelJson);
  } catch {
    throw new Error(`AI 返回的 modelJson 不是有效模型 JSON。原始响应片段：${previewText(modelJson)}`);
  }
  const content = JSON.stringify(parsed, null, 2);
  return {
    type: 'blockbench_model_draft',
    modelName: sanitizeAssetName(value.modelName, sanitizeAssetName(context.modelName, 'ai_model')),
    modelUsage: normalizeUsage(value.modelUsage, normalizeUsage(context.modelUsage, 'item_model')),
    modelOwner: String(value.modelOwner || context.modelOwner || 'item:example'),
    modelJson: content,
    textureHints: asStringArray(value.textureHints),
    animationHints: asStringArray(value.animationHints),
    notes: asStringArray(value.notes),
    mcpTarget: 'mcpblockbench-cloud-json'
  };
}

export async function createModelDraft(
  config: AiProviderConfig,
  userPrompt: string,
  context: Record<string, unknown>
): Promise<AiModelDraft> {
  const reply = await chat(config, buildModelDraftPrompt(userPrompt, context));
  return parseModelDraft(reply, context);
}

export function buildFeatureRecipePrompt(userPrompt: string, context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are BlockForge Studio Minecraft mod feature designer.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must be a mod_feature_recipe.',
        'Use this shape:',
        '{"type":"mod_feature_recipe","title":"moving crystal block","featureKind":"animated_block","summary":"...","difficulty":"medium","recommendedElements":["block:crystal_core"],"steps":["..."],"assetPlan":["..."],"logicPlan":["..."],"forgeNotes":["..."],"nextActions":["..."]}.',
        'Focus on features the app can help build: animated blocks, animated textures, material polish, particle/sound loops, block entity ideas, node logic, mcfunction, Forge event notes, and low-level mod-making method.',
        'Explain practical steps in Chinese. Do not write full Java source unless asked.',
        'Do not return markdown, explanations outside JSON, comments, or code fences.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ userPrompt, context }, null, 2)
    }
  ];
}

function normalizeFeatureKind(value: unknown): AiModFeatureDraft['featureKind'] {
  if (value === 'animated_block' || value === 'animated_texture' || value === 'material_polish' || value === 'low_level_method') return value;
  return 'custom';
}

function normalizeDifficulty(value: unknown): AiModFeatureDraft['difficulty'] {
  if (value === 'hard' || value === 'medium') return value;
  return 'easy';
}

export function parseFeatureRecipe(text: string): AiModFeatureDraft {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(extractJson(text)) as Record<string, unknown>;
  } catch {
    throw new Error(`AI 特色玩法响应不是有效 JSON。原始响应片段：${previewText(text)}`);
  }
  if (value.type !== 'mod_feature_recipe') {
    throw new Error(`AI 响应不是 mod_feature_recipe 对象。原始响应片段：${previewText(text)}`);
  }
  return {
    type: 'mod_feature_recipe',
    title: String(value.title || '特色玩法方案'),
    featureKind: normalizeFeatureKind(value.featureKind),
    summary: String(value.summary || ''),
    difficulty: normalizeDifficulty(value.difficulty),
    recommendedElements: asStringArray(value.recommendedElements),
    steps: asStringArray(value.steps),
    assetPlan: asStringArray(value.assetPlan),
    logicPlan: asStringArray(value.logicPlan),
    forgeNotes: asStringArray(value.forgeNotes),
    nextActions: asStringArray(value.nextActions)
  };
}

export async function createFeatureRecipe(
  config: AiProviderConfig,
  userPrompt: string,
  context: Record<string, unknown>
): Promise<AiModFeatureDraft> {
  const reply = await chat(config, buildFeatureRecipePrompt(userPrompt, context));
  return parseFeatureRecipe(reply);
}

export function buildProjectChangePrompt(userPrompt: string, projectFiles: Array<{ path: string; content: string }>, context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are the BlockForge project refactor assistant.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must be a project_change_plan:',
        '{"type":"project_change_plan","title":"short title","summary":"what will change","riskLevel":"low|medium|high","files":[{"path":"editor/elements/items/example.json","action":"create_or_replace","content":"full file content as UTF-8 string","reason":"why"}],"nextSteps":["generate Forge","build jar"]}.',
        'You may only propose changes to paths that already appear in projectFiles, or new files under editor/elements, editor/logic, editor/resources, editor/ui, editor/variables, editor/templates, editor/plugins, src/custom, or blockforge.project.json.',
        'Never include generated/forge, exports, logs, node_modules, dist, package files, or absolute paths.',
        'For JSON files, content must be complete valid JSON text, not a diff.',
        'For mcfunction files, content must be complete function text.',
        'Do not return markdown, explanations outside JSON, comments, or code fences.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ userPrompt, context, projectFiles }, null, 2)
    }
  ];
}

export function parseProjectChangePlan(text: string): AiProjectChangePlan {
  let value: Partial<AiProjectChangePlan>;
  try {
    value = JSON.parse(extractJson(text)) as Partial<AiProjectChangePlan>;
  } catch {
    throw new Error(`AI 响应不是有效工程变更 JSON。原始响应片段：${previewText(text)}`);
  }
  if (value.type !== 'project_change_plan') {
    throw new Error(`AI 响应不是 project_change_plan 对象。原始响应片段：${previewText(text)}`);
  }
  if (!value.title || !value.summary || !Array.isArray(value.files)) {
    throw new Error('AI 工程变更计划必须包含 title、summary 和 files。');
  }
  const risk = value.riskLevel === 'high' || value.riskLevel === 'medium' ? value.riskLevel : 'low';
  return {
    type: 'project_change_plan',
    title: String(value.title),
    summary: String(value.summary),
    riskLevel: risk,
    files: value.files.map(file => ({
      path: String(file.path || ''),
      action: file.action === 'delete' ? 'delete' : 'create_or_replace',
      content: file.content === undefined ? undefined : String(file.content),
      reason: String(file.reason || 'AI 建议修改')
    })),
    nextSteps: Array.isArray(value.nextSteps) ? value.nextSteps.map(String) : []
  };
}

export async function createProjectChangePlan(
  config: AiProviderConfig,
  userPrompt: string,
  projectFiles: Array<{ path: string; content: string }>,
  context: Record<string, unknown>
): Promise<AiProjectChangePlan> {
  const reply = await chat(config, buildProjectChangePrompt(userPrompt, projectFiles, context));
  return parseProjectChangePlan(reply);
}
