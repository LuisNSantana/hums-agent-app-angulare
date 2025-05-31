/**
 * ChatSidebarComponent - Conversation management sidebar
 * Following Angular 20+ patterns with signals and modern UI
 */

import { 
  Component, 
  input, 
  output, 
  signal, 
  computed,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation } from '../../shared/models/chat.models';
import { ConfirmationService } from '../../shared/services/confirmation.service';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside 
      class="chat-sidebar" 
      [class.open]="isOpen()"
      [class.collapsed]="!isOpen()"
    >
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="sidebar-title">
          <h2>Conversations</h2>
          <span class="conversation-count">{{ filteredConversations().length }}</span>
        </div>
        
        <div class="sidebar-actions">
          <!-- New Conversation Button -->
          <button 
            class="new-conversation-btn"
            (click)="onNewConversation()"
            title="New conversation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          
          <!-- Toggle Sidebar Button -->
          <button 
            class="toggle-btn"
            (click)="onToggleSidebar()"
            title="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              <path d="M9 3v18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      @if (isOpen()) {
        <div class="search-container">
          <div class="search-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search conversations..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
            @if (searchQuery()) {
              <button 
                class="clear-search-btn"
                (click)="clearSearch()"
                title="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            }
          </div>
        </div>
      }

      <!-- Conversations List -->
      <div class="conversations-container">
        @if (filteredConversations().length === 0) {
          <div class="empty-state">
            @if (searchQuery()) {
              <div class="empty-content">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <p>No conversations found</p>
                <button class="clear-search-btn" (click)="clearSearch()">
                  Clear search
                </button>
              </div>
            } @else {
              <div class="empty-content">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p>No conversations yet</p>
                <button class="new-conversation-btn" (click)="onNewConversation()">
                  Start chatting
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="conversations-list">
            @for (conversation of filteredConversations(); track conversation.id) {
              <div 
                class="conversation-item"
                [class.active]="conversation.id === currentConversationId()"
                (click)="onConversationSelect(conversation.id)"
              >
                <div class="conversation-content">
                  <div class="conversation-title">
                    {{ conversation.title }}
                  </div>
                  <div class="conversation-meta">
                    <span class="message-count">{{ conversation.messageCount }} messages</span>
                    <span class="conversation-date">{{ formatDate(conversation.updatedAt) }}</span>
                  </div>
                </div>
                
                <div class="conversation-actions">
                  <!-- Edit Title Button -->
                  <button 
                    class="action-btn edit-btn"
                    (click)="onEditTitle(conversation, $event)"
                    title="Edit title"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  
                  <!-- Delete Button -->
                  <button 
                    class="action-btn delete-btn"
                    (click)="onDeleteConversation(conversation.id, $event)"
                    title="Delete conversation"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19,6v14a2,2 0 01-2,2H7a2,2 0 01-2-2V6m3,0V4a2,2 0 012-2h4a2,2 0 012,2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Sidebar Footer -->
      @if (isOpen()) {
        <div class="sidebar-footer">
          <div class="footer-stats">
            <span class="total-conversations">
              {{ conversations().length }} total conversations
            </span>
          </div>
        </div>
      }
    </aside>
  `,  styles: [`
    .chat-sidebar {
      background: var(--mat-app-surface-container);
      border-right: 1px solid var(--mat-app-outline-variant);
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 320px;
      backdrop-filter: blur(var(--mat-app-glass-blur));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 30;
      box-shadow: var(--mat-app-elevation-3);

      /* Enhanced dark theme support with better contrast */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, 
          rgba(var(--mat-app-primary-rgb), 0.02) 0%,
          transparent 30%,
          transparent 70%,
          rgba(var(--mat-app-primary-rgb), 0.01) 100%);
        pointer-events: none;
        z-index: -1;
      }      &.collapsed {
        width: 60px;
        
        .conversation-content,
        .conversation-actions,
        .search-container,
        .sidebar-footer {
          opacity: 0;
          pointer-events: none;
        }
        
        .sidebar-title h2,
        .conversation-count {
          opacity: 0;
        }
      }
    }

    .sidebar-header {
      padding: 24px 16px 16px;
      border-bottom: 1px solid var(--mat-app-outline-variant);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, 
        rgba(var(--mat-app-primary-rgb), 0.08) 0%,
        rgba(var(--mat-app-tertiary-rgb), 0.05) 100%);
      backdrop-filter: blur(12px);
      position: relative;

      /* Enhanced dark theme header */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, 
          rgba(var(--mat-app-primary-rgb), 0.05) 0%,
          transparent 50%,
          rgba(var(--mat-app-secondary-rgb), 0.03) 100%);
        pointer-events: none;
      }
    }    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 12px;
      
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        /* Usar color directo del primary en lugar de gradiente problemático */
        color: var(--mat-app-primary);
        /* Fallback adicional para asegurar visibilidad */
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
        letter-spacing: -0.02em;
        
        /* Dark theme específico */
        @media (prefers-color-scheme: dark) {
          color: var(--mat-app-primary);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7),
                       0 0 20px rgba(var(--mat-app-primary-rgb), 0.3);
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          color: var(--mat-app-on-surface);
          font-weight: 800;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }
        
        /* Hover effect for better interaction */
        &:hover {
          color: var(--mat-app-tertiary);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6),
                       0 0 25px rgba(var(--mat-app-tertiary-rgb), 0.4);
        }
      }
    }

    .conversation-count {
      background: var(--mat-app-surface-container-high);
      color: var(--mat-app-primary);
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--mat-app-outline-variant);
      backdrop-filter: blur(8px);
      box-shadow: var(--mat-app-elevation-1);
      transition: all 0.3s ease;
    }    .sidebar-actions {
      display: flex;
      gap: 8px;
    }

    .new-conversation-btn,
    .toggle-btn {
      background: var(--mat-app-surface-container-highest);
      border: 1px solid var(--mat-app-outline-variant);
      padding: 10px;
      border-radius: 12px;
      cursor: pointer;
      color: var(--mat-app-on-surface-variant);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      position: relative;
      overflow: hidden;

      svg {
        width: 18px;
        height: 18px;
        transition: all 0.3s ease;
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(var(--mat-app-primary-rgb), 0.2) 50%, 
          transparent 100%);
        transition: left 0.5s ease;
      }

      &:hover {
        background: var(--mat-app-secondary-container);
        border-color: var(--mat-app-primary);
        color: var(--mat-app-primary);
        transform: translateY(-2px);
        box-shadow: var(--mat-app-elevation-3);

        &::before {
          left: 100%;
        }

        svg {
          transform: scale(1.1);
        }
      }

      &:active {
        transform: translateY(0);
      }
    }    .search-container {
      padding: 0 16px 20px;
      transition: opacity 0.2s ease;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      width: 18px;
      height: 18px;
      color: var(--mat-app-on-surface-variant);
      z-index: 1;
      transition: all 0.3s ease;
    }

    .search-input {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border: 1px solid var(--mat-app-outline-variant);
      border-radius: 16px;
      background: var(--mat-app-surface-container);
      font-size: 14px;
      color: var(--mat-app-on-surface);
      outline: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
      box-shadow: var(--mat-app-elevation-1);

      &::placeholder {
        color: var(--mat-app-on-surface-variant);
        font-weight: 400;
      }

      &:focus {
        border-color: var(--mat-app-primary);
        background: var(--mat-app-surface-container-high);
        box-shadow: 0 0 0 3px rgba(var(--mat-app-primary-rgb), 0.12), var(--mat-app-elevation-2);
        transform: translateY(-1px);

        ~ .search-icon {
          color: var(--mat-app-primary);
          transform: scale(1.1);
        }
      }
    }    .clear-search-btn {
      position: absolute;
      right: 12px;
      background: var(--mat-app-surface-container-highest);
      border: 1px solid var(--mat-app-outline-variant);
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      color: var(--mat-app-on-surface-variant);
      transition: all 0.3s ease;
      backdrop-filter: blur(4px);

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: var(--mat-app-error-container);
        color: var(--mat-app-error);
        transform: scale(1.1);
      }
    }

    .conversations-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }    .conversation-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: var(--mat-app-surface-container);
      border: 1px solid transparent;
      backdrop-filter: blur(8px);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, 
          rgba(var(--mat-app-primary-rgb), 0.08) 0%,
          rgba(var(--mat-app-tertiary-rgb), 0.04) 100%);
        transition: left 0.5s ease;
      }

      &:hover {
        background: var(--mat-app-surface-container-high);
        border-color: var(--mat-app-outline-variant);
        transform: translateX(4px);
        box-shadow: var(--mat-app-elevation-2);
        
        &::before {
          left: 100%;
        }
        
        .conversation-actions {
          opacity: 1;
          transform: translateX(0);
        }

        .conversation-title {
          color: var(--mat-app-primary);
        }
      }

      &.active {
        background: var(--mat-app-secondary-container);
        border-color: var(--mat-app-primary);
        box-shadow: 0 0 0 2px rgba(var(--mat-app-primary-rgb), 0.12), var(--mat-app-elevation-3);
        
        .conversation-title {
          color: var(--mat-app-primary);
          font-weight: 700;
        }

        .conversation-actions {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }.conversation-content {
      flex: 1;
      min-width: 0;
      transition: all 0.3s ease;
    }

    .conversation-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--mat-app-on-surface);
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
      transition: all 0.3s ease;
    }

    .conversation-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      font-weight: 500;
    }    .message-count {
      background: var(--mat-app-tertiary-container);
      color: var(--mat-app-on-tertiary-container);
      padding: 2px 8px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 11px;
      border: 1px solid var(--mat-app-outline-variant);
    }

    .conversation-date {
      color: var(--mat-app-on-surface-variant);
      font-size: 11px;
    }    .conversation-actions {
      display: flex;
      gap: 6px;
      opacity: 0;
      transform: translateX(8px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .action-btn {
      background: var(--mat-app-surface-container-highest);
      border: 1px solid var(--mat-app-outline-variant);
      padding: 8px;
      border-radius: 10px;
      cursor: pointer;
      color: var(--mat-app-on-surface-variant);
      transition: all 0.3s ease;
      backdrop-filter: blur(4px);
      position: relative;
      overflow: hidden;

      svg {
        width: 14px;
        height: 14px;
        transition: all 0.3s ease;
      }

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: radial-gradient(circle, var(--mat-app-primary) 0%, transparent 70%);
        opacity: 0;
        transition: all 0.3s ease;
        transform: translate(-50%, -50%);
        border-radius: 50%;
      }

      &:hover {
        background: var(--mat-app-secondary-container);
        color: var(--mat-app-primary);
        transform: scale(1.1);
        box-shadow: var(--mat-app-elevation-2);

        &::before {
          width: 100%;
          height: 100%;
          opacity: 0.1;
        }

        svg {
          transform: scale(1.1);
        }
      }

      &.delete-btn:hover {
        background: var(--mat-app-error-container);
        color: var(--mat-app-error);
        border-color: var(--mat-app-error);

        &::before {
          background: radial-gradient(circle, var(--mat-app-error) 0%, transparent 70%);
        }
      }
    }    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
    }

    .empty-content {
      text-align: center;
      max-width: 240px;
      padding: 32px;
      background: var(--mat-app-surface-container);
      border-radius: 20px;
      border: 1px solid var(--mat-app-outline-variant);
      backdrop-filter: blur(12px);
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      color: var(--mat-app-on-surface-variant);
      margin: 0 auto 24px;
      opacity: 0.6;
    }

    .empty-content p {
      margin: 0 0 24px;
      color: var(--mat-app-on-surface-variant);
      font-size: 15px;
      font-weight: 500;
      line-height: 1.5;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--mat-app-outline-variant);
      background: var(--mat-app-surface-container);
      backdrop-filter: blur(12px);
      transition: opacity 0.2s ease;
    }

    .footer-stats {
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      text-align: center;
      font-weight: 500;
    }    /* Enhanced Mobile Responsive with Dark Theme Support */
    @media (max-width: 768px) {
      .chat-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 280px;
        transform: translateX(-100%);
        z-index: 50;
        box-shadow: var(--mat-app-elevation-4);
        background: var(--mat-app-surface-container);

        &.open {
          transform: translateX(0);
        }

        &.collapsed {
          width: 280px;
          transform: translateX(-100%);
          
          .conversation-content,
          .conversation-actions,
          .search-container,
          .sidebar-footer {
            opacity: 1;
            pointer-events: auto;
          }

          .sidebar-title h2,
          .conversation-count {
            opacity: 1;
          }
        }
      }

      .sidebar-header {
        padding: 20px 16px 16px;
        background: linear-gradient(135deg, 
          rgba(var(--mat-app-primary-rgb), 0.1) 0%,
          rgba(var(--mat-app-tertiary-rgb), 0.05) 100%);
      }

      .conversation-item {
        padding: 14px;
        margin-bottom: 6px;
        
        &:hover {
          transform: translateX(2px);
        }
      }

      .search-input {
        padding: 12px 16px 12px 44px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }

    /* Small mobile devices */
    @media (max-width: 480px) {
      .chat-sidebar {
        width: 260px;
      }

      .sidebar-header {
        padding: 16px 12px 12px;
      }

      .sidebar-title h2 {
        font-size: 18px;
      }

      .conversation-item {
        padding: 12px;
        
        .conversation-title {
          font-size: 14px;
        }
        
        .conversation-meta {
          font-size: 11px;
        }
      }

      .search-container {
        padding: 0 12px 16px;
      }

      .conversations-list {
        padding: 6px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .chat-sidebar {
        border-right: 2px solid var(--mat-app-outline);
      }

      .conversation-item {
        border: 1px solid var(--mat-app-outline-variant);
        
        &.active {
          border: 2px solid var(--mat-app-primary);
        }
      }

      .search-input {
        border: 2px solid var(--mat-app-outline);
        
        &:focus {
          border: 2px solid var(--mat-app-primary);
        }
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .chat-sidebar,
      .conversation-item,
      .action-btn,
      .search-input,
      * {
        transition: none !important;
        animation: none !important;
      }

      .conversation-item::before,
      .action-btn::before,
      .new-conversation-btn::before,
      .toggle-btn::before {
        display: none !important;
      }
    }/* Custom scrollbar with enhanced dark theme support */
    .conversations-list {
      scrollbar-width: thin;
      scrollbar-color: var(--mat-app-outline-variant) transparent;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--mat-app-outline-variant);
        border-radius: 3px;
        transition: background 0.3s ease;
        
        &:hover {
          background: var(--mat-app-primary);
        }
      }

      &::-webkit-scrollbar-corner {
        background: transparent;
      }
    }

    /* Animation keyframes */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .conversation-item {
      animation: slideIn 0.3s ease-out;
    }
  `]
})
export class ChatSidebarComponent {
  // Injected services
  private readonly confirmationService = inject(ConfirmationService);

  // Inputs
  readonly conversations = input<Conversation[]>([]);
  readonly currentConversationId = input<string | null>(null);
  readonly isOpen = input<boolean>(true);

  // Outputs
  readonly conversationSelected = output<string>();
  readonly newConversation = output<void>();
  readonly deleteConversation = output<string>();
  readonly toggleSidebar = output<void>();

  // Internal state
  readonly searchQuery = signal<string>('');

  // Computed values
  readonly filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.conversations();

    return this.conversations().filter(conversation =>
      conversation.title.toLowerCase().includes(query)
    );
  });

  /**
   * Handle search input changes
   */
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }

  /**
   * Handle conversation selection
   */
  onConversationSelect(conversationId: string): void {
    this.conversationSelected.emit(conversationId);
  }

  /**
   * Handle new conversation creation
   */
  onNewConversation(): void {
    this.newConversation.emit();
  }
  /**
   * Handle conversation deletion with elegant modal
   */
  async onDeleteConversation(conversationId: string, event: Event): Promise<void> {
    event.stopPropagation(); // Prevent conversation selection
    
    // Find the conversation to get its title
    const conversation = this.conversations().find(c => c.id === conversationId);
    
    try {
      const confirmed = await this.confirmationService.confirmDeleteConversation(
        conversation?.title
      );
      
      if (confirmed) {
        this.deleteConversation.emit(conversationId);
      }
    } catch (error) {
      console.error('Error showing confirmation modal:', error);
      // Fallback to browser confirm if modal fails
      if (confirm('Are you sure you want to delete this conversation?')) {
        this.deleteConversation.emit(conversationId);
      }
    }
  }

  /**
   * Handle title editing
   */
  onEditTitle(conversation: Conversation, event: Event): void {
    event.stopPropagation(); // Prevent conversation selection
    
    const newTitle = prompt('Enter new title:', conversation.title);
    if (newTitle && newTitle.trim() !== conversation.title) {
      // TODO: Implement title update
      console.log('Update title:', conversation.id, newTitle);
    }
  }

  /**
   * Handle sidebar toggle
   */
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
