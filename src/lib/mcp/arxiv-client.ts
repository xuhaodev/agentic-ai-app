/**
 * arXiv MCP 客户端服务
 * 
 * 提供 arXiv 论文搜索和获取功能
 * 参考: https://info.arxiv.org/help/api/user-manual.html
 */

import { MCPTool, MCPToolCallResult, MCPContent } from './types';

// arXiv API 基础 URL
const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

// ar5iv HTML 版本基础 URL (将 arxiv.org 转换为 ar5iv.org 以获取 HTML 格式)
const AR5IV_BASE = 'https://ar5iv.org';

/**
 * arXiv 论文条目
 */
export interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  links: {
    href: string;
    type?: string;
    title?: string;
  }[];
  categories: string[];
  primaryCategory: string;
  pdfUrl?: string;
  htmlUrl?: string;
}

/**
 * arXiv 工具定义
 */
export const ARXIV_TOOLS: MCPTool[] = [
  {
    name: 'arxiv_search',
    description: '搜索 arXiv 学术论文。根据关键词、作者、标题等查询最相关的论文。返回论文标题、摘要、作者、发布日期和链接。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询词。可以是关键词、论文标题、作者名等。支持高级搜索语法如 "ti:attention" (标题)、"au:vaswani" (作者)、"abs:transformer" (摘要)、"cat:cs.CL" (分类)。',
        },
        maxResults: {
          type: 'number',
          description: '返回结果的最大数量（默认5，最大10）',
          default: 5,
        },
        sortBy: {
          type: 'string',
          description: '排序方式',
          enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
          default: 'relevance',
        },
        sortOrder: {
          type: 'string',
          description: '排序顺序',
          enum: ['ascending', 'descending'],
          default: 'descending',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'arxiv_fetch',
    description: '获取 arXiv 论文的详细内容。支持通过 arXiv URL 或论文 ID 获取论文的完整信息和 HTML 内容。',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'arXiv 论文的 URL (如 https://arxiv.org/abs/2509.06917) 或论文 ID (如 2509.06917)',
        },
        includeContent: {
          type: 'boolean',
          description: '是否尝试获取论文的 HTML 内容（通过 ar5iv.org）',
          default: true,
        },
      },
      required: ['url'],
    },
  },
];

/**
 * 解析 arXiv ID 从 URL 或直接的 ID
 */
function parseArxivId(urlOrId: string): string {
  // 移除前后空格
  urlOrId = urlOrId.trim();
  
  // 如果是 URL，提取 ID
  const urlPatterns = [
    /arxiv\.org\/abs\/(\d+\.\d+)/,
    /arxiv\.org\/pdf\/(\d+\.\d+)/,
    /ar5iv\.org\/abs\/(\d+\.\d+)/,
    /ar5iv\.org\/html\/(\d+\.\d+)/,
  ];
  
  for (const pattern of urlPatterns) {
    const match = urlOrId.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // 检查是否是旧格式 ID (如 hep-th/9901001)
  const oldFormatMatch = urlOrId.match(/([a-z-]+\/\d+)/i);
  if (oldFormatMatch) {
    return oldFormatMatch[1];
  }
  
  // 检查是否是新格式 ID (如 2509.06917 或 2509.06917v1)
  const newFormatMatch = urlOrId.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
  if (newFormatMatch) {
    return newFormatMatch[1];
  }
  
  // 如果都不匹配，返回原始输入
  return urlOrId;
}

/**
 * 解析 arXiv API XML 响应
 */
function parseArxivXML(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  
  // 使用简单的正则表达式解析 XML
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;
  
  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryXml = entryMatch[1];
    
    const getId = (xml: string): string => {
      const match = xml.match(/<id>(.*?)<\/id>/);
      return match ? match[1].replace('http://arxiv.org/abs/', '') : '';
    };
    
    const getTitle = (xml: string): string => {
      const match = xml.match(/<title>([\s\S]*?)<\/title>/);
      return match ? match[1].trim().replace(/\s+/g, ' ') : '';
    };
    
    const getSummary = (xml: string): string => {
      const match = xml.match(/<summary>([\s\S]*?)<\/summary>/);
      return match ? match[1].trim().replace(/\s+/g, ' ') : '';
    };
    
    const getAuthors = (xml: string): string[] => {
      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(xml)) !== null) {
        authors.push(authorMatch[1].trim());
      }
      return authors;
    };
    
    const getPublished = (xml: string): string => {
      const match = xml.match(/<published>(.*?)<\/published>/);
      return match ? match[1] : '';
    };
    
    const getUpdated = (xml: string): string => {
      const match = xml.match(/<updated>(.*?)<\/updated>/);
      return match ? match[1] : '';
    };
    
    const getLinks = (xml: string): ArxivEntry['links'] => {
      const links: ArxivEntry['links'] = [];
      const linkRegex = /<link\s+([^>]*)\/>/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(xml)) !== null) {
        const attrs = linkMatch[1];
        const href = attrs.match(/href="([^"]*)"/)?.[1] || '';
        const type = attrs.match(/type="([^"]*)"/)?.[1];
        const title = attrs.match(/title="([^"]*)"/)?.[1];
        if (href) {
          links.push({ href, type, title });
        }
      }
      return links;
    };
    
    const getCategories = (xml: string): string[] => {
      const categories: string[] = [];
      const catRegex = /<category[^>]*term="([^"]*)"[^>]*\/>/g;
      let catMatch;
      while ((catMatch = catRegex.exec(xml)) !== null) {
        categories.push(catMatch[1]);
      }
      return categories;
    };
    
    const getPrimaryCategory = (xml: string): string => {
      const match = xml.match(/<arxiv:primary_category[^>]*term="([^"]*)"[^>]*\/>/);
      return match ? match[1] : '';
    };
    
    const id = getId(entryXml);
    const links = getLinks(entryXml);
    const pdfLink = links.find(l => l.title === 'pdf');
    
    // 提取纯 ID（不含版本号用于生成 URL）
    const pureId = id.replace(/v\d+$/, '');
    
    entries.push({
      id,
      title: getTitle(entryXml),
      summary: getSummary(entryXml),
      authors: getAuthors(entryXml),
      published: getPublished(entryXml),
      updated: getUpdated(entryXml),
      links,
      categories: getCategories(entryXml),
      primaryCategory: getPrimaryCategory(entryXml),
      pdfUrl: pdfLink?.href || `https://arxiv.org/pdf/${pureId}.pdf`,
      htmlUrl: `${AR5IV_BASE}/abs/${pureId}`,
    });
  }
  
  return entries;
}

/**
 * 搜索 arXiv 论文
 */
export async function searchArxiv(
  query: string,
  maxResults: number = 5,
  sortBy: string = 'relevance',
  sortOrder: string = 'descending'
): Promise<ArxivEntry[]> {
  // 限制最大结果数
  maxResults = Math.min(Math.max(1, maxResults), 10);
  
  // 构建查询 URL
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: '0',
    max_results: maxResults.toString(),
    sortBy,
    sortOrder,
  });
  
  const url = `${ARXIV_API_BASE}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'agentic-ai-app/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`arXiv API request failed: ${response.status} ${response.statusText}`);
  }
  
  const xml = await response.text();
  return parseArxivXML(xml);
}

/**
 * 获取单篇 arXiv 论文信息
 */
export async function getArxivPaper(arxivId: string): Promise<ArxivEntry | null> {
  const id = parseArxivId(arxivId);
  
  const params = new URLSearchParams({
    id_list: id,
  });
  
  const url = `${ARXIV_API_BASE}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'agentic-ai-app/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`arXiv API request failed: ${response.status} ${response.statusText}`);
  }
  
  const xml = await response.text();
  const entries = parseArxivXML(xml);
  
  return entries.length > 0 ? entries[0] : null;
}

/**
 * 从 ar5iv 获取论文 HTML 内容
 */
export async function fetchArxivHtmlContent(arxivId: string): Promise<string> {
  const id = parseArxivId(arxivId);
  const url = `${AR5IV_BASE}/abs/${id}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; agentic-ai-app/1.0)',
      'Accept': 'text/html',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ar5iv content: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  
  // 提取主要内容（简化版本）
  // 移除 script 和 style 标签
  let content = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
  
  // 提取 article 或 main 内容
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
  if (articleMatch) {
    content = articleMatch[1];
  } else if (mainMatch) {
    content = mainMatch[1];
  } else if (bodyMatch) {
    content = bodyMatch[1];
  }
  
  // 转换为纯文本（简化版）
  content = content
    // 保留段落换行
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n### ')
    // 移除所有 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 清理多余空白
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return content;
}

/**
 * 格式化论文条目为可读文本
 */
function formatPaperEntry(entry: ArxivEntry, index?: number): string {
  const prefix = index !== undefined ? `## ${index + 1}. ` : '## ';
  
  return `${prefix}${entry.title}

**arXiv ID:** ${entry.id}
**作者:** ${entry.authors.join(', ')}
**发布时间:** ${new Date(entry.published).toLocaleDateString('zh-CN')}
**更新时间:** ${new Date(entry.updated).toLocaleDateString('zh-CN')}
**分类:** ${entry.categories.join(', ')}

**摘要:**
${entry.summary}

**链接:**
- 📄 arXiv: https://arxiv.org/abs/${entry.id}
- 📑 PDF: ${entry.pdfUrl}
- 🌐 HTML: ${entry.htmlUrl}
`;
}

/**
 * 执行 arXiv 工具调用
 */
export async function callArxivTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolCallResult> {
  try {
    if (toolName === 'arxiv_search') {
      const query = args.query as string;
      const maxResults = (args.maxResults as number) || 5;
      const sortBy = (args.sortBy as string) || 'relevance';
      const sortOrder = (args.sortOrder as string) || 'descending';
      
      if (!query) {
        return {
          content: [{ type: 'text', text: '错误: 请提供搜索查询词' }],
          isError: true,
        };
      }
      
      const papers = await searchArxiv(query, maxResults, sortBy, sortOrder);
      
      if (papers.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `未找到与 "${query}" 相关的论文。请尝试其他关键词或使用高级搜索语法：
- ti:关键词 - 搜索标题
- au:作者名 - 搜索作者
- abs:关键词 - 搜索摘要
- cat:分类 - 搜索分类 (如 cs.CL, cs.AI)`,
          }],
        };
      }
      
      const formattedResults = papers.map((p, i) => formatPaperEntry(p, i)).join('\n---\n\n');
      
      return {
        content: [{
          type: 'text',
          text: `# arXiv 搜索结果: "${query}"

找到 ${papers.length} 篇相关论文：

${formattedResults}`,
        }],
      };
      
    } else if (toolName === 'arxiv_fetch') {
      const url = args.url as string;
      const includeContent = args.includeContent !== false;
      
      if (!url) {
        return {
          content: [{ type: 'text', text: '错误: 请提供 arXiv URL 或论文 ID' }],
          isError: true,
        };
      }
      
      const paper = await getArxivPaper(url);
      
      if (!paper) {
        return {
          content: [{
            type: 'text',
            text: `未找到论文: ${url}。请确认 arXiv ID 或 URL 正确。`,
          }],
          isError: true,
        };
      }
      
      let result = `# ${paper.title}

${formatPaperEntry(paper)}`;
      
      if (includeContent) {
        try {
          const htmlContent = await fetchArxivHtmlContent(url);
          if (htmlContent) {
            // 限制内容长度
            const truncatedContent = htmlContent.length > 15000 
              ? htmlContent.substring(0, 15000) + '\n\n...(内容已截断，完整内容请访问论文链接)'
              : htmlContent;
            
            result += `\n---\n\n# 论文内容\n\n${truncatedContent}`;
          }
        } catch (contentError) {
          result += `\n\n*注意: 无法获取 HTML 内容 (${contentError instanceof Error ? contentError.message : '未知错误'})，请直接访问论文链接。*`;
        }
      }
      
      return {
        content: [{ type: 'text', text: result }],
      };
      
    } else {
      return {
        content: [{ type: 'text', text: `未知工具: ${toolName}` }],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `arXiv 工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }],
      isError: true,
    };
  }
}
