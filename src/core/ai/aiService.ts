import type { AiChatMessage, AiProjectChangePlan, AiProviderConfig } from '../../shared/types/ai';

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

export function buildProjectChangePrompt(userPrompt: string, projectFiles: Array<{ path: string; content: string }>, context: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are the BlockForge project refactor assistant.',
        'Return exactly one JSON object and nothing else.',
        'The JSON object must be a project_change_plan:',
        '{"type":"project_change_plan","title":"short title","summary":"what will change","riskLevel":"low|medium|high","files":[{"path":"editor/elements/items/example.json","action":"create_or_replace","content":"full file content as UTF-8 string","reason":"why"}],"nextSteps":["generate Forge","build jar"]}.',
        'You may only propose changes to paths that already appear in projectFiles, or new files under editor/elements, editor/logic, editor/resources, editor/ui, editor/variables, editor/templates, src/custom, or blockforge.project.json.',
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
