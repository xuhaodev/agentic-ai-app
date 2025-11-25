export type ChatRole = 'system' | 'user' | 'assistant' | 'developer';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  id?: string;
}
