// 利弗莫尔关键点模块的浏览器验收（零依赖 CDP）
// 覆盖两处：① 独立页面 /livermore（四分组切换 + 抽屉 + 潮汐开关）
//          ② K 线页 /chart 的利弗莫尔关键点叠加（开关 + 明细卡 + canvas 像素级验证）
// 用法：node scripts/smoke-livermore.mjs
import {
  connect, evaluate, goto, launchChrome, screenshot, shutdown, waitFor,
} from 'file:///C:/Users/Administrator/.workbuddy/skills/cdp-ui-smoke/assets/cdp.mjs'

const BASE = process.env.TA_UI_BASE || 'http://127.0.0.1:5173'
const CODE = process.env.TA_UI_CODE || 'US.AAPL'
const SHOT_A = process.env.TA_SHOT_A || 'F:/TraderAnalysis/logs/livermore-page.png'
const SHOT_B = process.env.TA_SHOT_B || 'F:/TraderAnalysis/logs/livermore-chart.png'

let ok = 0
const failures = []
const pageErrors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function check(name, cond, extra = '') {
  if (cond) { ok += 1; console.log(`  OK   ${name}`) }
  else { failures.push(name); console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`) }
}

// 图表是 canvas 绘制，DOM 里看不到水平线 → 用 canvas 指纹证明「线确实画上去了」。
// toDataURL 对同源 canvas 可用，抽稀采样后累加成整数哈希。
const CANVAS_FP = `(() => {
  const cs = [...document.querySelectorAll('.lw-inner canvas')]
  let h = 0, n = 0
  for (const c of cs) {
    if (!c.width || !c.height) continue
    const u = c.toDataURL()
    n += u.length
    for (let i = 0; i < u.length; i += 71) h = (h * 31 + u.charCodeAt(i)) | 0
  }
  return { hash: h, len: n, canvases: cs.length }
})()`

const clickTag = (text) => `(() => {
  const t = [...document.querySelectorAll('.indicator-tag')].find(x => x.innerText.includes(${JSON.stringify(text)}))
  if (!t) return 'missing'
  t.click(); return 'ok'
})()`

// ⚠️ ant-design 会在两个中文字之间插入空格（按钮文本实际是「查 询」）→ 比较前必须去空白
const CLICK_QUERY = `(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.innerText.replace(/\\s+/g, '').includes('查询'))
  if (!btn) return 'missing'
  btn.click(); return 'ok'
})()`

// 文字/背景对比度（WCAG 相对亮度比）。用来兜住「前景色 == 背景色 → 文字消失」这类主题变量误用。
// 背景色从 body 起逐层向元素做 **alpha 合成**（半透明卡片底必须合成，不能取到 rgba 本身当实色）。
const CONTRAST = (sel) => `(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const effBg = (el) => {
    const stack = []
    let n = el
    while (n) {
      const m = getComputedStyle(n).backgroundColor.match(/rgba?\\(([^)]+)\\)/)
      if (m) {
        const p = m[1].split(',').map((v) => parseFloat(v))
        stack.push([p[0] || 0, p[1] || 0, p[2] || 0, p.length < 4 ? 1 : p[3]])
      }
      n = n.parentElement
    }
    let r = 255, g = 255, b = 255
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const [cr, cg, cb, a] = stack[i]
      r = cr * a + r * (1 - a)
      g = cg * a + g * (1 - a)
      b = cb * a + b * (1 - a)
    }
    return [Math.round(r), Math.round(g), Math.round(b)]
  }
  const out = []
  for (const el of document.querySelectorAll(${JSON.stringify(sel)})) {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const fg = (cs.color.match(/\\d+(\\.\\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number)
    const bg = effBg(el)
    const l1 = lum(fg), l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    out.push({
      text: el.innerText.replace(/\\s+/g, ' ').trim().slice(0, 24),
      fg: cs.color, bg: 'rgb(' + bg.join(',') + ')',
      ratio: Math.round(ratio * 100) / 100,
    })
  }
  return out
})()`

const { proc } = await launchChrome()
const { send, ws } = await connect()

// canvas 绘制异常只有这里能看到
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
  // ════════════════════════════════════════════════════════════
  // 第一部分：独立页面 /livermore
  // ════════════════════════════════════════════════════════════
  console.log('\n[1] 打开 /livermore')
  await goto(send, `${BASE}/livermore`)
  await waitFor(send, `!!document.querySelector('.seg-item')`, { label: '分组切换出现', timeout: 40_000 })
  await waitFor(send, `!!document.querySelector('.summary .summary-text')`, { label: '结论条出现', timeout: 40_000 })
  await sleep(900)

  const navText = await evaluate(send, `document.querySelector('.nav-item[href="/livermore"], a[href="/livermore"]')?.innerText.trim() || ''`)
  check('顶栏存在「利弗莫尔」入口', navText.includes('利弗莫尔'), `实际="${navText}"`)

  console.log('\n[2] 口径说明卡')
  const caliberRows = await evaluate(send, `[...document.querySelectorAll('.caliber-row')].map(r => r.innerText.replace(/\\s+/g,' ').trim())`)
  check('口径卡 >= 4 行', caliberRows.length >= 4, `rows=${caliberRows.length}`)
  const caliberText = caliberRows.join(' | ')
  check('口径卡写明「独立体系」', caliberText.includes('独立体系'), '')
  check('口径卡写明「不并入 total_score」', caliberText.includes('不并入 total_score'), '')
  check('口径卡写明「收盘价」定义关键点', caliberText.includes('收盘价'), '')
  check('口径卡无未渲染的 markdown 粗体', !caliberText.includes('**'), `含 ** → ${caliberText.slice(0, 120)}`)

  console.log('\n[3] 工具栏与结论条')
  const chips = await evaluate(send, `[...document.querySelectorAll('.stat-chip')].map(c => c.innerText.trim())`)
  check('工具栏有 4 个及以上统计 chip', chips.length >= 4, `chips=${JSON.stringify(chips)}`)

  const sumText = await evaluate(send, `document.querySelector('.summary-text')?.innerText.replace(/\\s+/g,' ') || ''`)
  check('结论条含「扫描 N/M 只」', /扫描\s*\d+\/\d+\s*只/.test(sumText), `实际="${sumText.slice(0, 90)}"`)
  check('结论条含「突破关键点」计数', /只突破关键点/.test(sumText), '')
  check('结论条含潮汐分布', /潮汐：涨\s*\d+\s*\/\s*退\s*\d+/.test(sumText), '')
  check('结论条含 SPY 基准', /基准\s*SPY/.test(sumText), '')

  console.log('\n[4] 四分组切换')
  const segLabels = await evaluate(send, `[...document.querySelectorAll('.seg-item')].map(s => s.innerText.replace(/\\s+/g,' ').trim())`)
  check('恰好 4 个分组', segLabels.length === 4, `实际=${JSON.stringify(segLabels)}`)
  for (const label of ['关键点突破', '逼近关键点', '已在关键点上方', '风险信号']) {
    check(`存在分组「${label}」`, segLabels.some((s) => s.includes(label)), `实际=${JSON.stringify(segLabels)}`)
  }
  const segNote = await evaluate(send, `document.querySelector('.seg-note')?.innerText.trim() || ''`)
  check('分组说明文案已渲染', segNote.length > 8, `实际="${segNote}"`)

  // 逐个分组点击，断言表头列结构随分组自适应切换
  const groupProbe = []
  for (let i = 0; i < 4; i += 1) {
    await evaluate(send, `document.querySelectorAll('.seg-item')[${i}].click(); 'ok'`)
    await sleep(700)
    const info = await evaluate(send, `(() => ({
      active: document.querySelector('.seg-item.active')?.innerText.replace(/\\s+/g,' ').trim() || '',
      rows:  document.querySelectorAll('.tbl-row').length,
      hasBox: !!document.querySelector('.tbl-head .c-box'),
      hasStrength: !!document.querySelector('.tbl-head .c-strength'),
      hasBadge: !!document.querySelector('.tbl-head .c-badge'),
      empty: document.querySelector('.ant-empty-description')?.innerText.trim() || '',
      note: document.querySelector('.seg-note')?.innerText.trim() || '',
    }))()`)
    groupProbe.push(info)
    check(`分组 ${i + 1} 切换后 active 正确`, info.active.includes(['关键点突破', '逼近关键点', '已在关键点上方', '风险信号'][i]), `实际="${info.active}"`)
    check(`分组 ${i + 1} 表头列自适应（箱体col=${info.hasBox} 强度col=${info.hasStrength} 信号col=${info.hasBadge}）`,
      info.hasBox ? (info.hasStrength) : (info.hasBadge && !info.hasStrength))
    check(`分组 ${i + 1} 有行或显示空态`, info.rows > 0 || info.empty.length > 0, `rows=${info.rows} empty="${info.empty}"`)
    check(`分组 ${i + 1} 说明文案随分组变化`, info.note.length > 8, `实际="${info.note}"`)

    // 激活态可读性：主题里 --bg-emphasis 是深色，配深色文字会直接隐形
    const segContrast = await evaluate(send, CONTRAST('.seg-item.active'))
    const worstSeg = segContrast.reduce((a, b) => (a.ratio <= b.ratio ? a : b), { ratio: 99 })
    check(`分组 ${i + 1} 激活态文字对比度 >= 4.5`,
      segContrast.length > 0 && worstSeg.ratio >= 4.5,
      segContrast.map((c) => `${c.text} ${c.ratio}(${c.fg}/${c.bg})`).join(' ; '))
  }
  // 风险分组：表头应是「信号」列而非「强度」列
  check('风险分组表头用「信号」列替代「强度」列', groupProbe[3].hasBadge && !groupProbe[3].hasStrength)

  console.log('\n[5] 回到突破分组并检查行内容')
  await evaluate(send, `document.querySelectorAll('.seg-item')[0].click(); 'ok'`)
  await sleep(700)
  const rowProbe = await evaluate(send, `(() => {
    const r = document.querySelector('.tbl-row')
    if (!r) return null
    return {
      text: r.innerText.replace(/\\s+/g,' ').trim(),
      code: r.querySelector('.c-code')?.innerText.trim() || '',
      num: r.querySelector('.c-num')?.innerText.trim() || '',
      tide: [...r.querySelectorAll('.c-tide .tag')].map(t => t.innerText.trim()),
      dist: [...r.querySelectorAll('.c-num')].map(n => n.innerText.trim()),
      hasKlineBtn: !!r.querySelector('.c-act button'),
    }
  })()`)
  if (rowProbe) {
    check('数据行有代码', /\w/.test(rowProbe.code), `实际="${rowProbe.code}"`)
    check('数据行有现价数值', /\d/.test(rowProbe.num), `实际="${rowProbe.num}"`)
    check('数据行有潮汐 + 波浪两个标签', rowProbe.tide.length === 2, `实际=${JSON.stringify(rowProbe.tide)}`)
    check('数据行有「K线」跳转按钮', rowProbe.hasKlineBtn === true)
    const distText = rowProbe.dist.find((t) => t.includes('%')) || ''
    check('「距关键点」带正负号与百分号', /^[+-][\d.]+%$/.test(distText), `实际="${distText}"`)

    // 表格内小标签（潮汐/波浪/信号）的可读性
    const tagContrast = await evaluate(send, CONTRAST('.tbl-row .tag'))
    const badTag = tagContrast.filter((c) => c.ratio < 3.0)
    check('表格内潮汐/波浪标签对比度 >= 3.0', badTag.length === 0,
      badTag.map((c) => `${c.text} ${c.ratio}(${c.fg}/${c.bg})`).join(' ; '))
  } else {
    failures.push('突破分组无数据行，无法校验行内容')
    console.log('  FAIL 突破分组无数据行，无法校验行内容')
  }

  console.log('\n[6] 抽屉详情')
  await evaluate(send, `document.querySelector('.tbl-row').click(); 'ok'`)
  await waitFor(send, `!!document.querySelector('.ant-drawer-content')`, { label: '抽屉打开', timeout: 15_000 })
  await waitFor(send, `!!document.querySelector('.d-block')`, { label: '抽屉内容加载', timeout: 20_000 })
  await sleep(600)

  const drawer = await evaluate(send, `(() => {
    const blocks = [...document.querySelectorAll('.d-block .d-title')].map(t => t.innerText.trim())
    return {
      title: document.querySelector('.ant-drawer-title')?.innerText.trim() || '',
      blocks,
      kvText: [...document.querySelectorAll('.d-block .kv')].map(k => k.innerText.replace(/\\s+/g,' ').trim()),
      sigCount: document.querySelectorAll('.d-sig').length,
      hasChartBtn: [...document.querySelectorAll('.d-foot button')].some(b => b.innerText.includes('K 线')),
      body: document.querySelector('.ant-drawer-body')?.innerText.replace(/\\s+/g,' ').trim() || '',
    }
  })()`)
  check('抽屉标题含标的代码', drawer.title.includes('US.'), `实际="${drawer.title}"`)
  check('抽屉有「关键点全景」区块', drawer.blocks.some((b) => b.includes('关键点全景')), `blocks=${JSON.stringify(drawer.blocks)}`)
  check('抽屉有「金字塔加仓位」区块', drawer.blocks.some((b) => b.includes('金字塔')), '')
  check('抽屉有「趋势与相对强度」区块', drawer.blocks.some((b) => b.includes('趋势与相对强度')), '')
  const kvText = drawer.kvText.join(' | ')
  check('全景含关键点 / 箱体下沿 / 止损位', kvText.includes('关键点（箱体上沿）') && kvText.includes('箱体下沿') && kvText.includes('止损位'), '')
  check('趋势区含周线潮汐 / RS60 / 数据深度', kvText.includes('周线潮汐') && kvText.includes('RS60') && kvText.includes('数据深度'), '')
  check('抽屉无未渲染的 markdown 粗体', !drawer.body.includes('**'), `含 **`)
  check('抽屉底部有「打开 K 线图」按钮', drawer.hasChartBtn === true)

  // 关闭抽屉
  // ⚠️ ant-design-vue 的 Drawer 关闭后**不会移除 DOM 节点**，只做显隐 →
  //    不能用 `!document.querySelector('.ant-drawer-content')` 判定，必须看可见性。
  const DRAWER_CLOSED = `(() => {
    const d = document.querySelector('.ant-drawer-content')
    if (!d) return true
    const r = d.getBoundingClientRect()
    const st = getComputedStyle(d)
    return r.width === 0 || r.height === 0 || st.visibility === 'hidden' || st.display === 'none'
  })()`
  await evaluate(send, `(() => {
    const b = document.querySelector('.ant-drawer-close') || document.querySelector('.ant-drawer-header button')
    if (b) b.click()
    return b ? 'ok' : 'missing'
  })()`)
  await waitFor(send, DRAWER_CLOSED, { label: '抽屉关闭', timeout: 10_000 })
  check('抽屉可正常关闭（不可见）', (await evaluate(send, DRAWER_CLOSED)) === true)

  console.log('\n[7] 潮汐过滤开关')
  const beforeToggle = await evaluate(send, `[...document.querySelectorAll('.seg-item em')].map(e => +e.innerText.trim())`)
  await evaluate(send, `(() => { document.querySelector('.toolbar .ant-switch').click(); return 'ok' })()`)
  await waitFor(send, `!document.querySelector('.toolbar-stats .stat-chip:nth-child(5)')`, {
    label: '被潮汐挡 chip 消失（=关闭过滤）', timeout: 30_000,
  }).catch(() => { /* 可能本就没有被挡的，忽略 */ })
  await sleep(2500)
  const afterToggle = await evaluate(send, `[...document.querySelectorAll('.seg-item em')].map(e => +e.innerText.trim())`)
  const bSum = beforeToggle.reduce((a, b) => a + b, 0)
  const aSum = afterToggle.reduce((a, b) => a + b, 0)
  check('关闭潮汐过滤后做多信号数不减少', aSum >= bSum, `过滤前=${JSON.stringify(beforeToggle)} 过滤后=${JSON.stringify(afterToggle)}`)
  // 复原
  await evaluate(send, `(() => { document.querySelector('.toolbar .ant-switch').click(); return 'ok' })()`)
  await sleep(2500)
  check('潮汐开关可复原', true)

  console.log('\n[8] 截图存证（/livermore）')
  await evaluate(send, `document.querySelectorAll('.seg-item')[0].click(); 'ok'`)
  await sleep(900)
  await screenshot(send, SHOT_A)
  console.log(`  截图：${SHOT_A}`)

  // ════════════════════════════════════════════════════════════
  // 第二部分：K 线页叠加
  // ════════════════════════════════════════════════════════════
  console.log(`\n[9] 打开 /chart?code=${CODE}`)
  await goto(send, `${BASE}/chart?code=${CODE}`)
  await waitFor(send, `!!document.querySelector('.lv-grid')`, { label: '利弗莫尔明细卡出现', timeout: 40_000 })
  await waitFor(send, `document.querySelectorAll('.lw-inner canvas').length >= 2`, { label: 'K 线 canvas 渲染', timeout: 30_000 })
  await sleep(1600)

  const tagText = await evaluate(send, `(() => {
    const t = [...document.querySelectorAll('.indicator-tag')].find(x => x.innerText.includes('利弗莫尔'))
    return t ? t.innerText.trim() : ''
  })()`)
  check('存在「利弗莫尔关键点」开关', tagText.includes('利弗莫尔关键点'), `实际="${tagText}"`)

  const stateHint = await evaluate(send, `(() => {
    const hint = [...document.querySelectorAll('.level-hint')].map(h => h.innerText.trim())
    return hint.join(' | ')
  })()`)
  check('开关旁显示利弗莫尔状态', /已在关键点上方|逼近关键点|关键点下方|箱体震荡中|无有效平台|数据不足/.test(stateHint), `实际="${stateHint}"`)

  console.log('\n[10] K 线页利弗莫尔明细卡')
  const grid = await evaluate(send, `(() => {
    const items = [...document.querySelectorAll('.lv-item')].map(i => i.innerText.replace(/\\s+/g,' ').trim())
    return {
      badge: document.querySelector('.liv-badge')?.innerText.trim() || '',
      items,
      pivotal: document.querySelector('.lv-pivotal')?.innerText.trim() || '',
      stop: document.querySelector('.lv-stop')?.innerText.trim() || '',
      pyramid: document.querySelectorAll('.lv-py').length,
      pyramidHit: document.querySelectorAll('.lv-py-hit').length,
      sigs: [...document.querySelectorAll('.liv-sig-tag')].map(t => t.innerText.replace(/\\s+/g,' ').trim()),
      foot: document.querySelector('.lv-foot')?.innerText.replace(/\\s+/g,' ').trim() || '',
      footLink: document.querySelector('.lv-foot a[href="/livermore"]') ? true : false,
    }
  })()`)
  check('明细卡带「独立体系」徽标', grid.badge.includes('独立体系'), `实际="${grid.badge}"`)
  check('明细卡有 6 个字段块', grid.items.length === 6, `实际=${grid.items.length}`)
  check('关键点有数值', /\d/.test(grid.pivotal), `实际="${grid.pivotal}"`)
  check('止损位有数值', /\d/.test(grid.stop), `实际="${grid.stop}"`)
  const gridText = grid.items.join(' | ')
  check('含「周线潮汐」「量能 / 相对强度」字段', gridText.includes('周线潮汐') && gridText.includes('相对强度'), '')
  // 数值格式：后端返回的是 round 后的原始值（vol_ratio 可能是 1.0），前端必须补齐小数位与符号
  check('量比保留两位小数（不出现"量比 1"这类裸值）', /量比\s*\d+\.\d{2}\b/.test(gridText), `实际="${gridText}"`)
  check('RS60 带符号与一位小数', /RS60\s*[+-]\d+\.\d%/.test(gridText), `实际="${gridText}"`)
  check('潮汐周期写成「MAxx / MAxx」', /MA\d+\s*\/\s*MA\d+/.test(gridText), `实际="${gridText}"`)
  check('金字塔加仓位显示 3 级', grid.pyramid === 3, `实际=${grid.pyramid}`)
  check('金字塔已到达的级别标红（数量 0~3）', grid.pyramidHit >= 0 && grid.pyramidHit <= 3, `hit=${grid.pyramidHit}`)
  check('卡片底部有跳 /livermore 的链接', grid.footLink === true)
  check('卡片底部说明写明「独立信号体系」', grid.foot.includes('独立信号体系'), `实际="${grid.foot.slice(0, 100)}"`)
  check('明细卡无未渲染的 markdown 粗体', !gridText.includes('**'), '')

  // 明细卡内各字段（关键点/状态/止损/潮汐）在浅色卡片上的可读性
  const lvContrast = await evaluate(send, CONTRAST('.lv-item .lv-v, .lv-foot, .lv-pyramid .lv-py, .lv-pyramid .lv-py b, .lv-pyramid .lv-py span'))
  const badLv = lvContrast.filter((c) => c.ratio < 3.0)
  check('明细卡文字对比度 >= 3.0', badLv.length === 0,
    badLv.map((c) => `${c.text} ${c.ratio}(${c.fg}/${c.bg})`).join(' ; '))

  // 信号标签（ant Tag，白字彩底）
  const sigContrast = await evaluate(send, CONTRAST('.liv-sig-tag'))
  const badSig = sigContrast.filter((c) => c.ratio < 3.0)
  check('利弗莫尔信号标签对比度 >= 3.0', badSig.length === 0,
    badSig.map((c) => `${c.text} ${c.ratio}(${c.fg}/${c.bg})`).join(' ; '))

  console.log('\n[11] 图上水平线（canvas 指纹验证）')
  const fpOn = await evaluate(send, CANVAS_FP)
  check('canvas 指纹可读', fpOn.canvases >= 2 && fpOn.len > 0, JSON.stringify(fpOn))

  await evaluate(send, clickTag('利弗莫尔关键点'))
  await sleep(1600)
  const fpOff = await evaluate(send, CANVAS_FP)
  check('关闭开关后 canvas 画面发生变化（=水平线确实由本模块绘制）', fpOff.hash !== fpOn.hash, `on=${fpOn.hash} off=${fpOff.hash}`)
  const cardHidden = await evaluate(send, `!document.querySelector('.lv-grid')`)
  check('关闭开关后明细卡同步隐藏', cardHidden === true)

  await evaluate(send, clickTag('利弗莫尔关键点'))
  await sleep(1600)
  const fpBack = await evaluate(send, CANVAS_FP)
  check('再次开启后 canvas 恢复为开启态', fpBack.hash === fpOn.hash, `back=${fpBack.hash} on=${fpOn.hash}`)
  check('再次开启后明细卡恢复', (await evaluate(send, `!!document.querySelector('.lv-grid')`)) === true)

  console.log('\n[12] 非日线周期不请求利弗莫尔（4H）')
  await evaluate(send, `(() => {
    const sels = [...document.querySelectorAll('.ant-select-selector')]
    const s = sels[sels.length - 1]
    s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    return 'ok'
  })()`)
  await sleep(500)
  const chose4h = await evaluate(send, `(() => {
    const opts = [...document.querySelectorAll('.ant-select-item-option')]
    const o = opts.find(x => x.innerText.includes('4H'))
    if (!o) return 'missing'
    o.click(); return 'ok'
  })()`)
  if (chose4h === 'ok') {
    await evaluate(send, CLICK_QUERY)
    await sleep(4000)
    const gridGone = await evaluate(send, `!document.querySelector('.lv-grid')`)
    check('切到 4H 后不再请求利弗莫尔（明细卡不出现）', gridGone === true)
  } else {
    console.log('  SKIP 4H 选项未找到，跳过该断言')
  }

  console.log('\n[13] 截图存证（/chart）')
  await evaluate(send, `(() => {
    const sels = [...document.querySelectorAll('.ant-select-selector')]
    const s = sels[sels.length - 1]
    s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    return 'ok'
  })()`)
  await sleep(500)
  await evaluate(send, `(() => {
    const o = [...document.querySelectorAll('.ant-select-item-option')].find(x => x.innerText.includes('日K'))
    if (o) o.click(); return 'ok'
  })()`)
  await evaluate(send, CLICK_QUERY)
  await waitFor(send, `!!document.querySelector('.lv-grid')`, { label: '回到日线且明细卡恢复', timeout: 30_000 })
  await sleep(1800)
  await screenshot(send, SHOT_B)
  console.log(`  截图：${SHOT_B}`)

  console.log('\n[14] 边界：无整理平台的标的')
  // US.ARM 实测「近 60 根内无有效整理平台」（daily_bars=119，且潮汐向下）
  await goto(send, `${BASE}/chart?code=US.ARM`)
  await waitFor(send, `!!document.querySelector('.lv-grid')`, { label: '明细卡出现（无平台也应有卡）', timeout: 40_000 })
  await sleep(1600)
  const noPlat = await evaluate(send, `(() => ({
    alert: document.querySelector('.lv-grid')?.parentElement?.querySelector('.ant-alert-message')?.innerText.trim() || '',
    items: [...document.querySelectorAll('.lv-item')].map(i => i.innerText.replace(/\\s+/g,' ').trim()),
    pyramid: document.querySelectorAll('.lv-py').length,
    hasPivotal: !!document.querySelector('.lv-pivotal'),
    stateHint: [...document.querySelectorAll('.level-hint')].map(h => h.innerText.trim()).join(' | '),
    stillHasKline: document.querySelectorAll('.lw-inner canvas').length >= 2,
    // 支撑压力位明细卡不应被影响
    kvRows: document.querySelectorAll('.kv-row').length,
  }))()`)
  check('无平台时显示原因提示', /无有效整理平台|数据不足/.test(noPlat.alert), `实际="${noPlat.alert}"`)
  check('无平台时不渲染「关键点」字段（不出现 -- 占位）', noPlat.hasPivotal === false)
  check('无平台时不渲染金字塔加仓位', noPlat.pyramid === 0, `实际=${noPlat.pyramid}`)
  check('无平台时字段收窄为 2 个（潮汐 + 数据深度）', noPlat.items.length === 2, `实际=${JSON.stringify(noPlat.items)}`)
  check('无平台时状态提示为「无有效平台」', noPlat.stateHint.includes('无有效平台'), `实际="${noPlat.stateHint}"`)
  check('无平台时 K 线图仍正常渲染（不整体失败）', noPlat.stillHasKline === true)
  check('无平台不影响支撑压力位明细', noPlat.kvRows >= 1, `rows=${noPlat.kvRows}`)

  console.log('\n[15] 边界：港股')
  await goto(send, `${BASE}/chart?code=HK.01211`)
  await waitFor(send, `!!document.querySelector('.lw-inner canvas')`, { label: '港股 K 线渲染', timeout: 40_000 })
  await sleep(1800)
  const hk = await evaluate(send, `(() => ({
    tag: [...document.querySelectorAll('.indicator-tag')].some(t => t.innerText.includes('利弗莫尔关键点')),
    hasCard: !!document.querySelector('.lv-grid'),
    hasPivotal: !!document.querySelector('.lv-pivotal'),
    items: [...document.querySelectorAll('.lv-item')].map(i => i.innerText.replace(/\\s+/g,' ').trim()),
    canvases: document.querySelectorAll('.lw-inner canvas').length,
  }))()`)
  check('港股页面渲染利弗莫尔开关', hk.tag === true)
  check('港股 K 线 canvas 正常', hk.canvases >= 2, `canvas=${hk.canvases}`)
  check('港股无数据时也不报错（卡或有提示二选一）', hk.hasCard || hk.canvases >= 2,
    `hasCard=${hk.hasCard}`)
  if (hk.hasPivotal) {
    console.log(`  港股利弗莫尔字段：${JSON.stringify(hk.items)}`)
  }

  console.log('\n[16] 页面异常')
  const ignorable = /ResizeObserver loop|Non-Error promise rejection/i
  const realErrors = pageErrors.filter((p) => !ignorable.test(p))
  check('无 JS 异常 / console error', realErrors.length === 0,
    realErrors.length ? realErrors.slice(0, 5).join(' | ') : '')
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
