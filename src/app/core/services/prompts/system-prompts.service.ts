/**
 * System Prompts Service - Gestión centralizada de prompts del sistema
 * Siguiendo Clean Architecture y SOLID principles
 */

import { Injectable, signal } from '@angular/core';
import { SystemPromptTemplate, PromptCategory, PromptContext } from './prompt.types';
import { DEFAULT_AGENT_PROMPT } from './templates/default-agent.prompt';
import { CODING_ASSISTANT_PROMPT } from './templates/coding-assistant.prompt';
import { CREATIVE_WRITER_PROMPT } from './templates/creative-writer.prompt';
import { DATA_ANALYST_PROMPT } from './templates/data-analyst.prompt';

@Injectable({
  providedIn: 'root'
})
export class SystemPromptsService {
    // Available prompt templates
  private readonly _promptTemplates = signal<SystemPromptTemplate[]>([
    {
      id: 'default-agent',
      name: 'Agent Hums - Default Assistant',
      category: 'general',
      description: 'Balanced AI assistant for general tasks and conversations',
      template: DEFAULT_AGENT_PROMPT.content,
      isDefault: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'coding-assistant',
      name: 'Coding Assistant',
      category: 'development',
      description: 'Specialized for programming, debugging, and technical guidance',
      template: CODING_ASSISTANT_PROMPT.content,
      isDefault: false,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'creative-writer',
      name: 'Creative Writer',
      category: 'creative',
      description: 'Optimized for creative writing, storytelling, and content creation',
      template: CREATIVE_WRITER_PROMPT.content,
      isDefault: false,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'data-analyst',
      name: 'Data Analyst',
      category: 'analysis',
      description: 'Focused on data analysis, insights, and business intelligence',
      template: DATA_ANALYST_PROMPT.content,
      isDefault: false,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  // Current active prompt
  private readonly _activePromptId = signal<string>('default-agent');

  // Public readonly signals
  readonly promptTemplates = this._promptTemplates.asReadonly();
  readonly activePromptId = this._activePromptId.asReadonly();

  /**
   * Get all available prompt templates
   */
  getPromptTemplates(): SystemPromptTemplate[] {
    return this._promptTemplates();
  }

  /**
   * Get prompt templates by category
   */
  getPromptsByCategory(category: PromptCategory): SystemPromptTemplate[] {
    return this._promptTemplates().filter(template => template.category === category);
  }

  /**
   * Get a specific prompt template by ID
   */
  getPromptTemplate(id: string): SystemPromptTemplate | null {
    return this._promptTemplates().find(template => template.id === id) || null;
  }

  /**
   * Get the default prompt template
   */
  getDefaultPrompt(): SystemPromptTemplate {
    const defaultTemplate = this._promptTemplates().find(template => template.isDefault);
    if (!defaultTemplate) {
      throw new Error('No default prompt template found');
    }
    return defaultTemplate;
  }

  /**
   * Get the currently active prompt template
   */
  getActivePrompt(): SystemPromptTemplate {
    const activeTemplate = this.getPromptTemplate(this._activePromptId());
    return activeTemplate || this.getDefaultPrompt();
  }

  /**
   * Set the active prompt template
   */
  setActivePrompt(promptId: string): void {
    const template = this.getPromptTemplate(promptId);
    if (!template) {
      throw new Error(`Prompt template with ID '${promptId}' not found`);
    }
    this._activePromptId.set(promptId);
  }

  /**
   * Generate system prompt with context injection
   */
  generateSystemPrompt(context?: PromptContext): string {
    const activeTemplate = this.getActivePrompt();
    let prompt = activeTemplate.template;

    // Inject context if provided
    if (context) {
      prompt = this.injectContext(prompt, context);
    }

    return prompt;
  }

  /**
   * Create a custom prompt template
   */
  createCustomPrompt(template: Omit<SystemPromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): SystemPromptTemplate {
    const customPrompt: SystemPromptTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentTemplates = this._promptTemplates();
    this._promptTemplates.set([...currentTemplates, customPrompt]);

    return customPrompt;
  }

  /**
   * Update an existing prompt template
   */
  updatePromptTemplate(id: string, updates: Partial<SystemPromptTemplate>): SystemPromptTemplate | null {
    const currentTemplates = this._promptTemplates();
    const templateIndex = currentTemplates.findIndex(template => template.id === id);

    if (templateIndex === -1) {
      return null;
    }

    const updatedTemplate: SystemPromptTemplate = {
      ...currentTemplates[templateIndex],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    const updatedTemplates = [...currentTemplates];
    updatedTemplates[templateIndex] = updatedTemplate;
    this._promptTemplates.set(updatedTemplates);

    return updatedTemplate;
  }

  /**
   * Delete a custom prompt template
   */
  deletePromptTemplate(id: string): boolean {
    const currentTemplates = this._promptTemplates();
    const template = currentTemplates.find(t => t.id === id);

    // Don't allow deletion of default templates
    if (!template || template.isDefault) {
      return false;
    }

    const filteredTemplates = currentTemplates.filter(t => t.id !== id);
    this._promptTemplates.set(filteredTemplates);

    // Reset to default if deleted template was active
    if (this._activePromptId() === id) {
      this._activePromptId.set('default-agent');
    }

    return true;
  }

  /**
   * Reset to default prompt
   */
  resetToDefault(): void {
    this._activePromptId.set('default-agent');
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): PromptCategory[] {
    const categories = new Set(this._promptTemplates().map(template => template.category));
    return Array.from(categories);
  }

  /**
   * Private method to inject context into prompt template
   */
  private injectContext(template: string, context: PromptContext): string {
    let processedTemplate = template;

    // Inject user context
    if (context.userContext) {
      processedTemplate += `\n\n## USER CONTEXT\n${context.userContext}`;
    }

    // Inject conversation context
    if (context.conversationContext) {
      processedTemplate += `\n\n## CONVERSATION CONTEXT\n${context.conversationContext}`;
    }

    // Inject task-specific context
    if (context.taskContext) {
      processedTemplate += `\n\n## TASK CONTEXT\n${context.taskContext}`;
    }

    // Inject additional instructions
    if (context.additionalInstructions?.length) {
      processedTemplate += `\n\n## ADDITIONAL INSTRUCTIONS\n${context.additionalInstructions.join('\n')}`;
    }

    return processedTemplate;
  }
}
