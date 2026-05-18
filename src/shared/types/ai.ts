export interface AiProviderConfig {
  provider: string;
  displayName: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  timeoutMs: number;
  proxy?: string;
  headers?: Record<string, string>;
  compatibleMode: 'openai' | 'custom';
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const deepSeekPreset: Omit<AiProviderConfig, 'apiKey'> = {
  provider: 'deepseek',
  displayName: 'DeepSeek',
  apiBaseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.3,
  maxTokens: 4096,
  stream: false,
  timeoutMs: 60000,
  compatibleMode: 'openai'
};

export const ollamaPreset: Omit<AiProviderConfig, 'apiKey'> = {
  provider: 'ollama',
  displayName: 'Ollama 本地免费模型',
  apiBaseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5-coder:7b',
  temperature: 0.3,
  maxTokens: 4096,
  stream: false,
  timeoutMs: 120000,
  compatibleMode: 'openai'
};

export const lmStudioPreset: Omit<AiProviderConfig, 'apiKey'> = {
  provider: 'lmstudio',
  displayName: 'LM Studio 本地模型',
  apiBaseUrl: 'http://127.0.0.1:1234',
  model: 'local-model',
  temperature: 0.3,
  maxTokens: 4096,
  stream: false,
  timeoutMs: 120000,
  compatibleMode: 'openai'
};

export const mimoPreset: Omit<AiProviderConfig, 'apiKey'> = {
  provider: 'mimo',
  displayName: 'MIMO 云端大模型',
  apiBaseUrl: 'https://api.xiaomimimo.com/v1',
  model: 'mimo-v2.5-pro',
  temperature: 0.3,
  maxTokens: 4096,
  stream: false,
  timeoutMs: 120000,
  compatibleMode: 'openai'
};

export type AiProjectChangeAction = 'create_or_replace' | 'delete';

export interface AiProjectChangeFile {
  path: string;
  action: AiProjectChangeAction;
  content?: string;
  reason: string;
}

export interface AiProjectChangePlan {
  type: 'project_change_plan';
  title: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  files: AiProjectChangeFile[];
  nextSteps: string[];
}

export interface AiProjectApplyResult {
  snapshotPath: string;
  changedFiles: string[];
  deletedFiles: string[];
}
