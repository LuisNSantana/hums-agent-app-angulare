/**
 * Brave Search Service
 * Servicio para interactuar con la API de Brave Search
 */

import axios from 'axios';
import type { SearchResult, SearchWebOutput } from '../types';

export class BraveSearchService {
  constructor(private readonly apiKey: string) {}

  async search(query: string, limit: number = 5): Promise<SearchWebOutput> {
    try {
      console.log('🔍 Executing Brave Search:', { query, limit });
      
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip'
        },
        params: {
          q: query,
          count: Math.min(limit, 10),
          search_lang: 'es',
          country: 'MX',
          safesearch: 'moderate',
          freshness: 'pweek',
          text_decorations: false
        },
        timeout: 15000
      });

      if (response.data?.web?.results) {
        const results: SearchResult[] = response.data.web.results.map((item: any) => ({
          title: item.title || 'Sin título',
          url: item.url || '',
          snippet: item.description || 'Sin descripción disponible'
        }));

        console.log('✅ Brave Search Success:', results.length, 'results');
        
        return {
          success: true,
          results,
          message: `Búsqueda exitosa: ${results.length} resultados encontrados`,
          query,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Unexpected Brave Search API response format');
      }
    } catch (error: any) {
      console.error('❌ Brave Search Error:', error.message);
      
      return {
        success: false,
        results: [
          {
            title: `Error en búsqueda: ${query}`,
            url: 'https://brave.com/search/',
            snippet: `No se pudieron obtener resultados para "${query}". Error: ${error.message}`
          }
        ],
        message: `Error en Brave Search API: ${error.message}`,
        query,
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeWeb(
    topic: string,
    analysisType: 'comparison' | 'trends' | 'technical' | 'news' | 'general',
    searchQueries?: string[]
  ) {
    console.log('🔧 Service Execution: analyzeWeb', { topic, analysisType });
    
    // Generate search queries if not provided
    let queries = searchQueries || [topic];
    if (!searchQueries) {
      switch (analysisType) {
        case 'comparison':
          queries.push(`${topic} comparación`, `${topic} vs`);
          break;
        case 'trends':
          queries.push(`${topic} tendencias 2024`, `${topic} últimas noticias`);
          break;
        case 'technical':
          queries.push(`${topic} especificaciones`, `${topic} tutorial`);
          break;
        case 'news':
          queries.push(`${topic} noticias`, `${topic} últimas novedades`);
          break;
      }
    }    // Perform searches
    const allResults: SearchResult[] = [];
    for (const query of queries.slice(0, 3)) {
      const searchResult = await this.search(query, 3);
      if (searchResult.success) {
        allResults.push(...searchResult.results);
      }
    }

    // Remove duplicates
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    const analysis = `Análisis ${analysisType} sobre: ${topic}

Basado en ${uniqueResults.length} fuentes web actualizadas, se encontró información relevante sobre ${topic}.`;

    const summary = `Análisis completado con ${uniqueResults.length} fuentes verificadas. La información recopilada proporciona una visión ${analysisType} actualizada sobre ${topic}.`;

    return {
      analysis,
      sources: uniqueResults.slice(0, 8),
      summary,
      timestamp: new Date().toISOString()
    };
  }
}
