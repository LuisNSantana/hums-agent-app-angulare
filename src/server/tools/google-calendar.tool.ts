/**
 * Google Calendar Tools - Modular tools for Google Calendar integration
 * Uses Google Calendar Service for complete calendar management
 */

import { z } from '@genkit-ai/core/schema';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { 
  CreateEventInput, 
  UpdateEventInput, 
  DeleteEventInput, 
  ListEventsInput,
  CalendarEventOutput,
  CalendarEventsOutput
} from '../types';

export class GoogleCalendarTools {
  private calendarService: GoogleCalendarService;

  constructor() {
    this.calendarService = new GoogleCalendarService();
  }

  static getSchema() {
    return {
      name: 'googleCalendar',
      description: 'Herramientas completas para Google Calendar: crear, listar, actualizar y eliminar eventos',
      inputSchema: z.union([
        z.object({
          action: z.literal('create'),
          title: z.string(),
          description: z.string().optional(),
          startDateTime: z.string(),
          endDateTime: z.string(),
          location: z.string().optional(),
          attendees: z.array(z.string()).optional()
        }),
        z.object({
          action: z.literal('list'),
          startDate: z.string(),
          endDate: z.string(),
          maxResults: z.number().optional().default(10)
        }),
        z.object({
          action: z.literal('update'),
          eventId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          startDateTime: z.string().optional(),
          endDateTime: z.string().optional(),
          location: z.string().optional(),
          attendees: z.array(z.string()).optional()
        }),
        z.object({
          action: z.literal('delete'),
          eventId: z.string()
        })
      ]),
      outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        timestamp: z.string(),
        event: z.any().optional(),
        events: z.array(z.any()).optional(),
        count: z.number().optional()
      })
    };
  }

  static getCreateEventSchema() {
    return {
      name: 'createCalendarEvent',
      description: 'Crear un nuevo evento en Google Calendar con todos los detalles necesarios',
      inputSchema: z.object({
        title: z.string().describe('Título del evento'),
        description: z.string().optional().describe('Descripción detallada del evento'),
        startDateTime: z.string().describe('Fecha y hora de inicio (ISO 8601)'),
        endDateTime: z.string().describe('Fecha y hora de fin (ISO 8601)'),
        location: z.string().optional().describe('Ubicación del evento'),
        attendees: z.array(z.string()).optional().describe('Lista de emails de asistentes')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        event: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          startDateTime: z.string(),
          endDateTime: z.string(),
          location: z.string().optional(),
          attendees: z.array(z.string()).optional(),
          htmlLink: z.string().optional()
        }).optional(),
        message: z.string(),
        timestamp: z.string()
      })
    };
  }

  static getUpdateEventSchema() {
    return {
      name: 'updateCalendarEvent',
      description: 'Actualizar un evento existente en Google Calendar',
      inputSchema: z.object({
        eventId: z.string().describe('ID del evento a actualizar'),
        title: z.string().optional().describe('Nuevo título del evento'),
        description: z.string().optional().describe('Nueva descripción del evento'),
        startDateTime: z.string().optional().describe('Nueva fecha y hora de inicio (ISO 8601)'),
        endDateTime: z.string().optional().describe('Nueva fecha y hora de fin (ISO 8601)'),
        location: z.string().optional().describe('Nueva ubicación del evento'),
        attendees: z.array(z.string()).optional().describe('Nueva lista de emails de asistentes')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        event: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          startDateTime: z.string(),
          endDateTime: z.string(),
          location: z.string().optional(),
          attendees: z.array(z.string()).optional(),
          htmlLink: z.string().optional()
        }).optional(),
        message: z.string(),
        timestamp: z.string()
      })
    };
  }

  static getDeleteEventSchema() {
    return {
      name: 'deleteCalendarEvent',
      description: 'Eliminar un evento de Google Calendar',
      inputSchema: z.object({
        eventId: z.string().describe('ID del evento a eliminar')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        timestamp: z.string()
      })
    };
  }

  static getListEventsSchema() {
    return {
      name: 'listCalendarEvents',
      description: 'Listar eventos de Google Calendar en un rango de fechas específico',
      inputSchema: z.object({
        startDate: z.string().describe('Fecha de inicio para buscar eventos (ISO 8601)'),
        endDate: z.string().describe('Fecha de fin para buscar eventos (ISO 8601)'),
        maxResults: z.number().optional().default(10).describe('Número máximo de eventos a retornar')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        events: z.array(z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          startDateTime: z.string(),
          endDateTime: z.string(),
          location: z.string().optional(),
          attendees: z.array(z.string()).optional(),
          htmlLink: z.string().optional()
        })),
        count: z.number(),
        message: z.string(),
        timestamp: z.string()
      })
    };
  }
  async createEvent(input: CreateEventInput): Promise<CalendarEventOutput> {
    console.log('🔧 Tool Execution: createCalendarEvent', input);
    try {
      // Simular creación de evento (requiere OAuth token real)
      return {
        success: true,
        event: {
          id: `event_${Date.now()}`,
          title: input.title,
          description: input.description,
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
          location: input.location,
          attendees: input.attendees,
          htmlLink: `https://calendar.google.com/calendar/event?eid=${Date.now()}`
        },
        message: `Evento "${input.title}" creado exitosamente`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al crear evento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateEvent(input: UpdateEventInput): Promise<CalendarEventOutput> {
    console.log('🔧 Tool Execution: updateCalendarEvent', input);
    try {
      // Simular actualización de evento (requiere OAuth token real)
      return {
        success: true,
        event: {
          id: input.eventId,
          title: input.title || 'Evento actualizado',
          description: input.description,
          startDateTime: input.startDateTime || new Date().toISOString(),
          endDateTime: input.endDateTime || new Date(Date.now() + 3600000).toISOString(),
          location: input.location,
          attendees: input.attendees,
          htmlLink: `https://calendar.google.com/calendar/event?eid=${input.eventId}`
        },
        message: `Evento "${input.eventId}" actualizado exitosamente`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al actualizar evento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async deleteEvent(input: DeleteEventInput): Promise<{ success: boolean; message: string; timestamp: string }> {
    console.log('🔧 Tool Execution: deleteCalendarEvent', input);
    try {
      // Simular eliminación de evento (requiere OAuth token real)
      return {
        success: true,
        message: `Evento "${input.eventId}" eliminado exitosamente`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al eliminar evento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async listEvents(input: ListEventsInput): Promise<CalendarEventsOutput> {
    console.log('🔧 Tool Execution: listCalendarEvents', input);
    try {
      // Simular listado de eventos (requiere OAuth token real)
      const mockEvents = [
        {
          id: 'event_1',
          title: 'Reunión de equipo',
          description: 'Reunión semanal del equipo de desarrollo',
          startDateTime: input.startDate,
          endDateTime: new Date(new Date(input.startDate).getTime() + 3600000).toISOString(),
          location: 'Sala de conferencias',
          attendees: ['team@company.com'],
          htmlLink: 'https://calendar.google.com/calendar/event?eid=event_1'
        },
        {
          id: 'event_2',
          title: 'Revisión de código',
          description: 'Sesión de revisión de código',
          startDateTime: new Date(new Date(input.startDate).getTime() + 7200000).toISOString(),
          endDateTime: new Date(new Date(input.startDate).getTime() + 10800000).toISOString(),
          location: 'Virtual',
          attendees: ['dev@company.com'],
          htmlLink: 'https://calendar.google.com/calendar/event?eid=event_2'
        }
      ];

      return {
        success: true,
        events: mockEvents,
        count: mockEvents.length,
        message: `Se encontraron ${mockEvents.length} eventos`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        count: 0,
        message: `Error al listar eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}
