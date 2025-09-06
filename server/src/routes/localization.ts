/**
 * Localization API Routes
 * 
 * Provides endpoints for managing game localization data
 */

import { Router, Request, Response } from 'express';
import { SupportedLanguage, LANGUAGE_CONFIG } from '../../../shared/text-ids';
import { LocalizationManager, JSONFileDataLoader } from '../../../shared/localization-manager';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Initialize localization manager for server-side operations
const localizationManager = new LocalizationManager(
  new JSONFileDataLoader(path.join(process.cwd(), 'public/data/localization'))
);

/**
 * GET /api/localization/languages
 * Get list of available languages
 */
router.get('/languages', async (_req: Request, res: Response) => {
  try {
    const availableLanguages = Object.values(SupportedLanguage);
    const languageInfo = availableLanguages.map(lang => ({
      ...LANGUAGE_CONFIG[lang]
    }));

    res.json({
      success: true,
      data: {
        languages: languageInfo,
        default: SupportedLanguage.ENGLISH
      }
    });
  } catch (error) {
    console.error('Error fetching available languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available languages'
    });
  }
});

/**
 * GET /api/localization/:language
 * Get complete localization data for a specific language
 */
router.get('/:language', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;

    // Validate language parameter
    if (!language || !Object.values(SupportedLanguage).includes(language as SupportedLanguage)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Supported languages: ${Object.values(SupportedLanguage).join(', ')}`
      });
    }

    const supportedLanguage = language as SupportedLanguage;

    // Load language data
    await localizationManager.loadLanguage(supportedLanguage);

    // Get all localization data
    const languageData = {
      language: supportedLanguage,
      languageInfo: LANGUAGE_CONFIG[supportedLanguage],
      // Note: In a real implementation, you'd want to expose specific methods
      // rather than internal data structures
      data: {
        cards: {
          // Sample card names - in production, get from localization manager
          sampleCardName: localizationManager.getCardName('CARD_OAK_TREE' as any),
        },
        ui: {
          // Sample UI text - in production, get from localization manager
          sampleUIText: localizationManager.getUIText('UI_PLAY_CARD' as any),
        }
      }
    };

    return res.json({
      success: true,
      data: languageData
    });
  } catch (error) {
    console.error(`Error loading language ${req.params['language']}:`, error);
    return res.status(500).json({
      success: false,
      error: `Failed to load language data for ${req.params['language']}`
    });
  }
});

/**
 * GET /api/localization/:language/cards
 * Get card localization data for a specific language
 */
router.get('/:language/cards', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;

    if (!language || !Object.values(SupportedLanguage).includes(language as SupportedLanguage)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    const filePath = path.join(process.cwd(), 'public/data/localization', language, 'cards.json');
    const cardData = await fs.readFile(filePath, 'utf-8');

    return res.json({
      success: true,
      data: JSON.parse(cardData)
    });
  } catch (error) {
    console.error(`Error loading card data for ${req.params['language']}:`, error);
    return res.status(500).json({
      success: false,
      error: `Failed to load card data for ${req.params['language']}`
    });
  }
});

/**
 * GET /api/localization/:language/abilities
 * Get ability localization data for a specific language
 */
router.get('/:language/abilities', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;

    if (!language || !Object.values(SupportedLanguage).includes(language as SupportedLanguage)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    const filePath = path.join(process.cwd(), 'public/data/localization', language, 'abilities.json');
    const abilityData = await fs.readFile(filePath, 'utf-8');

    return res.json({
      success: true,
      data: JSON.parse(abilityData)
    });
  } catch (error) {
    console.error(`Error loading ability data for ${req.params['language']}:`, error);
    return res.status(500).json({
      success: false,
      error: `Failed to load ability data for ${req.params['language']}`
    });
  }
});

/**
 * GET /api/localization/:language/ui
 * Get UI localization data for a specific language
 */
router.get('/:language/ui', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;

    if (!language || !Object.values(SupportedLanguage).includes(language as SupportedLanguage)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    const filePath = path.join(process.cwd(), 'public/data/localization', language, 'ui.json');
    const uiData = await fs.readFile(filePath, 'utf-8');

    return res.json({
      success: true,
      data: JSON.parse(uiData)
    });
  } catch (error) {
    console.error(`Error loading UI data for ${req.params['language']}:`, error);
    return res.status(500).json({
      success: false,
      error: `Failed to load UI data for ${req.params['language']}`
    });
  }
});

/**
 * POST /api/localization/user-preference
 * Save user's language preference
 */
router.post('/user-preference', async (req: Request, res: Response) => {
  try {
    const { language, userId } = req.body;

    if (!Object.values(SupportedLanguage).includes(language as SupportedLanguage)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    // In a real implementation, you would save this to the database
    // For now, just validate and return success
    console.log(`User ${userId || 'anonymous'} set language preference to ${language}`);

    return res.json({
      success: true,
      data: {
        language,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error saving language preference:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save language preference'
    });
  }
});

/**
 * GET /api/localization/health
 * Health check endpoint for localization service
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const availableLanguages = Object.values(SupportedLanguage);
    const healthStatus = {
      service: 'localization',
      status: 'healthy',
      availableLanguages,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Localization health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Localization service unhealthy'
    });
  }
});

export default router;
