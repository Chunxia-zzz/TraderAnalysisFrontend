import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * API 层契约测试。
 *
 * 为什么测这个：`src/api/trader.js` 是前端唯一的数据出入口。参数构造错了（少传 date、
 * 把 ktype 写死角、timeout 用默认 10s 拉 30s 的接口），**构建不会报错**，页面只会空白或超时。
 * 这类回归只有断言「发出去了什么请求」才能抓住。
 *
 * 做法：把 axios 整个替换成记录器，不碰真实网络（CI 里没有后端，也不该有）。
 */

const h = vi.hoisted(() => {
  const calls = []
  const record = (method) => (url, a, b) => {
    calls.push({ method, url, args: [a, b] })
    return Promise.resolve({ data: null })
  }
  return { calls, record }
})

vi.mock('axios', () => {
  const client = {
    get: h.record('get'),
    post: h.record('post'),
    put: h.record('put'),
    patch: h.record('patch'),
    delete: h.record('delete'),
  }
  return { default: { create: () => client } }
})

const api = await import('../../src/api/trader.js')

/** 最近一次请求 */
const last = () => h.calls[h.calls.length - 1]
/** GET 的 config */
const cfg = () => last().args[0]
/** POST/PUT/PATCH 的第二个参数（payload）与第三个（config） */
const payload = () => last().args[0]
const cfg3 = () => last().args[1]

beforeEach(() => {
  h.calls.length = 0
})

describe('健康检查', () => {
  it('getHealth 请求 /health，不带参数', () => {
    api.getHealth()
    expect(last()).toMatchObject({ method: 'get', url: '/health' })
    expect(cfg()).toBeUndefined()
  })
})

describe('标的池', () => {
  it('getWatchlist 把筛选条件原样放进 params', () => {
    api.getWatchlist({ status: 'watching', category: 'ai' })
    expect(last().url).toBe('/api/watchlist')
    expect(cfg().params).toEqual({ status: 'watching', category: 'ai' })
  })

  it('getWatchlistDetail 把 code 拼进路径而不是塞 params', () => {
    api.getWatchlistDetail('AAPL')
    expect(last()).toMatchObject({ method: 'get', url: '/api/watchlist/AAPL' })
  })

  it('addWatchlistStock 用 POST 提交 payload', () => {
    api.addWatchlistStock({ code: 'AAPL', notes: 'x' })
    expect(last()).toMatchObject({ method: 'post', url: '/api/watchlist' })
    expect(payload()).toEqual({ code: 'AAPL', notes: 'x' })
  })

  it('updateWatchlistStock 用 PATCH 带 payload', () => {
    api.updateWatchlistStock('AAPL', { notes: '新备注' })
    expect(last()).toMatchObject({ method: 'patch', url: '/api/watchlist/AAPL' })
    expect(payload()).toEqual({ notes: '新备注' })
  })

  it('deleteWatchlistStock 用 DELETE', () => {
    api.deleteWatchlistStock('AAPL')
    expect(last()).toMatchObject({ method: 'delete', url: '/api/watchlist/AAPL' })
  })

  it('batchAddWatchlist 打到 /batch', () => {
    api.batchAddWatchlist([{ code: 'A' }])
    expect(last()).toMatchObject({ method: 'post', url: '/api/watchlist/batch' })
  })

  it('refreshSnapshot 不传 code 时 params 为空对象，传 code 时才带上', () => {
    api.refreshSnapshot()
    expect(last().url).toBe('/api/watchlist/refresh-snapshot')
    expect(cfg3().params).toEqual({})

    api.refreshSnapshot('AAPL')
    expect(cfg3().params).toEqual({ code: 'AAPL' })
  })
})

describe('技术指标', () => {
  it('getIndicators 默认 ktype=1d、days=60', () => {
    api.getIndicators('AAPL')
    expect(cfg().params).toEqual({ code: 'AAPL', ktype: '1d', days: 60 })
  })

  it('getIndicators 允许覆盖周期与天数', () => {
    api.getIndicators('AAPL', '4h', 120)
    expect(cfg().params).toEqual({ code: 'AAPL', ktype: '4h', days: 120 })
  })

  it('getIndicatorsLatest 打到 /latest', () => {
    api.getIndicatorsLatest('AAPL', '1w')
    expect(last().url).toBe('/api/indicators/latest')
    expect(cfg().params).toEqual({ code: 'AAPL', ktype: '1w' })
  })
})

describe('评分', () => {
  it('getScoresLatest 不传 date 时 params 里没有 date 键', () => {
    api.getScoresLatest('AAPL')
    expect(cfg().params).toEqual({ code: 'AAPL' })
    expect('date' in cfg().params).toBe(false)
  })

  it('getScoresLatest 传 date 时带上 date', () => {
    api.getScoresLatest('AAPL', '2026-01-05')
    expect(cfg().params).toEqual({ code: 'AAPL', date: '2026-01-05' })
  })

  it('getScoresOverview 支持可选 date', () => {
    api.getScoresOverview()
    expect(cfg().params).toEqual({})
    api.getScoresOverview('2026-01-05')
    expect(cfg().params).toEqual({ date: '2026-01-05' })
  })
})

describe('信号', () => {
  it('getEmaCrossSignals 打到 /api/ema-cross-signals', () => {
    api.getEmaCrossSignals()
    expect(last().url).toBe('/api/ema-cross-signals')
  })

  it('getTradeSignals / getBottomSignals 各自独立端点', () => {
    api.getTradeSignals('AAPL')
    expect(last().url).toBe('/api/trade-signals')
    api.getBottomSignals('AAPL')
    expect(last().url).toBe('/api/bottom-signals')
    expect(cfg().params).toEqual({ code: 'AAPL', days: 7 })
  })

  it('getDailyPicks 放宽 timeout 到 30s', () => {
    api.getDailyPicks('2026-01-05')
    expect(cfg().timeout).toBe(30000)
    expect(cfg().params).toEqual({ date: '2026-01-05' })
  })
})

describe('市场温度', () => {
  it('getMarketTemperature 不带参数', () => {
    api.getMarketTemperature()
    expect(last()).toMatchObject({ method: 'get', url: '/api/market-temperature' })
  })

  it('getMarketTemperatureHistory 默认拉 2025-01-01 起的全量序列', () => {
    api.getMarketTemperatureHistory()
    // 2026-11-10 拆分后：两条指数序列 + 温差，默认覆盖全部可回算区间
    expect(cfg().params).toEqual({ days: 465, start: '2025-01-01' })
  })

  it('getMarketTemperatureHistory 支持自定义 days 与 start', () => {
    api.getMarketTemperatureHistory(60, '2026-01-01')
    expect(cfg().params).toEqual({ days: 60, start: '2026-01-01' })
  })

  it('getAssetTemperatureHistory 默认 60 天并带 asset', () => {
    api.getAssetTemperatureHistory('gold')
    expect(cfg().params).toEqual({ asset: 'gold', days: 60 })
  })
})

describe('分析 / 估值 / 回测', () => {
  it('getAnalysis 默认 ktype=1d，传 date 才带 date', () => {
    api.getAnalysis('AAPL')
    expect(cfg().params).toEqual({ code: 'AAPL', ktype: '1d' })
    api.getAnalysis('AAPL', '2026-01-05', '4h')
    expect(cfg().params).toEqual({ code: 'AAPL', ktype: '4h', date: '2026-01-05' })
  })

  it('getFundamental 带 code 与可选 date', () => {
    api.getFundamental('AAPL', '2026-01-05')
    expect(last().url).toBe('/api/fundamental')
    expect(cfg().params).toEqual({ code: 'AAPL', date: '2026-01-05' })
  })

  it('getTpSl 把额外参数平铺进 params', () => {
    api.getTpSl('AAPL', { atr_multiplier: 2 })
    expect(cfg().params).toEqual({ code: 'AAPL', atr_multiplier: 2 })
  })

  it('getBacktestRun 放宽 timeout 到 30s', () => {
    api.getBacktestRun({ mode: 'ema_cross' })
    expect(last().url).toBe('/api/backtest/run')
    expect(cfg()).toMatchObject({ params: { mode: 'ema_cross' }, timeout: 30000 })
  })
})

describe('内容与复盘', () => {
  it('getContentGenerator 只带传入的可选字段', () => {
    api.getContentGenerator('AAPL')
    expect(cfg().params).toEqual({ code: 'AAPL' })
    expect(cfg().timeout).toBe(30000)
  })

  it('getReview 带 type 与可选 date', () => {
    api.getReview('daily', '2026-01-05')
    expect(cfg().params).toEqual({ type: 'daily', date: '2026-01-05' })
  })

  it('模板三件套：list / save / delete', () => {
    api.listContentTemplates()
    expect(last()).toMatchObject({ method: 'get', url: '/api/content-templates' })

    api.saveContentTemplate('daily', { body: 'x' })
    expect(last()).toMatchObject({ method: 'put', url: '/api/content-templates/daily' })

    api.deleteContentTemplate('daily')
    expect(last()).toMatchObject({ method: 'delete', url: '/api/content-templates/daily' })
  })
})
