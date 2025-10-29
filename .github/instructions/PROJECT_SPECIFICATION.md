# Agentic AI Application - Project Specification

## Project Overview

The Agentic AI Application is a modern, multi-agent AI platform built with Next.js and React that demonstrates different approaches to AI agent architecture and implementation. This project represents a new software development paradigm called "Vibe Coding" - where the entire application was developed through collaborative conversations between human developers and AI agents.

### Key Characteristics

- **Multi-Agent Architecture**: Four distinct agent types with specialized capabilities
- **Modern Tech Stack**: Built with Next.js 15, React 18, TypeScript, and Tailwind CSS
- **AI Integration**: Leverages CopilotKit, Azure OpenAI, and GitHub Models
- **Responsive Design**: Mobile-first responsive design with adaptive layouts
- **Production Ready**: Deployed on Azure with comprehensive CI/CD support

## Architecture Overview

### Technology Stack

#### Frontend
- **Framework**: Next.js 15.2.2 with App Router
- **UI Library**: React 18.2.0 with TypeScript 5.8.2
- **Styling**: Tailwind CSS 3.3.3 with custom components
- **AI Integration**: CopilotKit v1.7.1 for agent interactions
- **Icons**: Lucide React for modern iconography

#### Backend
- **Runtime**: Edge Runtime for improved performance
- **AI Services**: 
  - Azure OpenAI (GPT-4o, GPT-4o-mini)
  - GitHub Models for inference
  - OpenAI SDK for standardized API access
- **External APIs**:
  - Azure Retail Prices API
  - Tavily Search API
  - LangSmith for workflow tracing

#### Development & Deployment
- **Package Manager**: PNPM (recommended)
- **Linting**: ESLint with Next.js configuration
- **Deployment**: Azure Static Web Apps / Azure Web Apps
- **Docker**: Containerization support for Azure Container Apps

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   Function  │ │  Instruct   │ │  Workflow   │ │   MCP   │ │
│  │   Agent     │ │   Agent     │ │   Agent     │ │  Agent  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     API Routes                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   /api/     │ │    /api/    │ │    /api/    │ │  /api/  │ │
│  │ function-   │ │  instruct-  │ │  workflow-  │ │copilot- │ │
│  │  agent      │ │   agent     │ │   agent     │ │  kit    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   External Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   Azure     │ │   GitHub    │ │   Tavily    │ │LangSmith│ │
│  │   OpenAI    │ │   Models    │ │   Search    │ │ Platform│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Agent Types & Capabilities

### 1. Function Agent (`/function-agent`)

**Purpose**: Demonstrates OpenAI function calling capabilities with tool selection and execution.

#### Features
- **Tool Selection**: Users can select from available tools (Azure Pricing, Web Search)
- **Function Calling**: Implements OpenAI function calling standard
- **Streaming Responses**: Real-time streaming of both tool results and AI analysis
- **Context Management**: Maintains conversation context across sessions
- **Multi-Step Processing**: Tool execution followed by AI interpretation

#### Technical Implementation
- **API Route**: `/api/function-agent/route.ts`
- **Tools**: Azure Retail Prices API, Tavily Web Search
- **Models**: GPT-4o for function calling, GPT-4o-mini for analysis
- **UI Components**: Chat interface, tool selector, results display

#### Key Files
- `src/app/function-agent/page.tsx` - Main page component
- `src/lib/function-agent/function-tools.ts` - Tool implementations
- `src/lib/function-agent/tools-schema.ts` - Function definitions
- `src/components/function-agent/` - UI components

### 2. Instruct Agent (`/instruct-agent`)

**Purpose**: Processes documents and follows specialized system prompts for task-specific operations.

#### Features
- **Document Processing**: Upload and analyze PDF documents
- **System Prompt Customization**: Pre-configured tools with specialized prompts
- **Model Selection**: Support for multiple AI models (Azure OpenAI, GitHub Models)
- **Streaming Responses**: Real-time response streaming
- **Tool Library**: Pre-configured tools for different use cases

#### Technical Implementation
- **API Route**: `/api/instruct-agent/route.ts`
- **Document Parser**: PDF processing with pdfjs-dist
- **Multiple Clients**: Azure OpenAI REST client, GitHub Models via OpenAI SDK
- **Tool Configuration**: Centralized tool and prompt management

#### Key Files
- `src/app/instruct-agent/page.tsx` - Main page component
- `src/lib/instruct-agent/tools-config.ts` - Tool definitions
- `src/lib/instruct-agent/file-parser.ts` - Document processing
- `src/lib/instruct-agent/azure-client.ts` - AI client configuration

### 3. Workflow Agent (`/workflow-agent`)

**Purpose**: Executes multi-step AI workflows with autonomous task coordination.

#### Features
- **Workflow Orchestration**: LlamaIndex workflow engine
- **Agent Coordination**: Multiple specialized agents working together
- **Real-time Monitoring**: Live workflow visualization and logging
- **Semi-autonomous Operation**: Minimal human intervention required
- **Tool Integration**: Web search and research capabilities

#### Technical Implementation
- **API Route**: `/api/workflow-agent/route.ts`
- **Workflow Engine**: LlamaIndex workflow framework
- **Event Streaming**: Real-time workflow event broadcasting
- **Agent Types**: Research, Writing, Review agents
- **Visualization**: Graphviz-based workflow diagrams

#### Key Files
- `src/app/workflow-agent/page.tsx` - Main page component
- `src/lib/workflow-agent/workflow-agent.ts` - Workflow implementation
- `src/components/workflow-agent/` - UI components

### 4. MCP Agent (`/mcp-agent`)

**Purpose**: Implements Model Context Protocol for extensible agent capabilities.

#### Features
- **MCP Integration**: Full Model Context Protocol support
- **CopilotKit Framework**: Built on CopilotKit for React integration
- **Remote Endpoints**: Connects to external MCP servers
- **Tool Discovery**: Dynamic tool detection and integration
- **Configuration Interface**: User-friendly MCP server setup

#### Technical Implementation
- **API Route**: `/api/copilotkit/route.ts`
- **MCP Client**: LangGraph platform endpoint integration
- **CopilotKit Runtime**: Advanced agent runtime with remote capabilities
- **Action Handlers**: Dynamic action registration and execution

#### Key Files
- `src/app/mcp-agent/page.tsx` - Main page component
- `src/components/mcp-agent/` - MCP-specific components
- `src/lib/mcp-agent/utils.ts` - MCP utilities

## UI/UX Design System

### Layout Structure

#### Global Layout
- **Sidebar Navigation**: Collapsible sidebar with agent navigation
- **Responsive Design**: Mobile-first approach with breakpoint adaptations
- **CopilotKit Integration**: Global CopilotKit provider for AI interactions
- **Theme**: Gradient-based design with blue-to-purple color scheme

#### Component Architecture
```
src/components/
├── Sidebar.tsx              # Main navigation sidebar
├── SidebarContext.tsx       # Sidebar state management
├── SidebarWrapper.tsx       # Sidebar container component
├── function-agent/          # Function Agent UI components
│   ├── ChatInterface.tsx    # Chat UI with streaming
│   ├── QueryFilter.tsx      # Search and filter controls
│   ├── Results.tsx          # Results display component
│   └── ToolsBox.tsx         # Tool selection interface
├── instruct-agent/          # Instruct Agent UI components
├── mcp-agent/               # MCP Agent UI components
│   ├── CopilotActionHandler.tsx
│   ├── ExampleConfigs.tsx
│   ├── MCPConfigForm.tsx
│   └── ToolCallRenderer.tsx
└── workflow-agent/          # Workflow Agent UI components
    ├── AgentLog.tsx         # Workflow event logging
    └── WorkflowInterface.tsx # Workflow control interface
```

### Design Principles

#### Visual Design
- **Color Palette**: Blue-to-purple gradients for AI/tech theme
- **Typography**: System fonts with clear hierarchy
- **Spacing**: Consistent 4px grid system
- **Animations**: Smooth transitions (300ms duration)
- **Accessibility**: ARIA labels and keyboard navigation

#### Responsive Behavior
- **Mobile**: Single-column layout with collapsible sidebar
- **Tablet**: Adaptive layouts with flexible sidebar
- **Desktop**: Full multi-column layouts with expanded sidebar
- **Breakpoints**: Tailwind CSS standard breakpoints (sm, md, lg, xl)

## API Architecture

### Authentication & Environment

#### Required Environment Variables
```env
# Primary AI Service (GitHub Models)
AZURE_OPENAI_ENDPOINT=https://models.inference.ai.azure.com
OPENAI_API_KEY=ghp_xxxx  # GitHub token

# Secondary AI Service (Azure OpenAI)
SECOND_OPENAI_API_KEY=   # Azure OpenAI key
SECOND_AZURE_OPENAI_ENDPOINT=https://xxxxx.openai.azure.com/
OPENAI_API_VERSION=2024-10-21

# External Services
TAVILY_API_KEY=tvly-xxx  # Web search
LANGSMITH_API_KEY=lsv2_xxxx  # Workflow tracing
AGENT_DEPLOYMENT_URL=https://xxxx.azurewebsites.net  # MCP server
```

### API Endpoints

#### `/api/function-agent`
- **Method**: POST
- **Purpose**: Function calling agent with tool execution
- **Request Body**:
  ```typescript
  {
    prompt: string;
    selectedTools?: { toolIds: string[] };
    sessionId?: string;
    resetContext?: boolean;
  }
  ```
- **Response**: Server-Sent Events (SSE) stream
- **Features**: Tool execution, streaming responses, context management

#### `/api/instruct-agent`
- **Method**: POST
- **Purpose**: Document processing and specialized prompts
- **Request Body**:
  ```typescript
  {
    messages: ChatMessage[];
    systemPrompt?: string;
    prompt: string;
    tool: string;
    model: string;
    webSearchEnabled?: boolean;
  }
  ```
- **Response**: SSE stream with AI responses

#### `/api/workflow-agent`
- **Method**: POST
- **Purpose**: Multi-step workflow execution
- **Request Body**:
  ```typescript
  {
    userMsg: string;
  }
  ```
- **Response**: SSE stream with workflow events

#### `/api/copilotkit`
- **Method**: POST
- **Purpose**: MCP agent runtime endpoint
- **Features**: CopilotKit integration, remote MCP endpoints

### Data Flow Patterns

#### Streaming Architecture
All agents implement Server-Sent Events (SSE) for real-time communication:

1. **Client Request**: User input sent to API endpoint
2. **Processing**: Agent processes request with appropriate AI service
3. **Streaming**: Real-time events streamed back to client
4. **UI Updates**: Frontend updates in real-time as events arrive

#### Error Handling
- **Graceful Degradation**: Fallback responses when external services fail
- **Error Boundaries**: React error boundaries for UI stability
- **Logging**: Comprehensive error logging for debugging
- **User Feedback**: Clear error messages for user understanding

## Data Models & Types

### Core Types (`src/lib/types.ts`)

#### ChatMessage
```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
  id?: string;
}
```

#### PricingItem (Function Agent)
```typescript
interface PricingItem {
  armSkuName: string;
  retailPrice: number;
  unitOfMeasure: string;
  armRegionName: string;
  meterName: string;
  productName: string;
  type: string;
  location?: string;
  reservationTerm?: string;
  savingsPlan?: Array<{ term: string, retailPrice: string }>;
}
```

#### WorkflowAgentEvent
```typescript
interface WorkflowAgentEvent {
  type: 'agent_change' | 'agent_output' | 'tool_call' | 'tool_result';
  data: {
    agent_name?: string;
    content?: string;
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    tool_output?: string;
  };
}
```

## Development Workflow

### Project Setup

#### Prerequisites
- Node.js 18+ 
- PNPM (recommended) or npm/yarn
- Git for version control

#### Installation
```bash
# Clone repository
git clone <repository-url>
cd agentic-ai-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
pnpm dev
```

#### Development Scripts
```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

### Code Organization

#### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── function-agent/    # Function Agent page
│   ├── instruct-agent/    # Instruct Agent page
│   ├── workflow-agent/    # Workflow Agent page
│   ├── mcp-agent/         # MCP Agent page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/                   # Utility libraries and agent logic
│   ├── function-agent/    # Function Agent utilities
│   ├── instruct-agent/    # Instruct Agent utilities
│   ├── workflow-agent/    # Workflow Agent utilities
│   ├── mcp-agent/         # MCP Agent utilities
│   └── types.ts           # Shared TypeScript types
└── types/                 # Global type definitions
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `ChatInterface.tsx`)
- **Utilities**: camelCase (e.g., `function-tools.ts`)
- **API Routes**: kebab-case (e.g., `function-agent/route.ts`)
- **CSS Classes**: Tailwind utility classes

### Testing Strategy

#### Unit Testing
- **Framework**: Jest (configured in devDependencies)
- **Coverage**: Component logic and utility functions
- **Mocking**: External API calls and AI services

#### Integration Testing
- **API Testing**: Test API endpoints with mock data
- **Component Testing**: Test component interactions
- **E2E Testing**: Full user workflow testing

## Deployment & Operations

### Deployment Options

#### Azure Static Web Apps (Recommended)
```yaml
# azure.yml for Azure Static Web Apps
routes:
  - route: "/api/*"
    allowedRoles: ["anonymous"]
  - route: "/*"
    serve: "/index.html"
    statusCode: 200
```

#### Azure Web Apps
```dockerfile
# Dockerfile for Azure Web Apps
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Azure Container Apps
```yaml
# container-app.yml
properties:
  template:
    containers:
    - name: agentic-ai-app
      image: your-registry.azurecr.io/agentic-ai-app:latest
      env:
      - name: OPENAI_API_KEY
        secretRef: openai-key
      resources:
        cpu: 0.5
        memory: 1Gi
```

### Environment Configuration

#### Production Environment Variables
- **AI Services**: Azure OpenAI, GitHub Models credentials
- **External APIs**: Tavily, LangSmith API keys
- **Deployment**: Application URLs and endpoints
- **Security**: CORS settings, API rate limits

#### Monitoring & Logging
- **Application Insights**: Azure Application Insights integration
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Response time and resource usage
- **AI Usage Tracking**: Token consumption and API call metrics

### CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    - name: Install dependencies
      run: pnpm install
    - name: Build application
      run: pnpm build
    - name: Deploy to Azure
      uses: azure/static-web-apps-deploy@v1
```

## Performance & Optimization

### Frontend Optimization

#### Code Splitting
- **Dynamic Imports**: Lazy loading of agent components
- **Route-based Splitting**: Automatic Next.js code splitting
- **Component Optimization**: React.memo for expensive components

#### Asset Optimization
- **Image Optimization**: Next.js built-in image optimization
- **Font Loading**: System fonts for fast loading
- **CSS Optimization**: Tailwind CSS purging for minimal bundle size

### Backend Optimization

#### API Performance
- **Edge Runtime**: Fast cold starts and low latency
- **Streaming Responses**: Real-time data delivery
- **Caching**: Response caching where appropriate
- **Rate Limiting**: API protection and resource management

#### AI Service Optimization
- **Model Selection**: Appropriate models for different tasks
- **Token Management**: Efficient prompt design
- **Parallel Processing**: Concurrent API calls where possible
- **Error Recovery**: Graceful fallbacks for AI service failures

## Security Considerations

### API Security
- **Environment Variables**: Secure storage of API keys
- **CORS Configuration**: Proper origin restrictions
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Sanitization of user inputs

### Authentication & Authorization
- **Public Access**: Currently designed for public use
- **Future Extensions**: Ready for authentication integration
- **Session Management**: Secure session handling
- **Data Privacy**: No persistent storage of sensitive data

### AI Safety
- **Content Filtering**: Appropriate content policies
- **Usage Monitoring**: Track AI service usage
- **Error Handling**: Secure error messages
- **Input Sanitization**: Protection against prompt injection

## Future Roadmap

### Short-term Enhancements (Q1-Q2 2025)
- **Authentication System**: User accounts and personalization
- **Enhanced MCP Integration**: More MCP server types
- **Performance Monitoring**: Advanced analytics dashboard
- **Mobile App**: React Native version

### Medium-term Features (Q3-Q4 2025)
- **Multi-language Support**: Internationalization
- **Advanced Workflows**: Complex multi-agent scenarios
- **Plugin System**: Third-party integrations
- **Enterprise Features**: Team collaboration tools

### Long-term Vision (2026+)
- **AI Agent Marketplace**: Community-contributed agents
- **Advanced Reasoning**: Complex problem-solving capabilities
- **Industry-specific Agents**: Specialized domain agents
- **AI Development Platform**: Low-code agent creation

## Contributing Guidelines

### Development Process
1. **Fork Repository**: Create personal fork for development
2. **Feature Branches**: Create feature-specific branches
3. **Code Standards**: Follow TypeScript and React best practices
4. **Testing**: Add tests for new functionality
5. **Documentation**: Update documentation for changes
6. **Pull Requests**: Submit PRs with clear descriptions

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Code formatting consistency
- **Component Structure**: Consistent component patterns

### Issue Reporting
- **Bug Reports**: Detailed reproduction steps
- **Feature Requests**: Clear use case descriptions
- **Performance Issues**: Include performance metrics
- **Documentation**: Report unclear or missing documentation

## Conclusion

The Agentic AI Application represents a comprehensive exploration of modern AI agent architectures and implementations. Built through the innovative "Vibe Coding" methodology, it demonstrates the potential of human-AI collaborative development while providing a practical platform for experimenting with different agent paradigms.

The application's modular architecture, comprehensive documentation, and production-ready deployment options make it an excellent foundation for both learning about AI agents and building production applications. Its four distinct agent types showcase different approaches to AI integration, from simple function calling to complex workflow orchestration.

As AI technology continues to evolve, this application provides a solid foundation for exploring new agent capabilities and integration patterns. The extensible architecture and clear separation of concerns make it easy to add new agent types, integrate additional AI services, and experiment with emerging AI technologies.

---

*This specification document is maintained as part of the project documentation and should be updated as the project evolves.*