import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

// ── 健康检查 ──
export const getHealth = () => client.get('/health')

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
export const getAssetTemperatureHistory = (asset, days = 60) =>
  client.get('/api/asset-temperature/history', { params: { asset, days } })

// ── 止盈止损 ──
export const getTpSl = (code, params) =>
  client.get('/api/tp-sl', { params: { code, ...params } })

// ── 信号回测 ──
export const getBacktestRun = (params) =>
  client.get('/api/backtest/run', { params, timeout: 30000 })

// ── 技术分析（支撑/压力位 + 形态 + 趋势）──
export const getAnalysis = (code, ktype = '1d') =>
  client.get('/api/analysis', { params: { code, ktype } })

// ── 交易信号（顶/底背离）──
export const getTradeSignals = (code) =>
  client.get('/api/trade-signals', { params: { code } })
