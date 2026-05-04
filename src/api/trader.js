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

// ── 健康检查（用 watchlist 接口代替，后端无 /health 端点） ──
export const getHealth = () => client.get('/api/watchlist')

// ── 标的池 ──
export const getWatchlist = () => client.get('/api/watchlist')

// ── 技术指标 ──
export const getIndicators = (code, ktype = '1d', days = 60) =>
  client.get('/api/indicators', { params: { code, ktype, days } })

export const getIndicatorsLatest = (code, ktype = '1d') =>
  client.get('/api/indicators/latest', { params: { code, ktype } })

// ── 评分 ──
export const getScoresLatest = (code) =>
  client.get('/api/scores/latest', { params: { code } })

// ── 市场温度 ──
export const getMarketTemperature = () =>
  client.get('/api/market-temperature')

export const getMarketTemperatureHistory = (days = 30) =>
  client.get('/api/market-temperature/history', { params: { days } })
