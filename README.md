# Agentic AI Application

由 [@xuhaoruins](https://github.com/xuhaoruins) 与 GitHub Copilot AI 共同打造的现代 AI Agent 平台。

🔗 **演示**: [agent.haxu.dev](https://agent.haxu.dev/)

## ✨ 功能特性

- 🤖 **多模型支持** — GPT-5、GPT-4.1、GPT-4o 等模型
- 📄 **文档感知** — 上传 PDF/TXT/DOCX/MD 作为对话上下文
- 🖼️ **图片理解** — 支持图片附件的视觉理解
- 🔧 **动态工具** — 通过 GitHub Gist 管理系统提示词
- ⚡ **流式响应** — SSE 实时输出

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 添加 GITHUB_TOKEN

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

## 🔐 环境变量

```bash
# 必需
GITHUB_MODEL_ENDPOINT=https://models.github.ai/inference
GITHUB_TOKEN=ghp_xxxx

# 可选
GITHUB_TOOLS_GIST_ID=your_gist_id
```

## 🛠️ 技术栈

Next.js 15 · React 18 · TypeScript · Tailwind CSS · OpenAI SDK

## 📦 部署

```bash
# Docker
docker build -t agentic-ai-app .
docker run -p 3000:3000 --env-file .env agentic-ai-app
```

支持部署到 Azure Web App / Container Apps。

---

**Vibe Coding** — 人机协作，迭代交付 🚀
