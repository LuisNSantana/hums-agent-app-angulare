# Agent Hums App - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## 🎯 Project Overview

This is a modern Angular 20 chat AI assistant application styled like Claude/GPT. The application features:

- **Zoneless Architecture**: Leveraging Angular 20's zoneless change detection for optimal performance
- **Standalone Components**: Using modern Angular standalone component architecture
- **Server-Side Rendering**: Optimized for SEO and initial load performance
- **Reactive State Management**: Using Angular Signals for state management
- **Clean Architecture**: Following SOLID principles and clean code practices

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

- **Primary Colors**: Modern blue/purple gradient theme
- **Typography**: Clean, readable font hierarchy
- **Spacing**: Consistent 8px grid system
- **Components**: Reusable UI component library
- **Accessibility**: WCAG 2.1 AA compliance

## 🧪 Testing Strategy

- Unit tests for all services and utilities
- Component testing with Angular Testing Library
- Integration tests for user workflows
- Visual regression testing
- Performance testing and monitoring

Remember to follow the established patterns and maintain consistency throughout the codebase.
