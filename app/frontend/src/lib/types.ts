export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  versionId?: string;
  source?: 'mock' | 'llm';
  createdAt: number;
}

export interface Version {
  id: string;
  index: number;
  html: string;
  prompt: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  messages: ChatMessage[];
  versions: Version[];
  currentVersionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Store {
  projects: Project[];
  activeProjectId: string;
}

export type Provider = 'openai' | 'deepseek';

export interface Settings {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type Viewport = 'mobile' | 'tablet' | 'desktop';

export interface LogEntry {
  id: number;
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  time: number;
}
