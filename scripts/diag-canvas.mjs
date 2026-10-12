// 诊断：.lw-outer 内所有可见后代元素的位置与文本，确认左边缘是否有 DOM 文本溢出
import { connect, evaluate, goto, launchChrome, shutdown, waitFor } from 'file:///C:/Users/Administrator/.workbuddy/skills/cdp-ui-smoke/assets/cdp.mjs'

const BASE = process.env.TA_UI_BASE || 'http://127.0.0.1:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const probe = `(() => {
  const outer = document.querySelector('.lw-outer')
  if (!outer) return 'no .lw-outer'
  const o = outer.getBoundingClientRect()
  const rows = []
  const walk = (el, depth) => {
    for (const c of el.children) {
      const r = c.getBoundingClientRect()
      const txt = (c.innerText || '').replace(/\\s+/g, ' ').trim()
      if (r.width > 0 && r.height > 0) {
        rows.push({
          d: depth,
          tag: c.tagName,
          cls: String(c.className || '').slice(0, 34),
          relLeft: Math.round(r.left - o.left),
          relTop: Math.round(r.top - o.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
          txt: txt.slice(0, 50),
        })
      }
      if (c.children.length) walk(c, depth + 1)
    }
  }
  walk(outer, 0)
  return JSON.stringify({ outerLeftDoc: Math.round(o.left + scrollX), outerTopDoc: Math.round(o.top + scrollY), count: rows.length, rows }, null, 1)
})()`

const { proc } = await launchChrome()
const { send } = await connect()
await send('Runtime.enable')

try {
  await goto(send, `${BASE}/chart?code=US.AAPL`)
  await waitFor(send, `!!document.querySelector('.kv-row')`, { timeout: 30_000 })
  await sleep(1500)
  console.log(await evaluate(send, probe))
} catch (e) {
  console.log('[异常]', e.stack)
} finally {
  await shutdown(proc)
}
