/**
 * Message Avatar Component
 * Displays user or assistant avatar with fallback options
 */
import { 
  Component, 
  input, 
  computed,
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-avatar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message-avatar" [class]="role()">
      @if (role() === 'user') {
        @if (avatarUrl(); as url) {
          <img 
            [src]="url" 
            [alt]="displayName() || 'User'"
            class="avatar-image"
            (error)="onAvatarError($event)"
          />
        } @else {
          @if (initials(); as userInitials) {
            <span class="avatar-initials">{{ userInitials }}</span>
          } @else {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          }
        }
      } @else {
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
        </svg>
      }
    </div>
  `,
  styles: [`
    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      font-weight: 600;
      box-shadow: var(--mat-app-shadow);
      border: 2px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-initials {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .message-avatar.avatar-error .avatar-image {
      display: none !important;
    }

    .message-avatar.user {
      background: var(--mat-app-gradient-surface);
      color: var(--mat-app-on-surface-variant);
      border: 2px solid var(--mat-app-border-variant);
    }

    .message-avatar.assistant {
      background: var(--mat-app-gradient-primary);
      color: var(--mat-app-on-primary);
    }

    .message-avatar:hover {
      transform: scale(1.05);
      box-shadow: var(--mat-app-shadow-md);
    }

    @media (max-width: 768px) {
      .message-avatar {
        width: 36px;
        height: 36px;
      }
    }

    @media (max-width: 480px) {
      .message-avatar {
        width: 32px;
        height: 32px;
      }
    }
  `]
})
export class MessageAvatarComponent {
  // Inputs
  readonly role = input.required<'user' | 'assistant' | 'system'>();
  readonly avatarUrl = input<string | null>(null);
  readonly displayName = input<string | null>(null);
  readonly email = input<string | null>(null);
  
  // Computed values
  readonly initials = computed(() => {
    if (!this.displayName()) return null;
    
    const name = this.displayName()!;
    const names = name.trim().split(' ');
    
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    } else {
      return names[0].charAt(0).toUpperCase();
    }
    
    return this.email()?.charAt(0).toUpperCase() || null;
  });
  
  // Event handlers
  onAvatarError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
    
    // Force update to show fallback
    const userElement = imgElement.closest('.message-avatar');
    if (userElement) {
      userElement.classList.add('avatar-error');
    }
  }
}
