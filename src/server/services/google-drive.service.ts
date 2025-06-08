/**
 * Google Drive Service
 * Servicio para interactuar con la API de Google Drive
 */

import { google } from 'googleapis';
import type { GoogleDriveFile, DriveOrderBy } from '../types';

export class GoogleDriveService {
  async uploadFile(
    accessToken: string,
    fileName: string,
    fileContent: string, // base64
    mimeType: string,
    folderId?: string,
    makePublic: boolean = false
  ) {
    console.log('🔧 Service Execution: uploadGoogleDriveFile', { 
      fileName, 
      mimeType, 
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });

      const buffer = Buffer.from(fileContent, 'base64');

      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      };

      const media = {
        mimeType: mimeType,
        body: buffer,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,size',
      });

      const file = response.data;

      if (makePublic && file.id) {
        await drive.permissions.create({
          fileId: file.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }

      return {
        success: true,
        fileId: file.id || undefined,        fileName: file.name || undefined,
        webViewLink: file.webViewLink || undefined,
        size: file.size || undefined,
      };
    } catch (error: any) {
      console.error('❌ Google Drive Upload Error:', error.message);
      return this.handleDriveError(error);
    }
  }

  async listFiles(
    accessToken: string,
    query: string = '',
    maxResults: number = 10,
    orderBy: DriveOrderBy = 'modifiedTime',
    mimeType?: string,
    folderId?: string
  ) {
    console.log('🔧 Service Execution: listGoogleDriveFiles', { 
      query,
      maxResults,
      orderBy,
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });

      const queryParts: string[] = [];

      if (query) {
        queryParts.push(`name contains '${query}' or fullText contains '${query}'`);
      }
      if (mimeType) {
        queryParts.push(`mimeType='${mimeType}'`);
      }
      if (folderId) {
        queryParts.push(`'${folderId}' in parents`);
      }
      queryParts.push('trashed=false');

      const searchQuery = queryParts.join(' and ');

      let orderByValue = '';
      switch (orderBy) {
        case 'size':
          orderByValue = 'quotaBytesUsed desc';
          break;
        case 'modifiedTime':
          orderByValue = 'modifiedTime desc';
          break;
        case 'createdTime':
          orderByValue = 'createdTime desc';
          break;
        case 'name':
          orderByValue = 'name';
          break;
        default:
          orderByValue = 'modifiedTime desc';
      }
      
      const response = await drive.files.list({
        q: searchQuery,
        pageSize: maxResults,
        orderBy: orderByValue,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,shared)',
      });

      const files = response.data.files || [];

      return {
        success: true,
        files: files.map((file: any): GoogleDriveFile => ({
          id: file.id,          name: file.name,
          mimeType: file.mimeType,          size: file.size || undefined,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
        })),
        totalFiles: files.length,
      };
    } catch (error: any) {
      console.error('❌ Google Drive List Error:', error.message);
      return this.handleDriveError(error);
    }
  }

  async shareFile(
    accessToken: string,
    fileId: string,
    email?: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader',
    makePublic: boolean = false
  ) {
    console.log('🔧 Service Execution: shareGoogleDriveFile', { 
      fileId,
      email,
      role,
      makePublic,
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });

      let permissionResource: any;

      if (makePublic) {
        permissionResource = {
          role: 'reader',
          type: 'anyone',
        };
      } else if (email) {
        permissionResource = {
          role: role,
          type: 'user',
          emailAddress: email,
        };
      } else {
        throw new Error('Se debe especificar un email o hacer el archivo público');
      }

      const response = await drive.permissions.create({
        fileId: fileId,
        requestBody: permissionResource,
        fields: 'id',
      });

      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink',
      });

      return {
        success: true,
        permissionId: response.data.id || undefined,
        sharedLink: fileResponse.data.webViewLink || undefined,
      };
    } catch (error: any) {
      console.error('❌ Google Drive Share Error:', error.message);
      return this.handleDriveError(error);
    }
  }

  async createFolder(
    accessToken: string,
    name: string,
    parentFolderId?: string
  ) {
    console.log('🔧 Service Execution: createGoogleDriveFolder', { 
      name,
      parentFolderId,
      hasAccessToken: !!accessToken 
    });
    
    try {
      if (!accessToken) {
        throw new Error('Se requiere un token de acceso OAuth de Google.');
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
        name: name,
        parents: parentFolderId ? [parentFolderId] : undefined,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name,webViewLink',
      });

      const folder = response.data;

      return {
        success: true,
        folderId: folder.id || undefined,
        folderName: folder.name || undefined,
        webViewLink: folder.webViewLink || undefined,
      };
    } catch (error: any) {
      console.error('❌ Google Drive Create Folder Error:', error.message);
      return this.handleDriveError(error);
    }
  }

  private handleDriveError(error: any) {
    if (error.code === 401) {
      return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
    } else if (error.code === 403) {
      return { success: false, error: 'Error de permisos: No tienes autorización para acceder a Google Drive.' };
    } else if (error.code === 404) {
      return { success: false, error: 'Error: Archivo o carpeta no encontrado.' };
    }
    
    return { success: false, error: `Error en Drive API: ${error.message}` };
  }
}
