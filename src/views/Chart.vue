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
        :visible="visible"
        :height="800"
      />
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
import { getAnalysis, getIndicators, getWatchlist } from '../api/trader'
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

const hasData = computed(() => chartData.value.length > 0)
const hasLevels = computed(
  () => levels.value.supports.length > 0 || levels.value.resistances.length > 0
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

async function fetchData() {
  if (!code.value) {
    message.warning('请输入标的代码')
    return
  }
  loading.value = true
  try {
    // 指标与关键位并行拉取，关键位失败不影响 K 线渲染
    const [indRes, anaRes] = await Promise.all([
      getIndicators(code.value, ktype.value, days.value),
      getAnalysis(code.value, undefined, ktype.value).catch(() => null),
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
  } catch {
    message.error('获取数据失败，请检查后端连接')
    chartData.value = []
    clearAnalysis()
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
</style>
