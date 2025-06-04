/**
 * Core Interfaces Barrel Export
 * Central export point for all core interfaces
 */

// Genkit Types
export type * from './genkit.types';

// Tool Interfaces
export type * from './tool.interface';
// export * from './tool-result.interface'; // Avoid ambiguous ToolResult export
export type { ToolResult } from './genkit.types'; // Explicitly re-export ToolResult from genkit.types
export type * from './tool-result.interface'; // Export other members if any (except ToolResult)

// Re-export commonly used types for convenience
export type {
  GenkitChatMessage,
  GenkitStreamChunk,
  GenkitConfig,
  ToolResult as GenkitToolCallResult,
} from './genkit.types';

// Export the enum as value (not type-only)
export { GroqModel } from './genkit.types';

export type {
  Tool,
  ToolRegistry,
  ToolExecutionContext,
  ToolExample,
  EnhancedToolResult,
} from './tool.interface';

export { ToolCategory } from './tool.interface';
