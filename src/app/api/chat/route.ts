import { jsonWithNoStore } from '@/lib/cache'
import {
  ChatAgentModelError,
  answerLocalChatFallback,
  runChatAgent,
  type ChatCompletionRequest,
} from '@/lib/chat-agent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  role: ChatRole
  content: string
}

const DEFAULT_FREELLMAPI_BASE_URL = 'http://localhost:3001/v1'
const DEFAULT_FREELLMAPI_CHAT_MODEL = 'auto'
const MAX_HISTORY_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1800

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const messages: ChatMessage[] = []
  for (const item of value) {
    if (!isRecord(item)) return null

    const { role, content } = item
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null

    const trimmed = content.trim()
    if (!trimmed) return null
    messages.push({
      role,
      content: trimmed.slice(0, MAX_MESSAGE_LENGTH),
    })
  }

  if (!messages.some((message) => message.role === 'user')) return null
  return messages.slice(-MAX_HISTORY_MESSAGES)
}

function freeLlmApiErrorMessage(status: number) {
  if (status === 400) return 'Plana could not send that chat request correctly. Please try a shorter message.'
  if (status === 401) return 'Plana could not authenticate with FreeLLMAPI. Please check FREELLMAPI_API_KEY.'
  if (status === 402) return 'FreeLLMAPI cannot use the configured providers right now. Please check provider credits or quota.'
  if (status === 403) return 'FreeLLMAPI blocked this chat request. Please try a different Stratonas-related question.'
  if (status === 502 || status === 503) return 'The selected chat model is unavailable right now. Please try again soon.'
  return 'Plana could not reach the chat model right now. Please try again soon.'
}

function chatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}/chat/completions`
}

async function readFreeLlmApiError(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''

  try {
    const parsed = JSON.parse(text) as unknown
    if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string') {
      return parsed.error.message
    }
  } catch {
    return text.slice(0, 300)
  }

  return text.slice(0, 300)
}

async function callFreeLlmApi(body: ChatCompletionRequest, apiKey: string, baseUrl: string) {
  return fetch(chatCompletionsUrl(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function freeLlmApiAgentCall(body: ChatCompletionRequest, apiKey: string, baseUrl: string) {
  const response = await callFreeLlmApi(body, apiKey, baseUrl)
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: await response.json().catch(() => null) as unknown,
    }
  }

  return {
    ok: false,
    status: response.status,
    data: null,
    detail: await readFreeLlmApiError(response),
  }
}

export async function POST(req: Request) {
  let messages: ChatMessage[] | null = null
  let memory: unknown = null

  try {
    const body = await req.json()
    if (isRecord(body)) {
      messages = normalizeMessages(body.messages)
      memory = body.memory
    }
  } catch {
    return jsonWithNoStore({ error: 'Invalid chat request.' }, { status: 400 })
  }

  if (!messages) {
    return jsonWithNoStore({ error: 'Chat messages are required.' }, { status: 400 })
  }

  const apiKey = process.env.FREELLMAPI_API_KEY?.trim()
  if (!apiKey) {
    return jsonWithNoStore(
      { error: 'Plana is not connected to FreeLLMAPI yet. Please set FREELLMAPI_API_KEY on the server.' },
      { status: 500 }
    )
  }

  const baseUrl = process.env.FREELLMAPI_BASE_URL?.trim() || DEFAULT_FREELLMAPI_BASE_URL
  const model = process.env.FREELLMAPI_CHAT_MODEL?.trim() || DEFAULT_FREELLMAPI_CHAT_MODEL

  try {
    const response = await runChatAgent({
      messages,
      memory,
      model,
      callModel: (request) => freeLlmApiAgentCall(request, apiKey, baseUrl),
    })

    return jsonWithNoStore({
      message: response.message,
      model: response.model,
      memory: response.memory,
      expression: response.expression,
      expressionIntensity: response.expressionIntensity,
    })
  } catch (error) {
    if (error instanceof ChatAgentModelError) {
      if (error.status === 429) {
        const local = await answerLocalChatFallback({ messages, memory, model })
        if (local) {
          return jsonWithNoStore({
            message: local.message,
            model: local.model,
            memory: local.memory,
            expression: local.expression,
            expressionIntensity: local.expressionIntensity,
          })
        }
      }

      console.warn(`Tool chat model ${model} failed with ${error.status}${error.detail ? `: ${error.detail}` : ''}`)
      return jsonWithNoStore(
        { error: freeLlmApiErrorMessage(error.status) },
        { status: error.status >= 500 ? 502 : error.status }
      )
    }

    console.error('Chat route failed', error)
    return jsonWithNoStore({ error: 'Plana could not reach the site data right now. Please try again soon.' }, { status: 500 })
  }
}
