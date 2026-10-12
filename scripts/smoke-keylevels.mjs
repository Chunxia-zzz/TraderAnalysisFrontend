// K 线页「支撑压力关键位标注」的浏览器验收（零依赖 CDP）
// 用法：node scripts/smoke-keylevels.mjs
import {
  connect, evaluate, goto, launchChrome, screenshot, shutdown, waitFor,
} from 'file:///C:/Users/Administrator/.workbuddy/skills/cdp-ui-smoke/assets/cdp.mjs'

const BASE = process.env.TA_UI_BASE || 'http://127.0.0.1:5173'
const CODE = process.env.TA_UI_CODE || 'US.AAPL'
const SHOT = process.env.TA_SHOT || 'F:/TraderAnalysis/logs/chart-keylevels.png'

let ok = 0
const failures = []
const pageErrors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function check(name, cond, extra = '') {
  if (cond) { ok += 1; console.log(`  OK   ${name}`) }
  else { failures.push(name); console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`) }
}

const { proc } = await launchChrome()
const { send, ws } = await connect()

// 收集页面异常与控制台错误（canvas 绘制出错只有这里能看到）
ws.addEventListener('message', (ev) => {
  try {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails
      pageErrors.push(d?.exception?.description || d?.text || 'unknown exception')
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      pageErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
    }
  } catch { /* 忽略非 JSON 帧 */ }
})
await send('Runtime.enable')
await send('Page.enable')

try {
  console.log(`\n[1] 打开 /chart?code=${CODE}`)
  await goto(send, `${BASE}/chart?code=${CODE}`)
  await waitFor(send, `!!document.querySelector('.kv-row')`, { label: '关键位明细出现', timeout: 30_000 })
  await sleep(1200)   // 等图表与表格渲染稳定

  console.log('\n[2] 图表容器')
  const canvasCount = await evaluate(send, `document.querySelectorAll('.lw-inner canvas').length`)
  check('K 线图表已渲染 canvas', canvasCount >= 2, `canvas=${canvasCount}`)

  console.log('\n[3] 关键位开关')
  const switchText = await evaluate(send, `(() => {
    const tags = [...document.querySelectorAll('.indicator-tag')]
    const t = tags.find(x => x.innerText.includes('支撑压力'))
    return t ? t.innerText.trim() : ''
  })()`)
  check('存在「支撑压力关键位」开关', switchText.includes('支撑压力'), `实际="${switchText}"`)

  const hintText = await evaluate(send, `document.querySelector('.level-hint')?.innerText.trim() || ''`)
  check('开关旁显示压力/支撑数量', /\d+ 压力 \/ \d+ 支撑/.test(hintText), `实际="${hintText}"`)

  console.log('\n[4] 明细卡片内容')
  const cardPresent = await evaluate(send, `(() => {
    const titles = [...document.querySelectorAll('.kv-title')]
    return titles.some(t => t.innerText.includes('压力位')) && titles.some(t => t.innerText.includes('支撑位'))
  })()`)
  check('同时渲染压力位与支撑位分组', cardPresent === true)

  const resistRows = await evaluate(send, `document.querySelectorAll('.kv-title-resist ~ .kv-row').length`)
  const supportRows = await evaluate(send, `document.querySelectorAll('.kv-title-support ~ .kv-row').length`)
  check('压力位行数 >= 1', resistRows >= 1, `rows=${resistRows}`)
  check('支撑位行数 >= 1', supportRows >= 1, `rows=${supportRows}`)

  const priceText = await evaluate(send, `document.querySelector('.kv-price')?.innerText.trim() || ''`)
  check('价格列有数值', /\d/.test(priceText), `实际="${priceText}"`)

  const pctText = await evaluate(send, `document.querySelector('.kv-pct')?.innerText.trim() || ''`)
  check('距现价% 有正负号', /^[+-]\d/.test(pctText), `实际="${pctText}"`)

  const strengthText = await evaluate(send, `document.querySelector('.kv-strength')?.innerText.trim() || ''`)
  check('强度列有数值', /强度\s*\d+/.test(strengthText), `实际="${strengthText}"`)

  const nearestBadge = await evaluate(send, `document.querySelectorAll('.kv-badge-near').length`)
  check('存在「最近」标记', nearestBadge >= 1, `count=${nearestBadge}`)

  console.log('\n[5] 盈亏比')
  const rrText = await evaluate(send, `document.querySelector('.kv-rr')?.innerText.replace(/\s+/g,' ').trim() || ''`)
  check('盈亏比区域已渲染', rrText.includes('做多') && rrText.includes(': 1'), `实际="${rrText}"`)

  console.log('\n[6] 开关联动')
  await evaluate(send, `(() => {
    const t = [...document.querySelectorAll('.indicator-tag')].find(x => x.innerText.includes('支撑压力'))
    t.click(); return 'ok'
  })()`)
  await waitFor(send, `!document.querySelector('.kv-row')`, { label: '关闭后明细隐藏', timeout: 8_000 })
  check('关闭开关后明细卡片隐藏', true)

  await evaluate(send, `(() => {
    const t = [...document.querySelectorAll('.indicator-tag')].find(x => x.innerText.includes('支撑压力'))
    t.click(); return 'ok'
  })()`)
  await waitFor(send, `!!document.querySelector('.kv-row')`, { label: '再次开启后恢复', timeout: 8_000 })
  check('再次开启后明细恢复', true)

  console.log('\n[7] 截图存证')
  await sleep(800)
  await screenshot(send, SHOT)
  console.log(`  截图：${SHOT}`)

  console.log('\n[8] 页面异常')
  check('无 JS 异常 / console error', pageErrors.length === 0,
    pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : '')
} catch (e) {
  failures.push(`脚本异常：${e.message}`)
  console.log(`\n[异常] ${e.stack}`)
} finally {
  await shutdown(proc)
  console.log(`\n===== ${ok} 项通过，${failures.length} 项失败 =====`)
  failures.forEach((f) => console.log(`  - ${f}`))
  if (pageErrors.length) {
    console.log('\n页面错误明细：')
    pageErrors.slice(0, 10).forEach((p) => console.log(`  ! ${p}`))
  }
  process.exit(failures.length ? 1 : 0)
}
