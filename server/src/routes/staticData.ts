/**
 * Static Data Routes
 * Provides endpoints for version manifest and data files for StaticDataManager
 */

import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Base path for static data files
const DATA_BASE_PATH = path.join(__dirname, '../../../public/data/game-config');
const VERSION_FILE = path.join(DATA_BASE_PATH, 'version.json');

/**
 * Calculate SHA256 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    console.error('Failed to calculate checksum for', filePath, error);
    return '';
  }
}

/**
 * Validate file name to prevent directory traversal attacks
 */
function isValidFileName(fileName: string): boolean {
  // Only allow alphanumeric characters, dots, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9._-]+\.json$/;
  return validPattern.test(fileName) && !fileName.includes('..');
}

/**
 * Get the version manifest
 * GET /api/static-data/manifest
 */
router.get('/manifest', async (_req, res) => {
  try {
    console.log('📋 [StaticData] Serving version manifest');
    
    // Check if version.json exists
    try {
      await fs.access(VERSION_FILE);
    } catch (error) {
      // If version.json doesn't exist, create a default one
      const defaultVersion = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: {
          'cards.json': {
            version: '1.0.0',
            checksum: '',
            size: 0
          }
        }
      };
      
      await fs.writeFile(VERSION_FILE, JSON.stringify(defaultVersion, null, 2));
      console.log('📋 [StaticData] Created default version.json');
    }

    // Read and serve the version manifest
    const versionData = await fs.readFile(VERSION_FILE, 'utf-8');
    const manifest = JSON.parse(versionData);

    // Update checksums for all files in the manifest
    for (const [fileName, fileInfo] of Object.entries(manifest.files)) {
      const filePath = path.join(DATA_BASE_PATH, fileName);
      try {
        const stats = await fs.stat(filePath);
        const checksum = await calculateChecksum(filePath);
        
        (fileInfo as any).checksum = checksum;
        (fileInfo as any).size = stats.size;
        (fileInfo as any).lastModified = stats.mtime.getTime();
      } catch (error) {
        console.warn(`⚠️ [StaticData] File ${fileName} not found, removing from manifest`);
        delete manifest.files[fileName];
      }
    }

    // Update manifest timestamp
    manifest.timestamp = Date.now();

    // Save updated manifest
    await fs.writeFile(VERSION_FILE, JSON.stringify(manifest, null, 2));

    res.json(manifest);
  } catch (error) {
    console.error('❌ [StaticData] Failed to serve manifest:', error);
    res.status(500).json({
      error: 'Failed to load version manifest',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get individual data files
 * GET /api/static-data/:fileName
 */
router.get('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log(`📄 [StaticData] Serving data file: ${fileName}`);

    // Validate file name for security
    if (!isValidFileName(fileName)) {
      return res.status(400).json({
        error: 'Invalid file name',
        message: 'File name contains invalid characters or path traversal'
      });
    }

    const filePath = path.join(DATA_BASE_PATH, fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: `Data file ${fileName} does not exist`
      });
    }

    // Read file stats and content
    const stats = await fs.stat(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const checksum = await calculateChecksum(filePath);

    // Parse JSON to validate it
    let jsonData;
    try {
      jsonData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(500).json({
        error: 'Invalid JSON file',
        message: `File ${fileName} contains invalid JSON`
      });
    }

    // Set response headers with metadata
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Data-Version', '1.0.0'); // Could be read from manifest
    res.setHeader('X-Data-Checksum', checksum);
    res.setHeader('X-Data-Size', stats.size.toString());
    res.setHeader('X-Data-Last-Modified', stats.mtime.getTime().toString());
    
    // Enable caching for static data (1 hour)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('ETag', `"${checksum}"`);

    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === `"${checksum}"`) {
      return res.status(304).end(); // Not Modified
    }

    return res.json(jsonData);
  } catch (error) {
    console.error(`❌ [StaticData] Failed to serve file ${req.params.fileName}:`, error);
    return res.status(500).json({
      error: 'Failed to load data file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update version manifest (for admin use)
 * POST /api/static-data/update-manifest
 */
router.post('/update-manifest', async (req, res) => {
  try {
    console.log('🔄 [StaticData] Updating version manifest');

    // Scan data directory for JSON files
    const files = await fs.readdir(DATA_BASE_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'version.json');

    const manifest = {
      version: req.body.version || '1.0.0',
      timestamp: Date.now(),
      files: {} as Record<string, any>
    };

    // Add each JSON file to the manifest
    for (const fileName of jsonFiles) {
      const filePath = path.join(DATA_BASE_PATH, fileName);
      const stats = await fs.stat(filePath);
      const checksum = await calculateChecksum(filePath);

      manifest.files[fileName] = {
        version: req.body.version || '1.0.0',
        checksum,
        size: stats.size,
        lastModified: stats.mtime.getTime()
      };
    }

    // Save the updated manifest
    await fs.writeFile(VERSION_FILE, JSON.stringify(manifest, null, 2));

    console.log(`✅ [StaticData] Updated manifest with ${jsonFiles.length} files`);
    res.json({
      success: true,
      message: `Updated manifest with ${jsonFiles.length} files`,
      manifest
    });
  } catch (error) {
    console.error('❌ [StaticData] Failed to update manifest:', error);
    res.status(500).json({
      error: 'Failed to update manifest',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
