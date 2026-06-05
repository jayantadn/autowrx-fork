import axios from 'axios'
import config from '@/configs/config'


const API_BASE = `${config.serverBaseUrl}/${config.serverVersion}`

export const generateCode = async (prompt: string, context?: string) => {
  const res = await axios.post(`${API_BASE}/ai/generate-code`, {


    prompt,
    context
  }, {
    timeout: 60000
  })
  return res.data.code
}

export const generateScenarios = async (code: string, prompt?: string) => {

  const res = await axios.post(`${API_BASE}/ai/generate-scenarios`, {
    code,
    prompt
  }, {
    timeout: 60000
  })
  return res.data.scenarios
}

export const generateJourney = async (useCase: string, code?: string) => {
  const res = await axios.post(`${API_BASE}/ai/generate-journey`, {
    useCase,
    code,
  }, {
    timeout: 60000,
  })
  return res.data.journey as string
}

export interface GeneratedOverview {
  problem: string
  says_who: string
  solution: string
}

export const generateOverview = async (
  prompt: string,
  code?: string,
): Promise<GeneratedOverview> => {
  const res = await axios.post(
    `${API_BASE}/ai/generate-overview`,
    { prompt, code },
    { timeout: 60000 },
  )
  const o = res.data.overview || {}
  return {
    problem: String(o.problem || ''),
    says_who: String(o.says_who || ''),
    solution: String(o.solution || ''),
  }
}

export const generateDashboard = async (
  prompt: string,
  code: string,
): Promise<string> => {
  const res = await axios.post(
    `${API_BASE}/ai/generate-dashboard`,
    { prompt, code },
    { timeout: 60000 },
  )
  // backend returns widgetConfig as a JSON string already
  return res.data.widgetConfig as string
}