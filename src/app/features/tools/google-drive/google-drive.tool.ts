/**
 * Google Drive Tool - Genkit Compatible
 * File upload, management and sharing through Google Drive API
 */

import { z } from 'zod';
import { google } from 'googleapis';
import { inject } from '@angular/core';
import { 
  Tool, 
  ToolCategory, 
  ToolExample, 
  GenkitToolResult 
} from '../../../core/interfaces';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { AuthService } from '../../../core/services/auth.service';

// Google Drive API Configuration
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Input/Output Schemas
const UploadFileSchema = z.object({
  fileName: z.string().describe('Name of the file to upload'),
  fileContent: z.string().describe('Base64 encoded file content'),
  mimeType: z.string().describe('MIME type of the file'),
  folderId: z.string().optional().describe('Google Drive folder ID (optional)'),
  makePublic: z.boolean().default(false).describe('Make file publicly accessible'),
});

const ListFilesSchema = z.object({
  query: z.string().optional().describe('Search query for files'),
  maxResults: z.number().min(1).max(100).default(10),
  orderBy: z.enum(['name', 'modifiedTime', 'createdTime', 'size']).default('modifiedTime'),
  mimeType: z.string().optional().describe('Filter by MIME type'),
  folderId: z.string().optional().describe('Search within specific folder'),
});

const ShareFileSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
  email: z.string().email().optional().describe('Email to share with'),
  role: z.enum(['reader', 'writer', 'commenter']).default('reader'),
  makePublic: z.boolean().default(false),
});

const DownloadFileSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
  exportMimeType: z.string().optional().describe('Export MIME type for Google Docs files'),
});

const DeleteFileSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
});

const CreateFolderSchema = z.object({
  name: z.string().describe('Folder name'),
  parentFolderId: z.string().optional().describe('Parent folder ID (optional)'),
});

const MoveFileSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
  newParentId: z.string().describe('New parent folder ID'),
  removeFromParents: z.array(z.string()).optional().describe('Parents to remove from'),
});

const GetFileMetadataSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
  fields: z.string().optional().describe('Specific fields to retrieve'),
});

export class GoogleDriveTool implements Tool {
  public readonly id = 'google-drive';
  public readonly name = 'Google Drive Manager';
  public readonly description = 'Upload, manage and share files through Google Drive API with full integration support';
  public readonly category = ToolCategory.FILE_MANAGEMENT;
  public readonly version = '2.0.0';
  public readonly author = 'HumsAI Agent';
  public readonly tags = ['google', 'drive', 'files', 'storage', 'sharing', 'cloud'];
  public readonly requirements = ['Google Drive OAuth2 integration'];

  public readonly schema = z.union([
    UploadFileSchema.extend({ action: z.literal('upload') }),
    ListFilesSchema.extend({ action: z.literal('list') }),
    ShareFileSchema.extend({ action: z.literal('share') }),
    DownloadFileSchema.extend({ action: z.literal('download') }),
    DeleteFileSchema.extend({ action: z.literal('delete') }),
    CreateFolderSchema.extend({ action: z.literal('createFolder') }),
    MoveFileSchema.extend({ action: z.literal('move') }),
    GetFileMetadataSchema.extend({ action: z.literal('getMetadata') }),
  ]);

  public readonly examples: ToolExample[] = [
    {
      input: {
        action: 'upload',
        fileName: 'document.pdf',
        fileContent: 'base64content...',
        mimeType: 'application/pdf',
        makePublic: false,
      },
      output: {
        success: true,
        data: {
          fileId: 'abc123',
          fileName: 'document.pdf',
          webViewLink: 'https://drive.google.com/file/d/abc123/view',
        },
      },
      description: 'Upload a PDF document to Google Drive',
    },
    {
      input: {
        action: 'list',
        query: 'type:pdf',
        maxResults: 5,
      },
      output: {
        success: true,
        data: {
          files: [
            { id: 'abc123', name: 'document.pdf', size: '1024000' }
          ],
        },
      },
      description: 'List PDF files in Google Drive',
    },
    {
      input: {
        action: 'createFolder',
        name: 'My Project',
        parentFolderId: 'root',
      },
      output: {
        success: true,
        data: {
          folderId: 'folder123',
          folderName: 'My Project',
          webViewLink: 'https://drive.google.com/drive/folders/folder123',
        },
      },
      description: 'Create a new folder in Google Drive',
    },
    {
      input: {
        action: 'share',
        fileId: 'abc123',
        email: 'user@example.com',
        role: 'reader',
      },
      output: {
        success: true,
        data: {
          permissionId: 'perm123',
          sharedLink: 'https://drive.google.com/file/d/abc123/view?usp=sharing',
        },
      },
      description: 'Share a file with another user',
    },
  ];

  private drive: any;
  private auth: any;
  private readonly authService = inject(AuthService);
  private readonly integrationsService = inject(IntegrationsService);

  /**
   * Initialize Google Drive API client with secure credentials
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Google Drive integration is connected
      if (!this.integrationsService.isGoogleDriveConnected()) {
        console.warn('[GoogleDriveTool] Google Drive integration not connected');
        return false;
      }

      // Initialize Google Drive client
      await this.initializeDriveClient();
      console.log('[GoogleDriveTool] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[GoogleDriveTool] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize Google Drive API client with secure credentials
   */
  private async initializeDriveClient(): Promise<void> {
    try {
      // Get stored OAuth2 credentials securely from IntegrationsService
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        throw new Error('No valid Google Drive credentials found');
      }

      // Initialize OAuth2 client with credentials
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials(credentials);

      // Initialize Drive API client
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      console.log('[GoogleDriveTool] Drive client initialized with valid credentials');
    } catch (error) {
      console.error('[GoogleDriveTool] Failed to initialize Drive client:', error);
      throw error;
    }
  }

  /**
   * Execute Google Drive operations
   */
  async execute(params: any): Promise<GenkitToolResult> {
    try {
      const validatedParams = this.schema.parse(params);
      
      switch (validatedParams.action) {
        case 'upload':
          return await this.uploadFile(validatedParams);
        case 'list':
          return await this.listFiles(validatedParams);
        case 'share':
          return await this.shareFile(validatedParams);
        case 'download':
          return await this.downloadFile(validatedParams);
        case 'delete':
          return await this.deleteFile(validatedParams);
        case 'createFolder':
          return await this.createFolder(validatedParams);
        case 'move':
          return await this.moveFile(validatedParams);
        case 'getMetadata':
          return await this.getFileMetadata(validatedParams);
        default:
          throw new Error(`Unknown action: ${(validatedParams as any).action}`);
      }
    } catch (error) {
      console.error('[GoogleDriveTool] Execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
   * Upload file to Google Drive
   */
  private async uploadFile(params: z.infer<typeof UploadFileSchema>): Promise<GenkitToolResult> {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(params.fileContent, 'base64');

      const fileMetadata = {
        name: params.fileName,
        parents: params.folderId ? [params.folderId] : undefined,
      };

      const media = {
        mimeType: params.mimeType,
        body: buffer,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,size',
      });

      const file = response.data;

      // Make public if requested
      if (params.makePublic) {
        await this.makeFilePublic(file.id);
      }

      return {
        success: true,
        data: {
          fileId: file.id,
          fileName: file.name,
          webViewLink: file.webViewLink,
          size: file.size,
        },
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in Google Drive
   */
  private async listFiles(params: z.infer<typeof ListFilesSchema>): Promise<GenkitToolResult> {
    try {
      // Build query string for Google Drive API
      let query = '';
      const queryParts: string[] = [];

      // Add search query if provided
      if (params.query) {
        queryParts.push(`name contains '${params.query}' or fullText contains '${params.query}'`);
      }

      // Add MIME type filter if provided
      if (params.mimeType) {
        queryParts.push(`mimeType='${params.mimeType}'`);
      }

      // Add folder filter if provided
      if (params.folderId) {
        queryParts.push(`'${params.folderId}' in parents`);
      }

      // Add trashed filter (exclude trashed files by default)
      queryParts.push('trashed=false');

      query = queryParts.join(' and ');

      const response = await this.drive.files.list({
        q: query,
        pageSize: params.maxResults,
        orderBy: params.orderBy === 'size' ? 'quotaBytesUsed desc' : params.orderBy,
        fields: 'nextPageToken, files(id, name, size, mimeType, parents, createdTime, modifiedTime, webViewLink, thumbnailLink, owners, shared)',
      });

      const files = response.data.files || [];

      return {
        success: true,
        data: {
          files: files.map((file: any) => ({
            id: file.id,
            name: file.name,
            size: file.size ? parseInt(file.size) : 0,
            mimeType: file.mimeType,
            parents: file.parents || [],
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            thumbnailLink: file.thumbnailLink,
            owners: file.owners?.map((owner: any) => ({
              displayName: owner.displayName,
              emailAddress: owner.emailAddress,
            })) || [],
            shared: file.shared || false,
          })),
          totalFiles: files.length,
          nextPageToken: response.data.nextPageToken,
        },
      };
    } catch (error) {
      throw new Error(`List files failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Share file in Google Drive
   */
  private async shareFile(params: z.infer<typeof ShareFileSchema>): Promise<GenkitToolResult> {
    try {
      const permissions: any[] = [];

      if (params.email) {
        permissions.push({
          type: 'user',
          role: params.role,
          emailAddress: params.email,
        });
      }

      if (params.makePublic) {
        permissions.push({
          type: 'anyone',
          role: 'reader',
        });
      }

      const results = [];
      for (const permission of permissions) {
        const response = await this.drive.permissions.create({
          fileId: params.fileId,
          resource: permission,
          sendNotificationEmail: !!params.email,
        });
        results.push(response.data);
      }

      return {
        success: true,
        data: {
          fileId: params.fileId,
          permissions: results,
        },
      };
    } catch (error) {
      throw new Error(`Share failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from Google Drive
   */
  private async downloadFile(params: z.infer<typeof DownloadFileSchema>): Promise<GenkitToolResult> {
    try {
      const response = await this.drive.files.get({
        fileId: params.fileId,
        alt: 'media',
        mimeType: params.exportMimeType,
      });

      return {
        success: true,
        data: {
          fileContent: response.data,
        },
      };
    } catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from Google Drive
   */
  private async deleteFile(params: z.infer<typeof DeleteFileSchema>): Promise<GenkitToolResult> {
    try {
      await this.drive.files.delete({
        fileId: params.fileId,
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create folder in Google Drive
   */
  private async createFolder(params: z.infer<typeof CreateFolderSchema>): Promise<GenkitToolResult> {
    try {
      const fileMetadata = {
        name: params.name,
        parents: params.parentFolderId ? [params.parentFolderId] : undefined,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id,name,webViewLink,size',
      });

      const folder = response.data;

      return {
        success: true,
        data: {
          folderId: folder.id,
          folderName: folder.name,
          webViewLink: folder.webViewLink,
          size: folder.size,
        },
      };
    } catch (error) {
      throw new Error(`Create folder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Move file in Google Drive
   */
  private async moveFile(params: z.infer<typeof MoveFileSchema>): Promise<GenkitToolResult> {
    try {
      const file = await this.drive.files.get({
        fileId: params.fileId,
        fields: 'id,parents',
      });

      const currentParents = file.data.parents || [];

      // Remove from current parents
      for (const parent of currentParents) {
        await this.drive.files.update({
          fileId: params.fileId,
          addParents: [],
          removeParents: [parent],
        });
      }

      // Add to new parent
      await this.drive.files.update({
        fileId: params.fileId,
        addParents: [params.newParentId],
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new Error(`Move failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata from Google Drive
   */
  private async getFileMetadata(params: z.infer<typeof GetFileMetadataSchema>): Promise<GenkitToolResult> {
    try {
      const response = await this.drive.files.get({
        fileId: params.fileId,
        fields: params.fields,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw new Error(`Get metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make file publicly accessible
   */
  private async makeFilePublic(fileId: string): Promise<void> {
    await this.drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  /**
   * Get stored OAuth2 credentials securely from IntegrationsService
   */
  private async getStoredCredentials(): Promise<any> {
    try {
      const credentials = await this.integrationsService.getGoogleDriveCredentials();
      if (!credentials) {
        console.warn('[GoogleDriveTool] No Google Drive credentials found');
        return null;
      }

      return credentials;
    } catch (error) {
      console.error('[GoogleDriveTool] Error getting stored credentials:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario tiene Google Drive conectado (vía IntegrationsService)
   */
  async isDriveConnected(): Promise<boolean> {
    return this.integrationsService.isGoogleDriveConnected();
  }
}
