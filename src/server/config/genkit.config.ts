/**
 * Genkit AI Initialization
 * Configuración centralizada del cliente Genkit con Claude 3.5 Sonnet
 */

import { genkit } from 'genkit';
import { anthropic, claude35Sonnet } from 'genkitx-anthropic';
import type { ServerConfig } from './environment.config';

export const initializeGenkit = (config: ServerConfig) => {
  const ai = genkit({
    plugins: [
      anthropic({
        apiKey: config.anthropicApiKey,
      }),
    ],
  });

  return {
    ai,
    model: claude35Sonnet
  };
};

export { claude35Sonnet };
