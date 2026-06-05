// Copyright (c) 2025 Eclipse Foundation.

import { useState, useEffect } from 'react'
import {
  generateCode,
  generateScenarios,
  generateJourney,
  generateOverview,
  generateDashboard,
} from '@/services/openai.service'
import { Button } from '@/components/atoms/button'
import { Spinner } from '@/components/atoms/spinner'
import { toast } from 'react-toastify'
import useCurrentPrototype from '@/hooks/useCurrentPrototype'
import { updatePrototypeService } from '@/services/prototype.service'

const STORAGE_KEY = 'sdvCopilotState'

const AiGenerator = () => {
  const [prompt, setPrompt] = useState('')
  const [code, setCode] = useState('')
  const [scenarios, setScenarios] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [mode, setMode] = useState<'code' | 'scenarios'>('code')
  const [isLoaded, setIsLoaded] = useState(false)
  const { data: currentPrototype, refetch: refetchCurrentPrototype } = useCurrentPrototype()

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setPrompt(data.prompt || '')
        setCode(data.code || '')
        setGeneratedCode(data.generatedCode || '')
        setScenarios(data.scenarios || '')
        setMode(data.mode || 'code')
        setIsLoaded(true)
      } catch (e) {
        console.error('Failed to load saved state')
        setIsLoaded(true)
      }
    } else {
      setIsLoaded(true)
    }
  }, [])

  // Save state to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { 
      prompt: prompt || '', 
      code: code || '', 
      generatedCode: generatedCode || '', 
      scenarios: scenarios || '', 
      mode: mode || 'code' 
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [prompt, code, generatedCode, scenarios, mode, isLoaded])

  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    setLoading(true)
    try {
      const result = await generateCode(prompt)
      setGeneratedCode(result)
      // Fan out: paste code into compiler, then in parallel generate the
      // customer journey, the library overview, and the dashboard widgets.
      void autoApplyGeneratedCode(prompt, result)
    } catch (error) {
      toast.error('Failed to generate code')
    } finally {
      setLoading(false)
    }
  }

  // Push generated code straight into the prototype's code field (so it
  // appears in the SDV Code compiler tab) and trigger all derived
  // auto-generations in parallel.
  const autoApplyGeneratedCode = async (
    usedPrompt: string,
    generated: string,
  ) => {
    if (!currentPrototype?.id) return
    if (!generated || generated.trim().length < 10) return

    // 1) Paste code into the SDV Code compiler
    try {
      await updatePrototypeService(currentPrototype.id, { code: generated })
      toast.success('Generated code pasted into the SDV Code editor.')
    } catch (err) {
      console.warn('Failed to paste code into prototype:', err)
    }

    // 2..4) Run derived generators in parallel; each is non-blocking
    await Promise.allSettled([
      autoSyncCustomerJourneyAsync(usedPrompt, generated),
      autoSyncOverview(usedPrompt, generated),
      autoSyncDashboard(usedPrompt, generated),
    ])

    try {
      await refetchCurrentPrototype()
    } catch (_) {
      /* non-blocking */
    }
  }

  const autoSyncCustomerJourneyAsync = async (
    usedPrompt: string,
    generated: string,
  ) => {
    if (!currentPrototype?.id) return
    try {
      const useCaseParts: string[] = []
      if (currentPrototype.name)
        useCaseParts.push(`Prototype: ${currentPrototype.name}`)
      if (usedPrompt) useCaseParts.push(`User prompt: ${usedPrompt}`)
      const problem = (currentPrototype as any)?.description?.problem
      if (problem) useCaseParts.push(`Problem: ${problem}`)
      const useCase = useCaseParts.join('\n')
      const journey = await generateJourney(useCase, generated)
      if (!journey || journey.trim().length < 10) return
      await updatePrototypeService(currentPrototype.id, {
        customer_journey: journey,
      })
      toast.info('Customer Journey was auto-updated.')
    } catch (err) {
      console.warn('Auto customer-journey update failed (non-blocking):', err)
    }
  }

  const autoSyncOverview = async (
    usedPrompt: string,
    generated: string,
  ) => {
    if (!currentPrototype?.id) return
    try {
      const overview = await generateOverview(usedPrompt, generated)
      if (!overview.problem && !overview.solution) return
      await updatePrototypeService(currentPrototype.id, {
        description: {
          problem: overview.problem,
          says_who: overview.says_who,
          solution: overview.solution,
          status:
            (currentPrototype as any)?.description?.status || '',
          text:
            (currentPrototype as any)?.description?.text || '',
        } as any,
      } as any)
      toast.info('Overview was auto-updated.')
    } catch (err) {
      console.warn('Auto overview update failed (non-blocking):', err)
    }
  }

  const autoSyncDashboard = async (
    usedPrompt: string,
    generated: string,
  ) => {
    if (!currentPrototype?.id) return
    try {
      const widgetConfig = await generateDashboard(usedPrompt, generated)
      if (!widgetConfig) return
      // widgetConfig may arrive as a string; ensure it is valid JSON before saving
      let parsed: any = widgetConfig
      if (typeof widgetConfig === 'string') {
        try { parsed = JSON.parse(widgetConfig) } catch (_) {
          console.warn('Dashboard widget config is not valid JSON:', widgetConfig.slice(0, 200))
          toast.error('Dashboard auto-generation returned invalid data. Check Azure OpenAI config.')
          return
        }
      }
      if (!parsed?.widgets?.length) {
        toast.warning('Dashboard auto-generation produced no widgets (no VSS signals detected in code).')
        return
      }
      await updatePrototypeService(currentPrototype.id, {
        widget_config: typeof widgetConfig === 'string' ? widgetConfig : JSON.stringify(widgetConfig),
      } as any)
      toast.success(`Dashboard updated — ${parsed.widgets.length} widget(s) placed. Open the Dashboard tab to see them.`)
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.warn('Auto dashboard update failed:', msg)
      toast.error(`Dashboard auto-generation failed: ${msg}`)
    }
  }



  const handleGenerateScenarios = async () => {
    if (!code.trim()) {
      toast.error('Please enter your SDV code')
      return
    }
    setLoadingScenarios(true)
    try {
      const result = await generateScenarios(code, prompt)
      setScenarios(result)
    } catch (error) {
      toast.error('Failed to generate scenarios')
    } finally {
      setLoadingScenarios(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    toast.success('Code copied to clipboard')
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="mb-4">
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'code' ? 'default' : 'outline'}
            onClick={() => setMode('code')}
          >
            Code Generation
          </Button>
          <Button
            variant={mode === 'scenarios' ? 'default' : 'outline'}
            onClick={() => setMode('scenarios')}
          >
            Scenario Generation
          </Button>
        </div>
      </div>

      {mode === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your use case
            </label>
            <textarea
              className="w-full p-3 border rounded-md"
              rows={4}
              placeholder="e.g., Turn on low beam light"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerateCode} disabled={loading}>
            {loading ? <Spinner /> : 'Generate Code'}
          </Button>

          {generatedCode && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Generated Code</label>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  Copy
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                {generatedCode}
              </pre>
            </div>
          )}
        </div>
      )}

      {mode === 'scenarios' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste your SDV code
            </label>
            <textarea
              className="w-full p-3 border rounded-md"
              rows={6}
              placeholder="Paste your Python code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional requirements (optional)
            </label>
            <textarea
              className="w-full p-3 border rounded-md"
              rows={2}
              placeholder="Any specific scenarios you want..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerateScenarios} disabled={loadingScenarios}>
            {loadingScenarios ? <Spinner /> : 'Generate Scenarios'}
          </Button>

          {scenarios && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Generated Scenarios</label>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                {scenarios}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AiGenerator