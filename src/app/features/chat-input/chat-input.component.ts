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
          </div>        </div>        <!-- Attached Files Preview -->
        @if (currentAttachments().length > 0) {
          <div class="attachments-preview">
            @for (attachment of currentAttachments(); track attachment.id) {
              <div class="attachment-item">
                @if (attachment.type === 'image') {
                  <img [src]="attachment.url" [alt]="attachment.name" class="attachment-image" />
                } @else if (attachment.type === 'document') {
                  <div 
                    class="document-icon"
                    [class]="getDocumentIconClass(attachment.name)"
                    [title]="getDocumentTypeLabel(attachment.name)"
                    [innerHTML]="getDocumentIconSvg(attachment.name)">
                  </div>
                }
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
            }
          </div>
        }<!-- Suggestions section removed to save space -->

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
  `,
  styleUrls: ['./chat-input.component.scss']
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
  readonly messageSent = output<{ text: string; attachments?: ChatAttachment[] }>();
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
  }  /**
   * Send message (with optional attachments for multimodal)
   */
  onSend(): void {
    const msg = this.message().trim();
    const attachments = this.currentAttachments();
    
    if ((msg || attachments.length > 0) && this.canSend()) {
      // Create the message object that ChatInterfaceComponent expects
      const messageEvent = {
        text: msg || this.getDefaultMessageForAttachments(attachments),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      this.messageSent.emit(messageEvent);
      
      this.message.set('');
      this.clearAttachments();
      this.resetTextareaHeight();
    }
  }

  /**
   * Get default message based on attachment types
   */
  private getDefaultMessageForAttachments(attachments: ChatAttachment[]): string {
    if (attachments.length === 0) return '';
    
    const hasImages = attachments.some(a => a.type === 'image');
    const hasDocuments = attachments.some(a => a.type === 'document');
    
    if (hasDocuments && hasImages) {
      return 'Analyze these files:';
    } else if (hasDocuments) {
      return 'Analyze this document:';
    } else if (hasImages) {
      return 'Analyze this image:';
    }
    
    return 'Analyze this attachment:';
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
  }  /**
   * Handle file attachment (supports documents and images for multimodal)
   */
  onAttachFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    // Support all document formats handled by DocumentAnalyzer + images for multimodal
    input.accept = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.tsv,.md,.json,.jpg,.jpeg,.png,.gif,.bmp,.webp';
    input.multiple = false; // For now, single file only
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check if it's an image for multimodal support
        if (file.type.startsWith('image/')) {
          await this.handleImageAttachment(file);
        } else if (this.isSupportedDocumentType(file)) {
          // Handle all supported document types for analysis
          await this.handleDocumentAttachment(file);
        } else {
          // Fallback for unsupported files
          console.warn('[ChatInput] ⚠️ Unsupported file type:', file.type);
          // TODO: Show user-friendly error message
        }
      }
    };
    
    input.click();
  }  /**
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
   * Handle document attachment for AI document analysis (supports all DocumentAnalyzer formats)
   */
  private async handleDocumentAttachment(file: File): Promise<void> {
    try {
      // Convert document to base64 for analysis
      const base64 = await this.fileToBase64(file);
      
      // Create document attachment object
      const attachment: ChatAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'document' as const,
        size: file.size,
        mimeType: file.type,
        base64: base64,
        url: URL.createObjectURL(file) // For preview/download
      };

      // Add to current attachments
      this.currentAttachments.update(attachments => [...attachments, attachment]);
      
      // Focus input for user to add text description or questions about the document
      this.focusInput();
      
      const fileExtension = this.getFileExtension(file.name);
      console.log(`[ChatInput] ✅ ${fileExtension.toUpperCase()} documento adjuntado:`, file.name, this.formatFileSize(file.size));
      
    } catch (error) {
      console.error('[ChatInput] ❌ Error procesando documento:', error);
      // TODO: Show error message to user
    }
  }

  /**
   * Check if the file type is supported by DocumentAnalyzer
   */
  private isSupportedDocumentType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/tab-separated-values',
      'text/markdown',
      'application/json'
    ];
    
    const extension = this.getFileExtension(file.name).toLowerCase();
    const supportedExtensions = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'tsv', 'md', 'json'];
    
    return supportedTypes.includes(file.type) || supportedExtensions.includes(extension);
  }

  /**
   * Extract file extension from filename (public for template)
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * Get human-readable label for document type
   */
  getDocumentTypeLabel(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'PDF Document';
      case 'doc':
      case 'docx':
        return 'Word Document';
      case 'xls':
      case 'xlsx':
        return 'Excel Spreadsheet';
      case 'csv':
        return 'CSV File';
      case 'tsv':
        return 'TSV File';
      case 'txt':
        return 'Text File';
      case 'md':
        return 'Markdown File';
      case 'json':
        return 'JSON File';
      default:
        return 'Document';
    }
  }

  /**
   * Get SVG markup for document icon based on file extension
   */
  getDocumentIconSvg(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    const baseSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>`;
    
    switch (extension) {
      case 'pdf':
        return `${baseSvg}<text x="7" y="15" font-size="6" fill="currentColor">PDF</text></svg>`;
      case 'doc':
      case 'docx':
        return `${baseSvg}<text x="6" y="15" font-size="5" fill="currentColor">DOC</text></svg>`;
      case 'xls':
      case 'xlsx':
        return `${baseSvg}
          <rect x="8" y="11" width="8" height="6" fill="none" stroke="currentColor"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
          <line x1="8" y1="13" x2="16" y2="13"/>
          <line x1="8" y1="15" x2="16" y2="15"/>
        </svg>`;
      case 'csv':
      case 'tsv':
        return `${baseSvg}<text x="6" y="15" font-size="5" fill="currentColor">CSV</text></svg>`;
      case 'txt':
      case 'md':
        return `${baseSvg}
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>`;
      case 'json':
        return `${baseSvg}<text x="6" y="15" font-size="4" fill="currentColor">JSON</text></svg>`;
      default:
        return `${baseSvg}
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>`;
    }
  }

  /**
   * Get CSS class for document icon based on file extension
   */
  getDocumentIconClass(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'pdf-icon';
      case 'doc':
      case 'docx':
        return 'word-icon';
      case 'xls':
      case 'xlsx':
        return 'excel-icon';
      case 'csv':
      case 'tsv':
        return 'csv-icon';
      case 'txt':
      case 'md':
        return 'text-icon';
      case 'json':
        return 'json-icon';
      default:
        return 'document-icon';
    }
  }

  /**
   * Get appropriate icon for document type
   */
  getDocumentIcon(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '📄'; // PDF icon
      case 'doc':
      case 'docx':
        return '📝'; // Word icon
      case 'xls':
      case 'xlsx':
        return '📊'; // Excel icon
      case 'csv':
      case 'tsv':
        return '📋'; // CSV icon
      case 'txt':
      case 'md':
        return '📃'; // Text icon
      case 'json':
        return '🔧'; // JSON icon
      default:
        return '📄'; // Default document icon
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
