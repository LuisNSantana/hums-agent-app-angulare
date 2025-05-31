/**
 * ChatHeaderComponent - Main chat header with model selection and controls
 * Following Angular 20+ patterns with signals and modern UI
 */

import { 
  Component, 
  input, 
  output, 
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Conversation, AIModel } from '../../shared/models/chat.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <header class="chat-header">
      <!-- Left Section -->
      <div class="header-left">
        <!-- Sidebar Toggle (Mobile) -->
        <button 
          class="sidebar-toggle"
          (click)="onToggleSidebar()"
          [title]="sidebarOpen() ? 'Close sidebar' : 'Open sidebar'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <!-- Conversation Title -->
        <div class="conversation-info">
          @if (currentConversation()) {
            <h1 class="conversation-title">
              {{ currentConversation()!.title }}
            </h1>
            <div class="conversation-meta">
              <span class="message-count">
                {{ currentConversation()!.messageCount }} messages
              </span>
              <span class="last-updated">
                Updated {{ formatLastUpdated(currentConversation()!.updatedAt) }}
              </span>
            </div>
          } @else {
            <h1 class="conversation-title">Agent Hums</h1>
            <p class="conversation-subtitle">Your AI-powered assistant</p>
          }
        </div>
      </div>

      <!-- Center Section -->
      <div class="header-center">
        <!-- Model Selection -->
        @if (availableModels().length > 0) {
          <div class="model-selector">
            <label class="model-label">Model:</label>
            <select 
              class="model-select"
              [value]="selectedModel()"
              (change)="onModelChange($event)"
            >
              @for (model of availableModels(); track model.id) {
                <option [value]="model.id" [disabled]="!model.isAvailable">
                  {{ model.name }}
                  @if (!model.isAvailable) {
                    (Unavailable)
                  }
                </option>
              }
            </select>
            <div class="model-info">
              @if (selectedModelInfo()) {
                <span class="model-provider">{{ selectedModelInfo()!.provider }}</span>
                <span class="model-context">{{ formatContextWindow(selectedModelInfo()!.contextWindow) }}</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Right Section -->
      <div class="header-right">
        <!-- Connection Status -->
        <div class="connection-status" [class]="connectionStatus()">
          <div class="status-indicator"></div>
          <span class="status-text">{{ connectionStatusText() }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <!-- Export Chat -->
          @if (currentConversation()) {
            <button 
              class="action-btn"
              (click)="onExportChat()"
              title="Export conversation"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          }

          <!-- Settings -->
          <button 
            class="action-btn"
            (click)="onOpenSettings()"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>          <!-- User Menu -->
          <div class="user-menu">
            <button 
              class="user-avatar"
              (click)="toggleUserMenu()"
              title="User menu"
            >              <div class="avatar-circle">
                @if (currentUser()?.avatarUrl) {
                  <img 
                    [src]="currentUser()!.avatarUrl" 
                    [alt]="currentUser()!.displayName || currentUser()!.email"
                    class="avatar-image"
                    (error)="onAvatarError($event)"
                  />
                } @else {
                  @if (getUserInitials()) {
                    <span class="avatar-initials">{{ getUserInitials() }}</span>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  }
                }
              </div>
            </button>

            @if (userMenuOpen()) {
              <div class="user-dropdown">                <div class="user-info">
                  <div class="user-name">{{ currentUser()?.displayName || currentUser()?.email }}</div>
                  <div class="user-email">{{ currentUser()?.email }}</div>
                </div>
                <div class="dropdown-divider"></div>
                <a routerLink="/profile" class="dropdown-item" (click)="closeUserMenu()">
                  <span>Profile Settings</span>
                </a>
                <div class="dropdown-item" (click)="onOpenSettings()">
                  <span>App Settings</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item sign-out" (click)="onSignOut()">
                  <span>Sign Out</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.95);
      border-bottom: 1px solid rgba(229, 231, 235, 0.8);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 20;
      min-height: 60px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .sidebar-toggle {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
      display: none;

      svg {
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }
    }

    .conversation-info {
      min-width: 0;
      flex: 1;
    }

    .conversation-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-subtitle {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.2;
    }

    .conversation-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 2px;
      font-size: 12px;
      color: #9ca3af;
    }

    .header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .model-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 12px;
      transition: all 0.2s ease;

      &:focus-within {
        border-color: #3b82f6;
        background: #ffffff;
      }
    }

    .model-label {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      white-space: nowrap;
    }

    .model-select {
      background: none;
      border: none;
      outline: none;
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      cursor: pointer;
      min-width: 120px;

      option:disabled {
        color: #9ca3af;
      }
    }

    .model-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #9ca3af;
    }

    .model-provider {
      text-transform: uppercase;
      font-weight: 600;
      padding: 2px 6px;
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border-radius: 4px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: flex-end;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      background: #f3f4f6;

      &.connected {
        background: rgba(34, 197, 94, 0.1);
        color: #16a34a;
        
        .status-indicator {
          background: #16a34a;
        }
      }

      &.connecting {
        background: rgba(251, 191, 36, 0.1);
        color: #d97706;
        
        .status-indicator {
          background: #d97706;
          animation: pulse 2s infinite;
        }
      }

      &.disconnected {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        
        .status-indicator {
          background: #dc2626;
        }
      }
    }

    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #9ca3af;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }
    }

    .user-menu {
      position: relative;
    }    .user-avatar {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &:hover {
        transform: scale(1.05);
      }

      &:hover .avatar-circle {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
    }.avatar-circle {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

      svg {
        width: 18px;
        height: 18px;
      }
    }    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      position: absolute;
      top: 0;
      left: 0;
    }

    .avatar-initials {
      font-size: 14px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 50;
      min-width: 200px;
      overflow: hidden;
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .user-info {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .user-name {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .user-email {
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
    }

    .dropdown-item {
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s ease;
      font-size: 14px;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover {
        background: #f1f5f9;
      }

      &.sign-out {
        color: #dc2626;
        border-top: 1px solid #e2e8f0;

        &:hover {
          background: #fef2f2;
        }
      }
    }

    .dropdown-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 4px 0;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .chat-header {
        padding: 12px 16px;
      }

      .sidebar-toggle {
        display: flex;
      }

      .header-center {
        display: none;
      }

      .conversation-meta {
        display: none;
      }

      .connection-status {
        display: none;
      }

      .action-buttons .action-btn:not(:last-child) {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .header-left {
        gap: 12px;
      }

      .conversation-title {
        font-size: 16px;
      }

      .header-right {
        gap: 8px;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .chat-header {
        background: rgba(17, 24, 39, 0.95);
        border-bottom-color: rgba(55, 65, 81, 0.8);
      }

      .conversation-title {
        color: #f9fafb;
      }

      .model-selector {
        background: #374151;
        border-color: #4b5563;
      }

      .model-select {
        color: #f9fafb;
      }

      .connection-status {
        background: #374151;
      }

      .user-dropdown {
        background: #1f2937;
        border-color: #374151;
      }

      .dropdown-item {
        color: #f9fafb;

        &:hover {
          background: #374151;
        }
      }

      .dropdown-divider {
        background: #4b5563;
      }
    }
  `]
})
export class ChatHeaderComponent {
  // Injected services
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly currentConversation = input<Conversation | null>(null);
  readonly availableModels = input<AIModel[]>([]);
  readonly selectedModel = input<string>('');
  readonly sidebarOpen = input<boolean>(true);

  // Outputs
  readonly toggleSidebar = output<void>();
  readonly modelChanged = output<string>();

  // Internal state
  readonly userMenuOpen = signal<boolean>(false);
  readonly connectionStatus = signal<'connected' | 'connecting' | 'disconnected'>('connected');

  // Auth-related computed values
  readonly currentUser = computed(() => this.authService.user());
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  // Computed values
  readonly selectedModelInfo = computed(() => {
    const modelId = this.selectedModel();
    return this.availableModels().find(model => model.id === modelId) || null;
  });

  readonly connectionStatusText = computed(() => {
    switch (this.connectionStatus()) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  });

  /**
   * Handle sidebar toggle
   */
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Handle model selection change
   */
  onModelChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.modelChanged.emit(target.value);
  }

  /**
   * Toggle user menu
   */
  toggleUserMenu(): void {
    this.userMenuOpen.update(open => !open);
  }

  /**
   * Handle settings button
   */
  onOpenSettings(): void {
    // TODO: Implement settings modal
    console.log('Open settings');
  }
  /**
   * Handle export chat
   */
  onExportChat(): void {
    // TODO: Implement chat export
    console.log('Export chat');
  }

  /**
   * Close user menu
   */
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  /**
   * Handle user sign out
   */
  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.closeUserMenu();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Format context window for display
   */
  formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M tokens`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K tokens`;
    }
    return `${tokens} tokens`;
  }
  /**
   * Format last updated time
   */
  formatLastUpdated(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get user initials for avatar fallback
   */
  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return '';
    
    const displayName = user.displayName || user.email;
    if (!displayName) return '';
    
    // Get initials from display name or email
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } else {
      // Use first two characters of email before @
      return user.email.charAt(0).toUpperCase() + 
             (user.email.charAt(1) || '').toUpperCase();
    }
  }

  /**
   * Handle avatar image loading error
   */
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
