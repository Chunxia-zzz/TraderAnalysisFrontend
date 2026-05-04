<template>
  <div>
    <!-- 标的选择 -->
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
      </a-space>
    </a-card>

    <a-row :gutter="[16, 16]">
      <!-- 最新评分 -->
      <a-col :span="24">
        <a-card :title="`最新评分 — ${code || ''}`" :loading="scoreLoading">
          <template v-if="score">
            <a-row :gutter="16" align="middle" style="margin-bottom: 16px">
              <a-col>
                <a-statistic
                  title="综合评分"
                  :value="score.total_score"
                  :value-style="{ color: scoreColor }"
                />
              </a-col>
              <a-col>
                <a-tag :color="signalTagColor">{{ score.signal }}</a-tag>
              </a-col>
              <a-col>
                <span style="color: #999; font-size: 12px">{{ score.date }}</span>
              </a-col>
            </a-row>
            <!-- 因子明细 -->
            <a-row :gutter="[12, 8]">
              <a-col :xs="12" :md="8" v-for="(item, key) in score.breakdown" :key="key">
                <div class="factor-item">
                  <span class="factor-label">{{ factorLabel(key) }}</span>
                  <a-tag v-if="item.triggered" color="green" size="small">触发</a-tag>
                  <a-tag v-else size="small">未触发</a-tag>
                  <span class="factor-score">+{{ item.score }}</span>
                </div>
              </a-col>
            </a-row>
          </template>
          <a-empty v-else-if="!scoreLoading" description="暂无评分数据" />
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
import { message } from 'ant-design-vue'
import { getIndicatorsLatest, getScoresLatest, getWatchlist } from '../api/trader'

const code = ref(undefined)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const latest = ref(null)
const score = ref(null)
const indicatorLoading = ref(true)
const scoreLoading = ref(true)

const scoreColor = computed(() => {
  if (!score.value) return '#999'
  const s = score.value.total_score
  if (s >= 70) return '#52c41a'
  if (s >= 40) return '#faad14'
  return '#f5222d'
})

const signalTagColor = computed(() => {
  if (!score.value) return ''
  const sig = score.value.signal
  if (sig === 'BUY') return 'green'
  if (sig === 'SELL') return 'red'
  return 'default'
})

const FACTOR_LABELS = {
  weekly_rsi: '周RSI超卖',
  daily_macd_divergence: '日MACD底背离',
  vix: 'VIX恐慌',
  boll_lower: '布林下轨',
  daily_rsi: '日RSI超卖',
  cnn_fg: 'CNN恐贪指数',
  panic_volume: '恐慌放量',
  weekly_macd_shrink: '周MACD缩柱',
  ma250_deviation: 'MA250偏离',
}

function factorLabel(key) {
  return FACTOR_LABELS[key] || key
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
  indicatorLoading.value = true
  scoreLoading.value = true
  const [indRes, scoreRes] = await Promise.allSettled([
    getIndicatorsLatest(code.value),
    getScoresLatest(code.value),
  ])
  if (indRes.status === 'fulfilled') latest.value = indRes.value.data
  if (scoreRes.status === 'fulfilled') score.value = scoreRes.value.data
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
      value: item.futu_code,
    }))
    if (watchlistOptions.value.length > 0) {
      code.value = watchlistOptions.value[0].value
      loadData()
    }
  } catch {
    message.error('获取标的列表失败')
  } finally {
    watchlistLoading.value = false
  }
})
</script>

<style scoped>
.factor-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 13px;
}
.factor-label {
  color: #333;
}
.factor-score {
  margin-left: auto;
  font-weight: 600;
  color: #52c41a;
}
</style>
