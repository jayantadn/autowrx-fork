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

// ---------------------------------------------------------------------------
// Microsoft Graph API — mock signal catalog
// Works exactly like VSS signals: api.get() / api.set() in Python code.
// When real Graph API is integrated, only the data-fetch layer changes.
// ---------------------------------------------------------------------------
const MSGRAPH_SIGNALS_PATH = path.join(__dirname, '../data/microsoft-graph-signals.json')
let _msGraphSignals = null

const loadMicrosoftSignals = () => {
  if (_msGraphSignals) return _msGraphSignals
  try {
    const raw = fs.readFileSync(MSGRAPH_SIGNALS_PATH, 'utf8')
    _msGraphSignals = JSON.parse(raw)
    console.log(`Loaded ${_msGraphSignals.length} Microsoft Graph mock signals`)
  } catch (e) {
    console.warn('Could not load microsoft-graph-signals.json:', e.message)
    _msGraphSignals = []
  }
  return _msGraphSignals
}

/**
 * Return Microsoft Graph signals whose name appears in the given Python code.
 */
const findMicrosoftSignals = (code) => {
  if (!code) return []
  return loadMicrosoftSignals().filter(s => code.includes(s.name))
}

/**
 * Build the Microsoft Graph API reference block injected into AI prompts.
 * Groups signals by category for readability.
 */
const buildMicrosoftSignalDocs = () => {
  const catalog = loadMicrosoftSignals()
  if (!catalog.length) return ''

  const categories = {
    call:     '### Teams Call Signals',
    calendar: '### Teams Calendar Signals',
    presence: '### Teams Presence Signals',
    contacts: '### Teams Contacts Signals',
    chat:     '### Teams Chat Signals',
  }
  const grouped = {}
  for (const s of catalog) {
    const cat = s.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(
      `- ${s.name} (${s.datatype}, ${s.type})\n  ${s.description}`
    )
  }

  const sections = Object.entries(categories)
    .filter(([cat]) => grouped[cat])
    .map(([cat, heading]) => `${heading}\n${grouped[cat].join('\n')}`)
    .join('\n\n')

  return `## Available Microsoft Graph API Signals (Mock)
These signals are the Microsoft Teams integration layer.

CRITICAL — THE ONLY CORRECT PYTHON PATTERN:
Microsoft.Teams.* signals are NOT on the COVESA VSS tree. The Vehicle object has NO
"Microsoft" attribute. There is NO "api" object to import in Python vehicle app code.

FORBIDDEN (all of these cause immediate runtime crash):
  ❌  from sdv._internal.api import api          # module does not exist
  ❌  self.Vehicle.Microsoft.Teams.Call.IsActive  # AttributeError at runtime
  ❌  await api.get('Microsoft.Teams.Call.IsActive') # NameError: api not defined

REQUIRED PATTERN — use a self._ms dict + _ms_get / _ms_set helpers:

  # In __init__, initialise the mock store:
  self._ms = {
      'Microsoft.Teams.Call.IsIncoming': False,
      'Microsoft.Teams.Call.IsActive': False,
      'Microsoft.Teams.Call.IsMuted': False,
      'Microsoft.Teams.Call.IsOnHold': False,
      'Microsoft.Teams.Call.ParticipantCount': 0,
      'Microsoft.Teams.Call.TargetDevice': '',
      'Microsoft.Teams.Presence.Status': 'Available',
      'Microsoft.Teams.Calendar.NextMeeting.Title': '',
      'Microsoft.Teams.Calendar.NextMeeting.MinutesUntilStart': 99,
      'Microsoft.Teams.Calendar.NextMeeting.IsStartingSoon': False,
      'Microsoft.Teams.Contacts.CallerDisplayName': '',
      'Microsoft.Teams.Chat.UnreadCount': 0,
      'Microsoft.Teams.Chat.LastMessagePreview': '',
      'Microsoft.Teams.Chat.LastSenderName': '',
  }

  # Helper methods to read/write (add these to the class):
  def _ms_get(self, name: str):
      return self._ms.get(name)

  def _ms_set(self, name: str, value):
      self._ms[name] = value
      logger.debug("Microsoft signal set: %s = %s", name, value)

  # In _run_cycle, use the helpers — NOT api.get(), NOT self.Vehicle.Microsoft...:
  is_active = self._ms_get('Microsoft.Teams.Call.IsActive')
  self._ms_set('Microsoft.Teams.Call.IsMuted', True)

${sections}`
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

  // Include Microsoft Graph mock signals so the AI uses them when the
  // use case involves Teams calls, meetings, presence, or chat.
  const microsoftSignalDocs = buildMicrosoftSignalDocs()

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
${microsoftSignalDocs}

---
## Additional Instructions
You are an SDV code generator. Apply EVERY rule from the SKILL hardening checklist above.
Before emitting code, mentally walk through the SKILL's "Hardening Checklist" and
"Common Anti-Patterns to Reject" sections and ensure none are violated.
For every VSS signal read, use the _safe_read helper from the SKILL's Mock API Fallback Pattern.
MICROSOFT SIGNALS RULE: Any signal starting with "Microsoft." MUST be accessed ONLY via
self._ms_get('Microsoft.Teams...') and self._ms_set('Microsoft.Teams...', value).
NEVER import from sdv._internal — that module does not exist.
NEVER use self.Vehicle.Microsoft... — the Vehicle object has no Microsoft attribute.
NEVER call api.get() or api.set() — there is no api object in Python vehicle app code.
Always initialise self._ms dict in __init__ with all Microsoft signals used in the app.
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
  const raw = response.data.choices?.[0]?.message?.content || ''
  return stripCodeFence(raw) || 'No response from AI'
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

// ---------------------------------------------------------------------------
// Strip ```...``` fences from an LLM response, returning plain text/JSON
// ---------------------------------------------------------------------------
const stripCodeFence = (text) => {
  if (!text) return ''
  let s = text.trim()
  s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '')
  return s.trim()
}

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(stripCodeFence(text))
  } catch (e) {
    // Try to extract the first {...} or [...] block
    const m = String(text || '').match(/[\{\[][\s\S]*[\}\]]/)
    if (m) {
      try { return JSON.parse(m[0]) } catch (_) {}
    }
    return fallback
  }
}

/**
 * Generate an Overview (problem / says_who / solution) for the prototype
 * library card, based on the use-case prompt and the generated SDV code.
 */
const generateOverview = async (prompt, code) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  console.log('Azure OpenAI endpoint (overview):', endpoint)

  const systemPrompt = `You are a product analyst summarizing a Software-Defined Vehicle (SDV) prototype.
Given the user's use-case prompt and the generated SDV Python code, produce a concise
"Overview" suitable for a prototype-library card.

Return STRICTLY a single JSON object — no markdown, no code fences, no prose — with
exactly these three string fields:

{
  "problem": "<1-2 sentences describing the real-world problem this prototype addresses>",
  "says_who": "<the personas / stakeholders who care about this problem, 1 short sentence>",
  "solution": "<1-2 sentences explaining how this prototype solves it, referencing the key vehicle signals/actuators used>"
}

Keep every field short and human-readable. No bullet points, no line breaks inside fields.`

  const userMessage = `Use case:
${prompt || '(no use case provided)'}

SDV Python code (for reference; may be empty):
${code ? code.slice(0, 4000) : '(no code provided)'}

Return the JSON now.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 600,
    temperature: 0.5
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    httpsAgent,
    proxy: false
  })

  const raw = response.data.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(raw, { problem: '', says_who: '', solution: '' })
  return {
    problem: String(parsed.problem || '').trim(),
    says_who: String(parsed.says_who || '').trim(),
    solution: String(parsed.solution || '').trim(),
  }
}

// ---------------------------------------------------------------------------
// Catalog of all available built-in widgets (path + options format reference)
// ---------------------------------------------------------------------------
const BUILTIN_WIDGET_CATALOG = `
Available built-in widgets — pick the BEST match for each signal. Every "path"
field MUST be one of the exact strings listed here.

1. Single Signal Widget
   path: "/builtin-widgets/single-api/index.html"
   Best for: any single numeric or boolean signal (speed, temperature, door lock…)
   options: { "api": "<full.VSS.path>", "label": "<short label>" }

2. Chart Signals Widget
   path: "/builtin-widgets/chart-signals/index.html"
   Best for: visualizing 1–4 signals as time-series trends
   options: { "apis": ["<path1>", "<path2>"], "dataUpdateInterval": 500, "maxDataPoints": 60 }

3. Signal List Settable
   path: "/builtin-widgets/signal-list-settable/index.html"
   Best for: showing AND controlling 2–6 related signals in a list
   options: { "apis": ["<path1>", "<path2>"] }

4. Terminal Widget
   path: "/builtin-widgets/terminal/index.html"
   Best for: runtime logs, debugging output
   options: {}

5. Simple Fan Widget
   path: "/builtin-widgets/simple-fan/index.html"
   Best for: ONLY for fan speed signals (path contains "FanSpeed")
   options: { "api": "<FanSpeed signal>", "label": "<label>" }

6. 3D Windshield Wiper
   path: "/builtin-widgets/3d-windshield-wiper/index.html"
   Best for: wiper mode signals (path contains "Wiping.Mode")
   options: { "api": "<Wiping.Mode signal>" }

7. Simple Wiper Widget
   path: "/builtin-widgets/simple-wiper/index.html"
   Best for: front wiper specifically (Vehicle.Body.Windshield.Front.Wiping.Mode)
   options: { "api": "Vehicle.Body.Windshield.Front.Wiping.Mode" }

8. Simple Hood Widget
   path: "/builtin-widgets/simple-hood/index.html"
   Best for: hood open state (Vehicle.Body.Hood.IsOpen)
   options: { "api": "Vehicle.Body.Hood.IsOpen" }

9. Car Cockpit Widget
   path: "/builtin-widgets/car-cockpit/index.html"
   Best for: driving demos combining speed + headlights
   options: { "speedSignal": "Vehicle.Speed", "lightsSignal": "Vehicle.Body.Lights.Beam.Low.IsOn" }

10. General 3D Car Model
    path: "/builtin-widgets/3d-car/index.html"
    Best for: 2+ body signals combined (doors, trunk, windows, mirrors, lights)
    options: use ONLY the keys that have a matching signal from the code:
      row1_door1_open, row1_door2_open, row2_door3_open, row2_door4_open,
      trunk_rear_open, trunk_front_isopen, beam_high_open, beam_low_open,
      window1_isopen, window2_isopen, window3_isopen, window4_isopen,
      door1_locked, door2_locked, door3_locked, door4_locked,
      mirror_left_isfolded, mirror_right_isfolded, wipper_front, wipper_rear,
      wheels (= Vehicle.Speed or Vehicle.AverageSpeed)

If NO builtin widget above is a good fit, use GENERATE_CUSTOM:
    "widget": "GENERATE_CUSTOM",
    "path": "",
    "options": {
      "api": "<primary VSS signal>",
      "label": "<short human label>",
      "description": "<1-2 sentences: what to visualize, visual style, color coding, thresholds>"
    }
`.trim()

/**
 * Generate a standalone HTML widget file for a signal that has no good
 * built-in widget match. The file uses syncer.js and Tailwind CSS (both
 * already present in the /builtin-widgets/ static folder).
 */
const generateCustomWidgetHtml = async (signal, label, description, datatype) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  const unit = (() => {
    const s = signal.toLowerCase()
    if (s.includes('speed')) return 'km/h'
    if (s.includes('temperature') || s.includes('temp')) return '°C'
    if (s.includes('pressure')) return 'bar'
    if (s.includes('voltage')) return 'V'
    if (s.includes('current')) return 'A'
    if (s.includes('level') || s.includes('percent')) return '%'
    if (s.includes('distance')) return 'm'
    if (s.includes('angle')) return '°'
    if (s.includes('rpm')) return 'RPM'
    return ''
  })()

  const isBoolean = (datatype || '').toLowerCase() === 'boolean'
  const isString = (datatype || '').toLowerCase() === 'string'
  const isNumeric = !isBoolean && !isString && ['int8','uint8','int16','uint16','int32','uint32','int64','uint64','float','double'].includes((datatype||'').toLowerCase())

  // Provide a sensible range hint for the gauge arc
  const rangeHint = (() => {
    const s = signal.toLowerCase()
    if (s.includes('speed')) return '{ min: 0, max: 240 }'
    if (s.includes('temperature') || s.includes('temp')) return '{ min: -40, max: 120 }'
    if (s.includes('rpm')) return '{ min: 0, max: 8000 }'
    if (s.includes('fanspeed')) return '{ min: 0, max: 10 }'
    if (s.includes('level') || s.includes('percent') || s.includes('battery') || s.includes('fuel')) return '{ min: 0, max: 100 }'
    if (s.includes('angle') || s.includes('position') || s.includes('tilt')) return '{ min: -180, max: 180 }'
    if (s.includes('pressure')) return '{ min: 0, max: 10 }'
    if (s.includes('voltage')) return '{ min: 0, max: 60 }'
    return '{ min: 0, max: 100 }'
  })()

  const systemPrompt = `You generate a single self-contained HTML dashboard widget for a Software-Defined Vehicle (SDV) prototype. Output ONLY the raw HTML file — absolutely no markdown fences, no \`\`\`html, no prose before or after.

The host platform provides two scripts already in ../tailwind.min.css and ../syncer.js.
syncer.js exposes:
  - window.getApiValue(signalPath)       → current value (or undefined)
  - window.setApiValue(signalPath, val)  → write to simulator
  - window.onWidgetLoaded(options)       → called once on mount with widget options object
  - window.onWidgetUnloaded(options)     → called on unmount (clear timers here)
  - window.onVssSync(changedData)        → called EVERY TIME any signal updates (real-time)

MANDATORY structure — follow EXACTLY:
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../tailwind.min.css">
  <script defer src="../syncer.js"></script>
</head>
<body class="m-0 p-0 overflow-hidden bg-gray-900 flex items-center justify-center" style="width:100%;height:100vh">
  <div id="root" class="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
    <!-- rendered widget here -->
  </div>
  <script>
    const SIGNAL = "${signal}";
    let _iv = null;

    function render(val) {
      // update DOM based on val
    }

    // Called every time ANY runtime signal changes — use for live reaction
    window.onVssSync = function(data) {
      if (SIGNAL in data) render(data[SIGNAL]);
    };

    window.onWidgetLoaded = function(options) {
      const sig = (options && options.api) || SIGNAL;
      // initial value
      const v = window.getApiValue(sig);
      render(v !== undefined ? v : ${isBoolean ? 'false' : isString ? '""' : '0'});
    };

    window.onWidgetUnloaded = function() {
      if (_iv) { clearInterval(_iv); _iv = null; }
    };
  </script>
</body>
</html>

Design rules:
1. Use ONLY "../tailwind.min.css" and "../syncer.js" — NO CDN scripts, NO external libraries.
2. Dark theme: background #111827 (bg-gray-900), white text, indigo accent #6366f1.
3. Signal label: small, uppercase, letter-spaced, gray-400 text at the top.
4. Main value display rules:
   - BOOLEAN: large colored pill/badge (green bg + white text = true, gray-700 = false) + descriptive ON/OFF text
   - NUMERIC: an SVG arc gauge (semicircle, 0-180° sweep) showing the value as a colored arc.
     Arc color: indigo-500 (#6366f1) for normal, yellow-400 for warning (>70% range), red-500 for danger (>90% range).
     Show the numeric value in text-4xl font-bold text-white centered inside/below the arc.
     Show the unit in text-sm text-gray-500 right after the number.
   - STRING/ENUM: large colored badge matching the value (use different colors per value).
5. The SVG gauge arc must:
   - Be drawn as a <path> using arc commands.
   - Have a background arc (gray-700) and a value arc (colored).
   - Update smoothly when render(val) is called.
   - Range: ${rangeHint}
6. Widget must look good at any size from 150×150px to 400×300px.
7. Do NOT use alert(), console.log spam, or synchronous blocking code.
8. If the signal represents something interactive (slider-settable like fan speed), add a small range input below the value that calls setApiValue(SIGNAL, parseFloat(this.value)).`

  const userMessage = `Generate a widget for:
Signal path: ${signal}
DataType: ${datatype || 'float'}
Display label: ${label}
Unit: ${unit || '(none)'}
IsBoolean: ${isBoolean}
IsNumeric: ${isNumeric}
IsString: ${isString}
Value range: ${rangeHint}
Purpose: ${description}

Output the complete HTML file starting with <!DOCTYPE html>.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 2500,
    temperature: 0.2
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    httpsAgent,
    proxy: false
  })

  let html = response.data.choices?.[0]?.message?.content || ''
  // Strip any accidental markdown fences
  html = html.replace(/^```[a-zA-Z0-9]*\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  // Ensure it starts with <!DOCTYPE or <html
  const doctypeIdx = html.toLowerCase().indexOf('<!doctype')
  const htmlIdx = html.toLowerCase().indexOf('<html')
  const startIdx = doctypeIdx >= 0 ? doctypeIdx : (htmlIdx >= 0 ? htmlIdx : 0)
  if (startIdx > 0) html = html.slice(startIdx)
  return html
}

/**
 * Generate a dashboard widget_config JSON string based on the SDV code.
 * Selects the best matching built-in widget for each VSS signal, and
 * auto-generates a custom HTML widget for signals with no built-in match.
 */
const generateDashboard = async (prompt, code) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  console.log('Azure OpenAI endpoint (dashboard):', endpoint)

  // Detect which VSS signals appear in the code so we can hint the model
  const allSignals = loadVssSignals()
  const usedSignals = findMissingSignals(code || '', allSignals)
  const usedVssList = usedSignals.length
    ? usedSignals.slice(0, 20).map(s => `- ${s.name} (${s.datatype}, ${s.type})`).join('\n')
    : '(no recognized VSS signals were found in the code)'

  // Also detect Microsoft Graph signals used in the code
  const usedMsSignals = findMicrosoftSignals(code || '')
  const usedMsList = usedMsSignals.length
    ? usedMsSignals.map(s => `- ${s.name} (${s.datatype}, ${s.type}) [${s.category}]`).join('\n')
    : ''

  const usedList = [
    usedVssList,
    usedMsList ? `Microsoft Graph signals:\n${usedMsList}` : '',
  ].filter(Boolean).join('\n\n')

  // Build the Microsoft Teams widget extension for the catalog
  const hasMsCall     = usedMsSignals.some(s => s.category === 'call')
  const hasMsCalendar = usedMsSignals.some(s => s.category === 'calendar')
  const hasMsPresence = usedMsSignals.some(s => s.category === 'presence')
  const hasMsChat     = usedMsSignals.some(s => s.category === 'chat')

  // Build a per-run catalog extension for Microsoft Teams widgets
  const msWidgetCatalog = (hasMsCall || hasMsCalendar || hasMsPresence || hasMsChat)
    ? `

## Microsoft Teams Widgets (add these when Microsoft.Teams.* signals are detected)
Use EXACTLY when the corresponding Microsoft Graph signal category appears in the code.

${hasMsCall ? `Teams Rider View (for Microsoft.Teams.Call.* signals)
    path: "/builtin-widgets/teams-rider/index.html"
    options: {
      "speedSignal": "Vehicle.Speed",
      "incomingCallSignal": "Microsoft.Teams.Call.IsIncoming",
      "callTargetDeviceSignal": "Microsoft.Teams.Call.TargetDevice",
      "autoCallAfterMs": 15000
    }
    boxes: use a large 2x4 block (e.g. [1,2,3,4,6,7,8,9]) — call UI needs space.` : ''}

${hasMsCalendar ? `For Microsoft.Teams.Calendar.* signals — use GENERATE_CUSTOM:
    widget: "GENERATE_CUSTOM"
    options: { "api": "Microsoft.Teams.Calendar.NextMeeting.Title",
               "label": "Next Meeting",
               "description": "Show next meeting title, minutes until start (color-coded: green >10 min, yellow 5-10 min, red <5 min), and a Join button that reads the JoinUrl signal." }
    boxes: 2x2 block` : ''}

${hasMsPresence ? `For Microsoft.Teams.Presence.* signals — use GENERATE_CUSTOM:
    widget: "GENERATE_CUSTOM"
    options: { "api": "Microsoft.Teams.Presence.Status",
               "label": "Teams Presence",
               "description": "Show presence status as a colored badge: Available=green, Busy=red, Away=yellow, DoNotDisturb=purple, Offline=gray. Also show the Activity string below." }
    boxes: 1x2 block` : ''}

${hasMsChat ? `For Microsoft.Teams.Chat.* signals — use GENERATE_CUSTOM:
    widget: "GENERATE_CUSTOM"
    options: { "api": "Microsoft.Teams.Chat.UnreadCount",
               "label": "Teams Chat",
               "description": "Show unread count as a large badge, last sender name, and message preview text. Badge turns red when count > 0." }
    boxes: 1x2 block` : ''}`
    : ''

  const systemPrompt = `You are an SDV dashboard configurator.
Given the SDV prototype code and the list of VSS + Microsoft Graph signals it uses, generate a
dashboard layout that picks the BEST matching built-in widget for each signal.

${BUILTIN_WIDGET_CATALOG}${msWidgetCatalog}

The dashboard grid has 20 numbered boxes (1..20) arranged 5 columns x 4 rows:
  Row 1: 1  2  3  4  5
  Row 2: 6  7  8  9  10
  Row 3: 11 12 13 14 15
  Row 4: 16 17 18 19 20

Placement rules:
- Generate 2–6 widgets.
- Boxes MUST NOT overlap between widgets.
- Prefer 2×2 boxes per widget (e.g. [1,2,6,7]). Use 1×2 or 1×1 for simple signals.
- If the code uses driving signals (speed/lights), include a Car Cockpit or 3D Car widget.
- If 3+ body-part signals appear (doors/trunk/windows), group them into one 3D Car widget.
- If Microsoft.Teams.Call.* signals appear, ALWAYS include the Teams Rider View widget.
- If Microsoft.Teams.Calendar.*, Presence.*, or Chat.* signals appear, use GENERATE_CUSTOM per the catalog extension above.
- ALWAYS set "path" to the exact path string from the catalog (non-empty), except GENERATE_CUSTOM.

Return STRICTLY a single JSON object — no markdown, no code fences, no prose:
{
  "autorun": false,
  "widgets": [
    {
      "plugin": "Builtin",
      "widget": "<widget name exactly as in catalog, or GENERATE_CUSTOM>",
      "path": "<exact path from catalog, or '' for GENERATE_CUSTOM>",
      "options": { <options per catalog format for that widget> },
      "boxes": [<int>, ...],
      "label": "<short human title>"
    }
  ]
}`

  const userMessage = `Use case: ${prompt || '(none)'}

SDV Python code:
${code ? code.slice(0, 4000) : '(no code provided)'}

VSS + Microsoft Graph signals used in the code:
${usedList}

Generate the dashboard JSON now.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 1800,
    temperature: 0.3
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    httpsAgent,
    proxy: false
  })

  const raw = response.data.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(raw, null)

  // Validate the shape; fall back to an empty dashboard on bad output
  if (!parsed || !Array.isArray(parsed.widgets)) {
    return JSON.stringify({ autorun: false, widgets: [] })
  }

  // Sanitize: drop overlapping boxes between widgets, clamp to 1..20
  const used = new Set()
  let cleanWidgets = []
  for (const w of parsed.widgets) {
    if (!w || typeof w !== 'object') continue
    const boxes = Array.isArray(w.boxes)
      ? w.boxes
          .map((b) => parseInt(b, 10))
          .filter((b) => Number.isInteger(b) && b >= 1 && b <= 20 && !used.has(b))
      : []
    if (boxes.length === 0) continue
    boxes.forEach((b) => used.add(b))
    cleanWidgets.push({
      plugin: w.plugin || 'Builtin',
      widget: w.widget || 'Single Signal Widget',
      path: typeof w.path === 'string' ? w.path : '',
      options: w.options && typeof w.options === 'object' ? w.options : {},
      boxes,
      label: typeof w.label === 'string' ? w.label : '',
    })
  }

  // For GENERATE_CUSTOM entries: ask AI to write a bespoke HTML widget,
  // save it to /static/builtin-widgets/ai-widget-<id>/, update path.
  const timestamp = Date.now()
  cleanWidgets = await Promise.all(
    cleanWidgets.map(async (w, idx) => {
      if (w.widget !== 'GENERATE_CUSTOM') return w
      const signal = w.options?.api || ''
      const label = w.label || w.options?.label || (signal.split('.').pop() || 'Signal')
      const description = w.options?.description || `Show the live value of ${signal}`
      const sigMeta = allSignals.find((s) => s.name === signal)
      const datatype = sigMeta?.datatype || 'float'
      try {
        console.log(`Generating custom widget for signal: ${signal}`)
        const html = await generateCustomWidgetHtml(signal, label, description, datatype)
        const widgetId = `ai-widget-${timestamp}-${idx}`
        const widgetDir = path.join(__dirname, '../../static/builtin-widgets', widgetId)
        fs.mkdirSync(widgetDir, { recursive: true })
        fs.writeFileSync(path.join(widgetDir, 'index.html'), html, 'utf8')
        console.log(`Custom widget saved: /builtin-widgets/${widgetId}/index.html`)
        return {
          ...w,
          widget: label,
          path: `/builtin-widgets/${widgetId}/index.html`,
          options: { api: signal, label, ...w.options },
        }
      } catch (e) {
        console.warn(`Custom widget generation failed for ${signal}:`, e.message)
        // Fallback to single-api widget
        return {
          ...w,
          widget: 'Single Signal Widget',
          path: '/builtin-widgets/single-api/index.html',
          options: { api: signal, label },
        }
      }
    })
  )

  return JSON.stringify({
    autorun: parsed.autorun === true,
    widgets: cleanWidgets,
  })
}


/**
 * Bind each customer-journey step to a VSS predicate.
 * Returns: [{ stepIndex, signal, op, value, label }, ...]
 *   op ∈ ">=" | "<=" | "==" | "!=" | ">" | "<" | "changed"
 * The Live Demo plugin polls runtime signals and lights up the step whose
 * predicate currently evaluates true.
 */
const generateJourneyBindings = async (code, journey) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  const allSignals = loadVssSignals()
  const usedSignals = findMissingSignals(code || '', allSignals)
  const usedList = usedSignals.length
    ? usedSignals.slice(0, 30).map((s) => `- ${s.name} (${s.datatype})`).join('\n')
    : '(no recognized VSS signals were found in the code)'

  const systemPrompt = `You map customer-journey steps of an SDV prototype to
VSS signal predicates. Given the prototype code and a 3-step customer journey,
return a JSON array with EXACTLY one entry per step.

Each entry MUST be: { "stepIndex": <0|1|2>, "signal": "<Vehicle.Full.Path>",
"op": "<one of: >=, <=, ==, !=, >, <, changed>", "value": <number|boolean|string>,
"label": "<short reason>" }.

- "signal" MUST be a VSS path that appears in the code or in the provided list.
- For boolean signals use op "==" with true/false.
- For numeric signals prefer ">=" with a threshold that matches the step (e.g.
  "Vehicle.Speed >= 20" for "driving").
- For events that just need to happen, use op "changed".
- Output STRICTLY a JSON array, no markdown, no prose, no code fences.`

  const userMessage = `SDV code:
${(code || '').slice(0, 3500)}

Customer journey (3 steps in plain text):
${journey || '(empty)'}

VSS signals seen in code:
${usedList}

Return the JSON array now.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 800,
    temperature: 0.2
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    httpsAgent,
    proxy: false
  })

  const raw = response.data.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(raw, null)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((b) => b && typeof b === 'object' && typeof b.signal === 'string')
    .map((b) => ({
      stepIndex: Number.isInteger(b.stepIndex) ? b.stepIndex : 0,
      signal: String(b.signal),
      op: ['>=', '<=', '==', '!=', '>', '<', 'changed'].includes(b.op) ? b.op : '==',
      value: b.value,
      label: typeof b.label === 'string' ? b.label : '',
    }))
    .slice(0, 8)
}

/**
 * Generate "What-if?" edge-case scenarios for the prototype.
 * Returns: [{ title, emoji, description, signals: { 'Vehicle.X': value, ... } }]
 * Clicking a scenario in the plugin calls setRuntimeApiValues(signals) so the
 * dashboard, widgets and Live Demo all react immediately.
 */
const generateWhatIfScenarios = async (code, journey, name) => {
  const endpoint = config.azureOpenai.endpoint
  const apiKey = config.azureOpenai.key

  const allSignals = loadVssSignals()
  const usedSignals = findMissingSignals(code || '', allSignals)
  const usedList = usedSignals.length
    ? usedSignals.slice(0, 30).map((s) => `- ${s.name} (${s.datatype})`).join('\n')
    : '(no recognized VSS signals were found in the code)'

  const systemPrompt = `You generate "What if?" edge-case scenarios that stress
test an SDV prototype. Given the prototype name, code and customer journey,
return a JSON array of 4 to 6 scenarios.

Each scenario MUST be:
{
  "title": "<short title, max 6 words>",
  "emoji": "<a single relevant emoji>",
  "description": "<one sentence describing the edge case>",
  "signals": { "<Vehicle.Full.Path>": <number|boolean|string>, ... }
}

Rules:
- "signals" keys MUST be VSS paths that appear in the code or signal list.
- Each scenario sets 1 to 4 signals to provoke a meaningful runtime change.
- Cover diverse situations: failure, extreme value, unusual user behavior,
  environment change, conflicting state.
- Output STRICTLY a JSON array, no markdown, no code fences, no prose.`

  const userMessage = `Prototype: ${name || '(unnamed)'}

SDV code:
${(code || '').slice(0, 3500)}

Customer journey:
${journey || '(empty)'}

VSS signals seen in code:
${usedList}

Return the JSON array of scenarios now.`

  const response = await axios.post(endpoint, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 1500,
    temperature: 0.7
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    httpsAgent,
    proxy: false
  })

  const raw = response.data.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(raw, null)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((s) => s && typeof s === 'object' && s.signals && typeof s.signals === 'object')
    .map((s) => ({
      title: String(s.title || 'Scenario'),
      emoji: typeof s.emoji === 'string' ? s.emoji.slice(0, 4) : '✨',
      description: String(s.description || ''),
      signals: s.signals,
    }))
    .slice(0, 8)
}

module.exports = {
  generateCode,
  generateScenarios,
  generateMockApi,
  generateJourney,
  generateOverview,
  generateDashboard,
  generateCustomWidgetHtml,
  generateJourneyBindings,
  generateWhatIfScenarios,
  loadVssSignals,
  loadMicrosoftSignals,
  findMicrosoftSignals,
}