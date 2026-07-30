<template>
  <div class="lw-outer" :style="{ height: totalHeight + 'px' }">
    <div ref="containerRef" class="lw-inner" />
    <div ref="legendRef" class="lw-legend" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts'

const props = defineProps({
  data:    { type: Array,  default: () => [] },
  height:  { type: Number, default: 800 },
  visible: {
    type: Object,
    default: () => ({
      ma5: false, ma10: false, ma20: false, ma60: false,
      boll: false, ema: true, vol: true, macd: true, rsi: true,
    }),
  },
})

const containerRef = ref(null)
const legendRef    = ref(null)
let chart = null
let seriesRefs = {}

// ── 配色 ──
const UP   = '#ef5350'
const DOWN = '#26a69a'
const MA_COLORS  = { ma5: '#ff9800', ma10: '#2196f3', ma20: '#e91e63', ma60: '#9c27b0' }
const BOLL_COLOR = '#8d6e63'

// ── 布局 ──
const SUB_H    = 130
const MAIN_MIN = 360

const totalHeight = computed(() => {
  const n = [props.visible.vol, props.visible.macd, props.visible.rsi].filter(Boolean).length
  return Math.max(props.height, MAIN_MIN + n * SUB_H)
})

function getMargins(vis, h) {
  const subs = ['vol', 'macd', 'rsi'].filter(k => vis[k])
  const frac = SUB_H / h
  const gap  = 4 / h
  const mainBottom = subs.length === 0 ? 0.03 : subs.length * (frac + gap) + 0.01
  const result = { main: { top: 0.04, bottom: mainBottom } }
  let bottom = 0.01
  for (const key of [...subs].reverse()) {
    result[key] = { top: 1 - bottom - frac, bottom }
    bottom += frac + gap
  }
  return result
}

// ── EMA 飘带 Primitive（填充色带）──
class EmaRibbonPrimitive {
  constructor() {
    this._rawData = []   // [{time, v5, v30}]
    this._chart   = null
    this._series  = null
  }

  setData(ema5Data, ema30Data) {
    const map5  = new Map(ema5Data.map(d => [d.time, d.value]))
    const map30 = new Map(ema30Data.map(d => [d.time, d.value]))
    const times = [...new Set([...map5.keys(), ...map30.keys()])].sort()
    this._rawData = times
      .filter(t => map5.has(t) && map30.has(t))
      .map(t => ({ time: t, v5: map5.get(t), v30: map30.get(t) }))
  }

  attached({ chart, series }) { this._chart = chart; this._series = series }
  detached()                  { this._chart = null;  this._series = null  }

  updateAllViews() {}

  paneViews() {
    const self = this
    return [{
      zOrder:   () => 'bottom',
      renderer: () => ({ draw: target => self._draw(target) }),
    }]
  }

  _draw(target) {
    if (!this._chart || !this._series || this._rawData.length < 2) return
    const ts = this._chart.timeScale()

    target.useMediaCoordinateSpace(({ context }) => {
      // 转换为画布坐标
      const pts = this._rawData
        .map(d => ({
          x:   ts.timeToCoordinate(d.time),
          y5:  this._series.priceToCoordinate(d.v5),
          y30: this._series.priceToCoordinate(d.v30),
        }))
        .filter(p => p.x != null && p.y5 != null && p.y30 != null)

      if (pts.length < 2) return

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1]
        // Canvas Y 轴向下：y5 < y30 表示 ema5 在上方（多头）
        const aBull = a.y5 <= a.y30
        const bBull = b.y5 <= b.y30

        if (aBull === bBull) {
          // 同一趋势段：绘制四边形
          context.fillStyle = aBull ? 'rgba(38,166,154,0.20)' : 'rgba(239,83,80,0.20)'
          context.beginPath()
          context.moveTo(a.x, a.y5)
          context.lineTo(b.x, b.y5)
          context.lineTo(b.x, b.y30)
          context.lineTo(a.x, a.y30)
          context.closePath()
          context.fill()
        } else {
          // 交叉：线性插值找交点，分两个三角形
          const da = a.y30 - a.y5
          const db = b.y30 - b.y5
          const t  = da / (da - db)
          const xc = a.x  + t * (b.x  - a.x)
          const yc = a.y5 + t * (b.y5 - a.y5)

          context.fillStyle = aBull ? 'rgba(38,166,154,0.20)' : 'rgba(239,83,80,0.20)'
          context.beginPath()
          context.moveTo(a.x, a.y5)
          context.lineTo(xc, yc)
          context.lineTo(a.x, a.y30)
          context.closePath()
          context.fill()

          context.fillStyle = bBull ? 'rgba(38,166,154,0.20)' : 'rgba(239,83,80,0.20)'
          context.beginPath()
          context.moveTo(xc, yc)
          context.lineTo(b.x, b.y5)
          context.lineTo(b.x, b.y30)
          context.closePath()
          context.fill()
        }
      }
    })
  }
}

// ── 格式化 ──
function fmtPrice(v) {
  if (v == null || isNaN(+v)) return '--'
  const n = +v
  return n >= 1000 ? n.toFixed(1) : n.toFixed(2)
}
function fmtVol(v) {
  if (v == null || isNaN(+v)) return '--'
  const n = +v
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万'
  return Math.round(n).toLocaleString()
}
function fmtInd(v, d = 2) {
  if (v == null || isNaN(+v)) return '--'
  return (+v).toFixed(d)
}

// ── 图例 HTML ──
function buildLegendHTML(param, vis, margins, h, raw) {
  const hasHover = param?.time != null
  const last = raw[raw.length - 1]

  const sv = (key) => {
    if (!hasHover || !param?.seriesData || !seriesRefs[key]) return null
    return param.seriesData.get(seriesRefs[key])?.value ?? null
  }
  const val = (seriesKey, rawKey) => {
    const v = sv(seriesKey)
    return v != null ? v : (!hasHover ? (last[rawKey] ?? null) : null)
  }

  let ohlc
  if (hasHover && param?.seriesData && seriesRefs.candle) {
    ohlc = param.seriesData.get(seriesRefs.candle) || last
  } else {
    ohlc = last
  }
  const isUp = (+ohlc.close || 0) >= (+ohlc.open || 0)
  const sep = `<span class="leg-sep">|</span>`

  // 主图行
  let mainParts = [
    `<span style="color:${isUp ? UP : DOWN}">O:${fmtPrice(ohlc.open)} H:${fmtPrice(ohlc.high)} L:${fmtPrice(ohlc.low)} C:${fmtPrice(ohlc.close)}</span>`,
  ]
  if (vis.ema) {
    const e5  = val('ema5',  'ema5')
    const e30 = val('ema30', 'ema30')
    if (e5  != null) mainParts.push(`<span style="color:rgba(38,166,154,0.9)">EMA5:${fmtPrice(e5)}</span>`)
    if (e30 != null) mainParts.push(`<span style="color:rgba(239,83,80,0.85)">EMA30:${fmtPrice(e30)}</span>`)
  }
  for (const [key, color] of Object.entries(MA_COLORS)) {
    if (!vis[key]) continue
    const v = val(key, key)
    if (v != null) mainParts.push(`<span style="color:${color}">${key.toUpperCase()}:${fmtPrice(v)}</span>`)
  }
  if (vis.boll) {
    const bu = val('boll_upper', 'boll_upper')
    const bm = val('boll_mid',   'boll_mid')
    const bl = val('boll_lower', 'boll_lower')
    if (bu != null)
      mainParts.push(`<span style="color:${BOLL_COLOR}">U:${fmtPrice(bu)} M:${fmtPrice(bm)} L:${fmtPrice(bl)}</span>`)
  }

  let html = `<div class="leg-row" style="top:6px">${mainParts.join(sep)}</div>`

  // 成交量行
  if (vis.vol && margins.vol) {
    const paneTop = Math.round(margins.vol.top * h) + 4
    let v = sv('vol')
    if (v == null && !hasHover) v = last.volume
    const vma = val('vol_ma20', 'vol_ma20')
    let parts = [`<span style="color:#607d8b">VOL:${fmtVol(v)}</span>`]
    if (vma != null) parts.push(`<span style="color:#ff9800">MA20:${fmtVol(vma)}</span>`)
    html += `<div class="leg-row" style="top:${paneTop}px">${parts.join(sep)}</div>`
  }

  // MACD 行
  if (vis.macd && margins.macd) {
    const paneTop = Math.round(margins.macd.top * h) + 4
    const dif  = val('dif', 'dif')
    const dea  = val('dea', 'dea')
    let   macd = sv('macd')
    if (macd == null && !hasHover) macd = last.macd
    let parts = []
    if (dif  != null) parts.push(`<span style="color:#ff9800">DIF:${fmtInd(dif)}</span>`)
    if (dea  != null) parts.push(`<span style="color:#2196f3">DEA:${fmtInd(dea)}</span>`)
    if (macd != null) parts.push(`<span style="color:${(+macd >= 0) ? UP : DOWN}">MACD:${fmtInd(macd)}</span>`)
    html += `<div class="leg-row" style="top:${paneTop}px">${parts.join(sep)}</div>`
  }

  // RSI 行
  if (vis.rsi && margins.rsi) {
    const paneTop = Math.round(margins.rsi.top * h) + 4
    const rsi = val('rsi', 'rsi6')
    html += `<div class="leg-row" style="top:${paneTop}px"><span style="color:#ff5722">RSI6:${fmtInd(rsi)}</span></div>`
  }

  return html
}

// ── 建图 ──
function buildChart() {
  if (!containerRef.value) return
  if (chart) { chart.remove(); chart = null }
  seriesRefs = {}

  const raw = props.data
  if (!raw || raw.length === 0) return

  const vis     = props.visible
  const h       = totalHeight.value
  const margins = getMargins(vis, h)

  chart = createChart(containerRef.value, {
    width:  containerRef.value.clientWidth,
    height: h,
    layout: {
      background: { type: ColorType.Solid, color: '#ffffff' },
      textColor:  '#59636e',
      fontSize:   11,
      fontFamily: "'DM Mono', 'JetBrains Mono', SFMono-Regular, monospace",
    },
    grid: {
      vertLines: { color: '#e8ecf0' },
      horzLines: { color: '#e8ecf0' },
    },
    crosshair: {
      mode:     CrosshairMode.Normal,
      vertLine: { color: '#8b949e', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1f2328' },
      horzLine: { color: '#8b949e', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1f2328' },
    },
    rightPriceScale: { borderColor: '#e8ecf0', textColor: '#8b949e' },
    timeScale: { borderColor: '#e8ecf0', timeVisible: true },
  })

  // ── 蜡烛图 ──
  const candleSeries = chart.addCandlestickSeries({
    upColor: UP, downColor: DOWN,
    borderUpColor: UP, borderDownColor: DOWN,
    wickUpColor: UP, wickDownColor: DOWN,
  })
  seriesRefs.candle = candleSeries
  chart.priceScale('right').applyOptions({ scaleMargins: margins.main })
  candleSeries.setData(
    raw.map(d => ({ time: d.date, open: +d.open, high: +d.high, low: +d.low, close: +d.close }))
  )

  // ── EMA 飘带 ──
  if (vis.ema) {
    // 翻转标记
    const markers = []
    for (let i = 1; i < raw.length; i++) {
      const p = raw[i - 1], c = raw[i]
      if (!p.ema5 || !p.ema30 || !c.ema5 || !c.ema30) continue
      if (p.ema5 < p.ema30 && c.ema5 >= c.ema30)
        markers.push({ time: c.date, position: 'belowBar', color: DOWN, shape: 'arrowUp',   text: '转多', size: 1 })
      else if (p.ema5 >= p.ema30 && c.ema5 < c.ema30)
        markers.push({ time: c.date, position: 'aboveBar', color: UP,   shape: 'arrowDown', text: '转空', size: 1 })
    }
    if (markers.length) candleSeries.setMarkers(markers)

    // 填充色带 Primitive（附加到蜡烛图系列，使用主图价格坐标）
    const ema5Data  = raw.filter(d => d.ema5  != null).map(d => ({ time: d.date, value: +d.ema5  }))
    const ema30Data = raw.filter(d => d.ema30 != null).map(d => ({ time: d.date, value: +d.ema30 }))
    const ribbon = new EmaRibbonPrimitive()
    ribbon.setData(ema5Data, ema30Data)
    candleSeries.attachPrimitive(ribbon)

    // EMA5 线（用于图例 + 辅助视觉）
    const ema5Series = chart.addLineSeries({
      color: 'rgba(38,166,154,0.9)', lineWidth: 1,
      lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    })
    seriesRefs.ema5 = ema5Series
    ema5Series.setData(ema5Data)

    // EMA30 线（虚线）
    const ema30Series = chart.addLineSeries({
      color: 'rgba(239,83,80,0.75)', lineWidth: 1, lineStyle: LineStyle.Dashed,
      lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    })
    seriesRefs.ema30 = ema30Series
    ema30Series.setData(ema30Data)
  }

  // ── MA 均线 ──
  for (const [key, color] of Object.entries(MA_COLORS)) {
    if (!vis[key]) continue
    const s = chart.addLineSeries({
      color, lineWidth: 1,
      lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    })
    seriesRefs[key] = s
    s.setData(raw.filter(d => d[key] != null).map(d => ({ time: d.date, value: +d[key] })))
  }

  // ── 布林带 ──
  if (vis.boll) {
    for (const [field, style] of [
      ['boll_upper', LineStyle.Dashed],
      ['boll_mid',   LineStyle.Dotted],
      ['boll_lower', LineStyle.Dashed],
    ]) {
      const s = chart.addLineSeries({
        color: BOLL_COLOR, lineWidth: 1, lineStyle: style,
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      })
      seriesRefs[field] = s
      s.setData(raw.filter(d => d[field] != null).map(d => ({ time: d.date, value: +d[field] })))
    }
  }

  // ── 成交量 ──
  if (vis.vol && margins.vol) {
    const volSeries = chart.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat:  { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    seriesRefs.vol = volSeries
    chart.priceScale('vol').applyOptions({ scaleMargins: margins.vol })
    volSeries.setData(
      raw.map(d => ({
        time:  d.date,
        value: +d.volume,
        color: d.close >= d.open ? UP + 'aa' : DOWN + 'aa',
      }))
    )
    if (raw.some(d => d.vol_ma20 != null)) {
      const vma = chart.addLineSeries({
        color: '#ff9800', lineWidth: 1, priceScaleId: 'vol',
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      })
      seriesRefs.vol_ma20 = vma
      vma.setData(raw.filter(d => d.vol_ma20 != null).map(d => ({ time: d.date, value: +d.vol_ma20 })))
    }
  }

  // ── MACD ──
  if (vis.macd && margins.macd) {
    const macdHist = chart.addHistogramSeries({
      priceScaleId: 'macd',
      lastValueVisible: false, priceLineVisible: false,
    })
    seriesRefs.macd = macdHist
    chart.priceScale('macd').applyOptions({ scaleMargins: margins.macd })
    macdHist.setData(
      raw.map(d => ({
        time:  d.date,
        value: d.macd ?? 0,
        color: (d.macd ?? 0) >= 0 ? UP + 'aa' : DOWN + 'aa',
      }))
    )
    const difSeries = chart.addLineSeries({
      color: '#ff9800', lineWidth: 1, priceScaleId: 'macd',
      lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    })
    seriesRefs.dif = difSeries
    difSeries.setData(raw.filter(d => d.dif != null).map(d => ({ time: d.date, value: +d.dif })))

    const deaSeries = chart.addLineSeries({
      color: '#2196f3', lineWidth: 1, priceScaleId: 'macd',
      lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    })
    seriesRefs.dea = deaSeries
    deaSeries.setData(raw.filter(d => d.dea != null).map(d => ({ time: d.date, value: +d.dea })))
  }

  // ── RSI ──
  if (vis.rsi && margins.rsi) {
    const rsiSeries = chart.addLineSeries({
      color: '#ff5722', lineWidth: 1.5, priceScaleId: 'rsi',
      lastValueVisible: false, priceLineVisible: false,
    })
    seriesRefs.rsi = rsiSeries
    chart.priceScale('rsi').applyOptions({ scaleMargins: margins.rsi })
    rsiSeries.setData(raw.filter(d => d.rsi6 != null).map(d => ({ time: d.date, value: +d.rsi6 })))

    for (const [val, color] of [[70, UP + '55'], [30, DOWN + '55']]) {
      const refLine = chart.addLineSeries({
        color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: 'rsi',
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      })
      refLine.setData(raw.map(d => ({ time: d.date, value: val })))
    }
  }

  chart.timeScale().fitContent()

  // 初始图例（最后一根 K 线）
  if (legendRef.value) {
    legendRef.value.innerHTML = buildLegendHTML(null, vis, margins, h, raw)
  }

  // 十字准线图例
  chart.subscribeCrosshairMove(param => {
    if (legendRef.value) {
      legendRef.value.innerHTML = buildLegendHTML(param, vis, margins, h, raw)
    }
  })
}

let ro = null

onMounted(() => {
  buildChart()
  ro = new ResizeObserver(() => {
    if (chart && containerRef.value) {
      chart.applyOptions({ width: containerRef.value.clientWidth, height: totalHeight.value })
    }
  })
  if (containerRef.value) ro.observe(containerRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  chart?.remove()
  chart = null
})

watch([() => props.data, () => props.visible], buildChart, { deep: true })
</script>

<style scoped>
.lw-outer {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #fff;
}
.lw-inner {
  position: absolute;
  inset: 0;
}
.lw-legend {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}
</style>

<style>
/* 动态注入的 HTML 不受 scoped 限制，需全局定义 */
.leg-row {
  position: absolute;
  left: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 6px;
  font-family: 'DM Mono', 'JetBrains Mono', SFMono-Regular, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #59636e;
  background: rgba(255, 255, 255, 0.82);
  padding: 1px 6px;
  border-radius: 3px;
  max-width: calc(100% - 80px);
}
.leg-sep {
  color: #d0d7de;
  margin: 0 1px;
  font-size: 10px;
}
</style>
