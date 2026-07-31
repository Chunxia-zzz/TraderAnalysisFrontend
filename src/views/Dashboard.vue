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
          @change="handleCodeChange"
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
      <!-- 基本面估值 -->
      <a-col :span="24">
        <a-card title="基本面估值" :loading="fundaLoading">
          <template v-if="funda">
            <a-row :gutter="[16, 16]">
              <!-- 分析师目标价 -->
              <a-col :xs="24" :md="12">
                <div class="funda-block">
                  <span class="funda-label">分析师目标价</span>
                  <span class="funda-value mono">{{ funda.analyst_target ? '$' + funda.analyst_target : '-' }}</span>
                  <span v-if="funda.analyst_upside_pct != null"
                    :class="funda.analyst_upside_pct > 20 ? 'text-up' : funda.analyst_upside_pct > 0 ? 'text-up-mild' : 'text-down'">
                    {{ funda.analyst_upside_pct > 0 ? '+' : '' }}{{ funda.analyst_upside_pct }}%
                  </span>
                  <span v-else class="text-muted">暂无</span>
                </div>
              </a-col>
              <!-- 晨星公允价值 -->
              <a-col :xs="24" :md="12">
                <div class="funda-block">
                  <span class="funda-label">晨星公允价值</span>
                  <span class="funda-value mono">{{ funda.morningstar_value ? '$' + funda.morningstar_value : '-' }}</span>
                  <span v-if="funda.morningstar_discount_pct != null"
                    :class="funda.morningstar_discount_pct > 20 ? 'text-up' : funda.morningstar_discount_pct > 0 ? 'text-up-mild' : 'text-down'">
                    {{ funda.morningstar_discount_pct > 0 ? '+' : '' }}{{ funda.morningstar_discount_pct }}%
                  </span>
                  <span v-else class="text-muted">暂无</span>
                </div>
              </a-col>
              <!-- 关键指标 -->
              <a-col :xs="24" :md="8" v-if="funda.forward_pe">
                <div class="funda-block">
                  <span class="funda-label">远期 PE</span>
                  <span class="funda-value mono">{{ funda.forward_pe }}</span>
                </div>
              </a-col>
              <a-col :xs="24" :md="8" v-if="funda.peg_ratio">
                <div class="funda-block">
                  <span class="funda-label">PEG</span>
                  <span class="funda-value mono">{{ funda.peg_ratio }}</span>
                </div>
              </a-col>
              <a-col :xs="24" :md="8" v-if="funda.roe">
                <div class="funda-block">
                  <span class="funda-label">ROE</span>
                  <span class="funda-value mono">{{ funda.roe }}%</span>
                </div>
              </a-col>
            </a-row>
          </template>
          <a-empty v-else-if="!fundaLoading" :description="fundaMessage || '暂无基本面数据'" />
        </a-card>
      </a-col>

      <!-- 道氏技术面 -->
      <a-col :span="24">
        <a-card title="道氏技术面" :loading="analysisLoading">
          <template v-if="analysis">
            <!-- 道氏三层趋势 -->
            <div class="dow-section">
              <div class="dow-header">🌊 道氏趋势</div>
              <!-- 三层概览 -->
              <a-row :gutter="[12, 8]">
                <a-col :xs="24" :md="8" v-if="analysis.dow_theory">
                  <div class="dow-tier" :class="'tier-' + analysis.dow_theory.tide">
                    <span class="tier-level">潮汐 · 周线</span>
                    <span class="tier-dir">{{ tideLabel(analysis.dow_theory.tide) }}</span>
                    <span class="tier-ma mono" v-if="analysis.dow_theory.tide_ma20">MA20 {{ analysis.dow_theory.tide_ma20 }}</span>
                  </div>
                </a-col>
                <a-col :xs="24" :md="8" v-if="analysis.dow_theory">
                  <div class="dow-tier" :class="'tier-' + analysis.dow_theory.wave">
                    <span class="tier-level">波浪 · 日线</span>
                    <span class="tier-dir">{{ waveLabel(analysis.dow_theory.wave) }}</span>
                    <span class="tier-ma mono" v-if="analysis.dow_theory.wave_ma20">MA20 {{ analysis.dow_theory.wave_ma20 }}</span>
                  </div>
                </a-col>
                <a-col :xs="24" :md="8" v-if="analysis.dow_theory">
                  <div class="dow-tier">
                    <span class="tier-level">涟漪 · 日线</span>
                    <span class="tier-dir" :class="analysis.dow_theory.ripple?.rsi12 < 35 ? 'text-up' : analysis.dow_theory.ripple?.rsi12 > 70 ? 'text-down' : ''">
                      RSI {{ analysis.dow_theory.ripple?.rsi12 ?? '-' }}
                    </span>
                    <span class="tier-ma mono" v-if="analysis.dow_theory.ripple?.bb_pct_b != null">%B {{ (analysis.dow_theory.ripple.bb_pct_b * 100).toFixed(0) }}%</span>
                  </div>
                </a-col>
              </a-row>
              <!-- 信号提示 -->
              <div v-if="analysis.dow_theory" class="dow-signal" :class="signalClass(analysis.dow_theory.signal)">
                <span class="signal-icon">{{ signalIcon(analysis.dow_theory.signal) }}</span>
                <span class="signal-text">{{ analysis.dow_theory.signal }}</span>
                <span class="signal-desc">{{ analysis.dow_theory.signal_desc }}</span>
                <span class="signal-hint">{{ analysis.dow_theory.trade_hint }}</span>
              </div>
            </div>

            <a-divider style="margin: 16px 0" />

            <!-- 关键位置 -->
            <div class="dow-section">
              <div class="dow-header">🎯 关键位置</div>
              <a-row :gutter="16">
                <a-col :xs="24" :md="12">
                  <div class="dow-sub-label support-label">支撑位</div>
                  <template v-if="analysis.supports.length">
                    <div v-for="s in analysis.supports" :key="s.price" class="dow-kv">
                      <span class="dow-k">{{ s.label }}</span>
                      <span v-if="s.is_key" class="key-badge">★</span>
                      <span class="dow-v mono support-price">{{ fmt(s.price) }}</span>
                      <span class="dow-pct" :class="s.price < analysis.close ? 'text-down' : 'text-up'">{{ pctDiff(s.price, analysis.close) }}</span>
                      <a-tooltip v-if="s.dow_context" :title="s.dow_context" placement="right">
                        <span class="dow-ctx-icon">?</span>
                      </a-tooltip>
                    </div>
                  </template>
                  <span v-else class="sr-empty">无有效支撑位</span>
                </a-col>
                <a-col :xs="24" :md="12">
                  <div class="dow-sub-label resist-label">压力位</div>
                  <template v-if="analysis.resistances.length">
                    <div v-for="r in analysis.resistances" :key="r.price" class="dow-kv">
                      <span class="dow-k">{{ r.label }}</span>
                      <span v-if="r.is_key" class="key-badge">★</span>
                      <span class="dow-v mono resist-price">{{ fmt(r.price) }}</span>
                      <span class="dow-pct" :class="r.price > analysis.close ? 'text-up' : 'text-down'">{{ pctDiff(r.price, analysis.close) }}</span>
                      <a-tooltip v-if="r.dow_context" :title="r.dow_context" placement="right">
                        <span class="dow-ctx-icon">?</span>
                      </a-tooltip>
                    </div>
                  </template>
                  <span v-else class="sr-empty">无有效压力位</span>
                </a-col>
              </a-row>
            </div>

            <!-- 盈亏比 -->
            <a-divider style="margin: 16px 0" />
            <div class="dow-section" v-if="analysis.risk_reward && (analysis.risk_reward.long_rr || analysis.risk_reward.short_rr)">
              <div class="dow-header">📏 盈亏比</div>
              <a-row :gutter="16">
                <a-col :span="24">
                  <div class="rr-block">
                    <div class="rr-line">
                      <span class="rr-label">当前价</span>
                      <span class="rr-val mono">${{ analysis.close }}</span>
                    </div>
                    <div class="rr-line" v-if="analysis.risk_reward.short_target">
                      <span class="rr-label">到支撑 {{ analysis.risk_reward.short_target }}</span>
                      <span class="rr-pct down">{{ pctDiff(analysis.risk_reward.short_target, analysis.close) }}</span>
                      <span class="rr-tag sell">▼ 做空止盈</span>
                    </div>
                    <div class="rr-line" v-if="analysis.risk_reward.long_target">
                      <span class="rr-label">到压力 {{ analysis.risk_reward.long_target }}</span>
                      <span class="rr-pct up">{{ pctDiff(analysis.risk_reward.long_target, analysis.close) }}</span>
                      <span class="rr-tag buy">▲ 做多止盈</span>
                    </div>
                    <div class="rr-conclusion">
                      <template v-if="analysis.risk_reward.long_rr > analysis.risk_reward.short_rr">
                        做多盈亏比 <b>{{ analysis.risk_reward.long_rr }}:1</b>，优于做空 {{ analysis.risk_reward.short_rr }}:1
                      </template>
                      <template v-else>
                        做空盈亏比 <b>{{ analysis.risk_reward.short_rr }}:1</b>，优于做多 {{ analysis.risk_reward.long_rr }}:1
                      </template>
                    </div>
                  </div>
                </a-col>
              </a-row>
            </div>

            <!-- 形态信号 -->
            <div class="dow-section" style="margin-top: 16px">
              <div class="dow-header">📐 形态信号</div>
              <div v-if="analysis.patterns.length" class="pattern-wrap">
                <a-tooltip v-for="p in analysis.patterns" :key="p.id" :title="(p.desc || '') + (p.confidence?.note ? '\n' + p.confidence.note : '')">
                  <a-tag :color="p.bullish === true ? 'green' : p.bullish === false ? 'red' : 'default'">
                    {{ p.label }}<span v-if="p.confidence" class="conf-dot" :class="'conf-' + p.confidence.level" />
                  </a-tag>
                </a-tooltip>
              </div>
              <span v-else class="sr-empty">无明显形态信号</span>
            </div>

            <a-divider style="margin: 16px 0" />

            <div class="dow-section">
              <div class="dow-header">📏 量能 & 波动</div>
              <a-row :gutter="16">
                <a-col :xs="12" :md="6">
                  <span class="dow-label">成交量比</span>
                  <span class="dow-value mono">{{ analysis.trend.vol_ratio != null ? analysis.trend.vol_ratio + 'x' : '-' }}</span>
                </a-col>
                <a-col :xs="12" :md="6">
                  <span class="dow-label">ATR14</span>
                  <span class="dow-value mono">{{ analysis.trend.atr14 != null ? fmt(analysis.trend.atr14) : '-' }}</span>
                </a-col>
                <a-col :xs="12" :md="6">
                  <span class="dow-label">ATR波动率</span>
                  <span class="dow-value mono">{{ analysis.trend.atr_pct != null ? (analysis.trend.atr_pct * 100).toFixed(2) + '%' : '-' }}</span>
                </a-col>
                <a-col :xs="12" :md="6" v-if="analysis.dow_theory?.vol_context">
                  <span class="dow-label">量能信号</span>
                  <span class="dow-value" style="font-size:14px">{{ analysis.dow_theory.vol_context }}</span>
                </a-col>
              </a-row>
            </div>

            <div class="sr-footer">数据日期：{{ analysis.date }} · 当前价 {{ fmt(analysis.close) }}</div>
          </template>
          <a-empty v-else-if="!analysisLoading" description="暂无分析数据" />
        </a-card>
      </a-col>
      <!-- 综合评分结论 -->
      <a-col :span="24">
        <a-card :title="`综合评分 — ${code || ''}`" :loading="scoreLoading">
          <template v-if="score">
            <a-row :gutter="16" align="middle" style="margin-bottom: 16px">
              <a-col>
                <a-statistic
                  title="评分"
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
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { getAnalysis, getScoresLatest, getWatchlist, getFundamental } from '../api/trader'

const route = useRoute()

const code = ref(undefined)
const selectedDate = ref(null)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const score = ref(null)
const scoreMessage = ref('')
const analysis = ref(null)
const funda = ref(null)
const fundaMessage = ref('')
const scoreLoading = ref(true)
const analysisLoading = ref(true)
const fundaLoading = ref(true)

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

function pctDiff(price, base) {
  if (!price || !base) return '-'
  const pct = ((price - base) / base * 100).toFixed(1)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function strengthDots(n) {
  const level = Math.min(Math.ceil(n / 2), 3)
  return '●'.repeat(level) + '○'.repeat(3 - level)
}

function trendText(val) {
  return { up: '↑ 上涨', down: '↓ 下跌', sideways: '→ 震荡' }[val] ?? val ?? '-'
}

function trendColorClass(val) {
  return { up: 'text-up', down: 'text-down', sideways: '' }[val] ?? ''
}

function macdText(val) {
  return { bullish: '偏多', bearish: '偏空', neutral: '中性' }[val] ?? '-'
}

function macdColorClass(val) {
  return { bullish: 'text-up', bearish: 'text-down', neutral: '' }[val] ?? ''
}

// ── 道氏趋势 ──
const TIDE_LABELS = { up: '↑ 涨潮', down: '↓ 退潮', neutral: '— 无潮汐' }
const WAVE_LABELS = { up: '↑ 上升浪', down: '↓ 下降浪', neutral: '— 横盘' }
function tideLabel(val) { return TIDE_LABELS[val] ?? '-' }
function waveLabel(val) { return WAVE_LABELS[val] ?? '-' }
function signalIcon(val) {
  const icons = { '顺势做多': '🚀', '回调加仓': '🔍', '等回踩做多': '⏳', '短线反弹': '📉',
    '空仓等待': '❌', '反弹做空': '🔻', '回避/做空': '⛔', '谨慎做多': '⚠️', '等回调做多': '🔍',
    '反弹减仓': '📉', '空仓观望': '❌', '等突破做多': '⏳', '观望等跌': '⏳', '轻仓试多': '🟡',
    '轻仓观望': '🟡', '持续观望': '🟡', '不宜做多': '❌', '观望': '⚪' }
  return icons[val] ?? '⚪'
}
function signalClass(val) {
  if (val === '顺势做多') return 'sig-strong'
  if (['回调加仓', '等回调做多'].includes(val)) return 'sig-buy'
  if (['反弹做空', '回避/做空', '空仓等待', '空仓观望', '不宜做多'].includes(val)) return 'sig-sell'
  if (['等回踩做多', '短线反弹', '谨慎做多', '反弹减仓', '轻仓试多'].includes(val)) return 'sig-caution'
  return 'sig-neutral'
}

async function handleCodeChange() {
  loadData()
}

async function loadData() {
  if (!code.value) return
  score.value = null
  scoreMessage.value = ''
  analysis.value = null
  funda.value = null
  scoreLoading.value = true
  analysisLoading.value = true
  fundaLoading.value = true
  const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
  const [scoreRes, analysisRes, fundaRes] = await Promise.allSettled([
    getScoresLatest(code.value, dateStr),
    getAnalysis(code.value, dateStr),
    getFundamental(code.value, dateStr),
  ])
  if (scoreRes.status === 'fulfilled') {
    const d = scoreRes.value.data
    if (d && d.data === null) {
      score.value = null
      scoreMessage.value = d.message || '暂无评分数据'
    } else {
      score.value = d
    }
  }
  if (analysisRes.status === 'fulfilled') {
    const d = analysisRes.value.data
    analysis.value = (d && d.data === null) ? null : d
  }
  if (fundaRes.status === 'fulfilled') {
    const d = fundaRes.value.data
    if (d && d.data === null) {
      funda.value = null
      fundaMessage.value = d.message || '暂无基本面数据'
    } else if (d) {
      funda.value = d
    }
  }
  scoreLoading.value = false
  analysisLoading.value = false
  fundaLoading.value = false
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
/* ── 评分因子 ── */
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

/* ── 道氏技术面 ── */
.dow-section {
  margin-bottom: 4px;
}
.dow-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}
.dow-sub-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.dow-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.dow-value {
  font-size: 16px;
  font-weight: 600;
}
.dow-kv {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}
.dow-k {
  flex: 1;
  color: var(--text-secondary);
}
.dow-v {
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}
.dow-pct {
  font-size: 12px;
  min-width: 50px;
  text-align: right;
  font-family: 'DM Mono', monospace;
}

.support-price { color: var(--green); }
.resist-price  { color: var(--red); }

.sr-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.sr-row:last-child { border-bottom: none; }

.sr-price {
  font-size: 14px;
  font-weight: 600;
  min-width: 72px;
}
.support-price { color: var(--green); }
.resist-price  { color: var(--red); }

.sr-item-label {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
}

.sr-dist {
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  min-width: 54px;
  text-align: right;
}

.sr-strength {
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--accent);
  min-width: 32px;
  text-align: right;
}

.sr-empty {
  font-size: 13px;
  color: var(--text-muted);
}

.sr-footer {
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}

/* ── 形态 & 趋势 ── */
.section-sub-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.pattern-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 2px;
}

/* ── 通用 ── */
.mono {
  font-family: 'DM Mono', monospace;
}
.text-up   { color: var(--green); font-weight: 600; }
.text-down { color: var(--red);   font-weight: 600; }

/* ── 交易信号 ── */
.signals-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sig-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.badge-sell { background: rgba(255, 77, 79, 0.12); color: var(--red); }
.badge-buy  { background: rgba(82, 196, 26, 0.12);  color: var(--green); }

.signals-col-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.sell-label { color: var(--red); }
.buy-label  { color: var(--green); }

.signal-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background 0.15s;
}

.signal-triggered-sell {
  background: rgba(255, 77, 79, 0.07);
  border-left: 3px solid var(--red);
}
.signal-triggered-buy {
  background: rgba(82, 196, 26, 0.07);
  border-left: 3px solid var(--green);
}
.signal-inactive {
  opacity: 0.45;
  border-left: 3px solid transparent;
}

.signal-dot {
  font-size: 9px;
  flex-shrink: 0;
}
.dot-sell { color: var(--red); }
.dot-buy  { color: var(--green); }
.dot-off  { color: var(--text-muted); }

.signal-name {
  font-size: 13px;
  min-width: 100px;
  font-weight: 500;
}

.signal-strength-bar {
  flex: 1;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
  overflow: hidden;
  min-width: 40px;
}
.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.fill-sell { background: var(--red); }
.fill-buy  { background: var(--green); }

.signal-action {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: default;
  min-width: 80px;
  text-align: right;
}
.action-sell { color: var(--red); }
.action-buy  { color: var(--green); }

.signal-untriggered {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}

/* ── 基本面估值 ── */
.funda-block {
  padding: 12px 0;
}
.funda-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.funda-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}
.text-up      { color: var(--red);   font-weight: 600; }
.text-up-mild { color: var(--orange, #fa8c16); font-weight: 600; }
.text-down    { color: var(--green); font-weight: 600; }
.text-muted   { font-size: 13px; color: var(--text-muted); }

.support-label { color: var(--green); }
.resist-label  { color: var(--red); }

/* ── 道氏三层趋势 ── */
.dow-tier {
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-hover);
  min-height: 72px;
}
.dow-tier.tier-up   { border-left: 3px solid var(--red); }
.dow-tier.tier-down { border-left: 3px solid var(--green); }
.tier-level {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.tier-dir {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}
.tier-ma {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.dow-signal {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.dow-signal.sig-strong  { background: rgba(255, 77, 79, 0.08); border: 1px solid rgba(255, 77, 79, 0.15); }
.dow-signal.sig-buy     { background: rgba(82, 196, 26, 0.08);  border: 1px solid rgba(82, 196, 26, 0.15); }
.dow-signal.sig-caution { background: rgba(255, 159, 28, 0.08); border: 1px solid rgba(255, 159, 28, 0.15); }
.dow-signal.sig-sell    { background: rgba(240, 173, 78, 0.08); border: 1px solid rgba(240, 173, 78, 0.15); }
.dow-signal.sig-neutral { background: var(--bg-hover); }
.signal-icon { font-size: 18px; }
.signal-text { font-size: 16px; font-weight: 700; }
.signal-desc { font-size: 12px; color: var(--text-secondary); }
.signal-hint { width: 100%; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

/* ── 关键位置增强 ── */
.key-badge { font-size: 10px; color: var(--accent); margin-right: 4px; flex-shrink: 0; }
.dow-ctx-icon { font-size: 10px; color: var(--text-muted); cursor: help; background: var(--bg-hover); border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; }

/* ── 盈亏比 ── */
.rr-block { padding: 12px 16px; border-radius: 8px; background: var(--bg-hover); }
.rr-line { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.rr-label { font-size: 12px; color: var(--text-muted); min-width: 80px; }
.rr-val   { font-size: 14px; font-weight: 600; color: var(--text); }
.rr-pct   { font-size: 13px; font-weight: 600; min-width: 50px; }
.rr-pct.up   { color: var(--red); }
.rr-pct.down { color: var(--green); }
.rr-tag  { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.rr-tag.buy  { background: rgba(255,77,79,0.1); color: var(--red); }
.rr-tag.sell { background: rgba(82,196,26,0.1); color: var(--green); }
.rr-conclusion { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-secondary); }
.rr-conclusion b { color: var(--text); }

/* ── 形态信号置信度 ── */
.conf-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-left: 4px; vertical-align: middle; }
.conf-dot.conf-high   { background: var(--red); box-shadow: 0 0 4px var(--red); }
.conf-dot.conf-medium { background: var(--accent); }
.conf-dot.conf-low    { background: var(--text-muted); }
</style>
