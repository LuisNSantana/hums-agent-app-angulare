/**
 * Layout Service for Chat Interface
 *
 * Manages responsive layout, sidebar state, and UI configuration
 * Following Angular 20+ best practices with signals for reactive state
 */

import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  readonly sidebarOpen = signal(true);
  readonly displaySuggestions = signal(false); // Desactivadas por defecto para ahorrar espacio
  
  constructor() {
    // Setup responsive behavior
    this.setupResponsiveBehavior();
  }
  
  /**
   * Sets up responsive layout behavior based on screen size
   */
  private setupResponsiveBehavior(): void {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          this.sidebarOpen.set(false);
        } else {
          this.sidebarOpen.set(true);
        }
      }
    };
    
    // Initial check
    handleResize();
    
    // Add listener for window resize events
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  }
  
  /**
   * Toggles sidebar visibility state
   */
  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
  
  /**
   * Explicitly sets sidebar state
   */
  setSidebarOpen(isOpen: boolean): void {
    this.sidebarOpen.set(isOpen);
  }
  
  /**
   * Hides suggestions (typically after first message)
   */
  hideSuggestions(): void {
    this.displaySuggestions.set(false);
  }
  
  /**
   * Shows suggestions
   */
  showSuggestions(): void {
    this.displaySuggestions.set(true);
  }
  
  /**
   * Gets appropriate placeholder text based on application state
   */
  getInputPlaceholder(isProcessing: boolean, hasActiveConversation: boolean): string {
    if (isProcessing) {
      return 'Agent is thinking...';
    }
    
    if (!hasActiveConversation) {
      return 'Type your message to start a new conversation...';
    }
    
    return 'Type your message...';
  }
}
