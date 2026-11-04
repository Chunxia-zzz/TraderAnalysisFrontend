import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 利弗莫尔（关键点突破）与 6 因子评分是**两套方向相反**的体系（constitution §二，NON-NEGOTIABLE）：
 * 前者买突破、后者买超卖，两套数据不能混进同一条数据流。
 *
 * 这条原则此前只写在文档里，靠 review 记得。这里把它变成机器检查：
 *   - 利弗莫尔相关调用必须只命中 /api/livermore/*
 *   - 不得顺带请求任何评分类端点
 */

const h = vi.hoisted(() => {
  const calls = []
  const record = (method) => (url, a, b) => {
    calls.push({ method, url, args: [a, b] })
    return Promise.resolve({ data: null })
  }
  return { calls, record }
})

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: h.record('get'),
      post: h.record('post'),
      put: h.record('put'),
      patch: h.record('patch'),
      delete: h.record('delete'),
    }),
  },
}))

const api = await import('../../src/api/trader.js')

const last = () => h.calls[h.calls.length - 1]

beforeEach(() => {
  h.calls.length = 0
})

describe('利弗莫尔信号参数构造', () => {
  it('无参数调用时不带任何可选字段', () => {
    api.getLivermoreSignals()
    expect(last()).toMatchObject({ method: 'get', url: '/api/livermore/signals' })
    expect(last().args[0].params).toEqual({})
  })

  it("source 为 'live' 时不传（避免把默认值写进 URL）", () => {
    api.getLivermoreSignals({ source: 'live' })
    expect(last().args[0].params).toEqual({})
  })

  it("source 为非 live 时透传，并把布尔开关转成 1", () => {
    api.getLivermoreSignals({ date: '2026-01-05', source: 'backtest', allTide: true, refresh: true })
    expect(last().args[0].params).toEqual({
      date: '2026-01-05',
      source: 'backtest',
      all: 1,
      refresh: 1,
    })
  })

  it('放宽 timeout 到 30s（该接口要扫全标的池）', () => {
    api.getLivermoreSignals()
    expect(last().args[0].timeout).toBe(30000)
  })

  it('getLivermoreDetail 只带 code', () => {
    api.getLivermoreDetail('AAPL')
    expect(last().url).toBe('/api/livermore/detail')
    expect(last().args[0].params).toEqual({ code: 'AAPL' })
  })
})

describe('两套体系不混流', () => {
  it('利弗莫尔调用只命中 /api/livermore/*，不触碰评分类端点', () => {
    api.getLivermoreSignals({ date: '2026-01-05' })
    api.getLivermoreDetail('AAPL')

    const urls = h.calls.map((c) => c.url)
    expect(urls).toHaveLength(2)
    for (const url of urls) {
      expect(url.startsWith('/api/livermore/')).toBe(true)
    }
    expect(urls.some((u) => u.includes('/scores/'))).toBe(false)
    expect(urls.some((u) => u.includes('/signals') && !u.startsWith('/api/livermore/'))).toBe(false)
  })
})
