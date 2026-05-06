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