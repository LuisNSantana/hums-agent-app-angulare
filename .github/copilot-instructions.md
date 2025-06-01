# Agent Hums App - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## 🎯 Project Overview

This is a modern Angular 20 chat AI assistant application styled like Claude/GPT. The application features:

- **Zoneless Architecture**: Leveraging Angular 20's zoneless change detection for optimal performance
- **Standalone Components**: Using modern Angular standalone component architecture
- **Server-Side Rendering**: Optimized for SEO and initial load performance
- **Reactive State Management**: Using Angular Signals for state management
- **Clean Architecture**: Following SOLID principles and clean code practices

## 🆕 Angular 20 Syntax and Features

### Control Flow Syntax
- Always use the new Angular 20 control flow syntax instead of structural directives:
  - Replace `*ngIf` with `@if` / `@else` blocks
  - Replace `*ngFor` with `@for` blocks and use `track` identifier
  - Replace `*ngSwitch` with `@switch` / `@case` / `@default` blocks
  - Example:
    ```typescript
    @if (condition) {
      <element>Content</element>
    } @else if (otherCondition) {
      <element>Alternative</element>
    } @else {
      <element>Fallback</element>
    }

    @for (item of items(); track item.id) {
      <element>{{ item.name }}</element>
    }
    ```

### Resource() APIs
- Use the resource() APIs for streamlined asynchronous data handling
- Leverage built-in caching, error handling, and loading states
- Prefer signal-based reactive patterns for data streams
- Follow the AsyncPipe pattern with signals where appropriate

### TypeChecking for Host Bindings
- Utilize the new type checking for host bindings to catch errors early
- Ensure proper type safety in component interactions
- Follow strict typing for all template expressions

### Reactive Forms Arrays with Tracking
- Use the enhanced reactive form arrays with tracking capabilities
- Implement efficient change tracking for form arrays
- Leverage the improved type safety in forms

### Image and Multimedia Handling
- Implement proper image attachment handling for multimodal AI interactions
- Use the clipboard API for image pasting functionality
- Ensure proper error handling for file uploads and media processing
- Handle base64 encoding/decoding efficiently

## 🖼️ Multimodal Image Support

### Image Handling Patterns
- Implement clipboard paste support for all input components:
  ```typescript
  // Example clipboard paste implementation
  onPaste(event: ClipboardEvent): void {
    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems) return;
    
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) this.handleImageAttachment(file);
      }
    }
  }
  
  private async handleImageAttachment(file: File): Promise<void> {
    try {
      // Convert image to base64 for AI processing
      const base64 = await this.fileToBase64(file);
      
      // Create attachment object with proper typing
      const attachment: ChatAttachment = {
        id: crypto.randomUUID(),
        name: file.name || `pasted-image-${Date.now()}.png`,
        type: 'image',
        size: file.size,
        mimeType: file.type,
        base64: base64,
        url: URL.createObjectURL(file) // For preview
      };

      // Add to attachment collection
      this.currentAttachments.update(attachments => [...attachments, attachment]);
    } catch (error) {
      console.error('[Component] Error processing image:', error);
    }
  }
  ```

### Attachment Visualization
- Design consistent attachment previews in messages:
  ```html
  <!-- Example attachment display pattern -->
  @if (attachments().length > 0) {
    <div class="message-attachments">
      @for (attachment of attachments(); track attachment.id) {
        <div class="attachment-container">
          @if (attachment.type === 'image' && attachment.url) {
            <img 
              [src]="attachment.url"
              [alt]="attachment.name"
              class="attachment-image"
              loading="lazy" />
          }
          <div class="attachment-info">
            <span class="attachment-name">{{ attachment.name }}</span>
            <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
          </div>
        </div>
      }
    </div>
  }
  ```

### Image Processing
- Implement proper image resizing and optimization
- Add validation for image types and sizes
- Create reusable utility for base64 conversion:
  ```typescript
  // Utility for file to base64 conversion
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
  ```

### Metadata Handling
- Ensure safe handling of optional metadata in message types:
  ```typescript
  // Example safe metadata access pattern
  export interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    conversationId: string;
    metadata?: ChatMessageMetadata; // Optional metadata
  }

  export interface ChatMessageMetadata {
    model?: string;
    attachments?: ChatAttachment[]; // Optional attachments
  }

  // Safe access with optional chaining
  const hasAttachments = message.metadata?.attachments?.length > 0;
  ```

## 🔄 Control Flow Best Practices

### Angular 20 Control Flow
- Always use the new control flow syntax for better performance and type safety:

```typescript
// Avoid structural directives
// ❌ <div *ngIf="isLoading">Loading...</div>
// ❌ <div *ngFor="let item of items">{{item.name}}</div>

// Use control flow blocks instead
// ✅ @if block
@if (isLoading()) {
  <div class="loading-indicator">Loading...</div>
} @else {
  <div class="content">Content loaded</div>
}

// ✅ @for block with tracking
@for (item of items(); track item.id) {
  <div class="item">{{ item.name }}</div>
} @empty {
  <div class="no-items">No items available</div>
}

// ✅ @switch block
@switch (status()) {
  @case ('loading') {
    <loading-spinner />
  }
  @case ('error') {
    <error-message [error]="error()" />
  }
  @default {
    <data-display [data]="data()" />
  }
}
```

### Enhanced Signal Patterns
- Use computed signals for derived state:
```typescript
const items = signal<Item[]>([]);
const selectedItem = signal<Item | null>(null);

// Computed signal based on other signals
const hasItems = computed(() => items().length > 0);
const canDeleteItem = computed(() => selectedItem() !== null);
```

- Use effect() for side effects:
```typescript
effect(() => {
  // This runs whenever itemCount changes
  const count = itemCount();
  if (count > 10) {
    this.updatePagination();
  }
}, { allowSignalWrites: true });
```

## 🚀 Performance Optimization

### Angular 20 Performance Enhancements
- Use the optimized Ivy compiler features for faster load times and reduced memory consumption
- Implement zoneless change detection pattern where possible
- Utilize component-level signal-based reactivity
- Avoid unnecessary template expressions and function calls
- Use OnPush change detection strategy consistently
- Leverage the improved template parsing for better performance

### Lazy Loading
- Implement comprehensive lazy loading strategy for feature modules
- Use dynamic imports for code splitting
- Preload critical modules for better UX
- Apply route-level code splitting

### Rendering Optimization
- Minimize DOM operations with trackBy functions
- Use pure pipes for computed values in templates
- Implement virtual scrolling for large lists
- Optimize template expressions and bindings
- Use smart data fetching strategies with resource() APIs

## 🏗️ Architecture Guidelines

### Component Structure
- Use standalone components with OnPush change detection strategy
- Implement reactive patterns with Angular Signals
- Follow single responsibility principle for each component
- Use dependency injection for service communication

### Styling Approach
- SCSS with BEM methodology for maintainable styles
- Modern responsive design with mobile-first approach
- Dark/light theme support
- Smooth animations and transitions

### State Management
- Angular Signals for reactive state management
- Service-based state management pattern
- Immutable data handling
- Efficient change detection

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive unit testing with Jest
- E2E testing with Cypress
- Proper error handling and logging

## 🤖 AI Chat Features

The application should implement:

1. **Chat Interface**: Modern, clean chat UI with message bubbles
2. **Message Streaming**: Real-time message streaming simulation
3. **Conversation History**: Persistent conversation storage
4. **Message Types**: Support for text, code blocks, and markdown
5. **User Experience**: Typing indicators, auto-scroll, and responsive design

## 📋 Development Guidelines

### File Naming Conventions
- Components: `chat-interface.component.ts`
- Services: `chat.service.ts`
- Models: `message.model.ts`
- Guards: `auth.guard.ts`

### Import Organization
1. Angular core imports
2. Angular common imports
3. Third-party library imports
4. Internal service imports
5. Internal component imports
6. Models and interfaces

### Error Handling
- Implement global error handling
- User-friendly error messages
- Proper loading states
- Network error recovery

## 🎨 Design System

### Angular Material Integration
- Use Angular Material as the primary UI component library
- Follow Material Design guidelines for visual consistency
- Utilize the shared MaterialModule for component imports
- Customize the Material theme to match brand identity
- Example configuration:
  ```typescript
  // material.module.ts
  import { NgModule } from '@angular/core';
  import { MatButtonModule } from '@angular/material/button';
  import { MatCardModule } from '@angular/material/card';
  import { MatIconModule } from '@angular/material/icon';
  // ... other imports

  @NgModule({
    exports: [
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      // ... other modules
    ]
  })
  export class MaterialModule { }
  ```

### Theme Customization
- Create a custom theme using Angular Material's theming system
- Define primary, accent, and warn color palettes
- Set up typography scales for consistent text styling
- Example:
  ```scss
  // Custom theme definition
  @use '@angular/material' as mat;

  // Define custom palettes
  $app-primary: mat.define-palette(mat.$indigo-palette, 500);
  $app-accent: mat.define-palette(mat.$pink-palette, A200, A100, A400);
  $app-warn: mat.define-palette(mat.$red-palette);

  // Create light theme
  $app-light-theme: mat.define-light-theme((
    color: (
      primary: $app-primary,
      accent: $app-accent,
      warn: $app-warn,
    ),
    typography: mat.define-typography-config(),
    density: 0,
  ));

  // Create dark theme
  $app-dark-theme: mat.define-dark-theme((
    color: (
      primary: $app-primary,
      accent: $app-accent,
      warn: $app-warn,
    ),
    typography: mat.define-typography-config(),
    density: 0,
  ));
  ```

### Component Styling Patterns
- Use component-specific SCSS files with scoped styles
- Create shared SCSS variables for colors, spacing, and typography
- Implement CSS custom properties for theme switching
- Follow Material Design elevation system for shadow depths
- Use BEM methodology for custom component styling

### UI Kit Components
- **Layout Components**:
  - Responsive containers with Material breakpoints
  - Grid systems using CSS Grid or Flexbox
  - Card layouts with consistent padding/margins
- **Form Components**:
  - Material form fields with consistent validation styling
  - Custom form controls that implement ControlValueAccessor
  - Form field wrappers with standardized error handling
- **Navigation Components**:
  - App bar with responsive behavior
  - Side navigation with proper state management
  - Breadcrumb navigation with route integration
- **Feedback Components**:
  - Snackbar notifications with consistent styling
  - Dialog modals with standardized actions
  - Progress indicators for async operations

### Visual Standards
- **Primary Colors**: Modern blue/purple gradient theme
- **Typography**: Clean, readable font hierarchy based on Material typography
- **Spacing**: Consistent 8px grid system
- **Elevation**: Material Design elevation levels for shadow depths
- **Icons**: Material icons with consistent sizing and color
- **Animations**: Standard Material animations for transitions
- **Accessibility**: WCAG 2.1 AA compliance with proper contrast ratios

### Accessibility Patterns
- Ensure proper ARIA attributes on all components
- Maintain keyboard navigation support throughout the app
- Use semantic HTML elements with proper roles
- Test with screen readers and accessibility tools
- Follow color contrast guidelines (minimum 4.5:1 for normal text)

### Responsive Design
- Implement mobile-first design approach
- Use Material breakpoints for consistent responsive behavior
- Test on multiple device sizes and orientations
- Optimize touch targets for mobile experiences

## 🏁 Angular 20 Project Setup

### Project Structure
- Follow feature-based folder structure:
  ```
  app/
    ├── core/               # Singleton services, guards, interceptors
    │   ├── config/         # App configuration
    │   ├── guards/         # Route guards
    │   ├── interceptors/   # HTTP interceptors
    │   └── services/       # Core services
    ├── features/          # Feature modules/components
    │   ├── feature-one/
    │   └── feature-two/
    ├── shared/            # Shared components, models, utilities
    │   ├── components/
    │   ├── directives/
    │   ├── models/
    │   ├── pipes/
    │   └── utils/
    └── theme/             # Global styles and themes
  ```

### Application Bootstrap
- Use standalone components throughout the application
- Configure providers with provideX functions:
  ```typescript
  // Example app.config.ts
  export const appConfig: ApplicationConfig = {
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(withInterceptors([
        authInterceptor
      ])),
      provideAnimations(),
      provideClientHydration()
    ]
  };
  ```

### Component Setup
- Use the new input/output syntax:
  ```typescript
  @Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `...`
  })
  export class UserProfileComponent {
    user = input<User>(); // Input
    userChange = output<User>(); // Output
  
    // Required input with default value
    role = input.required<string>({ alias: 'userRole' });
  
    // Model input with transform function
    lastLogin = model<Date>(new Date());
  }
  ```

### New Projects Checklist
- Initialize with standalone components:
  ```bash
  ng new my-app --standalone --routing --style=scss
  ```
- Set strict TypeScript configuration
- Configure Material theme early
- Set up proper linting rules
- Create consistent folder structure
- Document architectural decisions
- Set up testing framework
- Configure CI/CD pipeline

### Migration Strategy
- Start with newest components first
- Replace structural directives with control flow syntax
- Move to dependency injection via inject()
- Replace class-based services with functional services where appropriate
- Update component inputs/outputs to new syntax
- Implement proper signal patterns for state

## 🚀 Application Performance

### Rendering Optimization
- Use OnPush change detection by default
- Avoid direct DOM manipulation
- Use trackBy functions for lists:
  ```typescript
  @for (item of items(); track trackByFn(item)) {
    <app-item [item]="item" />
  }
  
  // In component class
  trackByFn(item: Item): string {
    return item.id;
  }
  ```

### Bundle Optimization
- Lazy load all feature modules
- Use proper code splitting
- Implement preloading strategies
- Configure proper build optimization
- Set up route-level code splitting
- Use component lazy loading where applicable

### Signal-based Performance
- Keep signal graphs small and focused
- Avoid unnecessary signal dependencies
- Use untracked() for non-reactive operations
- Apply batch updates when needed
- Profile signal operations for optimization

### Memory Management
- Clean up subscriptions and references
- Use the takeUntilDestroyed operator
- Implement proper OnDestroy patterns
- Avoid memory leaks in event handlers
- Unsubscribe from long-lived observables
