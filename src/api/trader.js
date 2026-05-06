import axios from 'axios'
import router from '../router'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
})

// 请求拦截器：自动附加 token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时清除 token 并跳转登录
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      router.replace('/login')
    }
    console.error('[API Error]', error.config?.url, error.message)
    return Promise.reject(error)
  }
)

// ── 健康检查 ──
export const getHealth = () => client.get('/health')

// ── 认证 ──
export const getAuthMe = () => client.get('/api/auth/me')
export const changePassword = (old_password, new_password) =>
  client.post('/api/auth/change-password', { old_password, new_password })

// ── 标的池 ──
export const getWatchlist = (params) => client.get('/api/watchlist', { params })
export const getWatchlistDetail = (code) => client.get(`/api/watchlist/${code}`)
export const addWatchlistStock = (payload) => client.post('/api/watchlist', payload)
export const updateWatchlistStock = (code, payload) => client.patch(`/api/watchlist/${code}`, payload)
export const deleteWatchlistStock = (code) => client.delete(`/api/watchlist/${code}`)
export const batchAddWatchlist = (payload) => client.post('/api/watchlist/batch', payload)
export const refreshSnapshot = (code) =>
  client.post('/api/watchlist/refresh-snapshot', null, { params: code ? { code } : {} })

// ── 条件选股 ──
export const stockFilterSearch = (params) => client.get('/api/stock-filter/search', { params })
export const stockFilterInfo = (code) => client.get('/api/stock-filter/info', { params: { code } })

// ── 基本面分析 ──
export const getFundamentalLatest = (code) =>
  client.get('/api/fundamental/latest', { params: { code } })

export const getFundamentalOverview = () =>
  client.get('/api/fundamental/overview')

// ── 技术指标 ──
export const getIndicators = (code, ktype = '1d', days = 60) =>
  client.get('/api/indicators', { params: { code, ktype, days } })

export const getIndicatorsLatest = (code, ktype = '1d') =>
  client.get('/api/indicators/latest', { params: { code, ktype } })

// ── 评分 ──
export const getScoresLatest = (code, date) =>
  client.get('/api/scores/latest', { params: { code, ...(date ? { date } : {}) } })

export const getScoresOverview = (date) =>
  client.get('/api/scores/overview', { params: { ...(date ? { date } : {}) } })

// ── 市场温度 ──
export const getMarketTemperature = () =>
  client.get('/api/market-temperature')

export const getMarketTemperatureHistory = (days = 30) =>
  client.get('/api/market-temperature/history', { params: { days } })
