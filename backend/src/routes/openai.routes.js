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

router.post('/generate-overview', async (req, res) => {
  try {
    console.log('=== Generate Overview Request ===')
    const { prompt, code } = req.body;
    if (!prompt && !code) {
      return res.status(400).json({ error: 'Either prompt or code is required' });
    }
    const overview = await openai.generateOverview(prompt || '', code || '');
    res.json({ overview });
  } catch (error) {
    console.error('=== Error generating overview ===');
    console.error('Error:', error.message);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to generate overview: ' + error.message });
  }
});

router.post('/generate-dashboard', async (req, res) => {
  try {
    console.log('=== Generate Dashboard Request ===')
    const { prompt, code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    const widgetConfig = await openai.generateDashboard(prompt || '', code);
    res.json({ widgetConfig });
  } catch (error) {
    console.error('=== Error generating dashboard ===');
    console.error('Error:', error.message);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to generate dashboard: ' + error.message });
  }
});

router.post('/bind-journey-signals', async (req, res) => {
  try {
    console.log('=== Bind Journey Signals Request ===')
    const { code, journey } = req.body;
    if (!code && !journey) {
      return res.status(400).json({ error: 'code or journey is required' });
    }
    const bindings = await openai.generateJourneyBindings(code || '', journey || '');
    res.json({ bindings });
  } catch (error) {
    console.error('=== Error binding journey signals ===');
    console.error('Error:', error.message);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to bind journey signals: ' + error.message });
  }
});

router.post('/generate-what-if-scenarios', async (req, res) => {
  try {
    console.log('=== Generate What-If Scenarios Request ===')
    const { code, journey, name } = req.body;
    if (!code && !journey) {
      return res.status(400).json({ error: 'code or journey is required' });
    }
    const scenarios = await openai.generateWhatIfScenarios(code || '', journey || '', name || '');
    res.json({ scenarios });
  } catch (error) {
    console.error('=== Error generating what-if scenarios ===');
    console.error('Error:', error.message);
    res.locals.errorMessage = error.message;
    res.status(500).json({ error: 'Failed to generate scenarios: ' + error.message });
  }
});

module.exports = router;