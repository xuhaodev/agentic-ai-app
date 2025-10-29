# Agentic AI Application

**This is Vibe Coding Project** - A modern AI agent platform built through collaborative coding between [@xuhaoruins](https://github.com/xuhaoruins) and GitHub Copilot AI agents, showcasing the future of human-AI development partnerships and methodology.

**Live Demo**: [https://agent.haxu.dev/](https://agent.haxu.dev/)

## Project Overview

This project represents a new approach to software development - "Vibe Coding" - where the human author chats with AI agents to complete the entire development process collaboratively. The result is a multi-agent AI application with specialized components:

- **Function Agent**: Executes Azure price queries and web searches through function calling capabilities
- **Instruct Agent**: Processes documents and follows custom system prompts for specific tasks
- **Workflow Agent**: Coordinates multi-step AI processes through a chain of specialized agents
- **MCP Agent**: Model Context Protocol implementation for enhanced agent interactions

## Development Philosophy

Vibe Coding represents a new paradigm in software development:

1. **Human-AI Collaboration**: The entire codebase was developed through natural language conversations between the author and AI agents
2. **Iterative Development**: Features were built incrementally through conversational development cycles
3. **Knowledge Transfer**: Complex concepts were explained and implemented by the AI based on high-level requirements

## Project Structure

### Core Components

- **Function Agent**: `/app/function-agent/` - Agent with tool-calling capabilities for Azure pricing and web search
- **Instruct Agent**: `/app/instruct-agent/` - Agent that follows specialized system prompts with document processing
- **Workflow Agent**: `/app/workflow-agent/` - Agent that coordinates multi-step processes through multiple agents
- **MCP Agent**: `/app/mcp-agent/` - Implementation of the Model Context Protocol

### Technology Stack

- **Framework**: Next.js with React 19
- **AI Integration**: CopilotKit v1.6.0
- **Styling**: Tailwind CSS
- **Deployment**: Azure Static Web Apps

## Getting Started

### Installation

Install dependencies using your preferred package manager:

```bash
pnpm install
# or
npm install
# or
yarn install
```

### Development

Run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment

The application is deployed on Azure Static Web Apps and accessible at [https://agent.haxu.dev/](https://agent.haxu.dev/).

### Recommended Deployment Options

We recommend deploying this application using one of these Azure services:

1. **Azure Web App**:

   - Ideal for hosting the Next.js application directly
   - Supports continuous deployment from GitHub
   - Offers easy scaling options
2. **Azure Container App**:

   - Good choice for containerized deployment
   - Better for microservices architecture
   - Provides flexibility with resource allocation

### Required Environment Variables

To deploy your own version, you'll need to configure the following environment variables:

```
AZURE_OPENAI_ENDPOINT=https://models.inference.ai.azure.com # use GitHub Models as sample
OPENAI_API_KEY=ghp_xxxx  #use your GitHub key

SECOND_OPENAI_API_KEY=   # use your Azure OpenAI key
SECOND_AZURE_OPENAI_ENDPOINT=https://xxxxx.openai.azure.com/ # use your Azure OpenAI endpoint
OPENAI_API_VERSION=2024-10-21
TAVILY_API_KEY=tvly-xxx # use your Tavily search api key

LANGSMITH_API_KEY=lsv2_xxxx # use your Langsmith key
AGENT_DEPLOYMENT_URL=https://xxxx.azurewebsites.net # refer to my MCP-Server project


```

### Deployment Steps

1. Fork this repository
2. Create your chosen Azure resource (Web App, Container App, or Static Web App)
3. Connect it to your forked repository for CI/CD deployment
4. Configure the environment variables in the Azure service configuration
   - For Azure Web App: Add in Configuration > Application Settings
   - For Azure Container App: Add in Configuration > Environment Variables
   - For Azure Static Web Apps: Add in Configuration > Environment Variables
5. Deploy and enjoy!

If deploying with Docker (recommended for Azure Container App):

```bash
# Build the Docker image
docker build -t agentic-ai-app .

# Run locally to test (optional)
docker run -p 3000:3000 --env-file .env agentic-ai-app

# Push to a container registry (Azure Container Registry recommended)
docker tag agentic-ai-app your-registry.azurecr.io/agentic-ai-app
docker push your-registry.azurecr.io/agentic-ai-app
```

## Acknowledgements

This project demonstrates the potential of human-AI collaborative development. The entire development process was completed through conversation between the author and AI agents - showing how "Vibe Coding" can transform software development.
