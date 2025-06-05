/**
 * Model Selection Service
 * 
 * Responsible for managing AI model selection logic with priority rules
 * Follows Single Responsibility Principle from SOLID
 */

import { Injectable, inject, signal } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { AIModel } from '../../../shared/models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ModelSelectionService {
  private readonly chatService = inject(ChatService);
  readonly selectedModel = signal('');
  
  /**
   * Determines which model ID to use based on priority rules
   */
  determineModelToUse(
    models: AIModel[], 
    defaultModel: AIModel | null, 
    currentSelection: string
  ): string {
    // Priority 1: Keep current valid selection
    if (currentSelection && this.isModelAvailable(models, currentSelection)) {
      return currentSelection;
    }
    
    // Priority 2: Use default model from configuration
    if (defaultModel && (defaultModel.isAvailable || this.isModelAvailable(models, 'gemma3:4b'))) {
      return defaultModel.id;
    }
    
    // Priority 3: Use Gemma 3:4b explicitly if available
    const gemmaModel = models.find(m => m.id === 'gemma3:4b');
    if (gemmaModel) {
      return 'gemma3:4b';
    }
    
    // Priority 4: Use any available model
    const availableModel = models.find(m => m.isAvailable);
    if (availableModel) {
      return availableModel.id;
    }
    
    // Fallback: Use first model in the list
    return models.length > 0 ? models[0].id : '';
  }
  
  /**
   * Checks if a specific model ID is available in the models list
   */
  isModelAvailable(models: AIModel[], modelId: string): boolean {
    return models.some(m => m.id === modelId);
  }
  
  /**
   * Find a suitable alternative model when primary choice is unavailable
   * @returns ID of available model to use
   */
  findAlternativeModel(availableModels: AIModel[]): string {
    // Try default model first
    const defaultModel = this.chatService.getDefaultModel();
    if (defaultModel?.isAvailable) {
      return defaultModel.id;
    }
    
    // Next try any available model
    const availableModel = availableModels.find(m => m.isAvailable);
    if (availableModel) {
      return availableModel.id;
    }
    
    // Last resort: use default model ID even if not available
    return this.chatService.getDefaultModelId() || 'gemma3:4b';
  }
  
  /**
   * Validates model selection and returns a valid model ID
   */
  getValidatedModel(availableModels: AIModel[]): string {
    const selectedModelId = this.selectedModel();
    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    
    // If selected model exists and is available, use it
    if (selectedModel?.isAvailable) {
      return selectedModel.id;
    }
    
    // Otherwise use default model and update UI
    const defaultModelId = this.chatService.getDefaultModelId();
    this.selectedModel.set(defaultModelId); // Update UI to reflect actual model
    
    return defaultModelId;
  }
}
