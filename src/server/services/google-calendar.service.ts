/**
 * Google Calendar Service
 * Servicio para interactuar con la API de Google Calendar
 */

import { google } from 'googleapis';
import type { CalendarEvent } from '../types';

export class GoogleCalendarService {
  /**
   * Debug function to test Google Calendar API connection
   */
  async testApiConnection(accessToken: string) {
    console.log('🔬 Testing Google Calendar API Connection...', { 
      hasAccessToken: !!accessToken,
      tokenLength: accessToken?.length,
      tokenPrefix: accessToken?.substring(0, 10) + '...'
    });
    
    try {
      if (!accessToken) {
        throw new Error('No access token provided');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });

      // Test 1: Basic calendar info
      console.log('🔬 Test 1: Getting calendar info...');
      const calendarInfo = await calendar.calendars.get({
        calendarId: 'primary'
      });
      console.log('✅ Calendar info retrieved successfully:', {
        id: calendarInfo.data.id,
        summary: calendarInfo.data.summary,
        timeZone: calendarInfo.data.timeZone
      });

      // Test 2: Simple events list
      console.log('🔬 Test 2: Simple events list...');
      const now = new Date();
      const simpleEventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        maxResults: 1,
        singleEvents: true,
        orderBy: 'startTime'
      });
      console.log('✅ Simple events list successful:', {
        itemsCount: simpleEventsResponse.data.items?.length || 0
      });

      return { 
        success: true, 
        message: 'Google Calendar API connection test successful',
        calendarInfo: {
          id: calendarInfo.data.id,
          summary: calendarInfo.data.summary,
          timeZone: calendarInfo.data.timeZone
        },
        eventsCount: simpleEventsResponse.data.items?.length || 0
      };
    } catch (error: any) {
      console.error('❌ Google Calendar API Test Failed:', {
        message: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? 'present' : 'missing'
        }
      });
      
      return { 
        success: false, 
        error: error.message,
        details: {
          code: error.code,
          status: error.status,
          statusText: error.statusText,
          responseData: error.response?.data
        }
      };
    }
  }
  async listEvents(
    accessToken: string,
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 10
  ) {
    console.log('🔧 Service Execution: listGoogleCalendarEvents', { 
      calendarId, 
      timeMin, 
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google. Por favor verifica que Google Calendar esté conectado en la sección de integraciones.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });

      // Create RFC3339 timestamps with timezone offset (required by Google Calendar API)
      const now = new Date();
      const formatRFC3339 = (date: Date): string => {
        // Get timezone offset in minutes and convert to hours:minutes format
        const offset = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? '+' : '-';
        const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
        
        // Format date as YYYY-MM-DDTHH:mm:ss followed by timezone offset
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
      };

      const defaultTimeMin = formatRFC3339(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      const defaultTimeMax = formatRFC3339(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));      console.log('📅 Using RFC3339 timestamps:', { 
        defaultTimeMin, 
        defaultTimeMax,
        inputTimeMin: timeMin,
        inputTimeMax: timeMax
      });

      // Ensure timeMin and timeMax are in proper RFC3339 format
      let finalTimeMin = timeMin || defaultTimeMin;
      let finalTimeMax = timeMax || defaultTimeMax;

      // Validate and fix timeMin/timeMax if they're just dates (YYYY-MM-DD)
      if (finalTimeMin && !finalTimeMin.includes('T')) {
        const startDate = new Date(finalTimeMin);
        startDate.setHours(0, 0, 0, 0);
        finalTimeMin = startDate.toISOString();
        console.log('📅 Fixed timeMin format:', { original: timeMin, fixed: finalTimeMin });
      }

      if (finalTimeMax && !finalTimeMax.includes('T')) {
        const endDate = new Date(finalTimeMax);
        endDate.setHours(23, 59, 59, 999);
        finalTimeMax = endDate.toISOString();
        console.log('📅 Fixed timeMax format:', { original: timeMax, fixed: finalTimeMax });
      }

      const response = await calendar.events.list({
        calendarId,
        timeMin: finalTimeMin,
        timeMax: finalTimeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });const events: CalendarEvent[] = response.data.items?.map(event => ({
        id: event.id || '',
        title: event.summary || 'No Title',
        description: event.description || undefined,
        startDateTime: event.start?.dateTime || event.start?.date || '',
        endDateTime: event.end?.dateTime || event.end?.date || '',
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => attendee.email || '') || undefined,
        htmlLink: event.htmlLink || undefined
      })) || [];

      return { success: true, events };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      return this.handleCalendarError(error);
    }
  }

  async createEvent(
    accessToken: string,
    summary: string,
    startDateTime: string,
    endDateTime: string,
    calendarId: string = 'primary',
    description?: string,
    location?: string,
    timeZone: string = 'America/Mexico_City',
    attendees?: string[],
    sendNotifications: boolean = true
  ) {
    console.log('🔧 Service Execution: createGoogleCalendarEvent', { 
      summary, 
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });

      const eventData: any = {
        summary,
        description,
        location,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone }
      };

      if (attendees && attendees.length > 0) {
        eventData.attendees = attendees.map((email: string) => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
        sendUpdates: sendNotifications ? 'all' : 'none'
      });

      return {
        success: true,
        event: {
          id: response.data.id || undefined,
          summary: response.data.summary || undefined,
          htmlLink: response.data.htmlLink || undefined
        }
      };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      return this.handleCalendarError(error);
    }
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    calendarId: string = 'primary',
    summary?: string,
    description?: string,
    location?: string,
    startDateTime?: string,
    endDateTime?: string,
    timeZone: string = 'America/Mexico_City',
    attendees?: string[],
    sendNotifications: boolean = true
  ) {
    console.log('🔧 Service Execution: updateGoogleCalendarEvent', { 
      eventId, 
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });

      // Get current event
      const currentEvent = await calendar.events.get({
        calendarId,
        eventId
      });

      const eventData: any = {
        summary: summary || currentEvent.data.summary || undefined,
        description: description !== undefined ? description : (currentEvent.data.description || undefined),
        location: location !== undefined ? location : (currentEvent.data.location || undefined),
        start: {
          dateTime: startDateTime || (currentEvent.data.start?.dateTime || ''),
          timeZone: timeZone || (currentEvent.data.start?.timeZone || 'America/Mexico_City')
        },
        end: {
          dateTime: endDateTime || (currentEvent.data.end?.dateTime || ''),
          timeZone: timeZone || (currentEvent.data.end?.timeZone || 'America/Mexico_City')
        }
      };

      if (attendees) {
        eventData.attendees = attendees.map((email: string) => ({ email }));
      }

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData,
        sendUpdates: sendNotifications ? 'all' : 'none'
      });

      return {
        success: true,
        event: {
          id: response.data.id || undefined,
          summary: response.data.summary || undefined,
          htmlLink: response.data.htmlLink || undefined
        }
      };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      return this.handleCalendarError(error);
    }
  }

  async deleteEvent(
    accessToken: string,
    eventId: string,
    calendarId: string = 'primary',
    sendNotifications: boolean = true
  ) {
    console.log('🔧 Service Execution: deleteGoogleCalendarEvent', { 
      eventId, 
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: sendNotifications ? 'all' : 'none'
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      return this.handleCalendarError(error);
    }
  }

  private handleCalendarError(error: any) {
    if (error.code === 401) {
      return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
    } else if (error.code === 403) {
      return { success: false, error: 'Error de permisos: No tienes autorización para acceder a este calendario.' };
    } else if (error.code === 404) {
      return { success: false, error: 'Error: Calendario o evento no encontrado.' };
    }
    
    return { success: false, error: `Error en Calendar API: ${error.message}` };
  }
}
