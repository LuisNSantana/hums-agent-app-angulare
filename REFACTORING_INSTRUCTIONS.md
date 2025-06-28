# 🔧 Agent Hums - Refactoring Instructions

## 📋 Project Overview
- **Project**: Agent Hums - Angular 20 + Firebase Genkit + Claude 3.5 Haiku
- **Current Issue**: Tools defined inline in `claude-server.ts` (800+ lines)
- **Goal**: Modular architecture with observability system
- **Priority**: HIGH - Critical for maintainability and scalability

## 🎯 Refactoring Objectives

### 1. **Modular Tool Architecture**
Convert inline tool definitions to class-based modular system:
- ✅ `SearchWebTool` (Brave Search integration)
- ✅ `GoogleCalendarTool` (Calendar events CRUD)
- ✅ `GoogleDriveTool` (Drive files management)
- ✅ `DocumentAnalysisTool` (PDF/Word/Excel analysis)
- ✅ `TokenRefreshTool` (OAuth token management)

### 2. **Observability System**
Implement comprehensive metrics and monitoring:
- ✅ Tool execution tracking
- ✅ Performance metrics
- ✅ Error tracking
- ✅ Dashboard endpoints

### 3. **Code Quality**
- ✅ Reduce `claude-server.ts` from 800+ to <500 lines
- ✅ Type safety with Zod schemas
- ✅ Error handling standardization
- ✅ Zero breaking changes to frontend

## 📁 Target File Structure

```
src/server/tools/
├── base/
│   ├── base-tool.ts           # Abstract base class
│   ├── types.ts              # Common interfaces
│   └── tool-context.ts       # Execution context
├── registry/
│   ├── tool-registry.ts      # Tool management
│   └── tool-executor.ts      # Execution wrapper
├── factory/
│   └── tool-factory.ts       # Tool instantiation
├── implementations/
│   ├── search-web.tool.ts
│   ├── google-calendar.tool.ts
│   ├── google-drive.tool.ts
│   ├── document-analysis.tool.ts
│   └── token-refresh.tool.ts
└── observability/
    ├── metrics.service.ts
    ├── dashboard.service.ts
    └── analytics.service.ts
```

## 🔧 Implementation Steps

### STEP 1: Base Architecture
Create foundational classes and interfaces:

**1.1 Base Tool Class (`src/server/tools/base/base-tool.ts`)**
```typescript
export abstract class BaseTool<TInput = any, TOutput = any> {
  abstract readonly metadata: ToolMetadata;
  abstract readonly inputSchema: z.ZodSchema<TInput>;
  abstract readonly outputSchema: z.ZodSchema<TOutput>;
  abstract execute(input: TInput, context?: ToolExecutionContext): Promise<TOutput>;
  
  // Lifecycle hooks
  async beforeExecute?(input: TInput): Promise<void>;
  async afterExecute?(output: TOutput): Promise<void>;
  async onError?(error: Error): Promise<void>;
}
```

**1.2 Tool Registry (`src/server/tools/registry/tool-registry.ts`)**
```typescript
export class ToolRegistry {
  private tools = new Map<string, BaseTool>();
  register(tool: BaseTool): void;
  get(name: string): BaseTool | undefined;
  async executeWithTracking<T>(toolName: string, input: any, context: ToolExecutionContext): Promise<T>;
}
```

### STEP 2: Migrate Existing Tools
Convert each tool from inline definition to class:

**2.1 SearchWebTool Example**
```typescript
export class SearchWebTool extends BaseTool {
  readonly metadata = {
    name: 'searchWeb',
    description: 'Search the web using Brave Search API',
    category: 'search',
    version: '1.0.0'
  };
  // Implementation here...
}
```

### STEP 3: Observability System
Implement comprehensive monitoring:

**3.1 Metrics Service (`src/server/observability/metrics.service.ts`)**
```typescript
export class MetricsService extends EventEmitter {
  trackToolExecution(metric: ToolExecutionMetric): void;
  trackModelResponse(metric: ModelResponseMetric): void;
  trackError(error: Error, context?: Record<string, any>): void;
  getToolUsageStats(timeRange?: { start: Date; end: Date }): ToolUsageStats;
}
```

**3.2 Dashboard Endpoints**
Add to `claude-server.ts`:
```typescript
app.get('/api/metrics', async (req, res) => {
  const dashboard = await dashboardService.getDashboardData();
  res.json(dashboard);
});
```

### STEP 4: Integration
Update `claude-server.ts` to use new architecture:

**4.1 Tool Registration**
```typescript
// Replace inline definitions with:
const toolRegistry = new ToolRegistry();
const metricsService = new MetricsService();

// Register tools
ToolFactory.createAllTools(braveSearchService, googleCalendarService, googleDriveService, documentAnalysisService)
  .forEach(tool => toolRegistry.register(tool));
```

**4.2 Tool Execution**
```typescript
// Replace createTrackedTool with:
await toolRegistry.executeWithTracking(toolName, input, context);
```

## 🎯 Specific Requirements

### **Compatibility Requirements**
- ✅ **Zero Breaking Changes**: Frontend must work without modifications
- ✅ **Same API**: Tool responses must match current format exactly
- ✅ **Error Handling**: Maintain current error response structure
- ✅ **Performance**: Equal or better performance than current implementation

### **Code Quality Standards**
- ✅ **TypeScript**: Strict typing with Zod validation
- ✅ **Error Handling**: Comprehensive try-catch with meaningful messages
- ✅ **Logging**: Consistent logging format with proper levels
- ✅ **Testing**: Each tool should be unit testable

### **Current Tool Signatures** (Must Match)
```typescript
// SearchWeb
input: { query: string; limit?: number }
output: { success: boolean; results: SearchResult[]; message: string; query: string; timestamp: string }

// Calendar
input: { startDate: string; endDate: string; maxResults?: number }
output: { success: boolean; events: CalendarEvent[]; message: string }

// Drive
input: { query?: string; maxResults?: number; folderId?: string }
output: { success: boolean; files: DriveFile[]; message: string }

// Document Analysis
input: { documentBase64: string; fileName: string; analysisType?: string; specificQuestions?: string[] }
output: { success: boolean; content: string; summary?: string; metadata: object; message: string }
```

## ⚠️ Critical Notes

### **DO NOT BREAK**
- Frontend Angular components rely on current API structure
- Tool response formats must remain identical
- Error response format must be preserved
- Headers and authentication flow must work as-is

### **PRESERVE**
- All existing functionality
- Current performance characteristics
- Token passing mechanism (X-Calendar-Token, X-Drive-Token)
- Conversation tracking and metadata

### **ENHANCE**
- Code organization and maintainability
- Error tracking and debugging capabilities
- Performance monitoring
- Future extensibility

## 🚀 Implementation Priority

1. **Phase 1** (Critical): Base architecture + SearchWebTool
2. **Phase 2** (High): Migrate remaining tools + registry integration  
3. **Phase 3** (Medium): Observability system + metrics endpoints

## ✅ Success Criteria

- ✅ `claude-server.ts` reduced to <500 lines
- ✅ All tools in separate, testable files
- ✅ Metrics available at `/api/metrics`
- ✅ Zero frontend changes required
- ✅ Tool execution tracking works
- ✅ Performance maintained or improved

## 📞 Support Information

- **Current Working Directory**: `src/server/`
- **Main File**: `claude-server.ts` (currently ~800 lines)
- **Dependencies**: zod, express, genkit, anthropic
- **Test Command**: `npm run claude:server`
- **Frontend Compatibility**: Angular 20 with signals

---

**Ready to implement? Start with Phase 1 and verify each step works before proceeding to the next phase.**