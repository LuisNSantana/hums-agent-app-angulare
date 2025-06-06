/**
 * Google Calendar Tool - Genkit Compatible
 * Create, manage and query calendar events through Google Calendar API
 */

import { z } from 'zod';
import { google } from 'googleapis';
import { 
  Tool, 
  ToolCategory, 
  ToolExample, 
  GenkitToolResult 
} from '../../../core/interfaces';

// Google Calendar API Configuration
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// Input/Output Schemas
const CreateEventSchema = z.object({
  title: z.string().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  startTime: z.string().describe('Start time in ISO format (e.g., 2025-06-03T14:00:00Z)'),
  endTime: z.string().describe('End time in ISO format'),
  location: z.string().optional().describe('Event location'),
  attendees: z.array(z.string().email()).optional().describe('Email addresses of attendees'),
  calendarId: z.string().default('primary').describe('Calendar ID (default: primary)'),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number().min(0).max(40320), // Max 4 weeks
  })).optional(),
});

const ListEventsSchema = z.object({
  calendarId: z.string().default('primary'),
  timeMin: z.string().optional().describe('Lower bound for events start time (ISO format)'),
  timeMax: z.string().optional().describe('Upper bound for events start time (ISO format)'),
  maxResults: z.number().min(1).max(250).default(10),
  query: z.string().optional().describe('Free text search query'),
});

const UpdateEventSchema = z.object({
  eventId: z.string().describe('Google Calendar event ID'),
  calendarId: z.string().default('primary'),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
});

const DeleteEventSchema = z.object({
  eventId: z.string().describe('Google Calendar event ID'),
  calendarId: z.string().default('primary'),
});

import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { firstValueFrom } from 'rxjs';

export class GoogleCalendarTool implements Tool {
  public readonly id = 'google-calendar';
  public readonly name = 'Google Calendar Manager';
  public readonly description = 'Create, manage and query calendar events through Google Calendar API';
  public readonly category = ToolCategory.CALENDAR;
  public readonly version = '1.0.0';
  public readonly author = 'HumsAI Agent';
  public readonly tags = ['google', 'calendar', 'events', 'scheduling', 'meetings'];
  public readonly requirements = ['GOOGLE_CALENDAR_API_KEY', 'OAuth2 credentials'];

  public readonly schema = z.union([
    CreateEventSchema.extend({ action: z.literal('create') }),
    ListEventsSchema.extend({ action: z.literal('list') }),
    UpdateEventSchema.extend({ action: z.literal('update') }),
    DeleteEventSchema.extend({ action: z.literal('delete') }),
  ]);

  public readonly examples: ToolExample[] = [
    {
      input: {
        action: 'create',
        title: 'Team Meeting',
        description: 'Weekly team sync meeting',
        startTime: '2025-06-04T14:00:00Z',
        endTime: '2025-06-04T15:00:00Z',
        location: 'Conference Room A',
        attendees: ['john@example.com', 'jane@example.com'],
        reminders: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 15 },
        ],
      },
      output: {
        success: true,
        data: {
          eventId: 'abc123xyz',
          title: 'Team Meeting',
          startTime: '2025-06-04T14:00:00Z',
          endTime: '2025-06-04T15:00:00Z',
          htmlLink: 'https://calendar.google.com/event?eid=abc123xyz',
        },
      },
      description: 'Create a team meeting with attendees and reminders',
    },
    {
      input: {
        action: 'list',
        timeMin: '2025-06-03T00:00:00Z',
        timeMax: '2025-06-10T23:59:59Z',
        maxResults: 5,
      },
      output: {
        success: true,
        data: {
          events: [
            {
              id: 'abc123xyz',
              title: 'Team Meeting',
              start: '2025-06-04T14:00:00Z',
              end: '2025-06-04T15:00:00Z',
            }
          ],
        },
      },
      description: 'List events for the current week',
    },
  ];

  private calendar: any;
  private auth: any;
  private readonly authService = inject(AuthService);
  private readonly integrationsService = inject(IntegrationsService);

  /**
   * Inicialización mínima para cumplir la interfaz Tool
   */
  async initialize(): Promise<boolean> {
    try {
      await this.initializeCalendarClient();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Initialize Google Calendar API client with secure credentials
   */
  private async initializeCalendarClient(): Promise<void> {
    const credentials = await this.getStoredCredentials();
    if (!credentials?.access_token) {
      throw new Error('Google Calendar not connected. Please connect your account.');
    }
    this.auth = new google.auth.OAuth2({
      clientId: environment.googleClientId,
      // clientSecret is not used in client-side OAuth flows
      // redirectUri is also typically handled by the client-side auth flow (GIS)
    });
    this.auth.setCredentials(credentials);
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * Execute Google Calendar operations
   */
  async execute(params: any): Promise<GenkitToolResult> {
    try {
      // Validar usuario autenticado
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated. Please sign in to use Google Calendar.' };
      }
      // Validar conexión activa usando integrationStatus$
      const status = await firstValueFrom(this.integrationsService.integrationStatus$);
      if (!status?.googleCalendarConnected) {
        return { success: false, error: 'Google Calendar is not connected. Please connect your account.' };
      }
      // Inicializar cliente
      if (!this.calendar) {
        await this.initializeCalendarClient();
      }
      // Validar y despachar acción
      const validatedParams = this.schema.parse(params);
      switch (validatedParams.action) {
        case 'create':
          return await this.createEvent(validatedParams);
        case 'list':
          return await this.listEvents(validatedParams);
        case 'update':
          return await this.updateEvent(validatedParams);
        case 'delete':
          return await this.deleteEvent(validatedParams);
        default:
          return { success: false, error: `Unknown action: ${(validatedParams as any).action}` };
      }
    } catch (error) {
      console.error('[GoogleCalendarTool] Execution error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Define Genkit tool for registration
   */
  defineGenkitTool(): any {
    return {
      name: this.id,
      description: this.description,
      inputSchema: this.schema,
      outputSchema: z.object({
        success: z.boolean(),
        data: z.any().optional(),
        error: z.string().optional(),
      }),
    };
  }

  /**
   * Create a new calendar event
   */
  private async createEvent(params: z.infer<typeof CreateEventSchema>): Promise<GenkitToolResult> {
    try {
      const event = {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: params.endTime,
          timeZone: 'UTC',
        },
        attendees: params.attendees?.map(email => ({ email })),
        reminders: params.reminders ? {
          useDefault: false,
          overrides: params.reminders,
        } : undefined,
      };

      const response = await this.calendar.events.insert({
        calendarId: params.calendarId,
        resource: event,
        sendUpdates: 'all',
      });

      const createdEvent = response.data;

      return {
        success: true,
        data: {
          eventId: createdEvent.id,
          title: createdEvent.summary,
          startTime: createdEvent.start?.dateTime,
          endTime: createdEvent.end?.dateTime,
          location: createdEvent.location,
          htmlLink: createdEvent.htmlLink,
          attendees: createdEvent.attendees?.map((a: any) => a.email),
        },
      };
    } catch (error) {
      throw new Error(`Event creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List calendar events
   */
  private async listEvents(params: z.infer<typeof ListEventsSchema>): Promise<GenkitToolResult> {
    try {
      const response = await this.calendar.events.list({
        calendarId: params.calendarId,
        timeMin: params.timeMin || new Date().toISOString(),
        timeMax: params.timeMax,
        maxResults: params.maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        q: params.query,
      });

      const events = response.data.items || [];

      return {
        success: true,
        data: {
          events: events.map((event: any) => ({
            id: event.id,
            title: event.summary,
            description: event.description,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            location: event.location,
            htmlLink: event.htmlLink,
            attendees: event.attendees?.map((a: any) => a.email),
          })),
          totalCount: events.length,
        },
      };
    } catch (error) {
      throw new Error(`List events failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing event
   */
  private async updateEvent(params: z.infer<typeof UpdateEventSchema>): Promise<GenkitToolResult> {
    try {
      // First get the existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: params.calendarId,
        eventId: params.eventId,
      });

      // Prepare update data
      const updateData: any = { ...existingEvent.data };

      if (params.title) updateData.summary = params.title;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.location !== undefined) updateData.location = params.location;
      if (params.startTime) {
        updateData.start = { dateTime: params.startTime, timeZone: 'UTC' };
      }
      if (params.endTime) {
        updateData.end = { dateTime: params.endTime, timeZone: 'UTC' };
      }

      const response = await this.calendar.events.update({
        calendarId: params.calendarId,
        eventId: params.eventId,
        resource: updateData,
        sendUpdates: 'all',
      });

      const updatedEvent = response.data;

      return {
        success: true,
        data: {
          eventId: updatedEvent.id,
          title: updatedEvent.summary,
          startTime: updatedEvent.start?.dateTime,
          endTime: updatedEvent.end?.dateTime,
          location: updatedEvent.location,
          htmlLink: updatedEvent.htmlLink,
        },
      };
    } catch (error) {
      throw new Error(`Event update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  private async deleteEvent(params: z.infer<typeof DeleteEventSchema>): Promise<GenkitToolResult> {
    try {
      await this.calendar.events.delete({
        calendarId: params.calendarId,
        eventId: params.eventId,
        sendUpdates: 'all',
      });

      return {
        success: true,
        data: {
          eventId: params.eventId,
          message: 'Event deleted successfully',
        },
      };
    } catch (error) {
      throw new Error(`Event deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stored OAuth2 credentials securely from IntegrationsService
   */
  private async getStoredCredentials(): Promise<any> {
    return await this.integrationsService.getGoogleCalendarCredentials();
  }

  /**
   * Verifica si el usuario tiene Google Calendar conectado (vía IntegrationsService)
   */
  private async isCalendarConnected(): Promise<boolean> {
    try {
      const status = await firstValueFrom(this.integrationsService.integrationStatus$);
      return !!status?.googleCalendarConnected;
    } catch (error) {
      console.error('[GoogleCalendarTool] Error checking calendar connection:', error);
      return false;
    }
  }
}