/**
 * Tools Registry - Simplified registry for working server
 * Exports functional mock tools for testing
 */

// Import tool classes first
import { SearchWebTool } from './search-web.tool';
import { DocumentAnalysisTool } from './document-analysis.tool';
import { GoogleCalendarTools } from './google-calendar.tool';
import { GoogleDriveTools } from './google-drive.tool';

// Export tool classes
export { SearchWebTool, DocumentAnalysisTool, GoogleCalendarTools, GoogleDriveTools };

// Tool instances
export const searchWebTool = new SearchWebTool();
export const documentAnalysisTool = new DocumentAnalysisTool();
export const googleCalendarTools = new GoogleCalendarTools();
export const googleDriveTools = new GoogleDriveTools();

// Simplified tool schemas
export const getAllToolSchemas = () => {
  return [
    SearchWebTool.getSchema(),
    DocumentAnalysisTool.getSchema(),
    GoogleCalendarTools.getCreateEventSchema(),
    GoogleCalendarTools.getListEventsSchema(),
    GoogleDriveTools.getListFilesSchema(),
    GoogleDriveTools.getUploadFileSchema()
  ];
};

// Tool execution mapping
export const toolExecutors = {
  searchWeb: searchWebTool.execute.bind(searchWebTool),
  analyzeDocument: documentAnalysisTool.execute.bind(documentAnalysisTool),
  createCalendarEvent: googleCalendarTools.createEvent.bind(googleCalendarTools),
  updateCalendarEvent: googleCalendarTools.updateEvent.bind(googleCalendarTools),
  deleteCalendarEvent: googleCalendarTools.deleteEvent.bind(googleCalendarTools),
  listCalendarEvents: googleCalendarTools.listEvents.bind(googleCalendarTools),
  uploadFileToDrive: googleDriveTools.uploadFile.bind(googleDriveTools),
  listDriveFiles: googleDriveTools.listFiles.bind(googleDriveTools),
  shareDriveFile: googleDriveTools.shareFile.bind(googleDriveTools),
  createDriveFolder: googleDriveTools.createFolder.bind(googleDriveTools)
};
