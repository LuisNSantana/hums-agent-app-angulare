// Test script to check available models in genkitx-groq
import * as groqModule from 'genkitx-groq';

console.log('=== GENKITX-GROQ EXPORTS ===');
console.log('Available exports:', Object.keys(groqModule));

// Check for specific models
console.log('\n=== CHECKING FOR SPECIFIC MODELS ===');
console.log('groq function:', typeof groqModule.groq);
console.log('llama3x70b:', typeof groqModule.llama3x70b);
console.log('llama4Scout:', typeof groqModule.llama4Scout);
console.log('gemma2x9b:', typeof groqModule.gemma2x9b);

// Try to find all model-related exports
console.log('\n=== ALL EXPORTS ===');
for (const [key, value] of Object.entries(groqModule)) {
  console.log(`${key}: ${typeof value}`);
}
