export interface ModelDefinition {
  id: string;
  name: string;
}

export const models: ModelDefinition[] = [
  // GPT-5 系列
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
  },
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
  },
  // o 系列 (推理模型)
  {
    id: 'openai/o4-mini',
    name: 'o4-mini',
  },
  {
    id: 'openai/o3',
    name: 'o3',
  },
  {
    id: 'openai/o3-mini',
    name: 'o3-mini',
  },
  {
    id: 'openai/o1',
    name: 'o1',
  },
  {
    id: 'openai/o1-preview',
    name: 'o1-preview',
  },
  {
    id: 'openai/o1-mini',
    name: 'o1-mini',
  },
  // GPT-4 系列
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
  },
];
