/**
 * ChatInputComponent - Message composition with modern UI
 * Follows Angular 20+ patterns with signals and standalone architecture
 */

import { 
  Component, 
  output, 
  input, 
  signal, 
  viewChild, 
  ElementRef,
  effect,
  inject,
  DestroyRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ChatAttachment } from '../../shared/models/chat.models';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-input-container" [class.disabled]="disabled()">
      <!-- Input area -->
      <div class="input-area">
        <div class="input-wrapper">
          <!-- File attachment button -->
          <button 
            type="button"
            class="attachment-btn"
            [disabled]="disabled()"
            (click)="onAttachFile()"
            title="Attach file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <!-- Text input -->          <textarea
            #messageInput
            class="message-input"
            [value]="message()"
            (input)="onMessageChange($event)"
            (keydown)="onKeyDown($event)"
            (paste)="onPaste($event)"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [style.height.px]="inputHeight()"
            rows="1"
            maxlength="32000">
          </textarea>

          <!-- Character counter -->
          <div class="char-counter" [class.warning]="isNearLimit()">
            {{ message().length }}/32000
          </div>        </div>

        <!-- Attached Images Preview -->
        <div class="attachments-preview" *ngIf="currentAttachments().length > 0">
          <div class="attachment-item" *ngFor="let attachment of currentAttachments(); trackBy: trackByAttachment">
            <img *ngIf="attachment.type === 'image'" [src]="attachment.url" [alt]="attachment.name" class="attachment-image" />
            <div class="attachment-info">
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
            </div>
            <button type="button" class="attachment-remove" (click)="removeAttachment(attachment.id)" title="Remove attachment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Suggestions (when input is empty) -->
        <div class="suggestions" *ngIf="showSuggestions() && suggestions().length > 0 && !message()">
          <h4>Suggestions:</h4>
          <div class="suggestion-list">
            <button 
              class="suggestion-item"
              *ngFor="let suggestion of suggestions(); trackBy: trackBySuggestion"
              (click)="onSuggestionClick(suggestion.text)">
              <span class="suggestion-icon">{{ suggestion.icon }}</span>
              <span class="suggestion-text">{{ suggestion.text }}</span>
            </button>
          </div>
        </div>

        <!-- Send button -->
        <button 
          type="submit"
          class="send-btn"
          [disabled]="!canSend()"
          (click)="onSend()"
          title="Send message (Ctrl+Enter)">
          @if (disabled()) {
            <div class="loading-spinner"></div>
          } @else {
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          }
        </button>
      </div>

      <!-- Other UI sections -->
    </div>
  `,  styles: [`    .chat-input-container {
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      backdrop-filter: var(--mat-app-glass-blur);
      border-radius: 20px;
      padding: 24px;
      margin: 16px;
      box-shadow: var(--mat-app-shadow-elevated);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      /* Ensure proper mobile viewport behavior */
      contain: layout style paint;
    }

    .chat-input-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--mat-app-gradient-hero);
      border-radius: 20px 20px 0 0;
    }

    .chat-input-container:focus-within {
      border-color: var(--mat-app-primary);
      box-shadow: var(--mat-app-shadow-elevated), 0 0 0 2px rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
    }

    .chat-input-container.disabled {
      opacity: 0.6;
      pointer-events: none;
      filter: grayscale(0.3);
    }

    .input-area {
      display: flex;
      gap: 16px;
      align-items: flex-end;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-border);
      border-radius: 16px;
      padding: 16px 20px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--mat-app-shadow-sm);
    }

    .input-wrapper:focus-within {
      border-color: var(--mat-app-primary);
      background: var(--mat-app-surface-elevated);
      box-shadow: var(--mat-app-shadow), 0 0 0 2px rgba(99, 102, 241, 0.1);
      transform: translateY(-1px);
    }

    .attachment-btn {
      background: var(--mat-app-surface-variant);
      border: 1px solid var(--mat-app-border);
      padding: 8px;
      border-radius: 12px;
      cursor: pointer;
      color: var(--mat-app-on-surface-variant);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--mat-app-shadow-sm);
    }

    .attachment-btn svg {
      width: 20px;
      height: 20px;
    }

    .attachment-btn:hover:not(:disabled) {
      background: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
      border-color: var(--mat-app-primary);
      transform: translateY(-2px);
      box-shadow: var(--mat-app-shadow);
    }

    .attachment-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      resize: none;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: var(--mat-app-on-surface);
      min-height: 24px;
      max-height: 200px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--mat-app-surface-variant) transparent;
    }

    .message-input::-webkit-scrollbar {
      width: 6px;
    }

    .message-input::-webkit-scrollbar-track {
      background: transparent;
    }

    .message-input::-webkit-scrollbar-thumb {
      background: var(--mat-app-surface-variant);
      border-radius: 3px;
    }

    .message-input::placeholder {
      color: var(--mat-app-on-surface-muted);
      font-weight: 400;
    }

    .message-input:disabled {
      color: var(--mat-app-on-surface-muted);
      cursor: not-allowed;
    }

    .char-counter {
      font-size: 12px;
      color: var(--mat-app-on-surface-muted);
      white-space: nowrap;
      align-self: flex-end;
      margin-bottom: 4px;
      font-weight: 500;
      background: var(--mat-app-surface-variant);
      padding: 2px 6px;
      border-radius: 6px;
      border: 1px solid var(--mat-app-border);
    }

    .char-counter.warning {
      color: var(--mat-app-error);
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--mat-app-error);
      font-weight: 600;
    }

    .send-btn {
      background: var(--mat-app-gradient-primary);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 12px;
      cursor: pointer;
      color: var(--mat-app-on-primary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      height: 48px;
      box-shadow: var(--mat-app-shadow);
    }

    .send-btn svg {
      width: 22px;
      height: 22px;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--mat-app-gradient-secondary);
      transform: translateY(-3px) scale(1.05);
      box-shadow: var(--mat-app-shadow-lg);
    }

    .send-btn:active:not(:disabled) {
      transform: translateY(-1px) scale(1.02);
      transition: transform 0.1s ease;
    }

    .send-btn:disabled {
      background: var(--mat-app-surface-variant);
      color: var(--mat-app-on-surface-muted);
      cursor: not-allowed;
      transform: none;
      box-shadow: var(--mat-app-shadow-sm);
      border-color: var(--mat-app-border);
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }    .suggestions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-app-border);
      position: relative;
    }

    .suggestions::before {
      content: '';
      position: absolute;
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 2px;
      background: var(--mat-app-gradient-primary);
      border-radius: 1px;
    }    .suggestions h4 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--mat-app-on-surface);
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }    /* Attachments Preview Styles */
    .attachments-preview {
      margin-top: 16px;
      padding: 12px;
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      animation: slideInUp 0.3s ease-out;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .attachment-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border);
      border-radius: 8px;
      position: relative;
      transition: all 0.2s ease;
    }

    .attachment-item:hover {
      transform: translateY(-1px);
      box-shadow: var(--mat-app-shadow-sm);
    }

    .attachment-image {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--mat-app-border);
      box-shadow: var(--mat-app-shadow-sm);
    }

    .attachment-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .attachment-name {
      font-weight: 500;
      color: var(--mat-app-on-surface);
      font-size: 14px;
    }

    .attachment-size {
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
    }

    .attachment-remove {
      background: var(--mat-app-error);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--mat-app-on-error);
      transition: all 0.2s ease;
    }

    .attachment-remove:hover {
      background: var(--mat-app-error-variant);
      transform: scale(1.1);
    }

    .attachment-remove svg {
      width: 12px;
      height: 12px;
    }.suggestion-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      backdrop-filter: var(--mat-app-glass-blur);
      border-radius: 10px;
      padding: 12px 16px;
      text-align: left;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 13px;
      box-shadow: var(--mat-app-shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .suggestion-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--mat-app-gradient-hero);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .suggestion-item:hover {
      background: var(--mat-app-surface-elevated);
      border-color: var(--mat-app-primary);
      transform: translateY(-4px);
      box-shadow: var(--mat-app-shadow-md);
    }

    .suggestion-item:hover::before {
      opacity: 0.03;
    }    .suggestion-icon {
      font-size: 18px;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .suggestion-text {
      color: var(--mat-app-on-surface);
      font-weight: 500;
      line-height: 1.4;
      position: relative;
      z-index: 1;
    }    /* Responsive Design */
    @media (max-width: 1024px) {
      .suggestion-list {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px;
      }
    }

    @media (max-width: 768px) {
      .chat-input-container {
        margin: 12px;
        padding: 16px;
        border-radius: 16px;
      }

      .input-wrapper {
        padding: 12px 16px;
        border-radius: 12px;
      }

      .suggestion-list {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
      }

      .suggestion-item {
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 12px;
        gap: 8px;
      }

      .suggestion-icon {
        font-size: 16px;
      }

      .suggestions h4 {
        font-size: 12px;
        margin-bottom: 10px;
      }

      .char-counter {
        display: none;
      }

      .send-btn {
        min-width: 44px;
        height: 44px;
        padding: 10px;
        border-radius: 12px;
      }

      .send-btn svg {
        width: 20px;
        height: 20px;
      }
    }

    @media (max-width: 600px) {
      .suggestion-list {
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .suggestion-item {
        padding: 8px 12px;
        font-size: 11px;
        gap: 6px;
      }
    }

    @media (max-width: 480px) {
      .chat-input-container {
        margin: 8px;
        padding: 12px;
        border-radius: 12px;
      }

      .input-area {
        gap: 12px;
      }

      .attachment-btn {
        padding: 6px;
        border-radius: 10px;
      }

      .attachment-btn svg {
        width: 18px;
        height: 18px;
      }

      .suggestions {
        margin-top: 16px;
        padding-top: 16px;
      }

      .suggestions h4 {
        font-size: 12px;
        margin-bottom: 10px;
      }

      .suggestion-item {
        padding: 10px 14px;
        gap: 10px;
        font-size: 12px;
      }

      .suggestion-icon {
        font-size: 16px;
      }      .message-input {
        font-size: 14px;
      }
    }

    @media (max-width: 360px) {
      .chat-input-container {
        margin: 6px;
        padding: 10px;
      }

      .input-wrapper {
        padding: 10px 12px;
      }

      .suggestion-item {
        padding: 6px 10px;
        gap: 6px;
        font-size: 10px;
      }

      .suggestion-icon {
        font-size: 12px;
      }
    }

    /* Landscape mode optimizations for mobile */
    @media (max-height: 500px) and (orientation: landscape) {
      .suggestions {
        margin-top: 12px;
        padding-top: 12px;
      }

      .suggestions h4 {
        margin-bottom: 8px;
        font-size: 12px;
      }

      .suggestion-list {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 6px;
      }

      .suggestion-item {
        padding: 8px 12px;
        font-size: 11px;
      }

      .suggestion-icon {
        font-size: 14px;
      }
    }

    /* Touch improvements */
    @media (pointer: coarse) {
      .suggestion-item {
        min-height: 44px; /* Ensure touch targets are large enough */
      }      .attachment-btn,
      .send-btn {
        min-height: 44px;
        min-width: 44px;
      }
    }
  `]
})
export class ChatInputComponent {
  private readonly destroyRef = inject(DestroyRef);
    // Inputs
  readonly placeholder = input<string>('Type your message... (Ctrl+V to paste images)');
  readonly disabled = input<boolean>(false);
  readonly showSuggestions = input<boolean>(true);
  readonly showModelSelector = input<boolean>(false);
  readonly availableModels = input<any[]>([]);
  readonly selectedModel = input<string>('');
  // Outputs
  readonly messageSent = output<string>();
  readonly modelChanged = output<string>();
  readonly fileAttached = output<File>();
  readonly messageTyping = output<boolean>();
  readonly attachmentAdded = output<ChatAttachment>();

  // Internal state
  readonly message = signal<string>('');
  readonly inputHeight = signal<number>(40);
  
  // Signals to track current attachments
  readonly currentAttachments = signal<ChatAttachment[]>([]);

  // Computed values
  readonly canSend = signal<boolean>(false);
  readonly isNearLimit = signal<boolean>(false);
  // Suggestions data
  readonly suggestions = signal([
    { id: 1, icon: '💭', text: 'Explain quantum computing in simple terms' },
    { id: 2, icon: '🚀', text: 'Help me plan a new software project' },
    { id: 3, icon: '💻', text: 'Debug this code or write clean functions' },
    { id: 4, icon: '📊', text: 'Analyze data and create insights' },
    { id: 5, icon: '🎨', text: 'Design a modern user interface' },
    { id: 6, icon: '📝', text: 'Write professional documentation' }
  ]);

  // View references
  private readonly messageInput = viewChild<ElementRef<HTMLTextAreaElement>>('messageInput');
  constructor() {
    const chatService = inject(ChatService);
    const destroyRef = inject(DestroyRef);
    
    // Update computed values when message changes
    effect(() => {
      const msg = this.message().trim();
      this.canSend.set(msg.length > 0 && !this.disabled());
      this.isNearLimit.set(this.message().length > 30000);
    });

    // Auto-resize textarea
    effect(() => {
      const input = this.messageInput()?.nativeElement;
      if (input) {
        this.adjustTextareaHeight(input);
      }
    });

    // Set up typing indicator
    this.setupTypingIndicator();
  }

  /**
   * Handle message input changes
   */
  onMessageChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.message.set(target.value);
    this.adjustTextareaHeight(target);
  }
  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    // Send on Ctrl+Enter or Cmd+Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSend();
      return;
    }

    // Allow Shift+Enter for new lines
    if (event.shiftKey && event.key === 'Enter') {
      return;
    }

    // Send on Enter (without modifiers) if not on mobile
    if (event.key === 'Enter' && !event.shiftKey && !this.isMobile()) {
      event.preventDefault();
      this.onSend();
    }
  }
  /**
   * Handle clipboard paste events for images
   */
  onPaste(event: ClipboardEvent): void {
    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems) return;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) this.handleImageAttachment(file);
      }
    }
  }
  /**
   * Send message (with optional attachments for multimodal)
   */
  onSend(): void {
    const msg = this.message().trim();
    const attachments = this.currentAttachments();
    
    if ((msg || attachments.length > 0) && this.canSend()) {
      // If we have attachments, emit them too
      if (attachments.length > 0) {
        // For multimodal messages, we'll modify the interface to handle this
        this.messageSent.emit(msg || 'Analyze this image:');
        // Emit attachments separately for now
        attachments.forEach(attachment => {
          this.attachmentAdded.emit(attachment);
        });
      } else {
        // Regular text message
        this.messageSent.emit(msg);
      }
      
      this.message.set('');
      this.clearAttachments();
      this.resetTextareaHeight();
    }
  }

  /**
   * Clear all attachments
   */
  private clearAttachments(): void {
    // Clean up object URLs
    this.currentAttachments().forEach(attachment => {
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
    });
    this.currentAttachments.set([]);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Handle suggestion click
   */
  onSuggestionClick(text: string): void {
    this.message.set(text);
    this.focusInput();
  }

  /**
   * Handle model change
   */
  onModelChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.modelChanged.emit(target.value);
  }
  /**
   * Handle file attachment (supports both documents and images for multimodal)
   */
  onAttachFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    // Extended to support images for multimodal capabilities with Gemma 3
    input.accept = '.txt,.md,.pdf,.doc,.docx,.json,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp';
    input.multiple = false; // For now, single file only
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check if it's an image for multimodal support
        if (file.type.startsWith('image/')) {
          await this.handleImageAttachment(file);
        } else {
          // Handle regular document files as before
          this.fileAttached.emit(file);
        }
      }
    };
    
    input.click();
  }
  /**
   * Handle image attachment for multimodal AI analysis
   */
  private async handleImageAttachment(file: File): Promise<void> {
    try {
      // Convert image to base64 for AI processing
      const base64 = await this.fileToBase64(file);
      
      // Generate a descriptive name if the file doesn't have one
      const fileName = file.name || `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`;
      
      // Create attachment object
      const attachment = {
        id: crypto.randomUUID(),
        name: fileName,
        type: 'image' as const,
        size: file.size,
        mimeType: file.type,
        base64: base64,
        url: URL.createObjectURL(file) // For preview
      };

      // Add to current attachments
      this.currentAttachments.update(attachments => [...attachments, attachment]);
      
      // Focus input for user to add text description
      this.focusInput();
      
      console.log('[ChatInput] ✅ Imagen adjuntada:', fileName, this.formatFileSize(file.size));
      
    } catch (error) {
      console.error('[ChatInput] ❌ Error procesando imagen:', error);
      // TODO: Show error message to user
    }
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove an attachment
   */
  removeAttachment(attachmentId: string): void {
    this.currentAttachments.update(attachments => {
      const updated = attachments.filter(a => a.id !== attachmentId);
      // Clean up object URLs to prevent memory leaks
      const removed = attachments.find(a => a.id === attachmentId);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  }

  /**
   * Auto-resize textarea based on content
   */
  private adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
    this.inputHeight.set(newHeight);
  }

  /**
   * Reset textarea to initial height
   */
  private resetTextareaHeight(): void {
    const input = this.messageInput()?.nativeElement;
    if (input) {
      input.style.height = 'auto';
      this.inputHeight.set(40);
    }
  }

  /**
   * Focus the input field
   */
  private focusInput(): void {
    setTimeout(() => {
      this.messageInput()?.nativeElement.focus();
    });
  }

  /**
   * Setup typing indicator with debouncing
   */
  private setupTypingIndicator(): void {
    const input = this.messageInput();
    if (!input?.nativeElement) return;

    fromEvent(input.nativeElement, 'input')
      .pipe(
        map(() => this.message().length > 0),
        distinctUntilChanged(),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(isTyping => {
        this.messageTyping.emit(isTyping);
      });
  }

  /**
   * Check if running on mobile device
   */
  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * trackBy function for attachments list
   */
  trackByAttachment(index: number, attachment: ChatAttachment): string {
    return attachment.id;
  }

  /**
   * trackBy function for suggestions list
   */
  trackBySuggestion(index: number, suggestion: { id: number; icon: string; text: string }): number {
    return suggestion.id;
  }
}
