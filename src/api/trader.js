import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

// ── 请求拦截：自动附加 Bearer token ──
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── 响应拦截：401 自动跳转登录 ──
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── 健康检查 ──
export const getHealth = () => client.get('/health')

// ── 认证 ──
export const login = (username, password) =>
  client.post('/api/auth/login', { username, password })
export const getMe = () => client.get('/api/auth/me')

// ── 用户管理（admin） ──
export const listUsers = () => client.get('/api/users')
export const createUser = (payload) => client.post('/api/users', payload)
export const setUserStatus = (username, is_active) =>
  client.patch(`/api/users/${username}/status`, null, { params: { is_active } })
export const resetUserPassword = (username, new_password) =>
  client.post(`/api/users/${username}/reset-password`, { new_password })
export const deleteUser = (username) => client.delete(`/api/users/${username}`)

// ── 标的池 ──
export const getWatchlist = (params) => client.get('/api/watchlist', { params })
export const getWatchlistDetail = (code) => client.get(`/api/watchlist/${code}`)
export const addWatchlistStock = (payload) => client.post('/api/watchlist', payload)
export const updateWatchlistStock = (code, payload) => client.patch(`/api/watchlist/${code}`, payload)
export const deleteWatchlistStock = (code) => client.delete(`/api/watchlist/${code}`)
export const batchAddWatchlist = (payload) => client.post('/api/watchlist/batch', payload)
export const refreshSnapshot = (code) =>
  client.post('/api/watchlist/refresh-snapshot', null, { params: code ? { code } : {} })

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
export const getMarketTemperature = () => client.get('/api/market-temperature')
export const getMarketTemperatureHistory = (days = 30) =>
  client.get('/api/market-temperature/history', { params: { days } })

// ── 止盈止损 ──
export const getTpSl = (code, params) =>
  client.get('/api/tp-sl', { params: { code, ...params } })

// ── 信号回测 ──
export const getBacktestRun = (params) =>
  client.get('/api/backtest/run', { params, timeout: 30000 })

// ── 网格交易 ──
export const getGridStatus = (configId) =>
  client.get('/api/grid/status', { params: { config_id: configId } })
export const getGridOrders = (configId, limit = 50) =>
  client.get('/api/grid/orders', { params: { config_id: configId, limit } })
