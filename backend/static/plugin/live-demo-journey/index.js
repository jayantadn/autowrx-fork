// =============================================================================
// Live Demo - Customer Journey Animator
// -----------------------------------------------------------------------------
// Reads the prototype's customer_journey + code, asks the backend AI to map
// each step to a VSS predicate, then polls the runtime signals and highlights
// the step whose predicate currently evaluates true.
//
// Plugin URL (after registering in Plugin Management):
//   /plugin/live-demo-journey/index.js
// =============================================================================

const STYLE_ID = 'aw-live-demo-journey-style'

const styles = `
.aw-ldj { font-family: ui-sans-serif, system-ui, sans-serif; color: #1f2937; padding: 16px; }
.aw-ldj-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.aw-ldj-title { font-size:18px; font-weight:600; margin:0; }
.aw-ldj-sub { font-size:12px; color:#6b7280; margin-top:2px; }
.aw-ldj-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:9999px;
  font-size:12px; font-weight:500; background:#eef2ff; color:#4338ca; }
.aw-ldj-pill .dot { width:8px; height:8px; border-radius:50%; background:#a5b4fc; }
.aw-ldj-pill.live .dot { background:#22c55e; animation: aw-ldj-blink 1.2s infinite; }
@keyframes aw-ldj-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
.aw-ldj-steps { display:flex; flex-direction:column; gap:14px; }
.aw-ldj-step { position:relative; border:1px solid #e5e7eb; border-radius:12px; padding:14px 16px;
  background:#fff; transition: all .25s ease; }
.aw-ldj-step.active { border-color:#6366f1; background: linear-gradient(135deg,#eef2ff,#fff);
  box-shadow: 0 0 0 4px rgba(99,102,241,.12), 0 8px 24px -8px rgba(99,102,241,.35);
  transform: translateY(-1px); }
.aw-ldj-step .num { position:absolute; left:-12px; top:14px; width:26px; height:26px;
  border-radius:50%; background:#fff; border:1px solid #e5e7eb; display:flex;
  align-items:center; justify-content:center; font-size:12px; font-weight:600; color:#6b7280; }
.aw-ldj-step.active .num { background:#6366f1; color:#fff; border-color:#6366f1; }
.aw-ldj-step .row { display:flex; gap:6px; font-size:13px; margin-top:4px; }
.aw-ldj-step .row .k { color:#6b7280; min-width:140px; font-weight:500; }
.aw-ldj-step .row .v { color:#111827; }
.aw-ldj-bind { margin-top:10px; padding:8px 10px; background:#f9fafb; border-radius:8px;
  font-family: ui-monospace, SFMono-Regular, monospace; font-size:12px; color:#374151;
  display:flex; align-items:center; justify-content:space-between; gap:10px; }
.aw-ldj-bind.match { background:#ecfdf5; color:#065f46; }
.aw-ldj-bind .live-val { font-weight:600; color:#111827; }
.aw-ldj-bind.match .live-val { color:#047857; }
.aw-ldj-empty { padding:32px; text-align:center; color:#6b7280; border:1px dashed #e5e7eb; border-radius:12px; }
.aw-ldj-btn { padding:6px 12px; border:1px solid #d1d5db; background:#fff; border-radius:8px;
  font-size:12px; font-weight:500; cursor:pointer; }
.aw-ldj-btn:hover { background:#f9fafb; }
.aw-ldj-btn.primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }
.aw-ldj-btn.primary:hover { background:#4338ca; }
.aw-ldj-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px;
  border-radius:8px; font-size:13px; margin-bottom:12px; }
.aw-ldj-loader { display:inline-block; width:14px; height:14px; border:2px solid #e5e7eb;
  border-top-color:#6366f1; border-radius:50%; animation: aw-ldj-spin .8s linear infinite; }
@keyframes aw-ldj-spin { to { transform: rotate(360deg) } }
`

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = styles
  document.head.appendChild(el)
}

// --------------------------------------------------------------------------
// Customer-journey text parser. The format produced by the SDV copilot is:
//   #Step 1
//   Who: ...
//   What: ...
//   Customer TouchPoints: ...
//   #Step 2
//   ...
// --------------------------------------------------------------------------
function parseJourney(text) {
  if (!text || typeof text !== 'string') return []
  const lines = text.split(/\r?\n/)
  const steps = []
  let current = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^#\s*step/i.test(line)) {
      if (current) steps.push(current)
      current = { who: '', what: '', touchpoints: '' }
      continue
    }
    if (!current) current = { who: '', what: '', touchpoints: '' }
    const m = line.match(/^([^:]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1].trim().toLowerCase()
    const val = m[2].trim()
    if (key.startsWith('who')) current.who = val
    else if (key.startsWith('what')) current.what = val
    else if (key.startsWith('customer') || key.startsWith('touch')) current.touchpoints = val
  }
  if (current) steps.push(current)
  return steps
}

// --------------------------------------------------------------------------
// Predicate evaluation: turn a binding {signal, op, value} + runtime values
// into a boolean. "changed" returns true while the live value differs from the
// last sampled value for that signal.
// --------------------------------------------------------------------------
function makeEvaluator() {
  const lastValues = new Map()
  return function evaluate(binding, runtime) {
    if (!binding || !binding.signal) return { match: false, live: undefined }
    const live = runtime ? runtime[binding.signal] : undefined
    let match = false
    const target = binding.value
    switch (binding.op) {
      case '==': match = live == target; break // eslint-disable-line eqeqeq
      case '!=': match = live != target; break // eslint-disable-line eqeqeq
      case '>':  match = Number(live) >  Number(target); break
      case '<':  match = Number(live) <  Number(target); break
      case '>=': match = Number(live) >= Number(target); break
      case '<=': match = Number(live) <= Number(target); break
      case 'changed': {
        const prev = lastValues.get(binding.signal)
        match = prev !== undefined && prev !== live
        break
      }
      default: match = live == target // eslint-disable-line eqeqeq
    }
    lastValues.set(binding.signal, live)
    return { match, live }
  }
}

// --------------------------------------------------------------------------
// Backend call - asks the AI to bind each step to a VSS predicate
// --------------------------------------------------------------------------
async function fetchBindings(code, journey) {
  const res = await fetch('/v2/ai/bind-journey-signals', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, journey }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Backend ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return Array.isArray(data.bindings) ? data.bindings : []
}

// --------------------------------------------------------------------------
// Renderer (vanilla DOM - no React dependency)
// --------------------------------------------------------------------------
function render(container, state, handlers) {
  const { steps, bindings, runtime, status, error, live } = state
  const evaluate = state.evaluate
  container.innerHTML = ''

  const root = document.createElement('div')
  root.className = 'aw-ldj'

  // Header
  const header = document.createElement('div')
  header.className = 'aw-ldj-header'
  header.innerHTML = `
    <div>
      <h2 class="aw-ldj-title">Live Demo &mdash; Journey Animator</h2>
      <div class="aw-ldj-sub">Watches runtime signals and lights up the matching customer-journey step.</div>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <span class="aw-ldj-pill ${live ? 'live' : ''}"><span class="dot"></span>${live ? 'LIVE' : 'IDLE'}</span>
      <button class="aw-ldj-btn" data-act="rebind">${status === 'binding' ? '<span class="aw-ldj-loader"></span> Binding...' : 'Re-bind with AI'}</button>
      <button class="aw-ldj-btn primary" data-act="toggle">${live ? 'Pause' : 'Start'}</button>
    </div>
  `
  root.appendChild(header)

  if (error) {
    const err = document.createElement('div')
    err.className = 'aw-ldj-error'
    err.textContent = error
    root.appendChild(err)
  }

  if (!steps.length) {
    const empty = document.createElement('div')
    empty.className = 'aw-ldj-empty'
    empty.innerHTML = `
      <strong>No customer journey found.</strong><br/>
      Generate one from the SDV Copilot or fill in the Journey tab, then come back.
    `
    root.appendChild(empty)
  } else {
    const wrap = document.createElement('div')
    wrap.className = 'aw-ldj-steps'
    steps.forEach((step, idx) => {
      // gather bindings for this step
      const stepBindings = bindings.filter((b) => b.stepIndex === idx)
      const results = stepBindings.map((b) => ({ b, ...evaluate(b, runtime) }))
      const anyMatch = results.some((r) => r.match)

      const card = document.createElement('div')
      card.className = 'aw-ldj-step' + (anyMatch && live ? ' active' : '')
      card.innerHTML = `
        <div class="num">${idx + 1}</div>
        <div class="row"><span class="k">Who</span><span class="v">${escape(step.who)}</span></div>
        <div class="row"><span class="k">What</span><span class="v">${escape(step.what)}</span></div>
        <div class="row"><span class="k">Customer touchpoints</span><span class="v">${escape(step.touchpoints)}</span></div>
      `

      results.forEach((r) => {
        const bind = document.createElement('div')
        bind.className = 'aw-ldj-bind' + (r.match && live ? ' match' : '')
        bind.innerHTML = `
          <span>${escape(r.b.signal)} <strong>${escape(r.b.op)}</strong> ${escape(String(r.b.value))} <span style="color:#9ca3af">&mdash; ${escape(r.b.label || '')}</span></span>
          <span class="live-val">live: ${r.live === undefined ? '—' : escape(String(r.live))}</span>
        `
        card.appendChild(bind)
      })

      if (!stepBindings.length) {
        const note = document.createElement('div')
        note.className = 'aw-ldj-bind'
        note.textContent = 'No signal bound yet for this step.'
        card.appendChild(note)
      }
      wrap.appendChild(card)
    })
    root.appendChild(wrap)
  }

  container.appendChild(root)

  // wire buttons
  root.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => handlers[btn.getAttribute('data-act')]?.())
  })
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

// --------------------------------------------------------------------------
// Mount / unmount
// --------------------------------------------------------------------------
const instances = new WeakMap()

export function mount(el, props) {
  if (!el) return
  injectStyles()

  // Host React re-renders call mount again on the same element.
  // Reuse existing instance so polling and AI binding aren't restarted.
  if (instances.has(el)) {
    const existing = instances.get(el)
    existing._update && existing._update()
    return
  }

  const proto = props?.data?.prototype || {}
  const api = props?.api || {}

  const state = {
    steps: parseJourney(proto.customer_journey || ''),
    bindings: [],
    runtime: {},
    status: 'idle',
    error: '',
    live: false,
    evaluate: makeEvaluator(),
  }

  let pollTimer = null

  const update = () => render(el, state, handlers)

  const handlers = {
    rebind: async () => {
      if (state.status === 'binding') return
      state.status = 'binding'
      state.error = ''
      update()
      try {
        state.bindings = await fetchBindings(proto.code || '', proto.customer_journey || '')
        state.status = 'idle'
      } catch (e) {
        state.error = 'AI binding failed: ' + (e?.message || e)
        state.status = 'idle'
      }
      update()
    },
    toggle: () => {
      state.live = !state.live
      if (state.live) {
        startPolling()
      } else {
        stopPolling()
      }
      update()
    },
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      try {
        state.runtime = (typeof api.getRuntimeApiValues === 'function')
          ? (api.getRuntimeApiValues() || {})
          : {}
      } catch (_) {
        state.runtime = {}
      }
      update()
    }, 250)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  instances.set(el, { stopPolling, _update: update })

  // Auto-bind on first mount if we have something to work with
  if (state.steps.length) {
    handlers.rebind()
  } else {
    update()
  }
}

export function unmount(el) {
  const inst = el && instances.get(el)
  if (inst) {
    inst.stopPolling()
    instances.delete(el)
  }
  if (el) el.innerHTML = ''
}

export const components = {}

// Register globally
globalThis.DAPlugins = globalThis.DAPlugins || {}
globalThis.DAPlugins['page-plugin'] = { components, mount, unmount }
