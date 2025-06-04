/**
 * Web Search Tool - Genkit Compatible
 * Search current information on the internet using multiple search engines
 */

import { z } from 'zod';
import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';
import { 
  Tool, 
  ToolCategory, 
  ToolExample, 
  GenkitToolResult,
  SearchResult,
  SearchItem,
} from '../../../core/interfaces';

// Input/Output Schemas
const WebSearchSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum number of results'),
  engine: z.enum(['google', 'bing', 'duckduckgo']).default('google').describe('Search engine to use'),
  freshness: z.enum(['day', 'week', 'month', 'year', 'any']).default('any').describe('Freshness of results'),
  safeSearch: z.boolean().default(true).describe('Enable safe search'),
});

const ExtractContentSchema = z.object({
  url: z.string().url().describe('URL to extract content from'),
  maxLength: z.number().min(100).max(50000).default(5000).describe('Maximum content length'),
  includeImages: z.boolean().default(false).describe('Include image descriptions'),
});

const NewsSearchSchema = z.object({
  query: z.string().min(1).describe('News search query'),
  limit: z.number().min(1).max(20).default(5),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).default('24h').describe('News timeframe'),
  language: z.string().default('en').describe('Language code (en, es, fr, etc.)'),
});

export class WebSearchTool implements Tool {
  public readonly id = 'web-search';
  public readonly name = 'Web Search Engine';
  public readonly description = 'Search current information on the internet using multiple search engines and extract content from web pages';
  public readonly category = ToolCategory.WEB_SEARCH;
  public readonly version = '1.0.0';
  public readonly author = 'HumsAI Agent';
  public readonly tags = ['web', 'search', 'internet', 'scraping', 'news', 'information'];
  public readonly requirements = ['Internet connection', 'Optional: Search API keys'];

  public readonly schema = z.union([
    WebSearchSchema.extend({ action: z.literal('search') }),
    ExtractContentSchema.extend({ action: z.literal('extract') }),
    NewsSearchSchema.extend({ action: z.literal('news') }),
  ]);

  public readonly examples: ToolExample[] = [
    {
      input: {
        action: 'search',
        query: 'Angular 20 new features 2025',
        limit: 5,
        engine: 'google',
        freshness: 'month',
      },
      output: {
        success: true,
        data: {
          results: [
            {
              title: 'Angular 20: What\'s New in 2025',
              url: 'https://example.com/angular-20',
              snippet: 'Angular 20 introduces groundbreaking features...',
              source: 'google',
              relevanceScore: 0.95,
            }
          ],
          totalResults: 5,
          query: 'Angular 20 new features 2025',
          source: 'google',
        },
      },
      description: 'Search for recent Angular 20 information',
    },
    {
      input: {
        action: 'extract',
        url: 'https://example.com/article',
        maxLength: 2000,
        includeImages: false,
      },
      output: {
        success: true,
        data: {
          title: 'Article Title',
          content: 'Extracted article content...',
          author: 'John Doe',
          publishDate: '2025-06-01',
          wordCount: 1500,
        },
      },
      description: 'Extract content from a web page',
    },
  ];

  private browser: any;

  /**
   * Initialize Web Search Tool
   */
  async initialize(): Promise<boolean> {
    try {
      // Test internet connectivity
      await this.testConnectivity();
      
      console.log('[WebSearchTool] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[WebSearchTool] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Execute web search operations
   */
  async execute(params: any): Promise<GenkitToolResult> {
    try {
      const validatedParams = this.schema.parse(params);
      
      switch (validatedParams.action) {
        case 'search':
          return await this.performWebSearch(validatedParams);
        case 'extract':
          return await this.extractContent(validatedParams);
        case 'news':
          return await this.searchNews(validatedParams);
        default:
          throw new Error(`Unknown action: ${(validatedParams as any).action}`);
      }
    } catch (error) {
      console.error('[WebSearchTool] Execution error:', error);
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
   * Perform web search
   */
  private async performWebSearch(params: z.infer<typeof WebSearchSchema>): Promise<GenkitToolResult> {
    try {
      let results: SearchItem[] = [];

      switch (params.engine) {
        case 'google':
          results = await this.searchGoogle(params);
          break;
        case 'bing':
          results = await this.searchBing(params);
          break;
        case 'duckduckgo':
          results = await this.searchDuckDuckGo(params);
          break;
      }

      const searchResult: SearchResult = {
        success: true,
        data: null,
        timestamp: new Date(),
        results: results.slice(0, params.limit),
        totalResults: results.length,
        query: params.query,
        source: params.engine,
      };

      return {
        success: true,
        data: searchResult,
      };
    } catch (error) {
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from URL
   */
  private async extractContent(params: z.infer<typeof ExtractContentSchema>): Promise<GenkitToolResult> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(params.url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract main content
      const title = $('title').text().trim() || $('h1').first().text().trim();
      
      // Try to find main content area
      const contentSelectors = ['article', 'main', '.content', '.post-content', '.entry-content'];
      let mainContent = '';
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length && element.text().trim().length > 100) {
          mainContent = element.text().trim();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!mainContent) {
        mainContent = $('body').text().trim();
      }

      // Clean and truncate content
      const cleanContent = this.cleanText(mainContent);
      const truncatedContent = cleanContent.substring(0, params.maxLength);

      // Extract metadata
      const author = $('meta[name="author"]').attr('content') || 
                    $('[rel="author"]').text().trim() || 
                    $('.author').first().text().trim();

      const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="date"]').attr('content') ||
                         $('time').attr('datetime');

      await page.close();

      return {
        success: true,
        data: {
          title,
          content: truncatedContent,
          author: author || 'Unknown',
          publishDate: publishDate || null,
          url: params.url,
          wordCount: truncatedContent.split(/\s+/).length,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for news
   */
  private async searchNews(params: z.infer<typeof NewsSearchSchema>): Promise<GenkitToolResult> {
    try {
      // Use Google News or other news aggregators
      const newsQuery = `${params.query} site:news.google.com OR site:reuters.com OR site:bbc.com`;
      
      const searchParams = {
        action: 'search' as const,
        query: newsQuery,
        limit: params.limit,
        engine: 'google' as const,
        freshness: params.timeframe === '1h' ? 'day' as const : 
                   params.timeframe === '24h' ? 'day' as const :
                   params.timeframe === '7d' ? 'week' as const : 'month' as const,
        safeSearch: true,
      };

      return await this.performWebSearch(searchParams);
    } catch (error) {
      throw new Error(`News search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search Google (web scraping approach)
   */
  private async searchGoogle(params: z.infer<typeof WebSearchSchema>): Promise<SearchItem[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.query)}&num=${params.limit}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });

      const results = await page.evaluate(() => {
        const items: SearchItem[] = [];
        const resultElements = document.querySelectorAll('div.g');

        resultElements.forEach((element, index) => {
          const titleElement = element.querySelector('h3');
          const linkElement = element.querySelector('a[href]');
          const snippetElement = element.querySelector('div[data-sncf]') || 
                                element.querySelector('.VwiC3b');

          if (titleElement && linkElement && snippetElement) {
            items.push({
              title: titleElement.textContent || '',
              url: linkElement.getAttribute('href') || '',
              snippet: snippetElement.textContent || '',
              source: 'google',
              relevanceScore: 1 - (index * 0.1), // Simple relevance scoring
            });
          }
        });

        return items;
      });

      await page.close();
      return results;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Search Bing (placeholder)
   */
  private async searchBing(params: z.infer<typeof WebSearchSchema>): Promise<SearchItem[]> {
    // TODO: Implement Bing search
    console.warn('[WebSearchTool] Bing search not implemented yet');
    return [];
  }

  /**
   * Search DuckDuckGo (placeholder)
   */
  private async searchDuckDuckGo(params: z.infer<typeof WebSearchSchema>): Promise<SearchItem[]> {
    // TODO: Implement DuckDuckGo search
    console.warn('[WebSearchTool] DuckDuckGo search not implemented yet');
    return [];
  }

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<any> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim();
  }

  /**
   * Test internet connectivity
   */
  private async testConnectivity(): Promise<void> {
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        throw new Error('No internet connection');
      }
    } catch (error) {
      throw new Error('Internet connectivity test failed');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
