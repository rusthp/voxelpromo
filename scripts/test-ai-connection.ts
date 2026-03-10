import { AIService } from '../src/services/ai/AIService';
import { config } from 'dotenv';

config();

async function runTest() {
  console.log('Testing AI Service Connection...');
  const aiService = new AIService();
  
  try {
    const result = await aiService.testConnection('groq');
    console.log('Test Result:', result);
  } catch (error) {
    console.error('Connection Failed:', error);
  }
}

runTest();
