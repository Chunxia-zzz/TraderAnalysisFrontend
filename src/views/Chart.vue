<template>
  <div>
    <!-- 查询表单 -->
    <a-card style="margin-bottom: 16px">
      <a-space wrap>
        <a-select
          v-model:value="code"
          placeholder="选择标的"
          style="width: 200px"
          show-search
          :loading="watchlistLoading"
          :options="watchlistOptions"
        />
        <a-select v-model:value="ktype" style="width: 120px">
          <a-select-option value="1d">日K</a-select-option>
          <a-select-option value="4h">4H K线</a-select-option>
          <a-select-option value="1w">周K</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="days"
          :min="10"
          :max="500"
          addonBefore="K线数量"
          style="width: 180px"
        />
        <a-button type="primary" :loading="loading" @click="fetchData">查询</a-button>
      </a-space>
    </a-card>

    <!-- 指标开关 -->
    <a-card style="margin-bottom: 16px" size="small">
      <template #title>
        <span style="font-size: 13px; color: #666">指标开关</span>
      </template>
      <a-space wrap :size="[4, 8]">
        <span class="tag-group-label">均线</span>
        <a-tag
          v-for="key in maKeys"
          :key="key"
          :color="visible[key] ? maTagColors[key] : ''"
          class="indicator-tag"
          @click="visible[key] = !visible[key]"
        >
          {{ key.toUpperCase() }}
        </a-tag>

        <a-divider type="vertical" />

        <a-tag
          :color="visible.boll ? '#795548' : ''"
          class="indicator-tag"
          @click="visible.boll = !visible.boll"
        >
          BOLL
        </a-tag>
        <a-tag
          :color="visible.ema ? '#00897b' : ''"
          class="indicator-tag"
          @click="visible.ema = !visible.ema"
        >
          EMA多空带
        </a-tag>

        <a-divider type="vertical" />

        <span class="tag-group-label">关键位</span>
        <a-tag
          :color="visible.levels ? '#d32f2f' : ''"
          class="indicator-tag"
          @click="visible.levels = !visible.levels"
        >
          支撑压力位
        </a-tag>
        <span v-if="visible.levels && hasLevels" class="level-hint">
          {{ levels.resistances.length }} 压力 / {{ levels.supports.length }} 支撑
        </span>
        <a-tag
          :color="visible.livermore ? '#946800' : ''"
          class="indicator-tag"
          @click="visible.livermore = !visible.livermore"
        >
          利弗莫尔关键点
        </a-tag>
        <span v-if="visible.livermore && livermore.panorama" class="level-hint">
          {{ livPanorama.state_text }}
        </span>

        <a-divider type="vertical" />

        <span class="tag-group-label">副图</span>
        <a-tag
          :color="visible.vol ? '#607d8b' : ''"
          class="indicator-tag"
          @click="visible.vol = !visible.vol"
        >
          成交量
        </a-tag>
        <a-tag
          :color="visible.macd ? '#1976d2' : ''"
          class="indicator-tag"
          @click="visible.macd = !visible.macd"
        >
          MACD
        </a-tag>
        <a-tag
          :color="visible.rsi ? '#ff5722' : ''"
          class="indicator-tag"
          @click="visible.rsi = !visible.rsi"
        >
          RSI
        </a-tag>
      </a-space>
    </a-card>

    <!-- 图表 -->
    <a-card :loading="loading">
      <a-empty v-if="!hasData && !loading" description="请输入标的代码并点击查询" />
      <indicator-chart
        v-else
        :data="chartData"
        :levels="levels"
        :livermore="livermore"
        :visible="visible"
        :height="800"
      />
    </a-card>

    <!-- 利弗莫尔关键点明细（独立体系，与下方支撑压力位并非同一套算法）-->
    <a-card
      v-if="visible.livermore && livermore.panorama"
      size="small"
      style="margin-top: 16px"
    >
      <template #title>
        <span style="font-size: 13px; color: #666">
          利弗莫尔关键点
          <span class="liv-badge">独立体系 · 不并入评分</span>
          <span class="mono kv-date">{{ livermore.panorama.date || '' }}</span>
        </span>
      </template>

      <!-- 无有效整理平台：没有关键点就画不出任何线，用紧凑提示代替一整片「--」占位 -->
      <a-alert
        v-if="!livPano.pivotal"
        type="warning"
        show-icon
        :message="livPano.skip_reason || '该标的近期无有效整理平台，利弗莫尔关键点不适用'"
        style="margin-bottom: 12px"
      />

      <div class="lv-grid">
        <template v-if="livPano.pivotal">
          <div class="lv-item">
            <span class="lv-k">关键点（箱体上沿）</span>
            <span class="lv-v mono lv-pivotal">{{ fmt(livPano.pivotal) }}</span>
            <span class="lv-sub mono">{{ fmtPctOf(livPano.dist_pct) }}</span>
          </div>
          <div class="lv-item">
            <span class="lv-k">状态</span>
            <span class="lv-v" :class="'lv-state-' + livPano.state">{{ livPanorama.state_text }}</span>
            <span class="lv-sub">{{ livPanorama.context_text }}</span>
          </div>
          <div class="lv-item">
            <span class="lv-k">整理箱体</span>
            <span class="lv-v mono">
              {{ fmt(livPano.platform_lower) }} ~ {{ fmt(livPano.platform_upper) }}
            </span>
            <span class="lv-sub">
              {{ livPano.platform_bars }} 根 / 振幅 {{ fmtNum(livPano.platform_range_pct, 2) }}%
            </span>
          </div>
          <div class="lv-item">
            <span class="lv-k">止损位（0.5×ATR）</span>
            <span class="lv-v mono lv-stop">{{ fmt(livPano.stop) }}</span>
            <span class="lv-sub mono">{{ fmtPctOf(livPano.stop_dist_pct) }}</span>
          </div>
        </template>

        <div class="lv-item">
          <span class="lv-k">周线潮汐</span>
          <span class="lv-v" :class="'lv-state-' + livPano.tide">{{ tideText }}</span>
          <span class="lv-sub">
            <template v-if="livPano.wave">波浪 {{ waveText }}</template>
            <template v-if="livPano.tide_period">
              （MA{{ livPano.tide_period[0] }} / MA{{ livPano.tide_period[1] }}）
            </template>
          </span>
        </div>

        <div v-if="livPano.pivotal" class="lv-item">
          <span class="lv-k">量能 / 相对强度</span>
          <span class="lv-v mono">量比 {{ fmtNum(livPano.vol_ratio, 2) }}</span>
          <span class="lv-sub mono">
            RS60 {{ fmtSigned(livPano.rs_60, 1) }}
            <span v-if="livPano.is_leader" class="liv-leader">★龙头</span>
          </span>
        </div>
        <div v-else class="lv-item">
          <span class="lv-k">数据深度</span>
          <span class="lv-v mono">日线 {{ livPano.daily_bars }} 根</span>
          <span class="lv-sub mono">周线 {{ livPano.weekly_bars }} 根</span>
        </div>
      </div>

      <!-- 金字塔加仓位 -->
      <div v-if="livPano.pyramid && livPano.pyramid.length" class="lv-pyramid">
        <span class="lv-k">金字塔加仓位<span class="lv-sub">（关键点上方 1/2/3×ATR）</span></span>
        <span
          v-for="p in livPano.pyramid"
          :key="'py' + p.level"
          class="lv-py"
          :class="{ 'lv-py-hit': p.reached }"
        >
          {{ p.level }} 级 <b class="mono">{{ fmt(p.price) }}</b>
          <span class="lv-sub mono">{{ fmtPctOf(p.pct_from_pivotal) }}</span>
        </span>
      </div>

      <!-- 当前利弗莫尔信号 -->
      <div class="lv-sigs">
        <span class="lv-k">当前信号</span>
        <template v-if="livermore.signals && livermore.signals.length">
          <a-tag
            v-for="s in livermore.signals"
            :key="s.signal_type"
            :color="s.bullish ? 'green' : 'red'"
            class="liv-sig-tag"
          >
            {{ s.label }}
            <span v-if="s.strength != null" class="mono"> · {{ (+s.strength).toFixed(2) }}</span>
          </a-tag>
        </template>
        <span v-else class="lv-none">无（未触发任何关键点信号）</span>
      </div>

      <div class="lv-foot">
        <span>
          ⚠️ 本区块是<b>独立信号体系</b>：买突破、顺势方向使用；上方「支撑压力位」是 Swing Pivot
          聚类的静态价位，两者算法不同，勿混称。
        </span>
        <router-link to="/livermore" class="lv-link">查看全池利弗莫尔信号 →</router-link>
      </div>
    </a-card>

    <!-- 关键位明细 -->
    <a-card v-if="hasLevels && visible.levels" size="small" style="margin-top: 16px">
      <template #title>
        <span style="font-size: 13px; color: #666">
          支撑压力位明细
          <span class="mono kv-date">{{ analysisDate || '' }}</span>
        </span>
      </template>

      <a-row :gutter="[24, 12]">
        <a-col :xs="24" :md="12">
          <div class="kv-title kv-title-resist">压力位（上方阻力）</div>
          <div v-if="!levels.resistances.length" class="kv-empty">未检出</div>
          <div
            v-for="lv in levels.resistances"
            :key="'r' + lv.price"
            class="kv-row"
            :class="{ 'kv-nearest': lv.is_nearest }"
          >
            <span class="kv-price mono kv-c-resist">{{ fmt(lv.price) }}</span>
            <span class="kv-label">{{ lv.label }}</span>
            <span class="kv-pct mono" :class="pctClass(lv)">{{ fmtPct(lv) }}</span>
            <span v-if="lv.is_key" class="kv-badge kv-badge-key">MA60</span>
            <span v-else-if="lv.is_nearest" class="kv-badge kv-badge-near">最近</span>
            <span class="kv-strength mono">强度 {{ lv.strength }}</span>
            <span v-if="lv.dow_context" class="kv-ctx">{{ lv.dow_context }}</span>
          </div>
        </a-col>

        <a-col :xs="24" :md="12">
          <div class="kv-title kv-title-support">支撑位（下方托底）</div>
          <div v-if="!levels.supports.length" class="kv-empty">未检出</div>
          <div
            v-for="lv in levels.supports"
            :key="'s' + lv.price"
            class="kv-row"
            :class="{ 'kv-nearest': lv.is_nearest }"
          >
            <span class="kv-price mono kv-c-support">{{ fmt(lv.price) }}</span>
            <span class="kv-label">{{ lv.label }}</span>
            <span class="kv-pct mono" :class="pctClass(lv)">{{ fmtPct(lv) }}</span>
            <span v-if="lv.is_key" class="kv-badge kv-badge-key">MA60</span>
            <span v-else-if="lv.is_nearest" class="kv-badge kv-badge-near">最近</span>
            <span class="kv-strength mono">强度 {{ lv.strength }}</span>
            <span v-if="lv.dow_context" class="kv-ctx">{{ lv.dow_context }}</span>
          </div>
        </a-col>
      </a-row>

      <!-- 盈亏比 -->
      <div v-if="riskReward && riskReward.long_rr != null" class="kv-rr">
        <span class="kv-title" style="margin: 0">盈亏比参考</span>
        <span class="kv-rr-item">
          做多：止损 <b class="mono">{{ fmt(riskReward.long_stop) }}</b>
          / 止盈 <b class="mono">{{ fmt(riskReward.long_target) }}</b>
          / <b class="mono kv-c-resist">{{ riskReward.long_rr }} : 1</b>
        </span>
        <span v-if="riskReward.short_rr != null" class="kv-rr-item">
          做空：止损 <b class="mono">{{ fmt(riskReward.short_stop) }}</b>
          / 止盈 <b class="mono">{{ fmt(riskReward.short_target) }}</b>
          / <b class="mono kv-c-support">{{ riskReward.short_rr }} : 1</b>
        </span>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAnalysis, getIndicators, getWatchlist, getLivermoreDetail } from '../api/trader'
import IndicatorChart from '../components/IndicatorChart.vue'

const route = useRoute()
const code = ref(undefined)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const ktype = ref('1d')
const days = ref(250)
const loading = ref(false)
const chartData = ref([])

// ── 支撑/压力关键位（来自 /api/analysis 的 Swing Pivot 聚类结果）──
const levels = ref({ supports: [], resistances: [] })
const riskReward = ref(null)
const analysisDate = ref(null)
const closePrice = ref(null)

// ── 利弗莫尔关键点（来自 /api/livermore/detail，独立信号体系）──
// 只有日线才有意义：利弗莫尔关键点/箱体/周线潮汐都建立在日线尺度上，
// 4H/1W 不请求，避免图面出现与当前周期不匹配的水平线。
const livermore = ref({ levels: [], panorama: null, signals: [] })

const hasData = computed(() => chartData.value.length > 0)
const hasLevels = computed(
  () => levels.value.supports.length > 0 || levels.value.resistances.length > 0
)

// ── 利弗莫尔文案映射（与后端 livermore_detector.py 的 state/context 取值一一对应）──
const LIV_STATE_TEXT = {
  above: '已在关键点上方',
  approaching: '逼近关键点',
  below: '关键点下方',
  platform: '箱体震荡中',
  no_platform: '无有效平台',
}
const livPano = computed(() => livermore.value.panorama || {})
const livPanorama = computed(() => ({
  state_text: LIV_STATE_TEXT[livPano.value.state] || '数据不足',
  context_text:
    livPano.value.context === 'reversal'
      ? '反转关键点（中期趋势未转多，建仓）'
      : livPano.value.context === 'continuation'
        ? '连续关键点（趋势已向上，加仓）'
        : '',
}))
const tideText = computed(
  () =>
    ({ up: '向上', down: '向下', neutral: '走平', unknown: '数据不足' })[livPano.value.tide] ||
    '--'
)
const waveText = computed(
  () =>
    ({ up: '向上', down: '向下', neutral: '走平', unknown: '数据不足' })[livPano.value.wave] ||
    '--'
)

// ── 指标可见性 ──
const maKeys = ['ma5', 'ma10', 'ma20', 'ma60']
const maTagColors = { ma5: '#ff9800', ma10: '#2196f3', ma20: '#e91e63', ma60: '#9c27b0' }

const visible = reactive({
  ma5: false,
  ma10: false,
  ma20: false,
  ma60: false,
  boll: false,
  ema: true,
  levels: true,
  livermore: true,
  vol: true,
  macd: true,
  rsi: true,
})

// ── 关键位展示辅助 ──
function fmt(v) {
  if (v == null || isNaN(+v)) return '--'
  const n = +v
  return n >= 1000 ? n.toFixed(1) : n.toFixed(2)
}
function fmtPct(lv) {
  if (!closePrice.value || !lv?.price) return '--'
  const p = ((+lv.price - closePrice.value) / closePrice.value) * 100
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%'
}
// 后端已算好的百分比（如 dist_pct / stop_dist_pct），只负责加符号与格式化
function fmtPctOf(p) {
  if (p == null || isNaN(+p)) return '--'
  return (+p >= 0 ? '+' : '') + (+p).toFixed(2) + '%'
}
// 固定小数位（量比这类比值，1.0 也要显示成 1.00）
function fmtNum(v, d = 2) {
  if (v == null || isNaN(+v)) return '--'
  return (+v).toFixed(d)
}
// 带符号的百分数（相对强度：+5.2% / -2.0%）
function fmtSigned(v, d = 1) {
  if (v == null || isNaN(+v)) return '--'
  return (+v >= 0 ? '+' : '') + (+v).toFixed(d) + '%'
}
function pctClass(lv) {
  if (!closePrice.value || !lv?.price) return ''
  return +lv.price >= closePrice.value ? 'kv-up' : 'kv-down'
}

function clearAnalysis() {
  levels.value = { supports: [], resistances: [] }
  riskReward.value = null
  analysisDate.value = null
  closePrice.value = null
}

function clearLivermore() {
  livermore.value = { levels: [], panorama: null, signals: [] }
}

async function fetchData() {
  if (!code.value) {
    message.warning('请输入标的代码')
    return
  }
  loading.value = true
  try {
    // 指标 / 支撑压力位 / 利弗莫尔关键点三路并行，后两者失败都不影响 K 线渲染。
    // 利弗莫尔只在日线上请求：其箱体、潮汐、ATR 全部基于日线尺度，
    // 4H/1W 下画出来的水平线会与当前周期语义不符。
    const wantLiv = ktype.value === '1d'
    const [indRes, anaRes, livRes] = await Promise.all([
      getIndicators(code.value, ktype.value, days.value),
      getAnalysis(code.value, undefined, ktype.value).catch(() => null),
      wantLiv ? getLivermoreDetail(code.value).catch(() => null) : Promise.resolve(null),
    ])

    const d = indRes.data
    // 兼容新格式: data为空数组+message 表示无数据
    chartData.value = d.data || []
    if (d.message && chartData.value.length === 0) {
      message.info(d.message)
    }

    // /api/analysis 正常时直接返回结果对象；数据不足时返回 {data:null, message}
    const a = anaRes?.data
    if (a && Array.isArray(a.supports)) {
      levels.value = {
        supports: a.supports || [],
        resistances: a.resistances || [],
      }
      riskReward.value = a.risk_reward || null
      analysisDate.value = a.date || null
      closePrice.value = a.close ?? null
    } else {
      clearAnalysis()
    }

    // /api/livermore/detail 数据不足时返回 {data:null, message}
    const lv = livRes?.data
    if (lv && lv.panorama) {
      livermore.value = {
        levels: lv.levels || [],
        panorama: lv.panorama,
        signals: lv.signals || [],
      }
    } else {
      clearLivermore()
    }
  } catch {
    message.error('获取数据失败，请检查后端连接')
    chartData.value = []
    clearAnalysis()
    clearLivermore()
  } finally {
    loading.value = false
  }
}

async function loadWatchlist() {
  watchlistLoading.value = true
  try {
    const res = await getWatchlist()
    const data = res.data
    const list = (data.watchlist || []).filter((item) => item.has_data)
    watchlistOptions.value = list.map((item) => ({
      label: `${item.ticker} - ${item.name}`,
      value: item.code,
    }))
    if (route.query.code) {
      code.value = route.query.code
    } else if (watchlistOptions.value.length > 0 && !code.value) {
      code.value = watchlistOptions.value[0].value
    }
    fetchData()
  } catch {
    message.error('获取标的列表失败')
  } finally {
    watchlistLoading.value = false
  }
}

onMounted(() => loadWatchlist())
</script>

<style scoped>
.indicator-tag {
  cursor: pointer;
  user-select: none;
  min-width: 48px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.tag-group-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: 2px;
  font-weight: 500;
}
.level-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── 关键位明细 ── */
.kv-date {
  margin-left: 6px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}
.kv-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.kv-title-resist { color: #d32f2f; }
.kv-title-support { color: #00897b; }
.kv-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 0 8px;
}
.kv-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  padding: 5px 8px;
  border-radius: 4px;
  border-left: 2px solid transparent;
  font-size: 12px;
}
.kv-row + .kv-row { margin-top: 2px; }
.kv-nearest {
  background: rgba(128, 128, 128, 0.08);
  border-left-color: #888;
}
.kv-price {
  min-width: 62px;
  font-weight: 500;
  font-size: 13px;
}
.kv-c-resist { color: #d32f2f; }
.kv-c-support { color: #00897b; }
.kv-label {
  min-width: 78px;
  color: var(--text-muted);
}
.kv-pct { min-width: 58px; }
.kv-up { color: #d32f2f; }
.kv-down { color: #00897b; }
.kv-strength {
  color: var(--text-muted);
  font-size: 11px;
}
.kv-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  line-height: 16px;
}
.kv-badge-key {
  background: rgba(156, 39, 176, 0.12);
  color: #9c27b0;
}
.kv-badge-near {
  background: rgba(120, 120, 120, 0.15);
  color: #666;
}
.kv-ctx {
  font-size: 11px;
  color: #00897b;
}
.kv-rr {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
}
.kv-rr-item {
  font-size: 12px;
  color: var(--text-muted);
}
.mono {
  font-family: 'DM Mono', 'JetBrains Mono', SFMono-Regular, monospace;
}

/* ── 利弗莫尔关键点 ── */
.liv-badge {
  margin-left: 6px;
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  line-height: 16px;
  background: rgba(148, 104, 0, 0.12);
  color: #946800;
  font-weight: 400;
}
.lv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px 20px;
}
.lv-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lv-k {
  font-size: 11px;
  color: var(--text-muted);
}
.lv-v {
  font-size: 14px;
  font-weight: 500;
}
.lv-sub {
  font-size: 11px;
  color: var(--text-muted);
}
.lv-pivotal { color: #946800; }
.lv-stop { color: #a40e26; }
.lv-none { color: var(--text-muted); font-weight: 400; }
.lv-state-up { color: #d32f2f; }
.lv-state-down { color: #00897b; }
.lv-state-neutral,
.lv-state-unknown { color: var(--text-muted); }
.lv-state-above { color: #d32f2f; }
.lv-state-approaching { color: #946800; }
.lv-state-below { color: #00897b; }
.lv-state-platform { color: #795548; }
.lv-state-no_platform { color: var(--text-muted); }
.liv-leader {
  margin-left: 4px;
  color: #946800;
}
.lv-pyramid,
.lv-sigs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
}
/* 不用灰底：--text-muted 压在 rgba(128,128,128,.08) 上只有 2.82 对比度，
   改用淡边框的卡片底（纯白）后回到 3.08，既保住「次要信息」的视觉层级又可读 */
.lv-py {
  font-size: 12px;
  color: var(--text-muted);
  padding: 1px 7px;
  border-radius: 3px;
  border: 1px solid rgba(128, 128, 128, 0.25);
}
.lv-py b { color: var(--text); }
.lv-py-hit {
  background: rgba(212, 50, 50, 0.1);
  border-color: rgba(212, 50, 50, 0.3);
  color: #d32f2f;
}
.lv-py-hit b,
.lv-py-hit .lv-sub { color: #d32f2f; }
.liv-sig-tag {
  font-size: 11px;
}
.lv-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
  font-size: 11px;
  color: var(--text-muted);
}
.lv-link {
  color: #946800;
  white-space: nowrap;
}
</style>
