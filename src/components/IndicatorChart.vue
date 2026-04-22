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
      boll: true, vol: true, macd: true, rsi: true,
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
