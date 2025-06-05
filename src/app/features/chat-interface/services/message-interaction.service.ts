/**
 * Message Interaction Service
 * 
 * Responsible for handling message related interactions like sending, editing,
 * copying, and regenerating messages
 * 
 * Part of the modular architecture approach following SOLID principles
 */

import { Injectable, inject, signal } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { ChatAttachment, ChatMessageAction, ChatMessageActionType } from '../../../shared/models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class MessageInteractionService {
  private readonly chatService = inject(ChatService);
  readonly pendingAttachments = signal<ChatAttachment[]>([]);
  
  /**
   * Ensures there's an active conversation, creating one if needed
   * @returns The active conversation ID
   */
  async ensureActiveConversation(
    currentConversationId: string | null,
    initialContent?: string
  ): Promise<string | null> {
    let conversationId = currentConversationId;
    
    if (!conversationId) {
      await this.chatService.createConversation(undefined, initialContent);
      // The new conversation ID will be available through the chatService
      return this.chatService.currentConversation()?.id || null;
    }
    
    return conversationId;
  }
  
  /**
   * Sends a message with any pending attachments
   */
  async sendMessageWithAttachments(
    content: string,
    conversationId: string,
    modelId: string
  ): Promise<void> {
    const attachments = this.pendingAttachments();
    
    await this.chatService.sendMessage({
      message: content,
      conversationId,
      model: modelId,
      attachments: attachments.length > 0 ? attachments : undefined
    });
    
    // Reset attachments after sending
    this.resetAttachmentState();
  }
  
  /**
   * Resets attachment state after sending a message
   */
  resetAttachmentState(): void {
    this.pendingAttachments.set([]);
  }
  
  /**
   * Adds a file attachment to pending attachments
   */
  addFileAttachment(file: File): void {
    console.log('File attached:', file);
    // TODO: Implement file processing
  }
  
  /**
   * Adds an attachment to the pending attachments list
   */
  addAttachment(attachment: ChatAttachment): void {
    this.pendingAttachments.update(attachments => [...attachments, attachment]);
  }
  
  /**
   * Copies message content to clipboard
   */
  copyMessage(message: { id: string, content: string } | undefined): void {
    if (message && navigator.clipboard) {
      navigator.clipboard.writeText(message.content);
      // TODO: Show toast notification
    }
  }
  
  /**
   * Regenerates an AI message response
   */
  async regenerateMessage(messageId: string): Promise<void> {
    // TODO: Implement message regeneration through ChatService
  }
  
  /**
   * Edits a user message and potentially triggers regeneration
   */
  editMessage(messageId: string, newContent: string): void {
    // TODO: Implement message editing through ChatService
  }
  
  /**
   * Processes a message action based on its type
   */
  processMessageAction(
    action: ChatMessageAction, 
    messages: Array<{ id: string, content: string }>
  ): void {
    switch (action.type as ChatMessageActionType) {
      case ChatMessageActionType.Copy:
        const messageToCopy = messages.find(m => m.id === action.messageId);
        this.copyMessage(messageToCopy);
        break;
      case ChatMessageActionType.Regenerate:
        this.regenerateMessage(action.messageId);
        break;
      case ChatMessageActionType.Edit:
        this.editMessage(action.messageId, action.data as string);
        break;
      default:
        console.log('Unknown message action:', action);
    }
  }
}
