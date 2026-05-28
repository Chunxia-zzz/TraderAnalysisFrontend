<template>
  <div ref="chartRef" :style="{ width: '100%', height: totalHeight + 'px' }" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 800 },
  visible: {
    type: Object,
    default: () => ({
      ma5: true, ma10: true, ma20: false, ma60: false,
      boll: true, ema: false, vol: true, macd: true, rsi: true,
    }),
  },
})

const chartRef = ref(null)
const chart = shallowRef(null)

// ── 颜色常量 ─────────────────────────────────────────────
const UP_COLOR = '#ef5350'
const DOWN_COLOR = '#26a69a'
const MA_COLORS = { ma5: '#ff9800', ma10: '#2196f3', ma20: '#e91e63', ma60: '#9c27b0' }
const BOLL_COLOR = '#795548'
const EMA_COLORS = {
  ema5: '#e53935', ema10: '#ff7043', ema15: '#ffa726',
  ema20: '#66bb6a', ema25: '#42a5f5', ema30: '#5c6bc0',
}
const DIF_COLOR = '#ff9800'
const DEA_COLOR = '#2196f3'
const RSI_COLOR = '#ff5722'

// 根据可见子图数量动态计算高度
const SUB_CHART_HEIGHT = 120 // 每个子图固定高度 px
const DATAZOOM_HEIGHT = 36
const MAIN_MIN = 350

const totalHeight = computed(() => {
  const subCount = [props.visible.vol, props.visible.macd, props.visible.rsi].filter(Boolean).length
  return Math.max(props.height, MAIN_MIN + subCount * SUB_CHART_HEIGHT + DATAZOOM_HEIGHT + 30)
})

// ── 动态布局计算 ──────────────────────────────────────────
function calcLayout(vis) {
  const subs = []
  if (vis.vol) subs.push('vol')
  if (vis.macd) subs.push('macd')
  if (vis.rsi) subs.push('rsi')

  const total = totalHeight.value - DATAZOOM_HEIGHT
  const subTotal = subs.length * SUB_CHART_HEIGHT
  const mainH = total - subTotal - 30 // 30 px padding
  const gap = 12

  const grids = [{ left: 68, right: 68, top: 30, height: mainH }]
  const paneMap = {} // 'vol' -> gridIndex
  let cursor = 30 + mainH + gap

  for (const key of subs) {
    paneMap[key] = grids.length
    grids.push({ left: 68, right: 68, top: cursor, height: SUB_CHART_HEIGHT - gap })
    cursor += SUB_CHART_HEIGHT
  }

  return { grids, paneMap, subs }
}

function buildOption(raw, vis) {
  if (!raw || raw.length === 0) {
    return { title: { text: '暂无数据', left: 'center', top: 'center' } }
  }

  const { grids, paneMap, subs } = calcLayout(vis)
  const dates = raw.map((d) => d.date)
  const ohlc = raw.map((d) => [d.open, d.close, d.low, d.high])

  // ── 构建 axes ──
  const xAxes = []
  const yAxes = []
  const xAxisIndexes = []

  for (let i = 0; i < grids.length; i++) {
    const isLast = i === grids.length - 1
    xAxes.push({
      type: 'category',
      data: dates,
      gridIndex: i,
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#ccc' } },
      axisLabel: { show: isLast, fontSize: 10 },
    })
    const yOpt = { scale: true, gridIndex: i, splitLine: { lineStyle: { color: '#f0f0f0' } } }
    // 特殊 y 轴配置
    if (paneMap.vol === i) {
      yOpt.axisLabel = { formatter: (v) => (v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v) }
    }
    if (paneMap.rsi === i) {
      yOpt.min = 0
      yOpt.max = 100
    }
    yAxes.push(yOpt)
    xAxisIndexes.push(i)
  }

  // ── 构建 series ──
  const series = []

  // K 线（始终显示）
  series.push({
    name: 'K线',
    type: 'candlestick',
    data: ohlc,
    xAxisIndex: 0,
    yAxisIndex: 0,
    itemStyle: {
      color: UP_COLOR, color0: DOWN_COLOR,
      borderColor: UP_COLOR, borderColor0: DOWN_COLOR,
    },
  })

  // MA 线
  const maKeys = ['ma5', 'ma10', 'ma20', 'ma60']
  for (const key of maKeys) {
    if (vis[key]) {
      series.push(makeLine(key.toUpperCase(), raw.map((d) => d[key]), 0, 0, MA_COLORS[key]))
    }
  }

  // 布林带
  if (vis.boll) {
    series.push(makeLine('BOLL上轨', raw.map((d) => d.boll_upper), 0, 0, BOLL_COLOR, 'dashed'))
    series.push(makeLine('BOLL中轨', raw.map((d) => d.boll_mid), 0, 0, BOLL_COLOR, 'dotted'))
    series.push(makeLine('BOLL下轨', raw.map((d) => d.boll_lower), 0, 0, BOLL_COLOR, 'dashed'))
  }

  // EMA 多空飘带（实心色带）+ 翻转标记
  const hasEma = vis.ema && raw.some((d) => d.ema5 != null && d.ema30 != null)
  if (hasEma) {
    // 计算翻转点
    const bullMarkPoints = []  // 空转多
    const bearMarkPoints = []  // 多转空
    for (let i = 1; i < raw.length; i++) {
      const prev = raw[i - 1]
      const cur = raw[i]
      if (prev.ema5 == null || prev.ema30 == null || cur.ema5 == null || cur.ema30 == null) continue
      const prevBull = prev.ema5 >= prev.ema30
      const curBull = cur.ema5 >= cur.ema30
      if (!prevBull && curBull) {
        bullMarkPoints.push({ coord: [i, cur.low], value: '多' })
      } else if (prevBull && !curBull) {
        bearMarkPoints.push({ coord: [i, cur.high], value: '空' })
      }
    }

    series.push({
      name: 'EMA多空带',
      type: 'custom',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: raw.map((d, i) => [i, d.ema5, d.ema30]),
      renderItem(params, api) {
        const idx = params.dataIndex
        if (idx >= raw.length - 1) return null
        const cur = raw[idx]
        const nxt = raw[idx + 1]
        if (cur.ema5 == null || cur.ema30 == null || nxt.ema5 == null || nxt.ema30 == null) return null

        const p1 = api.coord([idx, cur.ema5])
        const p2 = api.coord([idx + 1, nxt.ema5])
        const p3 = api.coord([idx + 1, nxt.ema30])
        const p4 = api.coord([idx, cur.ema30])

        const avgShort = (cur.ema5 + nxt.ema5) / 2
        const avgLong = (cur.ema30 + nxt.ema30) / 2
        const isBull = avgShort >= avgLong

        return {
          type: 'polygon',
          shape: { points: [p1, p2, p3, p4] },
          style: { fill: isBull ? 'rgba(38,166,154,0.7)' : 'rgba(239,83,80,0.7)' },
          silent: true,
        }
      },
    })

    // 空转多标记（绿色向上箭头，打在当日最低价下方）
    if (bullMarkPoints.length > 0) {
      series.push({
        name: '空转多',
        type: 'scatter',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: bullMarkPoints.map((p) => ({ value: p.coord, label: p.value })),
        symbol: 'triangle',
        symbolSize: 12,
        symbolOffset: [0, '60%'],
        itemStyle: { color: '#26a69a' },
        label: {
          show: true,
          formatter: '转多',
          position: 'bottom',
          fontSize: 10,
          color: '#26a69a',
          fontWeight: 'bold',
        },
        tooltip: {
          formatter: (p) => `${dates[p.value[0]] ?? ''}<br/>飘带 空转多`,
        },
      })
    }

    // 多转空标记（红色向下箭头，打在当日最高价上方）
    if (bearMarkPoints.length > 0) {
      series.push({
        name: '多转空',
        type: 'scatter',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: bearMarkPoints.map((p) => ({ value: p.coord, label: p.value })),
        symbol: 'triangle',
        symbolSize: 12,
        symbolRotate: 180,
        symbolOffset: [0, '-60%'],
        itemStyle: { color: '#ef5350' },
        label: {
          show: true,
          formatter: '转空',
          position: 'top',
          fontSize: 10,
          color: '#ef5350',
          fontWeight: 'bold',
        },
        tooltip: {
          formatter: (p) => `${dates[p.value[0]] ?? ''}<br/>飘带 多转空`,
        },
      })
    }
  }

  // 成交量
  if (paneMap.vol != null) {
    const gi = paneMap.vol
    const volColors = raw.map((d) => (d.close >= d.open ? UP_COLOR : DOWN_COLOR))
    series.push({
      name: '成交量',
      type: 'bar',
      data: raw.map((d) => d.volume),
      xAxisIndex: gi, yAxisIndex: gi,
      itemStyle: { color: (p) => volColors[p.dataIndex] },
    })
    series.push(makeLine('VOL MA20', raw.map((d) => d.vol_ma20), gi, gi, '#ff9800'))
  }

  // MACD
  if (paneMap.macd != null) {
    const gi = paneMap.macd
    const macdHist = raw.map((d) => d.macd)
    const macdColors = macdHist.map((v) => (v >= 0 ? UP_COLOR : DOWN_COLOR))
    series.push({
      name: 'MACD',
      type: 'bar',
      data: macdHist,
      xAxisIndex: gi, yAxisIndex: gi,
      itemStyle: { color: (p) => macdColors[p.dataIndex] },
    })
    series.push(makeLine('DIF', raw.map((d) => d.dif), gi, gi, DIF_COLOR))
    series.push(makeLine('DEA', raw.map((d) => d.dea), gi, gi, DEA_COLOR))
  }

  // RSI
  if (paneMap.rsi != null) {
    const gi = paneMap.rsi
    series.push(makeLine('RSI14', raw.map((d) => d.rsi14), gi, gi, RSI_COLOR))
    series.push({
      name: '超买', type: 'line',
      data: new Array(dates.length).fill(70),
      xAxisIndex: gi, yAxisIndex: gi,
      lineStyle: { color: '#ccc', type: 'dashed', width: 1 },
      symbol: 'none', tooltip: { show: false },
    })
    series.push({
      name: '超卖', type: 'line',
      data: new Array(dates.length).fill(30),
      xAxisIndex: gi, yAxisIndex: gi,
      lineStyle: { color: '#ccc', type: 'dashed', width: 1 },
      symbol: 'none', tooltip: { show: false },
    })
  }

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#ccc',
      textStyle: { color: '#333', fontSize: 12 },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    dataZoom: [
      { type: 'inside', xAxisIndex: xAxisIndexes, start: 60, end: 100 },
      { type: 'slider', xAxisIndex: xAxisIndexes, bottom: 5, height: 20, start: 60, end: 100 },
    ],
    series,
  }
}

function makeLine(name, data, xIdx, yIdx, color, lineType = 'solid') {
  return {
    name, type: 'line', data,
    xAxisIndex: xIdx, yAxisIndex: yIdx,
    lineStyle: { color, width: 1, type: lineType },
    symbol: 'none', connectNulls: false,
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (chart.value) chart.value.dispose()
  chart.value = echarts.init(chartRef.value)
  chart.value.setOption(buildOption(props.data, props.visible))
}

let ro = null
onMounted(() => {
  renderChart()
  ro = new ResizeObserver(() => chart.value?.resize())
  ro.observe(chartRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  chart.value?.dispose()
})

// 数据或可见性变化时重绘（dispose + init 确保 grid 数量变化正确）
watch([() => props.data, () => props.visible], renderChart, { deep: true })
</script>
