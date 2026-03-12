import axios from 'axios'

export type PingResult = {
  status: 'UP' | 'DOWN'
  response_time: number
  status_code: number | null
  error: string | null
}

const MAX_RETRIES = 3
const TIMEOUT_MS = 10000

export async function pingUrl(url: string): Promise<PingResult> {
  let lastError: string | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now()
    try {
      const response = await axios({
        method: 'HEAD',
        url,
        timeout: TIMEOUT_MS,
        validateStatus: () => true, // Don't throw on any status
        headers: {
          'User-Agent': 'UptimePulse-Monitor/1.0',
        },
        maxRedirects: 5,
      })

      const responseTime = Date.now() - startTime
      const statusCode = response.status

      // 2xx and 3xx are UP
      if (statusCode >= 200 && statusCode < 400) {
        return {
          status: 'UP',
          response_time: responseTime,
          status_code: statusCode,
          error: null,
        }
      }

      // 4xx / 5xx
      lastError = `HTTP ${statusCode}`
      
      // If we get a definitive server error, no reason to retry
      if (statusCode >= 400 && statusCode < 500) {
        return {
          status: 'DOWN',
          response_time: responseTime,
          status_code: statusCode,
          error: lastError,
        }
      }

    } catch (err: unknown) {
      const responseTime = Date.now() - startTime
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          lastError = `Timeout after ${responseTime}ms`
        } else if (err.code === 'ENOTFOUND') {
          lastError = 'DNS resolution failed'
        } else if (err.code === 'ECONNREFUSED') {
          lastError = 'Connection refused'
        } else {
          lastError = err.message || 'Network error'
        }
      } else {
        lastError = 'Unknown error'
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < MAX_RETRIES) {
      await new Promise(res => setTimeout(res, attempt * 1000))
    }
  }

  return {
    status: 'DOWN',
    response_time: TIMEOUT_MS,
    status_code: null,
    error: lastError || 'Failed after 3 retries',
  }
}
