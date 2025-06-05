// chat-message.component.ts
import { 
  Component, 
  input, 
  output, 
  ChangeDetectionStrategy,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../shared/models/chat.models';
import { AuthService } from '../../core/services/auth/auth.service';
import { MessageAvatarComponent } from './components/message-avatar/message-avatar.component';
import { MessageContentComponent } from './components/message-content/message-content.component';
import { MessageAttachmentsComponent } from './components/message-attachments/message-attachments.component';
import { MessageFormatterService } from './services/message-formatter.service';
import { MessageAction, MessageActionType } from '../chat-messages/chat-messages.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [
    CommonModule,
    MessageAvatarComponent,
    MessageContentComponent,
    MessageAttachmentsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message" [class]="messageClasses()">
      <!-- Message Avatar -->
      <app-message-avatar
        [role]="message().role"
        [avatarUrl]="currentUser()?.avatarUrl ?? null"
        [displayName]="currentUser()?.displayName ?? null"
        [email]="currentUser()?.email ?? null">
      </app-message-avatar>

      <div class="message-content-container">
        <!-- Message Content -->
        <app-message-content
          [message]="message()"
          [showMetadata]="showMetadata()"
          (actionTriggered)="onAction($event)">
        </app-message-content>

        <!-- Message Attachments -->
        @if (message().metadata?.attachments?.length) {
          <app-message-attachments
            [attachments]="message().metadata?.attachments ?? []"
            class="message-attachments">
          </app-message-attachments>
        }
      </div>
    </div>
  `,
  styles: [`
    .message {
      display: flex;
      gap: 16px;
      width: 100%;
      animation: slideInUp 0.4s ease-out;
      margin-bottom: 8px;
    }

    .message-content-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      max-width: calc(100% - 56px);
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message.assistant .message-content {
      align-items: flex-start;
    }

    .message.user .message-content {
      align-items: flex-end;
    }

    .message-attachments {
      margin-top: 8px;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .message {
        gap: 12px;
      }
    }

    @media (max-width: 480px) {
      .message {
        gap: 8px;
      }
    }
  `]
})
export class ChatMessageComponent {
  // Services
  private readonly authService = inject(AuthService);
  private readonly formatter = inject(MessageFormatterService);

  // Inputs
  readonly message = input.required<ChatMessage>();
  readonly showMetadata = input(false);

  // Outputs con tipado estricto
  readonly messageAction = output<MessageAction>();

  // Computed properties
  readonly currentUser = computed(() => this.authService.user() || null);

  readonly messageClasses = computed(() => {
    const msg = this.message();
    return {
      [msg.role]: true,
      'streaming': msg.isStreaming,
      'error': msg.isError
    };
  });

  // Handle actions from child components
  onAction(event: { type: string; messageId: string; data?: unknown }): void {
    // Validar que el tipo sea compatible con MessageActionType
    this.messageAction.emit({
      type: event.type as MessageActionType, 
      messageId: event.messageId,
      data: event.data
    });
  }
}