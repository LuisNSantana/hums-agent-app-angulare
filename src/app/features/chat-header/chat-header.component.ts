/**
 * ChatHeaderComponent - Main chat header with model selec        <!-- Model Selection -->
        @if (availableModels().length > 0) {
          <div class="model-selector">
            <label class="model-label">Model:</label>
            <select 
              class="model-select"
              [value]="selectedModel()"
              (change)="onModelChange($event)"
            >
              @for (model of sortedModels(); track model.id) {
                <option [value]="model.id" [disabled]="!model.isAvailable">
                  {{ model.name }}
                  @if (model.id === 'gemma3:4b') {
                    ★
                  }
                  @if (!model.isAvailable) {
                    (Unavailable)
                  }
                </option>
              }
 * Following Angular 20+ patterns with signals and modern UI
 */

import { 
  Component, 
  input, 
  output, 
  signal,
  computed,
  inject,
  OnInit
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
            <h1 class="conversation-title">
              <img src="/img/logos/logocleo.png" alt="Cleo Logo" class="agent-logo" style="height: 24px; width: auto; margin-right: 8px; vertical-align: middle;" />
              Cleo
            </h1>
            <p class="conversation-subtitle">By huminaryLabs</p>
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
            >              @for (model of sortedModels(); track model.id) {
                <option [value]="model.id" [disabled]="!model.isAvailable">
                  {{ model.name }}
                  @if (model.id === 'gemma3:4b') {
                    ★ 
                  }
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
  `,  styles: [`
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: var(--mat-app-surface);
      border-bottom: 1px solid var(--mat-app-glass-border);
      backdrop-filter: blur(var(--mat-app-glass-blur));
      position: sticky;
      top: 0;
      z-index: 20;
      min-height: 72px;
      box-shadow: var(--mat-app-shadow-md);
      
      /* Glass morphism enhancement */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--mat-app-glass-bg);
        pointer-events: none;
        z-index: -1;
      }

      /* Gradient overlay */
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
          rgba(139, 92, 246, 0.03) 0%,
          rgba(59, 130, 246, 0.02) 100%);
        pointer-events: none;
        z-index: -1;
      }
    }    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
      min-width: 0;
    }

    .sidebar-toggle {
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      padding: 10px;
      border-radius: 12px;
      cursor: pointer;
      color: var(--mat-app-on-surface);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: none;
      backdrop-filter: blur(8px);
      position: relative;
      overflow: hidden;

      svg {
        width: 20px;
        height: 20px;
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
          rgba(139, 92, 246, 0.2) 50%, 
          transparent 100%);
        transition: left 0.5s ease;
      }

      &:hover {
        background: var(--mat-app-accent-hover);
        border-color: var(--mat-app-accent);
        color: var(--mat-app-accent);
        transform: translateY(-2px);
        box-shadow: var(--mat-app-shadow-lg);

        &::before {
          left: 100%;
        }

        svg {
          transform: scale(1.1);
        }
      }
    }    .conversation-info {
      min-width: 0;
      flex: 1;
    }

    .conversation-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      background: var(--mat-app-gradient-hero);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.02em;
      text-shadow: var(--mat-app-shadow-text);
    }

    .conversation-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--mat-app-on-surface-variant);
      line-height: 1.3;
      font-weight: 500;
    }

    .conversation-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 4px;
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      font-weight: 500;

      .message-count {
        background: var(--mat-app-glass-bg);
        color: var(--mat-app-accent);
        padding: 2px 8px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 11px;
        border: 1px solid var(--mat-app-glass-border);
      }
    }    .header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .model-selector {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      border-radius: 16px;
      padding: 12px 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(12px);
      box-shadow: var(--mat-app-shadow-sm);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--mat-app-gradient-hero);
        opacity: 0.02;
        pointer-events: none;
      }

      &:focus-within {
        border-color: var(--mat-app-accent);
        background: var(--mat-app-background);
        box-shadow: 0 0 0 3px var(--mat-app-accent-hover), var(--mat-app-shadow-lg);
        transform: translateY(-2px);
      }
    }

    .model-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-app-on-surface-variant);
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .model-select {
      background: none;
      border: none;
      outline: none;
      font-size: 14px;
      font-weight: 600;
      color: var(--mat-app-on-surface);
      cursor: pointer;
      min-width: 140px;
      transition: all 0.3s ease;

      option {
        background: var(--mat-app-background);
        color: var(--mat-app-on-surface);
        
        &:disabled {
          color: var(--mat-app-on-surface-variant);
        }
      }
    }

    .model-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--mat-app-on-surface-variant);
    }

    .model-provider {
      text-transform: uppercase;
      font-weight: 700;
      padding: 3px 8px;
      background: var(--mat-app-accent-hover);
      color: var(--mat-app-accent);
      border-radius: 6px;
      font-size: 10px;
      letter-spacing: 0.5px;
      border: 1px solid var(--mat-app-glass-border);
    }    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
      justify-content: flex-end;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 12px;
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      backdrop-filter: blur(8px);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.connected {
        background: rgba(34, 197, 94, 0.1);
        color: #16a34a;
        border-color: rgba(34, 197, 94, 0.3);
        
        .status-indicator {
          background: #16a34a;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
        }
      }

      &.connecting {
        background: rgba(251, 191, 36, 0.1);
        color: #d97706;
        border-color: rgba(251, 191, 36, 0.3);
        
        .status-indicator {
          background: #d97706;
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
        }
      }

      &.disconnected {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        border-color: rgba(239, 68, 68, 0.3);
        
        .status-indicator {
          background: #dc2626;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }
      }
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--mat-app-on-surface-variant);
      transition: all 0.3s ease;
    }

    @keyframes pulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
      }
      50% { 
        opacity: 0.5;
        transform: scale(1.2);
      }
    }    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-btn {
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      padding: 12px;
      border-radius: 12px;
      cursor: pointer;
      color: var(--mat-app-on-surface);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
          rgba(139, 92, 246, 0.2) 50%, 
          transparent 100%);
        transition: left 0.5s ease;
      }

      &:hover {
        background: var(--mat-app-accent-hover);
        border-color: var(--mat-app-accent);
        color: var(--mat-app-accent);
        transform: translateY(-2px);
        box-shadow: var(--mat-app-shadow-lg);

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
    }    .user-menu {
      position: relative;
    }

    .user-avatar {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &:hover {
        transform: scale(1.08);
      }

      &:hover .avatar-circle {
        box-shadow: var(--mat-app-shadow-xl);
        border-color: var(--mat-app-accent);
      }
    }

    .avatar-circle {
      width: 42px;
      height: 42px;
      background: var(--mat-app-gradient-hero);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
      overflow: hidden;
      border: 2px solid var(--mat-app-glass-border);
      box-shadow: var(--mat-app-shadow-lg);
      transition: all 0.3s ease;

      svg {
        width: 20px;
        height: 20px;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      position: absolute;
      top: 0;
      left: 0;
    }

    .avatar-initials {
      font-size: 16px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      letter-spacing: 0.5px;
    }

    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 12px;
      background: var(--mat-app-surface);
      border: 1px solid var(--mat-app-glass-border);
      border-radius: 20px;
      box-shadow: var(--mat-app-shadow-xl);
      z-index: 50;
      min-width: 220px;
      overflow: hidden;
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(20px);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--mat-app-glass-bg);
        pointer-events: none;
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-16px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .user-info {
      padding: 20px;
      border-bottom: 1px solid var(--mat-app-glass-border);
      background: linear-gradient(135deg, 
        rgba(139, 92, 246, 0.05) 0%,
        rgba(59, 130, 246, 0.03) 100%);
      position: relative;
    }

    .user-name {
      font-weight: 700;
      color: var(--mat-app-on-surface);
      font-size: 15px;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }

    .user-email {
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      word-break: break-all;
      font-weight: 500;
    }

    .dropdown-item {
      padding: 14px 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
      color: var(--mat-app-on-surface);
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      position: relative;

      &:hover {
        background: var(--mat-app-accent-hover);
        color: var(--mat-app-accent);
        transform: translateX(4px);
      }

      &.sign-out {
        color: #ef4444;
        border-top: 1px solid var(--mat-app-glass-border);

        &:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
      }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--mat-app-glass-border);
      margin: 8px 0;
    }    /* Mobile Responsive */
    @media (max-width: 768px) {
      .chat-header {
        padding: 12px 16px;
        min-height: 64px;
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

      .user-dropdown {
        right: -8px;
        min-width: 200px;
      }
    }

    @media (max-width: 480px) {
      .header-left {
        gap: 12px;
      }

      .conversation-title {
        font-size: 18px;
      }

      .header-right {
        gap: 12px;
      }

      .avatar-circle {
        width: 38px;
        height: 38px;
      }
    }

    /* Custom scrollbar for dropdown */
    .user-dropdown {
      scrollbar-width: thin;
      scrollbar-color: var(--mat-app-accent-hover) transparent;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--mat-app-accent-hover);
        border-radius: 2px;
        
        &:hover {
          background: var(--mat-app-accent);
        }
      }
    }
  `]
})
export class ChatHeaderComponent implements OnInit {
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
  readonly sortedModels = computed(() => {
    const models = this.availableModels();
    
    // Sort models: Gemma 3:4b first, then available models, then unavailable models
    return [...models].sort((a, b) => {
      // Gemma 3:4b always first
      if (a.id === 'gemma3:4b') return -1;
      if (b.id === 'gemma3:4b') return 1;
      
      // Then sort by availability
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });
  });
  
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
    const newModelId = target.value;
    
    console.log('[ChatHeader] 🔄 Model changed to:', newModelId);
    this.modelChanged.emit(newModelId);
  }
  
  /**
   * Angular lifecycle hook - After component is initialized
   * Ensures Gemma 3:4b is selected by default
   */
  ngOnInit(): void {
    // Check if Gemma 3:4b is available and select it by default if no model is selected
    setTimeout(() => {
      const currentSelection = this.selectedModel();
      const models = this.availableModels();
      
      if ((!currentSelection || currentSelection === 'deepseek-r1:7b') && models.length > 0) {
        const gemmaModel = models.find(m => m.id === 'gemma3:4b');
        
        if (gemmaModel) {
          console.log('[ChatHeader] 🔄 Auto-selecting Gemma 3:4b as default model');
          this.modelChanged.emit('gemma3:4b');
        }
      }
    }, 100); // Small delay to ensure models are loaded
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
