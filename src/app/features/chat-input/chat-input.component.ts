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
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

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

          <!-- Text input -->
          <textarea
            #messageInput
            class="message-input"
            [value]="message()"
            (input)="onMessageChange($event)"
            (keydown)="onKeyDown($event)"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [style.height.px]="inputHeight()"
            rows="1"
            maxlength="32000">
          </textarea>

          <!-- Character counter -->
          <div class="char-counter" [class.warning]="isNearLimit()">
            {{ message().length }}/32000
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

      <!-- Suggestions (when input is empty) -->
      @if (showSuggestions() && suggestions().length > 0 && !message()) {
        <div class="suggestions">
          <h4>Suggestions:</h4>
          <div class="suggestion-list">
            @for (suggestion of suggestions(); track suggestion.id) {
              <button 
                class="suggestion-item"
                (click)="onSuggestionClick(suggestion.text)">
                <span class="suggestion-icon">{{ suggestion.icon }}</span>
                <span class="suggestion-text">{{ suggestion.text }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Model selector (optional) -->
      @if (showModelSelector()) {
        <div class="model-selector">
          <select 
            [value]="selectedModel()"
            (change)="onModelChange($event)"
            class="model-select">
            @for (model of availableModels(); track model.id) {
              <option [value]="model.id">{{ model.name }}</option>
            }
          </select>
        </div>
      }
    </div>
  `,  styles: [`    .chat-input-container {
      background: rgba(20, 20, 32, 0.8);
      border: 1px solid rgba(60, 60, 78, 0.6);
      border-radius: 16px;
      padding: 20px;
      margin: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(12px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:focus-within {
        border-color: rgba(16, 163, 127, 0.6);
        box-shadow: 0 8px 32px rgba(16, 163, 127, 0.2), 0 0 0 1px rgba(16, 163, 127, 0.1);
        transform: translateY(-1px);
      }

      &.disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    }

    .input-area {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }    .input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      background: rgba(30, 30, 44, 0.7);
      border: 1px solid rgba(70, 70, 90, 0.6);
      border-radius: 12px;
      padding: 12px 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:focus-within {
        border-color: #10a37f;
        background: rgba(35, 35, 50, 0.9);
        box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2);
      }
    }    .attachment-btn {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #8b8b9c;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: rgba(16, 163, 127, 0.2);
        color: #10a37f;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }.message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      resize: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #e0e0e0;
      min-height: 20px;
      max-height: 200px;
      overflow-y: auto;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE 10+ */
      
      &::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Edge */
      }

      &::placeholder {
        color: #8b8b9c;
      }

      &:disabled {
        color: #6c757d;
        cursor: not-allowed;
      }
    }    .char-counter {
      font-size: 11px;
      color: #8b8b9c;
      white-space: nowrap;
      align-self: flex-end;
      margin-bottom: 2px;

      &.warning {
        color: #ff5a5f;
        font-weight: 500;
      }
    }    .send-btn {
      background: linear-gradient(135deg, #10a37f 0%, #0d8a6b 100%);
      border: none;
      border-radius: 10px;
      padding: 12px;
      cursor: pointer;
      color: white;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      height: 44px;
      box-shadow: 0 2px 8px rgba(16, 163, 127, 0.4);

      svg {
        width: 20px;
        height: 20px;
      }

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #13c095 0%, #0e957a 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(16, 163, 127, 0.6);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
        transition: transform 0.1s ease;
      }

      &:disabled {
        background: #3a3a4a;
        color: #8b8b9c;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
    }

    .loading-spinner {
      width: 18px;
      height: 18px;
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
      border-top: 1px solid rgba(60, 60, 78, 0.5);

      h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        font-weight: 600;
        color: #a0a0b0;
        opacity: 0.9;
      }
    }

    .suggestion-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(42, 42, 54, 0.7);
      border: 1px solid rgba(70, 70, 90, 0.6);
      border-radius: 10px;
      padding: 12px 16px;
      text-align: left;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 14px;

      &:hover {
        background: rgba(45, 45, 58, 0.9);
        border-color: #10a37f;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 163, 127, 0.25);
      }

      .suggestion-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .suggestion-text {
        color: #d0d0e0;
        font-weight: 500;
        line-height: 1.4;
      }
    }    .model-selector {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(60, 60, 78, 0.5);
    }

    .model-select {
      background: rgba(35, 35, 50, 0.8);
      border: 1px solid rgba(70, 70, 90, 0.6);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: #d0d0e0;
      cursor: pointer;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: #10a37f;
        background: rgba(40, 40, 55, 0.9);
        box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2);
      }

      option {
        background: #23232F;
        color: #d0d0e0;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .chat-input-container {
        margin: 12px;
        padding: 12px;
      }

      .suggestion-list {
        grid-template-columns: 1fr;
      }

      .char-counter {
        display: none;
      }
    }
  `]
})
export class ChatInputComponent {
  private readonly destroyRef = inject(DestroyRef);
  
  // Inputs
  readonly placeholder = input<string>('Type your message...');
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

  // Internal state
  readonly message = signal<string>('');
  readonly inputHeight = signal<number>(40);
  
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
   * Send message
   */
  onSend(): void {
    const msg = this.message().trim();
    if (msg && this.canSend()) {
      this.messageSent.emit(msg);
      this.message.set('');
      this.resetTextareaHeight();
    }
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
   * Handle file attachment
   */
  onAttachFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.doc,.docx,.json,.csv';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.fileAttached.emit(file);
      }
    };
    
    input.click();
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
}
