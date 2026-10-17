import { HandoverSession } from '../types';
import { generateBastPdfBlob } from './pdfGenerator';
import { getAccessToken } from './firebase';

export interface DriveUploadResult {
  fileId: string;
  name: string;
  webViewLink?: string;
  folderId?: string;
}

const FOLDER_NAME = 'BAST Retur Logistik';

/**
 * Searches for an existing folder with the given name, or creates one if not found.
 */
async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string | null> {
  try {
    const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Folder doesn't exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (err) {
    console.warn('Could not create or find folder, saving to root:', err);
  }
  return null;
}

/**
 * Uploads a BAST PDF Blob directly to user's Google Drive using multipart upload.
 */
export async function uploadBastPdfToGoogleDrive(
  session: HandoverSession,
  customAccessToken?: string
): Promise<DriveUploadResult> {
  const token = customAccessToken || (await getAccessToken());
  if (!token) {
    throw new Error('Google Drive belum terhubung. Silakan login dengan Google terlebih dahulu.');
  }

  // Generate the PDF blob
  const pdfBlob = generateBastPdfBlob(session);
  const fileName = `${session.bastNumber.replace(/[\/\\?%*:|"<>]/g, '_')}.pdf`;

  // Try to place into BAST Retur Logistik folder
  const folderId = await getOrCreateFolder(token, FOLDER_NAME);

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'application/pdf',
    description: `Berita Acara Serah Terima Retur Logistik - ${session.bastNumber} (${session.items.length} paket)`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Create multipart body
  const boundary = `-------BAST_BOUNDARY_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataContentType = 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  const fileContentType = 'Content-Type: application/pdf\r\n\r\n';

  // Read blob as ArrayBuffer to build the multipart payload cleanly
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const pdfUint8 = new Uint8Array(pdfArrayBuffer);

  const metaText = delimiter + metadataContentType + JSON.stringify(metadata) + delimiter + fileContentType;
  const metaEncoder = new TextEncoder();
  const metaUint8 = metaEncoder.encode(metaText);
  const closeUint8 = metaEncoder.encode(closeDelimiter);

  // Combine into single Uint8Array
  const combinedBuffer = new Uint8Array(metaUint8.length + pdfUint8.length + closeUint8.length);
  combinedBuffer.set(metaUint8, 0);
  combinedBuffer.set(pdfUint8, metaUint8.length);
  combinedBuffer.set(closeUint8, metaUint8.length + pdfUint8.length);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combinedBuffer,
    }
  );

  if (!uploadRes.ok) {
    const errorJson = await uploadRes.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${uploadRes.status} ${uploadRes.statusText}`;
    throw new Error(`Gagal mengunggah BAST ke Google Drive: ${message}`);
  }

  const result = await uploadRes.json();
  return {
    fileId: result.id,
    name: result.name || fileName,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    folderId: folderId || undefined,
  };
}
