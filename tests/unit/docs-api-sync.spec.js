import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 文档与代码一致性检查（constitution §五 的判定标准）。
 *
 * 原文：「`README.md` 的 API 函数表与 `src/api/trader.js` 导出一一对应，无遗漏无虚构」。
 * 此前这条只能靠人肉眼比对——而它已经失效过一次（README 曾写 33 个导出、实际 30 个；
 * 5 个函数只出现在正文里、没进表）。
 *
 * 这里把三个可判定的点变成测试：
 *   ① 表里写了的端点，代码里必须真有（防虚构）
 *   ② 代码里发出的端点，表里必须写到（防遗漏）
 *   ③ 表头声明的导出函数数量，必须等于实际导出数量
 */

const readme = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8')
const apiSource = readFileSync(
  fileURLToPath(new URL('../../src/api/trader.js', import.meta.url)),
  'utf8'
)

/**
 * 后端保留、前端明确不再封装的端点（2026-11-02 下线持仓配置，见 specs/002-*）。
 * 它们**可以**出现在 README 表里（会一直列着，否则没人知道接口还在），
 * 但代码里不该有对应函数 —— 所以从「表 → 代码」这一侧豁免。
 */
const BACKEND_ONLY = ['GET /api/position', 'GET /api/allocation', 'PUT /api/allocation']

/** 把 `{code}` / `${code}` / `{key}` 统一成 `:param`，避免模板写法差异导致假失败 */
const normalize = (method, path) => `${method.toUpperCase()} ${path.replace(/\$\{[^}]+\}|\{[^}]+\}/g, ':param')}`

/** README 表格里的「接口」列：`GET /api/xxx` */
const documented = new Set(
  [...readme.matchAll(/^\|\s*`(GET|POST|PUT|PATCH|DELETE)\s+([^`\s]+)`\s*\|/gm)].map((m) =>
    normalize(m[1], m[2])
  )
)

/** 代码里真实发出的端点：client.get('/x') / client.post(`/x/${code}`) ... */
const implemented = new Set(
  [...apiSource.matchAll(/client\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) =>
    normalize(m[1], m[2])
  )
)

describe('README 的 API 表 ↔ src/api/trader.js', () => {
  it('两侧都解析出了内容（防止正则失配后"空对空"通过）', () => {
    expect(documented.size).toBeGreaterThan(20)
    expect(implemented.size).toBeGreaterThan(20)
  })

  it('表里写的端点，代码里必须有（无虚构）', () => {
    const fabricated = [...documented].filter((e) => !implemented.has(e) && !BACKEND_ONLY.includes(e))
    expect(fabricated).toEqual([])
  })

  it('代码里的端点，表里必须写到（无遗漏）', () => {
    const missing = [...implemented].filter((e) => !documented.has(e))
    expect(missing).toEqual([])
  })

  it('表头声明的导出函数数量与实际一致', () => {
    const declared = readme.match(/(\d+)\s*个导出函数/)
    expect(declared, 'README 里找不到「N 个导出函数」的说法，表头可能被改写了').not.toBeNull()

    const actual = [...apiSource.matchAll(/^export const (\w+)/gm)].length
    expect(Number(declared[1])).toBe(actual)
  })
})
