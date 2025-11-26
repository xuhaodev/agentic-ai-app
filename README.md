# Agentic AI Application

**This is Vibe Coding Project** — a modern AI agent platform co-created by [@xuhaoruins](https://github.com/xuhaoruins) and GitHub Copilot AI agents. The codebase showcases what collaborative "Vibe Coding" looks like in production.

**Live Demo**: [https://agent.haxu.dev/](https://agent.haxu.dev/)

---

## 📖 Project Overview

This repository contains the production-ready **Instruct Agent** experience. Users can upload documents, craft custom system prompts, and chat with an AI assistant that streams responses in real time. The latest iteration adds a rich-text composer, inline line breaks, and direct image attachments that are forwarded to the model as `image_url` content.

### ✨ Key Features
- **Document-aware assistant** with structured context injection and streaming replies
- **Rich text input** with auto-growing editor (up to three lines) and keyboard shortcuts
- **Image attachments**: upload images alongside your prompt; files are encoded to Base64 and included in the API call
- **Flexible prompt management** powered by GitHub Gists (system prompts can be refreshed on demand)
- **File parsing pipeline** for PDF, TXT, DOCX, and Markdown uploads
- **Azure-friendly deployment** with Docker workflow targeting Azure Container Registry

### 🧠 Development Philosophy
Vibe Coding embraces:
1. **Human-AI Collaboration** — every feature begins as a conversation
2. **Iterative Delivery** — specs evolve dialog by dialog, with working builds on each pass
3. **Knowledge Transfer** — complex ideas are distilled into executable changes by the AI agents

---

## 🗂️ Project Structure & Stack

- **Framework**: Next.js 15 (App Router) with React 18
- **Language**: TypeScript (strict mode)
- **UI**: Tailwind CSS and custom gradients
- **AI Integration**: OpenAI SDK with Azure-compatible endpoints (GitHub Models by default)
- **File Utilities**: `pdfjs-dist` for PDF extraction plus custom parsers for text/DOCX
- **Build Tooling**: ESLint 9, TypeScript 5.8, Tailwind 3

Key directories:
- `src/app/instruct-agent/` — UI, streaming chat experience, file uploader
- `src/app/api/instruct-agent/` — Edge runtime route that calls the model and handles image payloads
- `src/lib/instruct-agent/` — client utilities (Azure client, prompt loader, file parser, models registry)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (aligns with Next.js 15 requirements)
- npm, pnpm, or yarn

### Install Dependencies
```bash
pnpm install
# or
npm install
# or
yarn install
```

### Run in Development
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000) to interact with the agent.

### Lint & Type-Check
```bash
npm run lint
```
This command runs ESLint with the Next.js configuration and is part of the local quality gate.

### Production Build
```bash
npm run build
```
The build step mirrors our CI pipeline and validates TypeScript types before emitting optimized output under `.next/`.

---

## 🔐 Environment Variables

Create a `.env.local` (or configure secrets in your hosting platform) with the following keys as needed:

```bash
AZURE_OPENAI_ENDPOINT=https://models.inference.ai.azure.com
OPENAI_API_KEY=ghp_xxxx            # GitHub Models sample key

SECOND_OPENAI_API_KEY=             # Azure OpenAI key (optional fallback)
SECOND_AZURE_OPENAI_ENDPOINT=https://xxxxx.openai.azure.com/
OPENAI_API_VERSION=2024-10-21

TAVILY_API_KEY=tvly_xxx            # Tavily search API key (optional)
LANGSMITH_API_KEY=lsv2_xxx         # LangSmith tracing key (optional)
AGENT_DEPLOYMENT_URL=https://xxxx.azurewebsites.net
```

> 💡 The application can run with only `OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` configured when using GitHub Models. Other keys unlock additional functionality like Tavily search or LangSmith tracing.

---

## 📦 Deployment & CI

### Docker
```bash
# Build the Docker image
docker build -t agentic-ai-app .

# Run locally
docker run -p 3000:3000 --env-file .env agentic-ai-app

# Push to Azure Container Registry
docker tag agentic-ai-app haxureg.azurecr.io/agentic-ai-app
docker push haxureg.azurecr.io/agentic-ai-app
```

### GitHub Actions
The workflow at `.github/workflows/action-to-acr.yml` builds and pushes the image to Azure Container Registry whenever commits land on the **`master`** branch (or an open PR targets `master`). Required secrets: `ACR_USERNAME` and `ACR_PASSWORD`.

### Recommended Azure Targets
1. **Azure Web App for Containers** — straightforward deployment of the Docker image
2. **Azure Container Apps** — flexible scaling and microservices support
3. **Azure Static Web Apps** — use if shipping a statically pre-rendered variant

---

## 🗃️ Branching Model

- **master** — current default branch
- **backup** — snapshot of the legacy master branch before the latest iteration
- **Feature branches** should branch off `master` and merge back via pull requests

Ensure your local clone targets the correct branch:
```bash
git checkout master
```

---

## 🤝 Contributing
1. Discuss planned changes via GitHub Issues or pull requests
2. Work in a dedicated feature branch
3. Run `npm run lint` and `npm run build` before opening a PR
4. Document testing steps (and any AI prompts used) in your PR description

Because this project highlights AI-assisted development, we encourage capturing the conversational context that led to major updates.

---

## 🙏 Acknowledgements

This project demonstrates how conversational development with AI agents can deliver a production-grade experience. Every commit reflects human guidance plus AI execution — showing how "Vibe Coding" can reshape modern software teams.

Enjoy building with Agentic AI!
