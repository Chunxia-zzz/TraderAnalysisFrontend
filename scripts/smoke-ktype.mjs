// 边界验收：切 4H 周期（本次新开放）+ 数据稀疏标的的降级路径
// 注意：本页设计为「改条件后需点查询才重新拉数据」，所以切周期后必须点查询，
//       否则读到的是上一个周期的数据（会假通过）。
import { connect, evaluate, goto, launchChrome, screenshot, shutdown, waitFor } from 'file:///C:/Users/Administrator/.workbuddy/skills/cdp-ui-smoke/assets/cdp.mjs'

const BASE = process.env.TA_UI_BASE || 'http://127.0.0.1:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let ok = 0
const failures = []
const pageErrors = []
const check = (n, c, e = '') => {
  if (c) { ok += 1; console.log(`  OK   ${n}`) }
  else { failures.push(n); console.log(`  FAIL ${n}${e ? ` — ${e}` : ''}`) }
}

const { proc } = await launchChrome()
const { send, ws } = await connect()
ws.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.exceptionThrown') {
      pageErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text)
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') {
      pageErrors.push((m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
    }
  } catch {}
})
await send('Runtime.enable')

const firstPressure = `document.querySelector('.kv-title-resist ~ .kv-row .kv-price')?.innerText.trim() || ''`
const chartCandles = `document.querySelectorAll('.lw-inner canvas').length`

async function pickOption(label) {
  await evaluate(send, `(() => {
    for (const s of document.querySelectorAll('.ant-select')) {
      const v = s.querySelector('.ant-select-selection-item')?.innerText.trim()
      if (['日K', '4H K线', '周K'].includes(v)) {
        s.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
        return 'opened'
      }
    }
    return 'notfound'
  })()`)
  await sleep(600)
  const r = await evaluate(send, `(() => {
    const opts = [...document.querySelectorAll('.ant-select-item-option')]
    const t = opts.find(o => ((o.getAttribute('title') || o.innerText) || '').includes(${JSON.stringify(label)}))
    if (t) { t.click(); return 'picked' }
    return 'nooption:' + opts.map(o => o.innerText).join('|')
  })()`)
  return r
}

async function clickQuery() {
  // ant-design 会在两个汉字的按钮里自动插入空格（「查 询」），不能直接精确比较
  const r = await evaluate(send, `(() => {
    const norm = (s) => (s || '').replace(/\\s+/g, '')
    const b = [...document.querySelectorAll('button')].find(x => norm(x.innerText) === '查询')
    if (b) { b.click(); return 'ok' }
    return 'nobutton:' + [...document.querySelectorAll('button')].map(x => x.innerText).join('/')
  })()`)
  if (r !== 'ok') throw new Error(`未找到查询按钮：${r}`)
  return r
}

try {
  console.log('\n[1] 日K 基线')
  await goto(send, `${BASE}/chart?code=US.AAPL`)
  await waitFor(send, `!!document.querySelector('.kv-row')`, { timeout: 30_000 })
  await sleep(1200)
  const basePressure = await evaluate(send, firstPressure)
  const baseCanvas = await evaluate(send, chartCandles)
  console.log(`     日K 首个压力位=${basePressure} canvas=${baseCanvas}`)
  check('日K 有关键位', basePressure !== '')
  check('日K 图表已渲染', baseCanvas >= 2)

  console.log('\n[2] 切 4H K线 + 点查询（本次新开放，原先后端 422）')
  console.log(`     选项操作：${await pickOption('4H')}`)
  console.log(`     查询按钮：${await clickQuery()}`)
  // 注意括号：firstPressure 自身含 `|| ''`，不加括号会被 && 优先级吃掉导致条件恒真
  await waitFor(send, `(() => { const v = ${firstPressure}; return !!v && v !== ${JSON.stringify(basePressure)} })()`,
    { label: '关键位数据已换周期', timeout: 25_000 })
  const h4Pressure = await evaluate(send, firstPressure)
  console.log(`     4H 首个压力位=${h4Pressure}（日K=${basePressure}）`)
  const curK = await evaluate(send, `(() => {
    for (const s of document.querySelectorAll('.ant-select')) {
      const v = s.querySelector('.ant-select-selection-item')?.innerText.trim()
      if (['日K', '4H K线', '周K'].includes(v)) return v
    }
    return ''
  })()`)
  check('ktype 显示 4H K线', curK === '4H K线', `实际="${curK}"`)
  check('4H 关键位数值与日K不同（证明确实换周期）', h4Pressure !== basePressure,
    `4H=${h4Pressure} 日K=${basePressure}`)
  check('4H 压力位 = 342.79（API 实测值）', h4Pressure === '342.79', `实际="${h4Pressure}"`)
  check('4H 下明细仍有行', (await evaluate(send, `document.querySelectorAll('.kv-row').length`)) > 0)
  await sleep(700)
  await screenshot(send, 'F:/TraderAnalysis/logs/chart-4h.png')

  console.log('\n[3] 切周K + 点查询')
  await pickOption('周K')
  await clickQuery()
  await waitFor(send, `(() => { const v = ${firstPressure}; return !!v && v !== ${JSON.stringify(h4Pressure)} })()`,
    { label: '周K 数据已就位', timeout: 25_000 })
  const wPressure = await evaluate(send, firstPressure)
  console.log(`     周K 首个压力位=${wPressure}（4H=${h4Pressure}）`)
  check('周K 压力位 = 342.89（API 实测值）', wPressure === '342.89', `实际="${wPressure}"`)
  check('周K 与 4H 的压力位不同（证明确实换周期）', wPressure !== h4Pressure,
    `周K=${wPressure} 4H=${h4Pressure}`)
  check('周K 下明细仍有行', (await evaluate(send, `document.querySelectorAll('.kv-row').length`)) > 0)

  console.log('\n[4] 港股标的（数据较稀疏）')
  await goto(send, `${BASE}/chart?code=HK.01211`)
  await sleep(3500)
  const hkRows = await evaluate(send, `document.querySelectorAll('.kv-row').length`)
  const hkChart = await evaluate(send, chartCandles)
  console.log(`     HK.01211 明细行=${hkRows} canvas=${hkChart}`)
  check('港股标的关键位正常渲染', hkRows > 0)
  check('港股标的图表正常渲染', hkChart >= 2)

  console.log('\n[5] 页面异常')
  check('全程无 JS 异常 / console error', pageErrors.length === 0,
    pageErrors.length ? pageErrors.slice(0, 4).join(' | ') : '')
} catch (e) {
  failures.push(`脚本异常：${e.message}`)
  console.log(`\n[异常] ${e.stack}`)
} finally {
  await shutdown(proc)
  console.log(`\n===== ${ok} 项通过，${failures.length} 项失败 =====`)
  failures.forEach((f) => console.log(`  - ${f}`))
  if (pageErrors.length) { console.log('\n页面错误：'); pageErrors.slice(0, 8).forEach((p) => console.log(`  ! ${p}`)) }
  process.exit(failures.length ? 1 : 0)
}
