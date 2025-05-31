import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatService } from './core/services/chat.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  providers: [ChatService],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'agent-hums-app';
}
