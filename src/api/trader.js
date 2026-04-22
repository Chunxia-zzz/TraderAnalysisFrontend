import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.config?.url, error.message)
    return Promise.reject(error)
  }
)

export const getHealth       = ()             => client.get('/health')
export const getLatest       = ()             => client.get('/v1/indicators/latest')
export const getHistory      = (limit = 100)  => client.get('/v1/indicators/history', { params: { limit } })
export const getLatestSignal = ()             => client.get('/v1/signals/latest')

// ── 新接口 (/api) ──────────────────────────────────────────
export const getIndicators       = (code, ktype = '1d', days = 250) =>
  client.get('/api/indicators', { params: { code, ktype, days } })

export const getIndicatorsLatest = (code, ktype = '1d') =>
  client.get('/api/indicators/latest', { params: { code, ktype } })

export const getScoresLatest     = (code) =>
  client.get('/api/scores/latest', { params: { code } })

export const getWatchlist        = () =>
  client.get('/api/watchlist')
