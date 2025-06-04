# 🚀 Agent Hums - Migration to Firebase Genkit + Groq

## ✅ Why NO cors and dotenv dependencies?

### 🚫 **cors** package - NOT NEEDED
- **Reason**: Manual CORS configuration in Express
- **Benefit**: Less dependencies, more control
- **Implementation**: Custom middleware function in `genkit-server.ts`

### 🚫 **dotenv** package - NOT NEEDED  
- **Reason**: Node.js accesses environment variables natively with `process.env`
- **Benefit**: One less dependency
- **Implementation**: Direct access to `process.env['VARIABLE_NAME']`

## 📦 Required Dependencies ONLY

Install only these essential packages:

```bash
# Core Genkit packages
npm install genkit genkitx-groq zod

# Global Genkit CLI
npm install -g genkit-cli
```

## 🔧 Setup Instructions

### 1. Get Groq API Key
1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Copy the key

### 2. Environment Configuration
```bash
# Create environment file
cp .env.example .env

# Edit .env and add your Groq API key
GROQ_API_KEY=your-actual-groq-api-key-here
```

### 3. Start Development Servers

```bash
# Option 1: Start both Angular + Genkit server
npm run dev:full

# Option 2: Start separately
# Terminal 1 - Angular development server
npm start

# Terminal 2 - Genkit backend server  
npm run serve:genkit
```

### 4. Verify Setup

Visit these endpoints to test:
- **Angular App**: http://localhost:4200
- **Health Check**: http://localhost:3001/api/health
- **Test Endpoint**: http://localhost:3001/api/test
- **Available Tools**: http://localhost:3001/api/genkit/tools

## 🧪 Test Chat API

```bash
# Test basic chat
curl -X POST http://localhost:3001/api/genkit/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola, ¿cómo estás?"}'

# Test with conversation history
curl -X POST http://localhost:3001/api/genkit/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué herramientas tienes disponibles?",
    "conversationHistory": [
      {"role": "user", "content": "Hola"},
      {"role": "assistant", "content": "¡Hola! Soy tu asistente IA."}
    ]
  }'
```

## 🤖 Model Information

- **Model**: Llama 3 70B via Groq
- **Pricing**: $0.11/M input tokens, $0.34/M output tokens
- **Context**: 8,192 tokens
- **Capabilities**: Tool calling, JSON mode, function calling

## 🛠️ Available Tools (Mock Implementation)

1. **uploadToDrive**: Upload files to Google Drive
2. **createCalendarEvent**: Create Google Calendar events
3. **searchWeb**: Web search functionality
4. **analyzeDocument**: PDF/Word document analysis (planned)

## 📁 Architecture

```
src/
├── app/
│   ├── core/
│   │   ├── interfaces/
│   │   │   ├── genkit.types.ts          # Genkit type definitions
│   │   │   ├── tool.interface.ts        # Enhanced tool interface
│   │   │   ├── tool-result.interface.ts # Tool result types
│   │   │   └── index.ts                 # Barrel exports
│   │   └── services/
│   │       ├── genkit-agent.service.ts  # Main Genkit service
│   │       └── tool-registry.service.ts # Tool management
│   └── features/
│       └── tools/                       # Tool implementations (TODO)
│           ├── google-drive/
│           ├── google-calendar/
│           ├── web-search/
│           └── document-analyzer/
└── genkit-server.ts                     # Express + Genkit backend
```

## 🔄 Manual CORS Configuration

Instead of using the `cors` package, we implement custom CORS:

```typescript
function enableCORS(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
```

## 🌍 Environment Variables Access

Instead of using `dotenv`, we access variables directly:

```typescript
// ❌ With dotenv
// import dotenv from 'dotenv';
// dotenv.config();
// const key = process.env.GROQ_API_KEY;

// ✅ Without dotenv  
const GROQ_API_KEY = process.env['GROQ_API_KEY'] || 'default-value';
```

## 🚀 Next Steps

1. **Install Dependencies**: Run `npm install genkit genkitx-groq zod`
2. **Add API Key**: Configure Groq API key in `.env`
3. **Test Setup**: Verify all endpoints are working
4. **Implement Tools**: Create actual tool classes
5. **Add Streaming**: Implement Server-Sent Events for streaming

## 📊 Package.json Scripts

```json
{
  "genkit:serve": "ts-node src/genkit-server.ts",      // Start Genkit server
  "serve:genkit": "ts-node src/genkit-server.ts",      // Alias
  "dev:full": "concurrently \"npm start\" \"npm run serve:genkit\"", // Both servers
  "genkit:ui": "genkit start",                         // Genkit UI
  "build:genkit": "tsc src/genkit-server.ts --outDir dist/genkit" // Build server
}
```

## 🎯 Benefits of This Architecture

1. **Zero unnecessary dependencies**: No cors, dotenv packages needed
2. **Modern Angular 20**: Using latest control flow syntax and signals
3. **Type Safety**: Full TypeScript support with Zod schemas
4. **Streaming Ready**: Prepared for real-time chat streaming
5. **Tool Ecosystem**: Extensible tool architecture
6. **Development Friendly**: Hot reload, clear error handling
7. **Production Ready**: Proper error handling and health checks
