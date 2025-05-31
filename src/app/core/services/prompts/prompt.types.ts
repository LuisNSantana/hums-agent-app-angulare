/**
 * System Prompts Type Definitions
 * Defines the structure and types for AI agent system prompts
 */

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  content: string;
  variables?: PromptVariable[];
  isActive: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  tags: string[];
  author?: string;
  language: 'en' | 'es' | 'fr' | 'de' | 'pt';
}

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For enum-like variables
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables: PromptVariable[];
  examples?: PromptExample[];
}

export interface SystemPromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  description: string;
  template: string;
  isDefault: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptContext {
  userContext?: string;
  conversationContext?: string;
  taskContext?: string;
  additionalInstructions?: string[];
  userName?: string; // Added for user's name
}

export interface PromptExample {
  title: string;
  description: string;
  input: Record<string, any>;
  expectedBehavior: string;
}

export interface ContextInjection {
  userProfile?: {
    name?: string;
    preferences?: Record<string, any>;
    expertise?: string[];
  };
  projectContext?: {
    type?: string;
    framework?: string;
    language?: string;
    dependencies?: string[];
  };
  conversationContext?: {
    mode?: 'creative' | 'analytical' | 'technical' | 'casual';
    previousTopics?: string[];
    userGoals?: string[];
  };
}

export type PromptCategory = 
  | 'assistant'
  | 'coding'
  | 'creative'
  | 'analysis'
  | 'education'
  | 'business'
  | 'research'
  | 'custom'
  | 'general'
  | 'development';

export interface PromptConfig {
  maxLength: number;
  temperature?: number;
  includeContext: boolean;
  contextTypes: Array<keyof ContextInjection>;
  customInstructions?: string;
}

export interface PromptValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PromptStats {
  usageCount: number;
  lastUsed: Date;
  averageResponseTime: number;
  userRating: number;
  effectivenessScore: number;
}

export interface CreatePromptRequest {
  name: string;
  description: string;
  category: PromptCategory;
  content: string;
  variables?: PromptVariable[];
  tags?: string[];
  language?: 'en' | 'es' | 'fr' | 'de' | 'pt';
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}

export interface PromptSearchParams {
  query?: string;
  category?: PromptCategory;
  tags?: string[];
  isCustom?: boolean;
  isActive?: boolean;
  language?: string;
}

// Predefined prompt identifiers
export const PROMPT_IDS = {
  DEFAULT_AGENT: 'default-agent',
  CODING_ASSISTANT: 'coding-assistant',
  CREATIVE_WRITER: 'creative-writer',
  DATA_ANALYST: 'data-analyst',
  RESEARCH_ASSISTANT: 'research-assistant',
  BUSINESS_CONSULTANT: 'business-consultant',
  EDUCATION_TUTOR: 'education-tutor'
} as const;

export type PredefinedPromptId = typeof PROMPT_IDS[keyof typeof PROMPT_IDS];