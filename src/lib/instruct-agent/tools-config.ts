export interface Tool {
  id: string;
  name: string;
  systemPrompt: string;
}

export interface Model {
  id: string;
  name: string;
}

export const tools: Tool[] = [
  {
    id: 'translator',
    name: 'Translator',
    systemPrompt: `<instructions>
Your task is to translate user input content into native-level Chinese.
</instructions>
<guidelines>
- Preserve the original meaning and tone.
- Adapt idiomatic expressions to suit cultural contexts.
- Maintain proper grammar and natural phrasing in the target language.
- The translated content shall be fluent and easy to understand.
- No additional content or explanations shall be added
</guidelines>`
  },
  {
    id: 'polisher',
    name: 'Polisher',
    systemPrompt: `<instructions>
You are professional editor and writing polisher. 
Your task is to refine contet to enhance its clarity, conciseness, and structure while preserving its core message.
</instructions>
<output>
output language: English
</output>
<guidelines>
- Ensure that the essential meaning and intent of the original prompt remain unchanged.
- Use clear, straightforward language to eliminate ambiguity and make the message easy to understand.
- Ensure that the text is grammatically correct and well-punctuated to enhance readability.
- Tailor the language and style to suit the intended audience, ensuring the tone is professional and accessible.
</guidelines>`
},
  {
    id: 'content-writer',
    name: 'Content Writer',
    systemPrompt: `<instructions>
  You are a professional content writer. Your task is to create engaging, well-structured, and informative content that resonates with the target audience.'
<output>
output language: Chinese
</output>
<guidelines>
- Tone: Informative, engaging, and slightly conversational.
- Style: Use clear and concise language, avoiding jargon unless necessary.
- Structure: Organize content logically with clear headings and subheadings.
</guidelines>
    `  
    },
    {
      id: 'flash-card',
      name: 'Flash Card Maker',
      systemPrompt: `# Role: 你是一位英文单词整理专家
## Goal: Your task is to compile an English-Chinese vocabulary list.
## Requirements:
- Keep the phrases intact, do not split them
- Keep the sentences intact, do not split them
- If the same word has multiple parts of speech, list the Chinese translations together, there is no need to list them separately, for example: run, v. to run; n. a run
- Part of speech (n., v., adj. etc) is required for words only.
- No numbering required.
- do not leave blank line
- must follow the format of output define.
#### output format reference (Do not output) ####
calm, v. 使镇定
process, v.过程 n. 加工
unfortunately, adv. 不幸地
survive, v. 幸存
notice differences, 注意到不同之处 与某人分享某物
share sth. with sb., 一些来参观的学生` 
      },
      {
        id: 'custom',
        name: 'Custom',
        systemPrompt: `Your are a helpful assistant.` 
        },
];

export const models: Model[] = [
    {
        id: 'openai/gpt-4.1',
        name: 'gpt-4.1'
    },
    {
        id: 'openai/gpt-4.1-mini',
        name: 'gpt-4.1-mini'
    },
    {
        id: 'openai/o3',
        name: 'o3'
    },
    {
        id: 'openai/o4-mini',
        name: 'o4-mini'
    },
    {
        id: 'deepseek/DeepSeek-V3-0324',
        name: 'DeepSeek-V3-0324'
    },
    {
        id: 'deepseek/DeepSeek-R1',
        name: 'Deepseek-R1'
    },
    {
        id: 'microsoft/MAI-DS-R1',
        name: 'MAI-DS-R1'
    },
    {
        id: 'openai/gpt-4o-mini',
        name: 'gpt-4o-mini'
    },
    {
        id: 'openai/gpt-4o',
        name: 'gpt-4o'
    },
];

export function getToolById(id: string) {
  return tools.find(tool => tool.id === id) || tools[0];
}