// =============================================================================
// What-If Scenarios
// -----------------------------------------------------------------------------
// Calls the backend AI to generate "What if?" edge-case scenarios based on the
// prototype's code + customer journey. Each scenario has a bundle of VSS
// signals; clicking a card injects those signals via pluginAPI.setRuntimeApiValues,
// so the dashboard widgets and Live Demo animator react instantly.
//
// Plugin URL (after registering in Plugin Management):
//   /plugin/what-if-scenarios/index.js
// =============================================================================

const STYLE_ID = 'aw-what-if-scenarios-style'

const styles = `
.aw-wif { font-family: ui-sans-serif, system-ui, sans-serif; color:#1f2937; padding:16px; }
.aw-wif-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
.aw-wif-title { font-size:18px; font-weight:600; margin:0; }
.aw-wif-sub { font-size:12px; color:#6b7280; margin-top:2px; }
.aw-wif-btn { padding:6px 12px; border:1px solid #d1d5db; background:#fff; border-radius:8px;
  font-size:12px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.aw-wif-btn:hover { background:#f9fafb; }
.aw-wif-btn.primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }
.aw-wif-btn.primary:hover { background:#4338ca; }
.aw-wif-btn:disabled { opacity:.5; cursor:not-allowed; }
.aw-wif-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }
.aw-wif-card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; background:#fff;
  transition: all .2s ease; cursor:pointer; display:flex; flex-direction:column; gap:8px; }
.aw-wif-card:hover { border-color:#6366f1; box-shadow: 0 8px 24px -10px rgba(99,102,241,.45);
  transform: translateY(-2px); }
.aw-wif-card.active { border-color:#22c55e; background: linear-gradient(135deg,#ecfdf5,#fff);
  box-shadow: 0 0 0 4px rgba(34,197,94,.18), 0 8px 24px -10px rgba(34,197,94,.4); }
.aw-wif-emoji { font-size:28px; line-height:1; }
.aw-wif-card-title { font-weight:600; font-size:15px; margin:0; color:#111827; }
.aw-wif-card-desc { font-size:13px; color:#4b5563; line-height:1.4; }
.aw-wif-sigs { display:flex; flex-direction:column; gap:4px; margin-top:6px; padding-top:8px; border-top:1px dashed #e5e7eb; }
.aw-wif-sig { font-family: ui-monospace, SFMono-Regular, monospace; font-size:11px; color:#374151;
  display:flex; justify-content:space-between; gap:8px; }
.aw-wif-sig .v { font-weight:600; color:#4338ca; }
.aw-wif-card.active .aw-wif-sig .v { color:#047857; }
.aw-wif-empty { padding:32px; text-align:center; color:#6b7280; border:1px dashed #e5e7eb; border-radius:12px; }
.aw-wif-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px;
  border-radius:8px; font-size:13px; margin-bottom:12px; }
.aw-wif-toast { position:absolute; top:10px; right:10px; background:#111827; color:#fff;
  padding:8px 12px; border-radius:8px; font-size:12px; opacity:0; transform:translateY(-4px);
  transition: all .25s ease; pointer-events:none; }
.aw-wif-toast.show { opacity:1; transform:translateY(0); }
.aw-wif-loader { display:inline-block; width:14px; height:14px; border:2px solid #e5e7eb;
  border-top-color:#6366f1; border-radius:50%; animation: aw-wif-spin .8s linear infinite; }
@keyframes aw-wif-spin { to { transform: rotate(360deg) } }
.aw-wif-skeleton { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }
.aw-wif-skel-card { height:160px; border-radius:14px; background:
  linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%; animation: aw-wif-shimmer 1.4s infinite; }
@keyframes aw-wif-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = styles
  document.head.appendChild(el)
}

async function fetchScenarios(payload) {
  const res = await fetch('/v2/ai/generate-what-if-scenarios', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Backend ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return Array.isArray(data.scenarios) ? data.scenarios : []
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

function render(container, state, handlers) {
  const { scenarios, status, error, activeIndex, baseline } = state
  container.innerHTML = ''

  const root = document.createElement('div')
  root.className = 'aw-wif'
  root.style.position = 'relative'

  const header = document.createElement('div')
  header.className = 'aw-wif-header'
  header.innerHTML = `
    <div>
      <h2 class="aw-wif-title">What-If Scenarios</h2>
      <div class="aw-wif-sub">AI-generated edge cases. Click one to inject the signals and watch the dashboard react.</div>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <button class="aw-wif-btn" data-act="reset" ${baseline ? '' : 'disabled'}>Reset signals</button>
      <button class="aw-wif-btn primary" data-act="regen" ${status === 'loading' ? 'disabled' : ''}>
        ${status === 'loading' ? '<span class="aw-wif-loader"></span> Generating...' : 'Regenerate with AI'}
      </button>
    </div>
  `
  root.appendChild(header)

  if (error) {
    const err = document.createElement('div')
    err.className = 'aw-wif-error'
    err.textContent = error
    root.appendChild(err)
  }

  if (status === 'loading' && !scenarios.length) {
    const skel = document.createElement('div')
    skel.className = 'aw-wif-skeleton'
    for (let i = 0; i < 4; i++) skel.innerHTML += '<div class="aw-wif-skel-card"></div>'
    root.appendChild(skel)
  } else if (!scenarios.length) {
    const empty = document.createElement('div')
    empty.className = 'aw-wif-empty'
    empty.innerHTML = `
      <strong>No scenarios yet.</strong><br/>
      Click <em>Regenerate with AI</em> to brainstorm "What if?" edge cases.
    `
    root.appendChild(empty)
  } else {
    const grid = document.createElement('div')
    grid.className = 'aw-wif-grid'
    scenarios.forEach((sc, idx) => {
      const card = document.createElement('div')
      card.className = 'aw-wif-card' + (activeIndex === idx ? ' active' : '')
      const sigEntries = Object.entries(sc.signals || {}).slice(0, 6)
      card.innerHTML = `
        <div class="aw-wif-emoji">${escape(sc.emoji || '✨')}</div>
        <h3 class="aw-wif-card-title">${escape(sc.title)}</h3>
        <div class="aw-wif-card-desc">${escape(sc.description)}</div>
        <div class="aw-wif-sigs">
          ${sigEntries.map(([k, v]) => `<div class="aw-wif-sig"><span>${escape(k)}</span><span class="v">${escape(String(v))}</span></div>`).join('')}
        </div>
      `
      card.addEventListener('click', () => handlers.apply(idx))
      grid.appendChild(card)
    })
    root.appendChild(grid)
  }

  const toast = document.createElement('div')
  toast.className = 'aw-wif-toast' + (state.toast ? ' show' : '')
  toast.textContent = state.toast || ''
  root.appendChild(toast)

  container.appendChild(root)

  root.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => handlers[btn.getAttribute('data-act')]?.())
  })
}

const instances = new WeakMap()

export function mount(el, props) {
  if (!el) return
  injectStyles()

  // Host React re-renders (e.g. runtime signal changes) call mount again on the
  // same element. Reuse the existing instance so we don't re-trigger AI generation.
  if (instances.has(el)) {
    const existing = instances.get(el)
    existing._proto = props?.data?.prototype || {}
    existing._api = props?.api || {}
    existing._update()
    return
  }

  const proto = props?.data?.prototype || {}
  const api = props?.api || {}

  const state = {
    scenarios: [],
    status: 'idle',
    error: '',
    activeIndex: -1,
    baseline: null, // saved snapshot of runtime values before first scenario
    toast: '',
  }

  let toastTimer = null

  const update = () => render(el, state, handlers)

  const showToast = (msg) => {
    state.toast = msg
    update()
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      state.toast = ''
      update()
    }, 1800)
  }

  const handlers = {
    regen: async () => {
      if (state.status === 'loading') return
      state.status = 'loading'
      state.error = ''
      update()
      try {
        state.scenarios = await fetchScenarios({
          code: proto.code || '',
          journey: proto.customer_journey || '',
          name: proto.name || '',
        })
        state.status = 'idle'
        if (!state.scenarios.length) {
          state.error = 'The AI returned no scenarios. Try adding code or a journey first.'
        }
      } catch (e) {
        state.error = 'Generation failed: ' + (e?.message || e)
        state.status = 'idle'
      }
      update()
    },

    apply: (idx) => {
      const sc = state.scenarios[idx]
      if (!sc || !sc.signals) return

      // Snapshot baseline the first time we apply anything
      if (!state.baseline && typeof api.getRuntimeApiValues === 'function') {
        try {
          const current = api.getRuntimeApiValues() || {}
          // Shallow copy, keep only keys this scenario (and future ones) might touch
          state.baseline = { ...current }
        } catch (_) {
          state.baseline = {}
        }
      }

      if (typeof api.setRuntimeApiValues === 'function') {
        try {
          const current = (typeof api.getRuntimeApiValues === 'function')
            ? (api.getRuntimeApiValues() || {})
            : {}
          api.setRuntimeApiValues({ ...current, ...sc.signals })
          state.activeIndex = idx
          showToast(`Injected ${Object.keys(sc.signals).length} signal(s)`)
        } catch (e) {
          state.error = 'Failed to set runtime signals: ' + (e?.message || e)
          update()
        }
      } else {
        state.error = 'pluginAPI.setRuntimeApiValues is not available in this host.'
        update()
      }
    },

    reset: () => {
      if (!state.baseline || typeof api.setRuntimeApiValues !== 'function') return
      try {
        api.setRuntimeApiValues({ ...state.baseline })
        state.activeIndex = -1
        showToast('Signals reset to baseline')
      } catch (e) {
        state.error = 'Failed to reset signals: ' + (e?.message || e)
        update()
      }
    },
  }

  const inst = {
    toastTimer: () => clearTimeout(toastTimer),
    _proto: proto,
    _api: api,
    _update: update,
  }
  instances.set(el, inst)

  // Auto-generate once on first mount if we have anything to work with
  if ((proto.code && proto.code.trim()) || (proto.customer_journey && proto.customer_journey.trim())) {
    handlers.regen()
  } else {
    update()
  }
}

export function unmount(el) {
  const inst = el && instances.get(el)
  if (inst) {
    inst.toastTimer()
    instances.delete(el)
  }
  if (el) el.innerHTML = ''
}

export const components = {}

globalThis.DAPlugins = globalThis.DAPlugins || {}
globalThis.DAPlugins['page-plugin'] = { components, mount, unmount }
