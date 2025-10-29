import { NextRequest, NextResponse } from 'next/server';

/**
 * List All Folder Content (Recursive) - Google Drive
 * Recursively lists all files and folders within a parent folder
 * Follows the same pattern as other custom endpoints (sheets/search, sheets/append)
 */

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  parents?: string[];
}

interface FolderNode {
  id: string;
  name: string;
  path: string;
  files: DriveFile[];
  subfolders: FolderNode[];
  totalFiles: number;
  totalFolders: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      const text = await request.text();
      console.log('Received body for recursive folder listing');
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    let { folderId, maxDepth = 10, includeFiles = true } = body;

    console.log('Parsed params:', { folderId, maxDepth, includeFiles });

    // Validate required fields
    if (!folderId || typeof folderId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: folderId' },
        { status: 400 }
      );
    }

    // Parse maxDepth if it's a string
    if (typeof maxDepth === 'string') {
      maxDepth = parseInt(maxDepth, 10);
      if (isNaN(maxDepth) || maxDepth < 1 || maxDepth > 20) {
        maxDepth = 10; // Default fallback
      }
    }

    // Parse includeFiles if it's a string
    if (typeof includeFiles === 'string') {
      includeFiles = includeFiles === 'true' || includeFiles === '1';
    }

    console.log('Final params:', { folderId, maxDepth, includeFiles });

    // Get the Authorization header (passed from execute endpoint)
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    // Recursive function to traverse folder tree
    async function listFolderRecursive(
      currentFolderId: string,
      currentPath: string,
      currentDepth: number
    ): Promise<FolderNode> {
      // Prevent infinite recursion
      if (currentDepth > maxDepth) {
        console.log(`Max depth ${maxDepth} reached at path: ${currentPath}`);
        return {
          id: currentFolderId,
          name: currentPath.split('/').pop() || 'Unknown',
          path: currentPath,
          files: [],
          subfolders: [],
          totalFiles: 0,
          totalFolders: 0,
        };
      }

      // Fetch contents of current folder
      const driveUrl = `https://www.googleapis.com/drive/v3/files?` +
        `q='${currentFolderId}' in parents and trashed = false&` +
        `fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)&` +
        `pageSize=1000&` +
        `orderBy=folder,name`;

      console.log(`Fetching contents of folder: ${currentPath} (depth: ${currentDepth})`);

      const response = await fetch(driveUrl, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch folder ${currentFolderId}:`, errorData);
        throw new Error(`Failed to fetch folder contents: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.files || [];

      console.log(`Found ${items.length} items in ${currentPath}`);

      // Separate files and folders
      const files: DriveFile[] = [];
      const folderItems: DriveFile[] = [];

      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          folderItems.push(item);
        } else if (includeFiles) {
          files.push(item);
        }
      }

      // Recursively process subfolders
      const subfolders: FolderNode[] = [];
      let totalFiles = files.length;
      let totalFolders = folderItems.length;

      for (const folder of folderItems) {
        const subfolderPath = `${currentPath}/${folder.name}`;
        const subfolder = await listFolderRecursive(
          folder.id,
          subfolderPath,
          currentDepth + 1
        );
        subfolders.push(subfolder);
        totalFiles += subfolder.totalFiles;
        totalFolders += subfolder.totalFolders;
      }

      return {
        id: currentFolderId,
        name: currentPath.split('/').pop() || 'Root',
        path: currentPath,
        files,
        subfolders,
        totalFiles,
        totalFolders,
      };
    }

    // Get root folder name first
    const folderInfoUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`;
    const folderInfoResponse = await fetch(folderInfoUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!folderInfoResponse.ok) {
      const errorData = await folderInfoResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Failed to fetch folder info: ${folderInfoResponse.statusText}`, details: errorData },
        { status: folderInfoResponse.status }
      );
    }

    const folderInfo = await folderInfoResponse.json();
    const rootPath = folderInfo.name || 'Root';

    console.log(`Starting recursive listing from: ${rootPath}`);

    // Start recursive traversal
    const folderTree = await listFolderRecursive(folderId, rootPath, 0);

    console.log('Recursive listing complete:', {
      totalFiles: folderTree.totalFiles,
      totalFolders: folderTree.totalFolders
    });

    return NextResponse.json({
      success: true,
      folder: folderTree,
      summary: {
        totalFiles: folderTree.totalFiles,
        totalFolders: folderTree.totalFolders,
        maxDepthReached: maxDepth
      }
    });

  } catch (error) {
    console.error('Recursive folder listing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list folder contents' },
      { status: 500 }
    );
  }
}
