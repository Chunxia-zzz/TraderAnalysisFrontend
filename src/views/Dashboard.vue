<template>
  <div>
    <a-row :gutter="[16, 16]">
      <!-- 最新评分 -->
      <a-col :span="24">
        <a-card title="最新评分 — US.SNDK" :loading="scoreLoading">
          <a-result
            v-if="score"
            :status="scoreStatus"
            :title="`综合评分: ${score.total_score ?? '-'}`"
            :sub-title="scoreSubTitle"
          />
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
import { getIndicatorsLatest, getScoresLatest } from '../api/trader'

const latest = ref(null)
const score = ref(null)
const indicatorLoading = ref(true)
const scoreLoading = ref(true)

const scoreStatus = computed(() => {
  if (!score.value) return 'info'
  const s = score.value.total_score
  if (s >= 70) return 'success'
  if (s <= 30) return 'error'
  return 'warning'
})

const scoreSubTitle = computed(() => {
  if (!score.value) return ''
  const parts = []
  if (score.value.date) parts.push(`日期: ${score.value.date}`)
  if (score.value.trend_score != null) parts.push(`趋势: ${score.value.trend_score}`)
  if (score.value.momentum_score != null) parts.push(`动量: ${score.value.momentum_score}`)
  if (score.value.volatility_score != null) parts.push(`波动: ${score.value.volatility_score}`)
  return parts.join('  |  ')
})

function fmt(val) {
  return val != null ? Number(val).toFixed(2) : '-'
}

function fmtVol(val) {
  if (val == null) return '-'
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M'
  if (val >= 1e3) return (val / 1e3).toFixed(0) + 'K'
  return val.toString()
}

onMounted(async () => {
  const [indRes, scoreRes] = await Promise.allSettled([
    getIndicatorsLatest('US.SNDK'),
    getScoresLatest('US.SNDK'),
  ])
  if (indRes.status === 'fulfilled') latest.value = indRes.value.data
  if (scoreRes.status === 'fulfilled') score.value = scoreRes.value.data
  indicatorLoading.value = false
  scoreLoading.value = false
})
</script>
