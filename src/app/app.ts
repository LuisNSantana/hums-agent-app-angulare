import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatService } from './core/services/chat.service';
import { ConfirmationModalWrapperComponent } from './shared/components/confirmation-modal/confirmation-modal-wrapper.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmationModalWrapperComponent],
  providers: [ChatService],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'agent-hums-app';
}
