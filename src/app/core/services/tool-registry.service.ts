/**
 * Tool Registry Service - Genkit Compatible
 * Manages registration and execution of tools for the Genkit agent
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { 
  Tool, 
  ToolRegistry as IToolRegistry, 
  ToolCategory, 
  EnhancedToolResult,
  ToolExecutionContext 
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ToolRegistryService implements IToolRegistry {
  private readonly http = inject(HttpClient);
  
  // Internal tool storage
  public tools = new Map<string, Tool>();
  
  // Enabled tools tracking
  private enabledTools = new Set<string>();

  /**
   * Initialize the registry with default tools
   */
  async initialize(): Promise<void> {
    try {
      // Register default tools
      await this.registerDefaultTools();
      
      console.log('[ToolRegistry] Initialized with tools:', 
        Array.from(this.tools.keys()));
    } catch (error) {
      console.error('[ToolRegistry] Initialization error:', error);
    }
  }

  /**
   * Register a tool in the registry
   */
  async register(tool: Tool): Promise<boolean> {
    try {
      // Initialize the tool
      const initialized = await tool.initialize();
      if (!initialized) {
        console.warn(`[ToolRegistry] Tool ${tool.id} failed to initialize`);
        return false;
      }

      // Store the tool
      this.tools.set(tool.id, tool);
      this.enabledTools.add(tool.id);

      // Register with Genkit backend
      await this.registerWithGenkit(tool);

      console.log(`[ToolRegistry] Registered tool: ${tool.id}`);
      return true;
    } catch (error) {
      console.error(`[ToolRegistry] Error registering tool ${tool.id}:`, error);
      return false;
    }
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    try {
      this.tools.delete(toolId);
      this.enabledTools.delete(toolId);
      
      console.log(`[ToolRegistry] Unregistered tool: ${toolId}`);
      return true;
    } catch (error) {
      console.error(`[ToolRegistry] Error unregistering tool ${toolId}:`, error);
      return false;
    }
  }

  /**
   * Get a specific tool
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): Tool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.category === category);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get only enabled tools
   */
  getEnabledTools(): Tool[] {
    return Array.from(this.tools.values())
      .filter(tool => this.enabledTools.has(tool.id));
  }

  /**
   * Execute a tool with context
   */
  async executeTool(
    toolId: string, 
    params: Record<string, any>,
    context?: Partial<ToolExecutionContext>
  ): Promise<EnhancedToolResult> {
    const startTime = Date.now();
    
    try {
      const tool = this.getTool(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      if (!this.enabledTools.has(toolId)) {
        throw new Error(`Tool ${toolId} is disabled`);
      }

      // Create execution context
      const executionContext: ToolExecutionContext = {
        toolId,
        params,
        timestamp: new Date(),
        ...context,
      };

      // Execute the tool
      const result = await tool.execute(params);
      const executionTime = Date.now() - startTime;      return {
        ...result,
        toolId,
        executionTime,
        context: executionContext,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[ToolRegistry] Tool execution error (${toolId}):`, error);
        return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolId,
        executionTime,
        context: {
          toolId,
          params,
          timestamp: new Date(),
          ...context,
        },
      };
    }
  }

  /**
   * Enable/disable a tool
   */
  setToolEnabled(toolId: string, enabled: boolean): boolean {
    const tool = this.getTool(toolId);
    if (!tool) {
      return false;
    }

    if (enabled) {
      this.enabledTools.add(toolId);
    } else {
      this.enabledTools.delete(toolId);
    }

    return true;
  }

  /**
   * Check if a tool is enabled
   */
  isToolEnabled(toolId: string): boolean {
    return this.enabledTools.has(toolId);
  }

  /**
   * Get tool statistics
   */
  getToolStats(): { total: number; enabled: number; byCategory: Record<string, number> } {
    const stats = {
      total: this.tools.size,
      enabled: this.enabledTools.size,
      byCategory: {} as Record<string, number>,
    };

    // Count by category
    this.getAllTools().forEach(tool => {
      const category = tool.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  }
  /**
   * Register default tools
   */
  private async registerDefaultTools(): Promise<void> {
    try {
      // Import tools dynamically
      const { GoogleDriveTool } = await import('../../features/tools/google-drive/google-drive.tool');
      const { GoogleCalendarTool } = await import('../../features/tools/google-calendar/google-calendar.tool');
      const { WebSearchTool } = await import('../../features/tools/web-search/web-search.tool');
      const { DocumentAnalyzerTool } = await import('../../features/tools/document-analyzer/document-analyzer.tool');

      // Create tool instances
      const tools = [
        new GoogleDriveTool(),
        new GoogleCalendarTool(),
        new WebSearchTool(),
        new DocumentAnalyzerTool(),
      ];

      // Register all tools
      for (const tool of tools) {
        await this.register(tool);
      }

      console.log('[ToolRegistry] Default tools registered successfully');
    } catch (error) {
      console.error('[ToolRegistry] Error registering default tools:', error);
    }
  }

  /**
   * Register tool with Genkit backend
   */
  private async registerWithGenkit(tool: Tool): Promise<void> {
    try {
      // Send tool definition to backend
      await this.http.post('/api/genkit/tools/register', {
        id: tool.id,
        definition: tool.defineGenkitTool(),
        category: tool.category,
        enabled: true,
      }).toPromise();
    } catch (error) {
      console.warn(`[ToolRegistry] Failed to register ${tool.id} with Genkit:`, error);
      // Don't throw - tool can still work locally
    }
  }
}
