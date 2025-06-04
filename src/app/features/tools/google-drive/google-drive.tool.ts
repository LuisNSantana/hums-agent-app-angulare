/**
 * Google Drive Tool - Genkit Compatible
 * File upload, management and sharing through Google Drive API
 */

import { z } from 'zod';
import { google } from 'googleapis';
import { 
  Tool, 
  ToolCategory, 
  ToolExample, 
  GenkitToolResult 
} from '../../../core/interfaces';

// Google Drive API Configuration
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
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
  orderBy: z.enum(['name', 'modifiedTime', 'createdTime']).default('modifiedTime'),
});

const ShareFileSchema = z.object({
  fileId: z.string().describe('Google Drive file ID'),
  email: z.string().email().optional().describe('Email to share with'),
  role: z.enum(['reader', 'writer', 'commenter']).default('reader'),
  makePublic: z.boolean().default(false),
});

export class GoogleDriveTool implements Tool {
  public readonly id = 'google-drive';
  public readonly name = 'Google Drive Manager';
  public readonly description = 'Upload, manage and share files through Google Drive API';
  public readonly category = ToolCategory.FILE_MANAGEMENT;
  public readonly version = '1.0.0';
  public readonly author = 'HumsAI Agent';
  public readonly tags = ['google', 'drive', 'files', 'storage', 'sharing'];
  public readonly requirements = ['GOOGLE_DRIVE_API_KEY', 'OAuth2 credentials'];

  public readonly schema = z.union([
    UploadFileSchema.extend({ action: z.literal('upload') }),
    ListFilesSchema.extend({ action: z.literal('list') }),
    ShareFileSchema.extend({ action: z.literal('share') }),
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
  ];

  private drive: any;
  private auth: any;

  /**
   * Initialize Google Drive API client
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env['GOOGLE_OAUTH_CLIENT_ID'],
        process.env['GOOGLE_OAUTH_CLIENT_SECRET'],
        'http://localhost:4200/auth/callback'
      );

      // Set credentials if available
      const credentials = this.getStoredCredentials();
      if (credentials) {
        this.auth.setCredentials(credentials);
      }

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      console.log('[GoogleDriveTool] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[GoogleDriveTool] Initialization failed:', error);
      return false;
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
      const response = await this.drive.files.list({
        q: params.query,
        pageSize: params.maxResults,
        orderBy: params.orderBy,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
      });

      return {
        success: true,
        data: {
          files: response.data.files || [],
          totalCount: response.data.files?.length || 0,
        },
      };
    } catch (error) {
      throw new Error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Get stored OAuth2 credentials (placeholder)
   */
  private getStoredCredentials(): any {
    // TODO: Implement credential storage/retrieval
    // This should integrate with your auth system
    return null;
  }
}
