export interface ModelDefinition {
  id: string;
  name: string;
}

export const models: ModelDefinition[] = [
  {
    id: 'openai/gpt-5-chat',
    name: 'openai/gpt-5-chat',
  },
  {
    id: 'openai/gpt-5',
    name: 'openai/gpt-5',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'openai/gpt-5-mini',
  },
  {
    id: 'openai/gpt-4.1',
    name: 'openai/gpt-4.1',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'openai/gpt-4.1-mini',
  },
  {
    id: 'openai/gpt-4o',
    name: 'openai/gpt-4o',
  },
];
