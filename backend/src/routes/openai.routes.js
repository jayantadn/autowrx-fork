const express = require('express');
const router = express.Router();
const openai = require('../services/openai.service');

router.get('/test', (req, res) => {
  res.json({ message: 'AI routes working!' })
})

router.post('/generate-code', async (req, res) => {
  try {
    console.log('=== Generate Code Request ===')
    console.log('Body:', JSON.stringify(req.body))
    
    const { prompt, context } = req.body;
    
    if (!prompt) {
      console.log('No prompt provided')
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Calling Azure Open AI...')
    const code = await openai.generateCode(prompt, context);
    console.log('Code generated:', code.substring(0, 100))
    res.json({ code });
  } catch (error) {
    console.error('=== Error generating code ===');
    console.error('Error:', error.message);
    console.error('Cause:', error.cause?.message);
    console.error('Stack:', error.stack);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to generate code: ' + error.message });
  }
});

router.post('/generate-scenarios', async (req, res) => {
  try {
    const { code, prompt } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const scenarios = await openai.generateScenarios(code, prompt);
    res.json({ scenarios });
  } catch (error) {
    console.error('Error generating scenarios:', error);
    res.status(500).json({ error: 'Failed to generate scenarios' });
  }
});

router.post('/generate-journey', async (req, res) => {
  try {
    console.log('=== Generate Journey Request ===')
    const { useCase, code } = req.body;

    if (!useCase && !code) {
      return res.status(400).json({ error: 'Either useCase or code is required' });
    }

    const journey = await openai.generateJourney(useCase || '', code || '');
    res.json({ journey });
  } catch (error) {
    console.error('=== Error generating journey ===');
    console.error('Error:', error.message);
    console.error('Cause:', error.cause?.message);
    console.error('Stack:', error.stack);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to generate journey: ' + error.message });
  }
});

router.post('/generate-mock-api', async (req, res) => {
  try {
    const { code, prompt } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const mockApi = await openai.generateMockApi(code, prompt);
    res.json({ mockApi });
  } catch (error) {
    console.error('Error generating mock API:', error);
    res.status(500).json({ error: 'Failed to generate mock API' });
  }
});

module.exports = router;