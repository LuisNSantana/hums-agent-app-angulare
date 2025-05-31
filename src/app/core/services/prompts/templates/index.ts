/**
 * System Prompt Templates Export
 * Central export file for all predefined system prompt templates
 */

import { DEFAULT_AGENT_PROMPT } from './default-agent.prompt';
import { CODING_ASSISTANT_PROMPT } from './coding-assistant.prompt';
import { CREATIVE_WRITER_PROMPT } from './creative-writer.prompt';
import { DATA_ANALYST_PROMPT } from './data-analyst.prompt';
import { SystemPrompt } from '../prompt.types';

/**
 * Collection of all predefined system prompts
 */
export const SYSTEM_PROMPT_TEMPLATES: SystemPrompt[] = [
  DEFAULT_AGENT_PROMPT,
  CODING_ASSISTANT_PROMPT,
  CREATIVE_WRITER_PROMPT,
  DATA_ANALYST_PROMPT
];

/**
 * Map of prompt IDs to their respective prompt objects for quick lookup
 */
export const PROMPT_TEMPLATE_MAP = new Map<string, SystemPrompt>(
  SYSTEM_PROMPT_TEMPLATES.map(prompt => [prompt.id, prompt])
);

/**
 * Get a prompt template by ID
 */
export function getPromptTemplate(id: string): SystemPrompt | undefined {
  return PROMPT_TEMPLATE_MAP.get(id);
}

/**
 * Get all prompts by category
 */
export function getPromptsByCategory(category: string): SystemPrompt[] {
  return SYSTEM_PROMPT_TEMPLATES.filter(prompt => prompt.category === category);
}

/**
 * Get active prompts only
 */
export function getActivePrompts(): SystemPrompt[] {
  return SYSTEM_PROMPT_TEMPLATES.filter(prompt => prompt.isActive);
}

/**
 * Get prompts by tags
 */
export function getPromptsByTags(tags: string[]): SystemPrompt[] {
  return SYSTEM_PROMPT_TEMPLATES.filter(prompt => 
    tags.some(tag => prompt.tags.includes(tag))
  );
}

// Re-export individual templates for direct imports
export {
  DEFAULT_AGENT_PROMPT,
  CODING_ASSISTANT_PROMPT,
  CREATIVE_WRITER_PROMPT,
  DATA_ANALYST_PROMPT
};