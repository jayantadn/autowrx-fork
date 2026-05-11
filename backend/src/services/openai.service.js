const axios = require('axios')
const { HttpsProxyAgent } = require('https-proxy-agent')
const fs = require('fs')
const path = require('path')
const config = require('../config/config')

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

// ---------------------------------------------------------------------------
// BaseModel_vss.json signal traversal
// ---------------------------------------------------------------------------
const BASE_MODEL_VSS_PATH = path.join(__dirname, '../../BaseModel_vss.json')

/**
 * Recursively walk the VSS tree and collect all leaf (non-branch) signals.
 * Returns array of { name, datatype, description, type }
 */
const traverseVssTree = (node, results = []) => {
  if (!node || typeof node !== 'object') return results
  if (node.type && node.type !== 'branch' && node.name) {
    results.push({
      name: node.name,
      datatype: node.datatype || 'unknown',
      description: node.description || '',
      type: node.type
    })
  }
  if (node.children) {
    for (const child of Object.values(node.children)) {
      traverseVssTree(child, results)
    }
  }
  return results
}

let _vssSignals = null
const loadVssSignals = () => {
  if (_vssSignals) return _vssSignals
  try {
    const raw = fs.readFileSync(BASE_MODEL_VSS_PATH, 'utf8')
    const tree = JSON.parse(raw)
    // Support both { Vehicle: { children: ... } } and bare { children: ... }
    const root = tree.Vehicle || Object.values(tree)[0]
    _vssSignals = traverseVssTree(root)
    console.log(`Loaded ${_vssSignals.length} signals from BaseModel_vss.json`)
  } catch (e) {
    console.warn('Could not load BaseModel_vss.json:', e.message)
    _vssSignals = []
  }
  return _vssSignals
}

/**
 * Given Python source code and the full signal list, return signals
 * whose short path (everything after "Vehicle.") appears in the code.
 */
const findMissingSignals = (code, allSignals) => {
  const usedInCode = allSignals.filter(s => {
    const shortPath = s.name.replace(/^Vehicle\./, '')
    return code.includes(shortPath) || code.includes(s.name)
  })
  // "missing" means used in code but NOT resolvable (simulate not-found)
  // In this context we return ALL used signals so the caller can decide
  return usedInCode
}

// Resolve the SDV codegen skill in priority order:
//   1. SDV_SKILL_PATH env var (explicit override)
//   2. Bundled inside the repo: backend/src/skills/SKILL.md (preferred)
//   3. Legacy per-user location: ~/.agents/skills/sdv-automotive-codegen/SKILL.md
const SKILL_CANDIDATES = [
  process.env.SDV_SKILL_PATH,
  path.join(__dirname, '../skills/SKILL.md'),
  path.join(require('os').homedir(), '.agents/skills/sdv-automotive-codegen/SKILL.md'),
].filter(Boolean)

// Strip optional YAML frontmatter so only the markdown body is sent to the model.
const stripFrontmatter = (md) => {
  if (typeof md !== 'string') return ''
  const match = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? md.slice(match[0].length) : md
}

let _sdvSkill = null
const loadSdvSkill = () => {
  if (_sdvSkill !== null) return _sdvSkill
  for (const candidate of SKILL_CANDIDATES) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8')
      _sdvSkill = stripFrontmatter(raw).trim()
      console.log(`SDV skill loaded from ${candidate} (${_sdvSkill.length} chars)`)
      return _sdvSkill
    } catch (e) {
      // Try next candidate
    }
  }
  console.warn('SDV skill file not found in any known location; falling back to built-in prompt only.')
  _sdvSkill = ''
  return _sdvSkill
}

const generateCode = async (prompt, context) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  console.log('Azure OpenAI endpoint:', endpoint)

  const skill = loadSdvSkill()

  // Load all available signals from BaseModel_vss.json
  const allSignals = loadVssSignals()
  const signalList = allSignals.length
    ? allSignals.map(s => `- ${s.name} (${s.datatype}, ${s.type}): ${s.description}`).join('\n')
    : 'BaseModel_vss.json not loaded — use any valid COVESA VSS signal path.'

  const skillSection = skill
    ? `# AUTHORITATIVE SKILL — sdv-automotive-codegen

The rules, checklists, signal-lookup procedure, anti-patterns, and code skeletons in
the SKILL document below are MANDATORY. Every rule must be satisfied by the generated
code. If a rule conflicts with the user prompt, follow the SKILL.

<skill>
${skill}
</skill>

`
    : ''

  const systemPrompt = `${skillSection}---
## Available Vehicle API Signals (from BaseModel_vss.json)
The following signals are the complete traversal of BaseModel_vss.json.
USE ONLY signals from this list. If the signal you need is not listed, use _safe_read
with a mock fallback — do NOT invent a path.

${signalList}

---
## Additional Instructions
You are an SDV code generator. Apply EVERY rule from the SKILL hardening checklist above.
Before emitting code, mentally walk through the SKILL's "Hardening Checklist" and
"Common Anti-Patterns to Reject" sections and ensure none are violated.
For every signal read, use the _safe_read helper from the SKILL's Mock API Fallback Pattern.
Always include Python's standard logging module and configure it at module level immediately after imports:
  import logging
  logging.basicConfig(level=logging.INFO)
  logger = logging.getLogger(__name__)
Use logger (e.g. logger.debug, logger.info, logger.warning, logger.error) for all log output — never use print().
Return only the Python code block — no prose before or after it.`

  const userMessage = `Use case: ${prompt}
Context: ${context || 'No additional context'}
Generate SDV Python code.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 4000,
    temperature: 0.7
  }, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    httpsAgent,
    proxy: false
  })

  console.log('Azure OpenAI response status:', response.status)
  return response.data.choices?.[0]?.message?.content || 'No response from AI'
}

const generateScenarios = async (code, prompt) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  const skill = loadSdvSkill()
  const skillSection = skill
    ? `# AUTHORITATIVE SKILL — sdv-automotive-codegen

The SKILL document below defines the SDV rules the code under test must satisfy.
Use it to derive meaningful, automotive-grade scenarios (signal validation,
error/back-off paths, sensor-vs-actuator discipline, mock-API fallback, watchdog
timeouts, etc.). Reference SKILL section names where relevant.

<skill>
${skill}
</skill>

`
    : ''

  const systemPrompt = `${skillSection}You are an SDV test scenario generator.
Analyze the provided Python code.
Generate test scenarios based on the code functionality.
Identify COVESA VSS signals used (sensor vs actuator) and cover both happy-path and
failure-mode scenarios derived from the SKILL's Hardening Checklist (e.g. signal
unavailable, value out of range, repeated failures triggering back-off, mock API
fallback, write attempts on read-only sensors, etc.).
For missing signals, create mock API definitions.
Generate comprehensive test scenarios.`

  const userMessage = `Code to analyze:
${code}

Additional requirements: ${prompt || 'Generate standard test scenarios'}
Analyze code and generate test scenarios with mock APIs where needed.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 4000,
    temperature: 0.7
  }, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    httpsAgent,
    proxy: false
  })

  return response.data.choices?.[0]?.message?.content || 'No response from AI'
}

const generateMockApi = async (code, prompt) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  // Diff: find signals referenced in code vs those in BaseModel_vss.json
  const allSignals = loadVssSignals()
  const allSignalNames = new Set(allSignals.map(s => s.name))
  const usedSignals = findMissingSignals(code, allSignals)
  const missingSignals = usedSignals.filter(s => !allSignalNames.has(s.name))

  const missingContext = missingSignals.length
    ? `Signals used in the code but NOT found in BaseModel_vss.json (require mock):\n${missingSignals.map(s => `- ${s.name}`).join('\n')}`
    : 'All signals used in the code were found in BaseModel_vss.json. Generate mocks only for signals that fail at runtime.'

  const systemPrompt = `You are an SDV Mock API Generator.
The Vehicle API signal tree is loaded from BaseModel_vss.json.
For each signal used in the given Python code that is NOT found in that tree,
generate a mock ExtendedApi definition in JSON.

For each missing signal output:
{
  "apiName": "Vehicle.Full.Signal.Path",
  "datatype": "boolean | float | uint8 | string",
  "defaultValue": <sensible default>,
  "description": "what this signal represents",
  "type": "sensor | actuator"
}

Return a JSON array. If no signals are missing, return [].`

  const userMessage = `Code:
${code}

${missingContext}

${prompt || 'Generate mock ExtendedApi definitions for all missing signals.'}`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 4000,
    temperature: 0.7
  }, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    httpsAgent,
    proxy: false
  })

  return response.data.choices?.[0]?.message?.content || 'No response from AI'
}

const generateJourney = async (useCase, code) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  console.log('Azure OpenAI endpoint (journey):', endpoint)

  const systemPrompt = `You are a UX product analyst for Software-Defined Vehicle (SDV) features.
Given a use case description and (optionally) the SDV Python code that implements it,
produce a 3-step Customer Journey table describing the end-user experience.

Output STRICTLY in the following plain-text format — no markdown, no code fences, no
preamble, no trailing commentary. Each step is introduced by a line starting with "#".
Each row inside a step has the format "<RowName>: <value>". Use EXACTLY these three
row names in this exact order: "Who", "What", "Customer TouchPoints".

Use exactly 3 steps. Keep each cell concise (one short sentence, no line breaks
inside a cell).

Required output format:
#Step 1
Who: <persona involved in this step>
What: <what they do / what happens>
Customer TouchPoints: <vehicle UI element, sensor, app, voice, etc.>
#Step 2
Who: ...
What: ...
Customer TouchPoints: ...
#Step 3
Who: ...
What: ...
Customer TouchPoints: ...
`

  const userMessage = `Use case:
${useCase || '(no use case provided)'}

SDV Python code (for reference; may be empty):
${code ? code.slice(0, 4000) : '(no code provided)'}

Generate the 3-step Customer Journey table now.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 800,
    temperature: 0.5
  }, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    httpsAgent,
    proxy: false
  })

  const raw = response.data.choices?.[0]?.message?.content || ''
  return sanitizeJourney(raw)
}

const sanitizeJourney = (text) => {
  if (!text) return ''
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '')
  const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const kept = lines.filter(l => l.startsWith('#') || /^[^:]+:\s/.test(l))
  return kept.join('\n')
}

module.exports = {
  generateCode,
  generateScenarios,
  generateMockApi,
  generateJourney,
  loadVssSignals
}