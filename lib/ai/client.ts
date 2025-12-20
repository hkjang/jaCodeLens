import OpenAI from 'openai'

// Default to Ollama local URL if not specified
const BASE_URL = process.env.AI_BASE_URL || 'http://localhost:11434/v1'
const API_KEY = process.env.AI_API_KEY || 'ollama' // Ollama usually accepts any key

export const aiClient = new OpenAI({
  baseURL: BASE_URL,
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true // Allow running in client-side if needed (though usually server-side)
})

export const DEFAULT_MODEL = process.env.AI_MODEL || 'llama3' // Or 'codellama', 'mistral' etc.

export async function checkConnectivity(): Promise<boolean> {
  try {
    const list = await aiClient.models.list()
    return list.data.length > 0
  } catch (error) {
    console.error('AI Provider connectivity verification failed:', error)
    return false
  }
}
