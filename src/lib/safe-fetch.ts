import { lookup } from 'node:dns'
import { isIP } from 'node:net'
import { Agent, buildConnector, fetch, type RequestInit, type Response } from 'undici'

const MAX_REDIRECTS = 3

function isPrivateIpv4(address: string) {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = octets
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
}

export function isPublicIpAddress(address: string) {
  const normalized = address.toLowerCase().split('%', 1)[0]
  const version = isIP(normalized)
  if (version === 4) return !isPrivateIpv4(normalized)
  if (version !== 6) return false

  const mappedIpv4 = normalized.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  if (mappedIpv4) return !isPrivateIpv4(mappedIpv4)
  return normalized !== '::'
    && normalized !== '::1'
    && !normalized.startsWith('fc')
    && !normalized.startsWith('fd')
    && !/^fe[89ab]/.test(normalized)
    && !normalized.startsWith('ff')
    && !normalized.startsWith('2001:db8:')
}

const connector = buildConnector({
  timeout: 10_000,
  lookup(hostname, options, callback) {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return callback(error, '', 0)
      const address = addresses.find((candidate) => isPublicIpAddress(candidate.address))
      if (!address || addresses.some((candidate) => !isPublicIpAddress(candidate.address))) {
        return callback(new Error('Destination resolves to a non-public address'), '', 0)
      }
      if (typeof options === 'object' && options.all) {
        callback(null, addresses as never, undefined as never)
      } else {
        callback(null, address.address, address.family)
      }
    })
  },
})

const dispatcher = new Agent({
  connect: connector,
  headersTimeout: 15_000,
  bodyTimeout: 20_000,
})

function validatedUrl(value: string | URL, allowedHosts?: ReadonlySet<string>) {
  const url = value instanceof URL ? new URL(value) : new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Unsafe outbound URL')
  }
  if ((url.protocol === 'http:' && url.port && url.port !== '80') || (url.protocol === 'https:' && url.port && url.port !== '443')) {
    throw new Error('Unsafe outbound port')
  }
  const hostname = url.hostname.toLowerCase()
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || (allowedHosts && !allowedHosts.has(hostname))
  ) throw new Error('Outbound host is not allowed')
  return url
}

export async function safeFetch(
  value: string | URL,
  options: RequestInit & { allowedHosts?: ReadonlySet<string>; timeoutMs?: number } = {},
): Promise<Response> {
  const { allowedHosts, timeoutMs = 20_000, ...requestOptions } = options
  let url = validatedUrl(value, allowedHosts)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(url, {
        ...requestOptions,
        dispatcher,
        redirect: 'manual',
        signal: controller.signal,
      })
      if (![301, 302, 303, 307, 308].includes(response.status)) return response

      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location || redirects === MAX_REDIRECTS) throw new Error('Unsafe outbound redirect')
      url = validatedUrl(new URL(location, url), allowedHosts)
    }
    throw new Error('Too many redirects')
  } finally {
    clearTimeout(timeout)
  }
}

export async function readLimitedResponse(response: Response, maxBytes: number, timeoutMs = 30_000) {
  const declaredLength = Number(response.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel()
    throw new Error('Outbound response exceeds the size limit')
  }

  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    void reader.cancel('Outbound response timed out')
  }, timeoutMs)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (timedOut) throw new Error('Outbound response timed out')
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw new Error('Outbound response exceeds the size limit')
      chunks.push(Buffer.from(value))
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    clearTimeout(timeout)
  }
  return Buffer.concat(chunks, total)
}
