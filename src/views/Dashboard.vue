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
            <a-descriptions-item label="RSI12">{{ fmt(latest.rsi12) }}</a-descriptions-item>
          </a-descriptions>
          <a-empty v-else-if="!indicatorLoading" description="暂无数据" />
        </a-card>
      </a-col>

      <!-- 交易信号 -->
      <a-col :span="24">
        <a-card title="交易信号" :loading="signalsLoading">
          <template v-if="tradeSignals">
            <div class="signals-meta">
              数据日期：{{ tradeSignals.date }}
              <span v-if="tradeSignals.top_triggered_count > 0" class="sig-badge badge-sell">
                顶部预警 {{ tradeSignals.top_triggered_count }}
              </span>
              <span v-if="tradeSignals.bottom_triggered_count > 0" class="sig-badge badge-buy">
                底部买入 {{ tradeSignals.bottom_triggered_count }}
              </span>
            </div>
            <a-row :gutter="16" style="margin-top: 12px">
              <!-- 左栏：顶部预警 -->
              <a-col :xs="24" :md="12">
                <div class="signals-col-label sell-label">顶部预警（卖出侧）</div>
                <div
                  v-for="sig in tradeSignals.top_signals"
                  :key="sig.signal_type"
                  class="signal-row"
                  :class="sig.triggered ? 'signal-triggered-sell' : 'signal-inactive'"
                >
                  <span class="signal-dot" :class="sig.triggered ? 'dot-sell' : 'dot-off'">●</span>
                  <span class="signal-name">{{ sig.label }}</span>
                  <template v-if="sig.triggered">
                    <div class="signal-strength-bar">
                      <div class="strength-fill fill-sell" :style="{ width: (sig.strength * 100) + '%' }" />
                    </div>
                    <a-tooltip :title="sig.description">
                      <span class="signal-action action-sell">{{ sig.action }}</span>
                    </a-tooltip>
                  </template>
                  <span v-else class="signal-untriggered">未触发</span>
                </div>
              </a-col>
              <!-- 右栏：底部买入 -->
              <a-col :xs="24" :md="12">
                <div class="signals-col-label buy-label">底部买入（买入侧）</div>
                <div
                  v-for="sig in tradeSignals.bottom_signals"
                  :key="sig.signal_type"
                  class="signal-row"
                  :class="sig.triggered ? 'signal-triggered-buy' : 'signal-inactive'"
                >
                  <span class="signal-dot" :class="sig.triggered ? 'dot-buy' : 'dot-off'">●</span>
                  <span class="signal-name">{{ sig.label }}</span>
                  <template v-if="sig.triggered">
                    <div class="signal-strength-bar">
                      <div class="strength-fill fill-buy" :style="{ width: (sig.strength * 100) + '%' }" />
                    </div>
                    <a-tooltip :title="sig.description">
                      <span class="signal-action action-buy">{{ sig.action }}</span>
                    </a-tooltip>
                  </template>
                  <span v-else class="signal-untriggered">未触发</span>
                </div>
              </a-col>
            </a-row>
          </template>
          <a-empty v-else-if="!signalsLoading" description="暂无信号数据" />
        </a-card>
      </a-col>

      <!-- 支撑 & 压力位 -->
      <a-col :xs="24" :md="12">
        <a-card title="支撑 & 压力位" :loading="analysisLoading">
          <template v-if="analysis">
            <!-- 支撑位 -->
            <div class="sr-group-label support-label">支撑位</div>
            <template v-if="analysis.supports.length">
              <div v-for="s in analysis.supports" :key="s.price" class="sr-row">
                <span class="sr-price support-price mono">{{ fmt(s.price) }}</span>
                <span class="sr-item-label">{{ s.label }}</span>
                <span class="sr-dist" :class="s.price < analysis.close ? 'text-down' : 'text-up'">
                  {{ pctDiff(s.price, analysis.close) }}
                </span>
                <span class="sr-strength">{{ strengthDots(s.strength) }}</span>
              </div>
            </template>
            <span v-else class="sr-empty">无有效支撑位</span>

            <a-divider style="margin: 12px 0" />

            <!-- 压力位 -->
            <div class="sr-group-label resist-label">压力位</div>
            <template v-if="analysis.resistances.length">
              <div v-for="r in analysis.resistances" :key="r.price" class="sr-row">
                <span class="sr-price resist-price mono">{{ fmt(r.price) }}</span>
                <span class="sr-item-label">{{ r.label }}</span>
                <span class="sr-dist" :class="r.price > analysis.close ? 'text-up' : 'text-down'">
                  {{ pctDiff(r.price, analysis.close) }}
                </span>
                <span class="sr-strength">{{ strengthDots(r.strength) }}</span>
              </div>
            </template>
            <span v-else class="sr-empty">无有效压力位</span>

            <div class="sr-footer">数据日期：{{ analysis.date }} · 当前价 {{ fmt(analysis.close) }}</div>
          </template>
          <a-empty v-else-if="!analysisLoading" description="暂无分析数据" />
        </a-card>
      </a-col>

      <!-- 技术形态 & 趋势 -->
      <a-col :xs="24" :md="12">
        <a-card title="技术形态 & 趋势" :loading="analysisLoading">
          <template v-if="analysis">
            <!-- 形态信号 -->
            <div class="section-sub-label">形态信号</div>
            <div v-if="analysis.patterns.length" class="pattern-wrap">
              <a-tooltip v-for="p in analysis.patterns" :key="p.id" :title="p.desc">
                <a-tag
                  :color="p.bullish === true ? 'green' : p.bullish === false ? 'red' : 'default'"
                  style="margin-bottom: 6px; cursor: default"
                >
                  {{ p.label }}
                </a-tag>
              </a-tooltip>
            </div>
            <span v-else class="sr-empty">无明显形态信号</span>

            <a-divider style="margin: 12px 0" />

            <!-- 趋势数据 -->
            <div class="section-sub-label">趋势判断</div>
            <a-descriptions :column="2" size="small">
              <a-descriptions-item label="主趋势">
                <span :class="trendColorClass(analysis.trend.primary)">
                  {{ trendText(analysis.trend.primary) }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="短期趋势">
                <span :class="trendColorClass(analysis.trend.short_term)">
                  {{ trendText(analysis.trend.short_term) }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="RSI12">
                <span class="mono">{{ analysis.trend.rsi12 ?? '-' }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="MACD">
                <span :class="macdColorClass(analysis.trend.macd_bias)">
                  {{ macdText(analysis.trend.macd_bias) }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="BB位置(%B)">
                <span class="mono">
                  {{ analysis.trend.bb_pct_b != null ? (analysis.trend.bb_pct_b * 100).toFixed(1) + '%' : '-' }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="成交量比">
                <span class="mono">{{ analysis.trend.vol_ratio != null ? analysis.trend.vol_ratio + 'x' : '-' }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="ATR14">
                <span class="mono">{{ analysis.trend.atr14 != null ? fmt(analysis.trend.atr14) : '-' }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="ATR波动率">
                <span class="mono">
                  {{ analysis.trend.atr_pct != null ? (analysis.trend.atr_pct * 100).toFixed(2) + '%' : '-' }}
                </span>
              </a-descriptions-item>
            </a-descriptions>
          </template>
          <a-empty v-else-if="!analysisLoading" description="暂无分析数据" />
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
import { getAnalysis, getIndicatorsLatest, getScoresLatest, getTradeSignals, getWatchlist } from '../api/trader'

const route = useRoute()

const code = ref(undefined)
const selectedDate = ref(null)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const latest = ref(null)
const score = ref(null)
const scoreMessage = ref('')
const analysis = ref(null)
const tradeSignals = ref(null)
const indicatorLoading = ref(true)
const scoreLoading = ref(true)
const analysisLoading = ref(true)
const signalsLoading = ref(true)

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

async function loadSignals() {
  if (!code.value) return
  tradeSignals.value = null
  signalsLoading.value = true
  try {
    const res = await getTradeSignals(code.value)
    const d = res.data
    tradeSignals.value = (d && d.data === null) ? null : d
  } catch {
    tradeSignals.value = null
  } finally {
    signalsLoading.value = false
  }
}

async function loadData() {
  if (!code.value) return
  latest.value = null
  score.value = null
  scoreMessage.value = ''
  analysis.value = null
  indicatorLoading.value = true
  scoreLoading.value = true
  analysisLoading.value = true
  const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
  const [indRes, scoreRes, analysisRes] = await Promise.allSettled([
    getIndicatorsLatest(code.value),
    getScoresLatest(code.value, dateStr),
    getAnalysis(code.value),
  ])
  if (indRes.status === 'fulfilled') {
    const d = indRes.value.data
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
  if (analysisRes.status === 'fulfilled') {
    const d = analysisRes.value.data
    analysis.value = (d && d.data === null) ? null : d
  }
  indicatorLoading.value = false
  scoreLoading.value = false
  analysisLoading.value = false
}

async function handleCodeChange() {
  loadData()
  loadSignals()
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
    loadSignals()
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

/* ── 支撑/压力位 ── */
.sr-group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.support-label { color: var(--green); }
.resist-label  { color: var(--red); }

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
</style>
