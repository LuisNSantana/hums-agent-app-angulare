/**
 * Simple test server to verify Express setup
 */
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'healthy', 
    message: 'Test server is working',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Test server root endpoint' });
});

app.post('/test', (req, res) => {
  res.json({ message: 'Test POST endpoint', body: req.body });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
