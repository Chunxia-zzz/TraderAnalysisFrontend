<template>
  <div>
    <!-- 标的选择 + 日期选择 -->
    <a-card style="margin-bottom: 16px" size="small">
      <a-space>
        <span style="color: #666">标的</span>
        <a-select
          v-model:value="code"
          placeholder="选择标的"
          style="width: 200px"
          show-search
          :loading="watchlistLoading"
          :options="watchlistOptions"
          @change="loadData"
        />
        <span style="color: #666">日期</span>
        <a-date-picker
          v-model:value="selectedDate"
          placeholder="最新"
          :allow-clear="true"
          style="width: 140px"
          @change="loadData"
        />
      </a-space>
    </a-card>

    <a-row :gutter="[16, 16]">
      <!-- 最新评分 -->
      <a-col :span="24">
        <a-card :title="`评分 — ${code || ''}`" :loading="scoreLoading">
          <template v-if="score">
            <a-row :gutter="16" align="middle" style="margin-bottom: 16px">
              <a-col>
                <a-statistic
                  title="综合评分"
                  :value="score.total_score"
                  :precision="1"
                  :value-style="{ color: scoreColor }"
                  suffix="/ 100"
                />
              </a-col>
              <a-col>
                <a-tag :color="signalTagColor">{{ signalLabel }}</a-tag>
              </a-col>
              <a-col>
                <span style="color: #999; font-size: 12px">{{ score.date }}</span>
              </a-col>
            </a-row>
            <!-- 因子明细 -->
            <div v-for="(item, key) in score.breakdown" :key="key" class="factor-row">
              <span class="factor-label">{{ factorLabel(key) }}</span>
              <a-progress
                :percent="item.ratio * 100"
                :stroke-color="getRatioColor(item.ratio)"
                :show-info="false"
                style="flex: 1; margin: 0 12px"
              />
              <span class="factor-score" :class="{ 'factor-highlight': item.ratio > 0.7 }">
                {{ item.score.toFixed(1) }}
              </span>
            </div>
          </template>
          <a-empty v-else-if="!scoreLoading" :description="scoreMessage || '暂无评分数据'" />
        </a-card>
      </a-col>

      <!-- 最新技术指标 -->
      <a-col :xs="24" :md="12">
        <a-card title="最新技术指标" :loading="indicatorLoading">
          <a-descriptions v-if="latest" :column="2" bordered size="small">
            <a-descriptions-item label="日期">{{ latest.date }}</a-descriptions-item>
            <a-descriptions-item label="收盘价">{{ fmt(latest.close) }}</a-descriptions-item>
            <a-descriptions-item label="开盘价">{{ fmt(latest.open) }}</a-descriptions-item>
            <a-descriptions-item label="最高价">{{ fmt(latest.high) }}</a-descriptions-item>
            <a-descriptions-item label="最低价">{{ fmt(latest.low) }}</a-descriptions-item>
            <a-descriptions-item label="成交量">{{ fmtVol(latest.volume) }}</a-descriptions-item>
          </a-descriptions>
          <a-empty v-else-if="!indicatorLoading" description="暂无指标数据" />
        </a-card>
      </a-col>

      <!-- 均线 & 布林 -->
      <a-col :xs="24" :md="12">
        <a-card title="均线 & 布林带" :loading="indicatorLoading">
          <a-descriptions v-if="latest" :column="2" bordered size="small">
            <a-descriptions-item label="MA5">{{ fmt(latest.ma5) }}</a-descriptions-item>
            <a-descriptions-item label="MA10">{{ fmt(latest.ma10) }}</a-descriptions-item>
            <a-descriptions-item label="MA20">{{ fmt(latest.ma20) }}</a-descriptions-item>
            <a-descriptions-item label="MA60">{{ fmt(latest.ma60) }}</a-descriptions-item>
            <a-descriptions-item label="BOLL上轨">{{ fmt(latest.boll_upper) }}</a-descriptions-item>
            <a-descriptions-item label="BOLL中轨">{{ fmt(latest.boll_mid) }}</a-descriptions-item>
            <a-descriptions-item label="BOLL下轨">{{ fmt(latest.boll_lower) }}</a-descriptions-item>
          </a-descriptions>
          <a-empty v-else-if="!indicatorLoading" description="暂无数据" />
        </a-card>
      </a-col>

      <!-- MACD & RSI -->
      <a-col :span="24">
        <a-card title="MACD & RSI" :loading="indicatorLoading">
          <a-descriptions v-if="latest" :column="4" bordered size="small">
            <a-descriptions-item label="DIF">{{ fmt(latest.dif) }}</a-descriptions-item>
            <a-descriptions-item label="DEA">{{ fmt(latest.dea) }}</a-descriptions-item>
            <a-descriptions-item label="MACD">{{ fmt(latest.macd) }}</a-descriptions-item>
            <a-descriptions-item label="RSI14">{{ fmt(latest.rsi14) }}</a-descriptions-item>
          </a-descriptions>
          <a-empty v-else-if="!indicatorLoading" description="暂无数据" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { getIndicatorsLatest, getScoresLatest, getWatchlist } from '../api/trader'

const route = useRoute()

const code = ref(undefined)
const selectedDate = ref(null)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const latest = ref(null)
const score = ref(null)
const scoreMessage = ref('')
const indicatorLoading = ref(true)
const scoreLoading = ref(true)

const scoreColor = computed(() => {
  if (!score.value) return 'var(--text-muted)'
  const s = score.value.total_score
  if (s >= 80) return 'var(--green)'
  if (s >= 60) return 'var(--accent)'
  return 'var(--text-muted)'
})

const signalTagColor = computed(() => {
  if (!score.value) return ''
  const sig = score.value.signal
  if (sig === 'STRONG_BUY') return 'green'
  if (sig === 'BUY') return 'lime'
  return 'default'
})

const signalLabel = computed(() => {
  if (!score.value) return ''
  const labels = { STRONG_BUY: '强烈买入', BUY: '建议买入', NO_ACTION: '观望' }
  return labels[score.value.signal] || score.value.signal
})

const FACTOR_LABELS = {
  weekly_rsi: '周线RSI',
  daily_macd_pct: '日线MACD百分位',
  boll_position: '布林带位置',
  daily_rsi: '日线RSI',
  weekly_macd_pct: '周线MACD百分位',
  ma250_deviation: 'MA250偏离',
}

function factorLabel(key) {
  return FACTOR_LABELS[key] || key
}

function getRatioColor(ratio) {
  if (ratio >= 0.7) return 'var(--green)'
  if (ratio >= 0.4) return 'var(--accent)'
  return 'var(--text-muted)'
}

function fmt(val) {
  return val != null ? Number(val).toFixed(2) : '-'
}

function fmtVol(val) {
  if (val == null) return '-'
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M'
  if (val >= 1e3) return (val / 1e3).toFixed(0) + 'K'
  return val.toString()
}

async function loadData() {
  if (!code.value) return
  latest.value = null
  score.value = null
  scoreMessage.value = ''
  indicatorLoading.value = true
  scoreLoading.value = true
  const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
  const [indRes, scoreRes] = await Promise.allSettled([
    getIndicatorsLatest(code.value),
    getScoresLatest(code.value, dateStr),
  ])
  if (indRes.status === 'fulfilled') {
    const d = indRes.value.data
    // 兼容新格式 {data: null, message} 和旧格式直接返回对象
    latest.value = (d && d.data === null) ? null : d
  }
  if (scoreRes.status === 'fulfilled') {
    const d = scoreRes.value.data
    if (d && d.data === null) {
      score.value = null
      scoreMessage.value = d.message || '暂无评分数据'
    } else {
      score.value = d
    }
  }
  indicatorLoading.value = false
  scoreLoading.value = false
}

onMounted(async () => {
  watchlistLoading.value = true
  try {
    const res = await getWatchlist()
    const data = res.data
    const list = (data.watchlist || []).filter((item) => item.has_data)
    watchlistOptions.value = list.map((item) => ({
      label: `${item.ticker} - ${item.name}`,
      value: item.code,
    }))
    // 支持从 URL query 传入 code 和 date（如从机会速览页跳转）
    const queryCode = route.query.code
    const queryDate = route.query.date
    if (queryCode && watchlistOptions.value.some(o => o.value === queryCode)) {
      code.value = queryCode
      if (queryDate) selectedDate.value = dayjs(queryDate)
    } else if (watchlistOptions.value.length > 0) {
      code.value = watchlistOptions.value[0].value
    }
    loadData()
  } catch {
    message.error('获取标的列表失败')
  } finally {
    watchlistLoading.value = false
  }
})
</script>

<style scoped>
.factor-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
}
.factor-label {
  width: 120px;
  font-size: 13px;
  color: var(--text-secondary);
}
.factor-score {
  width: 40px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
  font-family: 'DM Mono', monospace;
  color: var(--text-muted);
}
.factor-highlight {
  color: var(--green);
}
</style>
