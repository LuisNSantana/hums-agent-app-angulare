/**
 * Test Suite para Genkit Hybrid Server
 * Prueba routing inteligente y herramientas
 */

const BASE_URL = 'http://localhost:3001';

// Mensajes de prueba para diferentes tipos de tareas
const TEST_MESSAGES = {
  // Chat conversacional normal (Llama 4 Scout)
  conversation: [
    "Hola, ¿cómo estás?",
    "Explícame qué es la inteligencia artificial",
    "Cuéntame un chiste",
    "¿Cuál es la capital de Francia?",
    "Ayúdame a entender el concepto de recursión"
  ],
  
  // Tool execution (Llama 3.3 70B Versatile)
  toolExecution: [
    "Buscar información sobre Angular 20 en internet",
    "Subir un archivo llamado 'report.pdf' a Google Drive",
    "Crear un evento en el calendario para mañana a las 3 PM",
    "Analizar el documento 'presupuesto.xlsx'",
    "Busca en la web las últimas noticias sobre IA"
  ],
  
  // Análisis complejo (Llama 3.3 70B Versatile)
  complexAnalysis: [
    "Analizar profundamente las ventajas y desventajas de Angular vs React",
    "Evaluar la estrategia de migración de una aplicación legacy",
    "Comparar las opciones de hosting: AWS vs Azure vs Google Cloud",
    "Investigar a fondo las tendencias del mercado de IA en 2025",
    "Decidir qué stack tecnológico usar para una startup"
  ]
};

// Función auxiliar para hacer requests
async function makeRequest(endpoint, data) {
  try {
    console.log(`\n📡 Testing ${endpoint}...`);
    console.log(`📝 Message: "${data.message}"`);
    
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ Response received:`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return null;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('\n🏥 === TESTING HEALTH CHECK ===');
  return await makeRequest('health', {});
}

// Test 2: Routing Inteligente (hybridChat)
async function testHybridRouting() {
  console.log('\n🧠 === TESTING HYBRID ROUTING ===');
  
  const results = [];
  
  // Test conversational messages
  console.log('\n💬 Testing CONVERSATION routing (should use Llama 4 Scout):');
  for (const message of TEST_MESSAGES.conversation.slice(0, 2)) {
    const result = await makeRequest('hybridChat', { message });
    if (result) {
      results.push({
        type: 'conversation',
        message,
        taskType: result.taskType,
        modelUsed: result.modelUsed
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
  }
  
  // Test tool execution messages
  console.log('\n🛠️ Testing TOOL_EXECUTION routing (should use Llama 3.3 70B):');
  for (const message of TEST_MESSAGES.toolExecution.slice(0, 2)) {
    const result = await makeRequest('hybridChat', { message });
    if (result) {
      results.push({
        type: 'tool_execution',
        message,
        taskType: result.taskType,
        modelUsed: result.modelUsed
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test complex analysis messages
  console.log('\n🔬 Testing COMPLEX_ANALYSIS routing (should use Llama 3.3 70B):');
  for (const message of TEST_MESSAGES.complexAnalysis.slice(0, 2)) {
    const result = await makeRequest('hybridChat', { message });
    if (result) {
      results.push({
        type: 'complex_analysis',
        message,
        taskType: result.taskType,
        modelUsed: result.modelUsed
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

// Test 3: Conversation Flow (solo chat)
async function testConversationFlow() {
  console.log('\n💭 === TESTING CONVERSATION FLOW ===');
  
  const testMessage = "¿Puedes explicarme los beneficios de TypeScript?";
  return await makeRequest('conversation', { message: testMessage });
}

// Test 4: Force Task Type (testing override)
async function testForceTaskType() {
  console.log('\n🎯 === TESTING FORCE TASK TYPE ===');
  
  const message = "Hola, ¿cómo estás?"; // Normally conversation
  
  // Force tool execution
  const forcedToolResult = await makeRequest('hybridChat', {
    message,
    forceTaskType: 'tool_execution'
  });
  
  console.log('\n🔄 Forced tool_execution for conversation message:');
  console.log('TaskType:', forcedToolResult?.taskType);
  console.log('Model:', forcedToolResult?.modelUsed);
  
  return forcedToolResult;
}

// Función principal de testing
async function runAllTests() {
  console.log('🚀 === GENKIT HYBRID SERVER TEST SUITE ===');
  console.log('⏰ Starting comprehensive testing...\n');
  
  try {
    // Test 1: Health check
    const healthResult = await testHealthCheck();
    
    // Test 2: Routing inteligente
    const routingResults = await testHybridRouting();
    
    // Test 3: Conversation flow
    const conversationResult = await testConversationFlow();
    
    // Test 4: Force task type
    const forceResult = await testForceTaskType();
    
    // Resumen de resultados
    console.log('\n📊 === TEST RESULTS SUMMARY ===');
    console.log('\n🏥 Health Check:', healthResult ? '✅ PASSED' : '❌ FAILED');
    console.log('💭 Conversation Flow:', conversationResult ? '✅ PASSED' : '❌ FAILED');
    console.log('🎯 Force Task Type:', forceResult ? '✅ PASSED' : '❌ FAILED');
    
    if (routingResults.length > 0) {
      console.log('\n🧠 Routing Results:');
      routingResults.forEach(result => {
        const correctRouting = 
          (result.type === 'conversation' && result.taskType === 'conversation') ||
          (result.type === 'tool_execution' && result.taskType === 'tool_execution') ||
          (result.type === 'complex_analysis' && result.taskType === 'complex_analysis');
        
        console.log(`  ${correctRouting ? '✅' : '❌'} ${result.type.toUpperCase()}: ${result.taskType} (${result.modelUsed})`);
      });
    }
    
    console.log('\n🎉 Testing completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Ejecutar tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testHealthCheck, testHybridRouting, testConversationFlow };
