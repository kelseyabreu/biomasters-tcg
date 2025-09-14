/**
 * Firefox Browser Context Manager
 * Handles Firefox-specific browser context creation and management issues
 */

import { Browser, BrowserContext, Page } from '@playwright/test';

export interface FirefoxBrowserOptions {
  maxRetries?: number;
  retryDelay?: number;
  contextTimeout?: number;
  pageTimeout?: number;
  enableLogging?: boolean;
}

export class FirefoxBrowserManager {
  private browser: Browser;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: Required<FirefoxBrowserOptions>;

  constructor(browser: Browser, options: FirefoxBrowserOptions = {}) {
    this.browser = browser;
    this.options = {
      maxRetries: options.maxRetries ?? 5,
      retryDelay: options.retryDelay ?? 2000,
      contextTimeout: options.contextTimeout ?? 30000,
      pageTimeout: options.pageTimeout ?? 30000,
      enableLogging: options.enableLogging ?? true
    };
  }

  /**
   * Create a new browser context with Firefox-specific retry logic
   */
  async createContext(): Promise<BrowserContext> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        if (this.options.enableLogging) {
          console.log(`🦊 [Firefox] Creating browser context (attempt ${attempt}/${this.options.maxRetries})`);
        }

        // Close any existing context first
        await this.closeContext();

        // Create new context with Firefox-optimized settings
        this.context = await this.browser.newContext({
          // Firefox-specific viewport settings
          viewport: { width: 1280, height: 720 },
          // Disable unnecessary features for stability
          permissions: [],
          geolocation: undefined,
          // Enhanced timeout settings
          timeout: this.options.contextTimeout,
          // Memory optimization
          recordVideo: undefined,
          recordHar: undefined
        });

        if (this.options.enableLogging) {
          console.log(`✅ [Firefox] Browser context created successfully`);
        }

        return this.context;

      } catch (error) {
        lastError = error as Error;
        
        if (this.options.enableLogging) {
          console.log(`⚠️ [Firefox] Context creation failed (attempt ${attempt}/${this.options.maxRetries}):`, error.message);
        }

        // Clean up failed context
        await this.closeContext();

        // Wait before retry (exponential backoff)
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(1.5, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to create Firefox browser context after ${this.options.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Create a new page with Firefox-specific retry logic
   */
  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context must be created before creating a page');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        if (this.options.enableLogging) {
          console.log(`🦊 [Firefox] Creating page (attempt ${attempt}/${this.options.maxRetries})`);
        }

        // Close any existing page first
        await this.closePage();

        // Create new page with timeout
        this.page = await Promise.race([
          this.context.newPage(),
          this.timeoutPromise(this.options.pageTimeout, 'Page creation timeout')
        ]);

        // Configure page for Firefox stability
        await this.configurePage(this.page);

        if (this.options.enableLogging) {
          console.log(`✅ [Firefox] Page created successfully`);
        }

        return this.page;

      } catch (error) {
        lastError = error as Error;
        
        if (this.options.enableLogging) {
          console.log(`⚠️ [Firefox] Page creation failed (attempt ${attempt}/${this.options.maxRetries}):`, error.message);
        }

        // Clean up failed page
        await this.closePage();

        // Wait before retry
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(1.5, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to create Firefox page after ${this.options.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Configure page with Firefox-specific settings
   */
  private async configurePage(page: Page): Promise<void> {
    try {
      // Set longer timeouts for Firefox
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(90000);

      // Handle page errors gracefully
      page.on('pageerror', (error) => {
        if (this.options.enableLogging) {
          console.log(`🦊 [Firefox] Page error:`, error.message);
        }
      });

      // Handle console messages for debugging
      if (this.options.enableLogging) {
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            console.log(`🦊 [Firefox] Console error:`, msg.text());
          }
        });
      }

      // Handle dialog boxes
      page.on('dialog', async (dialog) => {
        if (this.options.enableLogging) {
          console.log(`🦊 [Firefox] Dialog appeared: ${dialog.type()} - ${dialog.message()}`);
        }
        await dialog.accept();
      });

    } catch (error) {
      if (this.options.enableLogging) {
        console.log(`⚠️ [Firefox] Page configuration failed:`, error.message);
      }
      // Don't throw here, as basic page creation succeeded
    }
  }

  /**
   * Navigate to URL with Firefox-specific retry logic
   */
  async navigateToUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page must be created before navigation');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        if (this.options.enableLogging) {
          console.log(`🦊 [Firefox] Navigating to ${url} (attempt ${attempt}/${this.options.maxRetries})`);
        }

        await this.page.goto(url, {
          waitUntil: 'domcontentloaded', // Less strict than 'load' for Firefox
          timeout: 60000
        });

        if (this.options.enableLogging) {
          console.log(`✅ [Firefox] Navigation successful`);
        }

        return;

      } catch (error) {
        lastError = error as Error;
        
        if (this.options.enableLogging) {
          console.log(`⚠️ [Firefox] Navigation failed (attempt ${attempt}/${this.options.maxRetries}):`, error.message);
        }

        // Wait before retry
        if (attempt < this.options.maxRetries) {
          await this.sleep(this.options.retryDelay);
        }
      }
    }

    throw new Error(`Failed to navigate to ${url} after ${this.options.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Get the current page (throws if not created)
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Page has not been created yet');
    }
    return this.page;
  }

  /**
   * Get the current context (throws if not created)
   */
  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Context has not been created yet');
    }
    return this.context;
  }

  /**
   * Close the current page
   */
  async closePage(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        // Ignore close errors
      }
      this.page = null;
    }
  }

  /**
   * Close the current context
   */
  async closeContext(): Promise<void> {
    await this.closePage();
    
    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        // Ignore close errors
      }
      this.context = null;
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await this.closeContext();
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Create a timeout promise
   */
  private timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}
