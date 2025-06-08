/**
 * Prompt Caching Service for Agent Hums
 * Implementa caché de prompts para optimizar performance y costos
 */

interface PromptCacheItem {
  key: string;
  content: string;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  usage: number; // Número de veces usado
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  efficiency: number; // hits / totalRequests
  memoryUsage: number;
  lastClearTime: Date;
}

export class PromptCacheService {
  private cache: Map<string, PromptCacheItem> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    efficiency: 0,
    memoryUsage: 0,
    lastClearTime: new Date()
  };

  // Cache TTL configurations (in milliseconds)
  private readonly TTL_CONFIGS = {
    STATIC_CONTENT: 24 * 60 * 60 * 1000, // 24 horas para contenido estático
    TEMPORAL_CONTENT: 60 * 60 * 1000,   // 1 hora para contenido temporal
    DYNAMIC_CONTENT: 5 * 60 * 1000      // 5 minutos para contenido dinámico
  };

  /**
   * Generar clave de caché basada en contenido y tipo
   */
  private generateCacheKey(content: string, type: string): string {
    // Usar hash simple del contenido + tipo para la clave
    const hash = this.simpleHash(content + type);
    return `${type}_${hash}`;
  }

  /**
   * Hash simple para generar claves de caché
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Verificar si un elemento de caché está expirado
   */
  private isExpired(item: PromptCacheItem): boolean {
    const now = new Date().getTime();
    const itemTime = item.timestamp.getTime();
    return (now - itemTime) > item.ttl;
  }

  /**
   * Obtener contenido del caché
   */
  public get(content: string, type: string): string | null {
    this.stats.totalRequests++;
    
    const key = this.generateCacheKey(content, type);
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateEfficiency();
      return null;
    }
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateEfficiency();
      return null;
    }
    
    // Incrementar uso y actualizar estadísticas
    item.usage++;
    this.stats.hits++;
    this.updateEfficiency();
    
    console.log(`🚀 [PromptCache] HIT for type '${type}' - Saved ${content.length} chars`);
    return item.content;
  }

  /**
   * Almacenar contenido en caché
   */
  public set(content: string, type: string, customTTL?: number): void {
    const key = this.generateCacheKey(content, type);
    const ttl = customTTL || this.getTTLForType(type);
    
    const item: PromptCacheItem = {
      key,
      content,
      timestamp: new Date(),
      ttl,
      usage: 0
    };
    
    this.cache.set(key, item);
    this.updateMemoryUsage();
    
    console.log(`💾 [PromptCache] STORED type '${type}' - ${content.length} chars, TTL: ${ttl}ms`);
  }

  /**
   * Obtener TTL apropiado según el tipo de contenido
   */
  private getTTLForType(type: string): number {
    switch (type) {
      case 'BASE_SYSTEM':
      case 'TOOL_GUIDELINES':
      case 'CONVERSATION_PATTERNS':
      case 'EXAMPLES':
        return this.TTL_CONFIGS.STATIC_CONTENT;
      
      case 'TEMPORAL_CONTEXT':
        return this.TTL_CONFIGS.TEMPORAL_CONTENT;
      
      default:
        return this.TTL_CONFIGS.DYNAMIC_CONTENT;
    }
  }

  /**
   * Limpiar caché expirado
   */
  public cleanExpired(): number {
    let cleanedCount = 0;
    const now = new Date().getTime();
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.updateMemoryUsage();
      console.log(`🧹 [PromptCache] Cleaned ${cleanedCount} expired items`);
    }
    
    return cleanedCount;
  }

  /**
   * Limpiar todo el caché
   */
  public clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.lastClearTime = new Date();
    this.updateMemoryUsage();
    
    console.log(`🗑️ [PromptCache] Cleared all cache (${previousSize} items)`);
  }

  /**
   * Obtener estadísticas del caché
   */
  public getStats(): CacheStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Actualizar eficiencia del caché
   */
  private updateEfficiency(): void {
    this.stats.efficiency = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
  }

  /**
   * Actualizar uso de memoria
   */
  private updateMemoryUsage(): void {
    let totalMemory = 0;
    for (const item of this.cache.values()) {
      totalMemory += item.content.length * 2; // Aproximación para strings UTF-16
    }
    this.stats.memoryUsage = totalMemory;
  }

  /**
   * Obtener información detallada del caché
   */
  public getCacheInfo(): {
    size: number;
    keys: string[];
    memoryUsage: string;
    oldestItem: Date | null;
  } {
    const keys = Array.from(this.cache.keys());
    let oldestDate: Date | null = null;
    
    for (const item of this.cache.values()) {
      if (!oldestDate || item.timestamp < oldestDate) {
        oldestDate = item.timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      keys,
      memoryUsage: `${(this.stats.memoryUsage / 1024).toFixed(2)} KB`,
      oldestItem: oldestDate
    };
  }

  /**
   * Precarga de elementos clave del caché
   */
  public preloadCache(systemPrompts: { [key: string]: string }): void {
    console.log('🔄 [PromptCache] Preloading essential prompts...');
    
    Object.entries(systemPrompts).forEach(([type, content]) => {
      this.set(content, type);
    });
    
    console.log(`✅ [PromptCache] Preloaded ${Object.keys(systemPrompts).length} system prompts`);
  }

  /**
   * Programar limpieza automática
   */
  public startAutoCleanup(intervalMinutes: number = 30): void {
    setInterval(() => {
      this.cleanExpired();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`⏰ [PromptCache] Auto-cleanup scheduled every ${intervalMinutes} minutes`);
  }
}

// Singleton instance
export const promptCacheService = new PromptCacheService();
