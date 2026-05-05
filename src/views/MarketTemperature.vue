<template>
  <div>
    <!-- 快速链接 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" rel="noopener noreferrer">
        CNN Fear &amp; Greed Index
      </a>
      <span style="color: #999; margin-left: 8px; font-size: 12px">— CNN 恐惧与贪婪指数，市场情绪参考</span>
      <br />
      <span style="color: #fa8c16; font-size: 13px; margin-top: 4px; display: inline-block">交易时请观察VIX期货价格，30以上为极度恐慌，35以上往往是抄底的绝佳机会</span>
    </a-card>

    <!-- 顶部概览 -->
    <a-card :loading="loading" style="margin-bottom: 16px">
      <template v-if="data">
        <a-row :gutter="24" align="middle">
          <a-col :xs="24" :md="8">
            <div class="score-section" :style="{ backgroundColor: level.bg }">
              <div class="score-value" :style="{ color: level.color }">
                {{ data.composite_score.toFixed(1) }}
              </div>
              <div class="score-label">/ 100</div>
            </div>
            <a-tag :color="level.color" style="margin-top: 8px; font-size: 14px; padding: 4px 12px">
              {{ level.label }}
            </a-tag>
          </a-col>
          <a-col :xs="24" :md="16">
            <a-descriptions :column="2" size="small">
              <a-descriptions-item label="建议仓位">
                <span style="font-weight: 600; font-size: 16px">{{ data.target_position_pct.toFixed(1) }}%</span>
              </a-descriptions-item>
              <a-descriptions-item label="操作建议">
                <span style="font-weight: 500">{{ level.action }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">{{ data.created_at }}</a-descriptions-item>
              <a-descriptions-item label="数据日期">{{ data.date }}</a-descriptions-item>
            </a-descriptions>
            <!-- 杠杆提示 -->
            <a-alert
              v-if="leverageInfo"
              :message="leverageInfo.text"
              :description="leverageInfo.detail"
              type="warning"
              show-icon
              style="margin-top: 12px"
            />
          </a-col>
        </a-row>
      </template>
      <a-empty v-else-if="!loading" description="暂无市场温度数据，请确认后端已运行 temperature 命令" />
    </a-card>

    <!-- 维度拆解 -->
    <a-card title="维度拆解" style="margin-bottom: 16px" :loading="loading" v-if="data">
      <div v-for="dim in activeDimensions" :key="dim.key" class="dimension-row">
        <span class="dim-name">{{ dim.name }}</span>
        <a-tag size="small" style="min-width: 36px; text-align: center">{{ dim.weight }}</a-tag>
        <a-progress
          :percent="data[dim.key]"
          :stroke-color="getDimensionColor(data[dim.key])"
          :show-info="false"
          style="flex: 1; margin: 0 12px"
        />
        <span class="dim-score">{{ data[dim.key]?.toFixed(1) }}</span>
      </div>
    </a-card>

    <!-- 标的指标卡片 -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 16px" v-if="data">
      <a-col :xs="24" :md="12">
        <a-card size="small" title="SPY">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="价格">{{ fmt(data.spy_price) }}</a-descriptions-item>
            <a-descriptions-item label="日RSI">{{ fmt(data.spy_daily_rsi) }}</a-descriptions-item>
            <a-descriptions-item label="周RSI">{{ fmt(data.spy_weekly_rsi) }}</a-descriptions-item>
            <a-descriptions-item label="MA200偏离">{{ pct(data.spy_ma200_dev) }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="12">
        <a-card size="small" title="QQQ">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="价格">{{ fmt(data.qqq_price) }}</a-descriptions-item>
            <a-descriptions-item label="日RSI">{{ fmt(data.qqq_daily_rsi) }}</a-descriptions-item>
            <a-descriptions-item label="周RSI">{{ fmt(data.qqq_weekly_rsi) }}</a-descriptions-item>
            <a-descriptions-item label="MA200偏离">{{ pct(data.qqq_ma200_dev) }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>

    <!-- 历史趋势图 -->
    <a-card title="历史趋势" :loading="historyLoading" v-if="historyData.length > 0">
      <div ref="chartRef" style="width: 100%; height: 320px"></div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getMarketTemperature, getMarketTemperatureHistory } from '../api/trader'

const TEMPERATURE_LEVELS = [
  { max: 5,   label: '极端恐慌', color: '#1a237e', bg: '#e8eaf6', action: '融资+期权超配' },
  { max: 15,  label: '极度恐慌', color: '#1a5fb4', bg: '#d0e4f5', action: '重仓逆势买入' },
  { max: 30,  label: '偏悲观',   color: '#3584e4', bg: '#dbeafe', action: '积极加仓' },
  { max: 45,  label: '略偏冷',   color: '#62a0ea', bg: '#e0f2fe', action: '适度加仓' },
  { max: 55,  label: '中性',     color: '#9a9996', bg: '#f5f5f5', action: '维持仓位' },
  { max: 70,  label: '略偏热',   color: '#ff7800', bg: '#fff3e0', action: '适度减仓' },
  { max: 85,  label: '偏贪婪',   color: '#e66100', bg: '#fbe9e7', action: '积极减仓' },
  { max: 100, label: '极度贪婪', color: '#c01c28', bg: '#ffebee', action: '大幅减仓' },
]

const LEVERAGE_LABELS = {
  none: null,
  margin: { text: '建议融资补仓（现货ETF）', detail: '融资额度不超过净值30%' },
  'margin + OTM_call': { text: '建议融资 + OTM Call期权超配', detail: '融资≤净值30% + 权利金≤净值10%' },
}

const dimensions = [
  { key: 'daily_tech_score',  name: '日线技术面', weight: '50%' },
  { key: 'weekly_tech_score', name: '周线技术面', weight: '35%' },
  { key: 'price_score',       name: '价格位置',   weight: '15%' },
]

function getDimensionColor(score) {
  if (score == null) return '#9e9e9e'
  if (score <= 20) return '#1565c0'
  if (score <= 40) return '#42a5f5'
  if (score <= 60) return '#9e9e9e'
  if (score <= 80) return '#ff9800'
  return '#d32f2f'
}

function fmt(val) {
  return val != null ? Number(val).toFixed(2) : '-'
}

function pct(val) {
  return val != null ? (val * 100).toFixed(1) + '%' : '-'
}

const loading = ref(true)
const data = ref(null)
const historyLoading = ref(true)
const historyData = ref([])
const chartRef = ref(null)
let chartInstance = null

const level = computed(() => {
  if (!data.value) return TEMPERATURE_LEVELS[4]
  return TEMPERATURE_LEVELS.find((l) => data.value.composite_score <= l.max) || TEMPERATURE_LEVELS[7]
})

const leverageInfo = computed(() => {
  if (!data.value) return null
  return LEVERAGE_LABELS[data.value.leverage_tool] || null
})

const activeDimensions = computed(() => {
  if (!data.value) return []
  return dimensions.filter(dim => data.value[dim.key] != null)
})

function renderChart() {
  if (!chartRef.value || historyData.value.length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  const dates = historyData.value.map((d) => d.date)
  const scores = historyData.value.map((d) => d.composite_score)
  const positions = historyData.value.map((d) => d.target_position_pct)

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['综合评分', '建议仓位%'] },
    grid: { left: 50, right: 50, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: dates },
    yAxis: [
      { type: 'value', name: '评分', min: 0, max: 100 },
      { type: 'value', name: '仓位%', min: 0, max: 130 },
    ],
    series: [
      {
        name: '综合评分',
        type: 'line',
        data: scores,
        smooth: true,
        itemStyle: { color: '#1976d2' },
        markArea: {
          silent: true,
          data: [
            [{ yAxis: 0, itemStyle: { color: 'rgba(21,101,192,0.06)' } }, { yAxis: 30 }],
            [{ yAxis: 30, itemStyle: { color: 'rgba(158,158,158,0.06)' } }, { yAxis: 70 }],
            [{ yAxis: 70, itemStyle: { color: 'rgba(211,47,47,0.06)' } }, { yAxis: 100 }],
          ],
        },
      },
      {
        name: '建议仓位%',
        type: 'line',
        yAxisIndex: 1,
        data: positions,
        smooth: true,
        lineStyle: { type: 'dashed' },
        itemStyle: { color: '#ff9800' },
      },
    ],
  })
}

onMounted(async () => {
  try {
    const res = await getMarketTemperature()
    data.value = res.data
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }

  try {
    const res = await getMarketTemperatureHistory(60)
    historyData.value = res.data.history || []
  } catch {
    historyData.value = []
  } finally {
    historyLoading.value = false
  }

  await nextTick()
  renderChart()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  chartInstance?.resize()
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.score-section {
  display: inline-flex;
  align-items: baseline;
  padding: 16px 24px;
  border-radius: 12px;
}
.score-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}
.score-label {
  font-size: 18px;
  color: #999;
  margin-left: 4px;
}
.dimension-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
}
.dim-name {
  width: 80px;
  font-size: 13px;
  color: #333;
}
.dim-score {
  width: 48px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
}
</style>
