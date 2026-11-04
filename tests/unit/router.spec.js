import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 路由表与页面文件的一致性检查。
 *
 * 为什么需要：这个仓库真的踩过两类事故——
 *   ① 路由写了 `import('../views/X.vue')`，但文件被删/改名 → 点进页面白屏；
 *   ② 页面文件存在，但没人挂路由 → 用户永远到不了（`ScoresOverview.vue` 曾是"代码留着没入口"）。
 * 这两种问题构建都能通过，只有静态比对能抓。
 *
 * 不 import 真实 router 模块：它会 `createWebHistory()`，在 node 环境需要 DOM。
 * 这里解析源码文本，成本更低、意图更明确（检查的是"声明"，不是运行时行为）。
 */

const routerPath = fileURLToPath(new URL('../../src/router/index.js', import.meta.url))
const viewsDir = fileURLToPath(new URL('../../src/views/', import.meta.url))
const source = readFileSync(routerPath, 'utf8')

/** 路由里动态 import 的视图文件名 */
const importedViews = [...source.matchAll(/import\(\s*['"]\.\.\/views\/([^'"]+\.vue)['"]\s*\)/g)].map(
  (m) => m[1],
)

/** 声明的路由 path */
const routePaths = [...source.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

/** 声明的路由 name */
const routeNames = [...source.matchAll(/\bname:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

/** redirect 目标 */
const redirects = [...source.matchAll(/\bredirect:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

/** src/views 下真实存在的 .vue 文件 */
const actualViews = readdirSync(viewsDir).filter(
  (f) => f.endsWith('.vue') && statSync(`${viewsDir}${f}`).isFile(),
)

describe('路由指向的页面文件真实存在', () => {
  it('至少解析出了路由声明（防止正则失配后"空对空"通过）', () => {
    expect(importedViews.length).toBeGreaterThan(0)
    expect(routePaths.length).toBeGreaterThan(0)
  })

  it.each(importedViews)('src/views/%s 存在', (file) => {
    expect(actualViews).toContain(file)
  })
})

describe('没有"有页面却无入口"的孤儿文件', () => {
  it.each(actualViews)('src/views/%s 被路由引用', (file) => {
    expect(importedViews).toContain(file)
  })
})

describe('路由表自身自洽', () => {
  it('path 不重复', () => {
    expect(new Set(routePaths).size).toBe(routePaths.length)
  })

  it('name 不重复（重名会让 router-link 解析到错误页面）', () => {
    expect(new Set(routeNames).size).toBe(routeNames.length)
  })

  it('redirect 目标必须是一条已声明的路由', () => {
    expect(redirects.length).toBeGreaterThan(0)
    for (const target of redirects) {
      expect(routePaths).toContain(target)
    }
  })

  it('已下线页面（/position、/allocation）保留为重定向，不是组件', () => {
    // 见 specs/002-retire-position-allocation：软着陆，避免书签白屏
    const redirectBlock = source.slice(source.indexOf("path: '/position'"))
    expect(redirectBlock).toMatch(/redirect:\s*'\/'/)
    expect(source).toContain("path: '/allocation'")
  })
})
