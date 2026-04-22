<template>
  <div ref="chartContainer" :style="{ width: '100%', height: height + 'px' }" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createChart, ColorType } from 'lightweight-charts'

const props = defineProps({
  candles: {
    type: Array,
    default: () => [],
  },
  sma: {
    type: Array,
    default: () => [],
  },
  ema: {
    type: Array,
    default: () => [],
  },
  bbUpper: {
    type: Array,
    default: () => [],
  },
  bbLower: {
    type: Array,
    default: () => [],
  },
  height: {
    type: Number,
    default: 500,
  },
})

const chartContainer = ref(null)
let chart = null
let candleSeries = null
let smaSeries = null
let emaSeries = null
let bbUpperSeries = null
let bbLowerSeries = null

onMounted(() => {
  chart = createChart(chartContainer.value, {
    layout: {
      background: { type: ColorType.Solid, color: '#ffffff' },
      textColor: '#333',
    },
    grid: {
      vertLines: { color: '#f0f0f0' },
      horzLines: { color: '#f0f0f0' },
    },
    timeScale: {
      timeVisible: true,
      borderColor: '#d1d4dc',
    },
    width: chartContainer.value.clientWidth,
    height: props.height,
  })

  candleSeries = chart.addCandlestickSeries({
    upColor: '#ef5350',
    downColor: '#26a69a',
    borderUpColor: '#ef5350',
    borderDownColor: '#26a69a',
    wickUpColor: '#ef5350',
    wickDownColor: '#26a69a',
  })

  smaSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 1, title: 'SMA' })
  emaSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, title: 'EMA' })
  bbUpperSeries = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1, lineStyle: 2, title: 'BB Upper' })
  bbLowerSeries = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1, lineStyle: 2, title: 'BB Lower' })

  updateData()

  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({ width: chartContainer.value.clientWidth })
  })
  resizeObserver.observe(chartContainer.value)

  onUnmounted(() => {
    resizeObserver.disconnect()
    chart.remove()
  })
})

watch(() => [props.candles, props.sma, props.ema, props.bbUpper, props.bbLower], updateData)

function updateData() {
  if (!candleSeries) return
  candleSeries.setData(props.candles)
  smaSeries.setData(props.sma)
  emaSeries.setData(props.ema)
  bbUpperSeries.setData(props.bbUpper)
  bbLowerSeries.setData(props.bbLower)
  if (props.candles.length > 0) {
    chart.timeScale().fitContent()
  }
}
</script>
