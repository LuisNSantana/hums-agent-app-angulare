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
  effect 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation } from '../../shared/models/chat.models';

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
  `,
  styles: [`
    .chat-sidebar {
      background: rgba(249, 250, 251, 0.95);
      border-right: 1px solid rgba(229, 231, 235, 0.8);
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 320px;
      backdrop-filter: blur(8px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 30;

      &.collapsed {
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
      padding: 20px 16px 16px;
      border-bottom: 1px solid rgba(229, 231, 235, 0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        transition: opacity 0.2s ease;
      }
    }

    .conversation-count {
      background: #f3f4f6;
      color: #6b7280;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      transition: opacity 0.2s ease;
    }

    .sidebar-actions {
      display: flex;
      gap: 8px;
    }

    .new-conversation-btn,
    .toggle-btn {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }
    }

    .search-container {
      padding: 0 16px 16px;
      transition: opacity 0.2s ease;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      width: 16px;
      height: 16px;
      color: #9ca3af;
      z-index: 1;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      font-size: 14px;
      color: #111827;
      outline: none;
      transition: all 0.2s ease;

      &::placeholder {
        color: #9ca3af;
      }

      &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }

    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #9ca3af;
      transition: all 0.2s ease;

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: #f3f4f6;
        color: #6b7280;
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
    }

    .conversation-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      group: hover;

      &:hover {
        background: rgba(59, 130, 246, 0.05);
        
        .conversation-actions {
          opacity: 1;
        }
      }

      &.active {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
        
        .conversation-title {
          color: #1e40af;
          font-weight: 600;
        }
      }
    }

    .conversation-content {
      flex: 1;
      min-width: 0;
      transition: opacity 0.2s ease;
    }

    .conversation-title {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #6b7280;
    }

    .conversation-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #9ca3af;
      transition: all 0.2s ease;

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }

      &.delete-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }

    .empty-content {
      text-align: center;
      max-width: 200px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      color: #d1d5db;
      margin: 0 auto 16px;
    }

    .empty-content p {
      margin: 0 0 16px;
      color: #6b7280;
      font-size: 14px;
    }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(229, 231, 235, 0.6);
      background: rgba(249, 250, 251, 0.5);
      transition: opacity 0.2s ease;
    }

    .footer-stats {
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .chat-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 280px;
        transform: translateX(-100%);
        z-index: 50;
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);

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
        }
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .chat-sidebar {
        background: rgba(17, 24, 39, 0.95);
        border-right-color: rgba(55, 65, 81, 0.8);
      }

      .sidebar-title h2 {
        color: #f9fafb;
      }

      .conversation-count {
        background: #374151;
        color: #9ca3af;
      }

      .search-input {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
        
        &::placeholder {
          color: #6b7280;
        }
        
        &:focus {
          border-color: #3b82f6;
        }
      }

      .conversation-title {
        color: #f9fafb;
      }

      .conversation-item.active .conversation-title {
        color: #60a5fa;
      }

      .sidebar-footer {
        background: rgba(17, 24, 39, 0.5);
        border-top-color: rgba(55, 65, 81, 0.6);
      }
    }
  `]
})
export class ChatSidebarComponent {
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
   * Handle conversation deletion
   */
  onDeleteConversation(conversationId: string, event: Event): void {
    event.stopPropagation(); // Prevent conversation selection
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.deleteConversation.emit(conversationId);
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
