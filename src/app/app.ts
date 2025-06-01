import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatService } from './core/services/chat.service';
import { IconService } from './core/services/icon.service';
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
  
  // Initialize the icon service to register custom icons
  private readonly iconService = inject(IconService);
}
