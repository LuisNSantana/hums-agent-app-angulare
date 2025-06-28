import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-google-calendar-icon',
  standalone: true,
  template: `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 48 48" 
      [attr.width]="size + 'px'" 
      [attr.height]="size + 'px'"
      class="google-icon">
      <rect width="36" height="36" x="6" y="6" fill="#fff"/>
      <path fill="#1e88e5" d="M42,12v24c0,3.314-2.686,6-6,6H12c-3.314,0-6-2.686-6-6V12c0-3.314,2.686-6,6-6h24C39.314,6,42,8.686,42,12z"/>
      <path fill="#fafafa" d="M36,14H12v20h24V14z"/>
      <path fill="#e53935" d="M28.8,18h-1.6v6.399h1.6V18z"/>
      <path fill="#e53935" d="M20.8,18h-1.6v6.399h1.6V18z"/>
      <path fill="#e53935" d="M29.21,30.76l-1.6-1.28l-4.481,5.12l1.6,1.28L29.21,30.76z"/>
      <path fill="#e53935" d="M22.39,22.4l-1.6-1.28l-4.481,5.12l1.6,1.28L22.39,22.4z"/>
    </svg>
  `,
  styles: [`
    .google-icon {
      display: block;
    }
  `]
})
export class GoogleCalendarIconComponent {
  @Input() size = 48;
}
