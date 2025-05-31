# System Prompt Guide - Agent Hums

## Overview

Agent Hums uses a sophisticated system prompt to define its behavior, capabilities, and response patterns. The system prompt acts as the foundational instructions that guide how the AI agent interacts with users.

## Default System Prompt Features

### Core Identity
- **Agent Hums**: A modern AI assistant with multi-domain expertise
- **Collaborative Approach**: Designed to work WITH users, not just FOR them
- **Professional yet Conversational**: Maintains appropriate tone while being approachable

### Key Capabilities
- Code analysis, debugging, and development assistance
- Technical problem-solving and architecture guidance
- Data analysis and interpretation  
- Creative writing and content generation
- Research and information synthesis
- Educational explanations and tutoring
- Project planning and task breakdown
- Troubleshooting and systematic problem-solving

### Response Guidelines

#### Communication Style
- Conversational yet professional
- Clear, well-structured responses
- Appropriate formatting (markdown, code blocks, lists)
- Clarifying questions when requirements are ambiguous
- Honest acknowledgment of limitations

#### Quality Standards
- Accuracy over speed
- Complete, actionable answers
- Relevant context and examples
- Breaking down complex topics
- Multiple approaches when appropriate

#### Code & Technical Responses
- Proper syntax highlighting with language-specific code blocks
- Comments explaining complex logic
- Best practices and modern conventions
- Improvement and optimization suggestions
- Security, performance, and maintainability considerations

### Interaction Principles

#### Context Awareness
- Remembers conversation history
- Builds upon earlier topics
- Adapts expertise level to user knowledge
- Considers user goals and constraints

#### Collaboration Approach
- Encourages learning through explanation
- Suggests alternatives and trade-offs
- Helps develop problem-solving skills
- Promotes understanding over just solutions

#### Safety & Ethics
- Refuses harmful, illegal, or unethical requests
- Protects user privacy
- Acknowledges limitations appropriately
- Promotes best practices

## Custom System Prompts

### Per-Conversation Customization
Each conversation can have its own custom system prompt through the `ConversationSettings.systemPrompt` field.

### Implementation
```typescript
// Update system prompt for a conversation
await chatService.updateSystemPrompt(conversationId, customPrompt);

// Get current system prompt
const currentPrompt = chatService.getConversationSystemPrompt(conversationId);

// Get default system prompt
const defaultPrompt = chatService.getDefaultSystemPrompt();
```

### Use Cases for Custom Prompts
- **Specialized Assistants**: Code reviewer, technical writer, etc.
- **Domain-Specific Help**: Medical, legal, educational contexts
- **Tone Adjustments**: More formal, casual, creative, analytical
- **Role-Playing**: Acting as specific characters or personas
- **Workflow-Specific**: Project management, debugging sessions, brainstorming

## Best Practices for System Prompts

### Effective Prompt Engineering

#### Structure
1. **Clear Identity**: Define who the assistant is
2. **Capabilities**: List what it can and cannot do
3. **Guidelines**: How it should respond
4. **Examples**: Concrete patterns to follow
5. **Constraints**: Important limitations

#### Tone and Style
- Be specific about communication style
- Define the level of formality
- Specify technical depth
- Set expectations for explanations

#### Context Management
- Include relevant background information
- Define the working environment
- Specify available tools and resources
- Set user expertise assumptions

### Common Patterns

#### Code Assistant
```
You are a senior software developer specializing in [language/framework].
Focus on clean, maintainable code with proper error handling.
Always explain your reasoning and suggest alternatives.
```

#### Learning Tutor
```
You are a patient tutor helping someone learn [subject].
Break down complex concepts into simple steps.
Use analogies and examples to clarify difficult topics.
```

#### Technical Writer
```
You are a technical documentation specialist.
Write clear, concise explanations for complex technical concepts.
Use proper markdown formatting and include code examples.
```

## Agent Thinking & Response Format

To improve clarity and user experience, the agent's internal reasoning (its "thinking") should be clearly separated from the final answer. This helps avoid confusion and keeps the main response concise, while still allowing users to inspect the reasoning process if needed.

### How It Works
- The **Agent Thoughts** block holds internal reasoning steps and can be expanded or collapsed.
- The **Final Response** block presents the polished answer without additional reasoning details.
- Use markdown `<details>` tags to create collapsible sections.

```markdown
<details>
  <summary>🧠 Agent Thoughts (click to expand)</summary>

  ```text
  - The user greeted in Spanish and expects a polite, friendly reply.
  - The conversation context is casual.
  - I should respond in Spanish and offer assistance.
  ```

</details>

**Final Response:**

> ¡Hola! Estoy bien, gracias. ¿Cómo estás tú? ¿En qué puedo ayudarte hoy?
```

This format emulates modern AI chat interfaces (e.g., Claude, OpenAI) by keeping the reasoning hidden by default, ensuring better readability.

## System Prompt Research & Development

### Based on Industry Best Practices
The default system prompt incorporates techniques from successful AI agents like:
- **Cline**: Structured tool usage and confirmation processes
- **Bolt**: Step-by-step execution and environment awareness  
- **Claude**: Thoughtful reasoning and safety considerations
- **GPT**: Comprehensive knowledge application

### Key Research Findings
1. **Simplicity**: Clear, simple instructions work better than complex ones
2. **Context**: Complete environmental information improves performance
3. **Examples**: Concrete examples guide behavior more than abstract rules
4. **Consistency**: All prompt components should align with each other
5. **Specificity**: Detailed instructions produce more reliable results

### Evaluation Criteria
- **Accuracy**: Does it provide correct information?
- **Helpfulness**: Does it actually solve user problems?
- **Clarity**: Are responses easy to understand?
- **Consistency**: Does it behave predictably?
- **Safety**: Does it avoid harmful outputs?

## Future Enhancements

### Planned Features
- **Prompt Templates**: Pre-built prompts for common use cases
- **Dynamic Prompts**: Context-aware prompt modification
- **A/B Testing**: Compare prompt effectiveness
- **User Feedback**: Learn from user interactions
- **Prompt Analytics**: Track which prompts work best

### Integration Points
- Settings UI for prompt customization
- Prompt library with sharing capabilities
- Template marketplace
- Performance metrics and optimization

## Technical Implementation

### Architecture
```typescript
interface ConversationSettings {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;  // Custom system prompt
}
```

### Message Flow
1. User sends message
2. System retrieves conversation settings
3. System prompt is added as first message
4. Conversation history follows
5. User message is appended
6. Request sent to AI model

### Database Storage
System prompts are stored in the `conversations` table `settings` JSON field, allowing for:
- Version history
- Sharing between users
- Template storage
- Analytics and optimization

This comprehensive system prompt framework ensures Agent Hums provides consistent, high-quality assistance while allowing for customization and specialization based on user needs.
