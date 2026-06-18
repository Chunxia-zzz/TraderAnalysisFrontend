<template>
  <div>
    <!-- ── 顶部视图切换 ── -->
    <div class="card view-switcher">
      <span
        v-for="tab in TABS" :key="tab.key"
        class="view-tab" :class="[tab.cls, { active: view === tab.key }]"
        @click="switchView(tab.key)"
      >{{ tab.label }}</span>
    </div>

    <a-spin :spinning="loading">

      <!-- ══ 美股大盘视图 ══ -->
      <template v-if="view === 'market'">
        <div class="card hero-card" style="margin-bottom:16px" v-if="data">
          <div class="hero-body">
            <div class="hero-left">
              <div class="hero-eyebrow">美股大盘温度</div>
              <div class="hero-score mono">{{ data.composite_score.toFixed(1) }}</div>
              <div class="hero-sub">/ 100</div>
              <span class="status-pill" :style="pillStyle(data.composite_score)">{{ getLevel(data.composite_score).label }}</span>
              <div class="hero-action">{{ getLevel(data.composite_score).action }}</div>
            </div>
            <div class="hero-right">
              <div v-for="dim in activeDimensions" :key="dim.key" class="dim-block">
                <div class="dim-value mono">{{ data[dim.key]?.toFixed(1) }}</div>
                <div class="dim-label">{{ dim.name }}</div>
                <div class="dim-weight">{{ dim.weight }}</div>
                <div class="dim-bar">
                  <div class="dim-bar-fill" :style="{ width: data[dim.key] + '%', background: dimColor(data[dim.key]) }"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="hero-footer">
            <div class="footer-item">
              <span class="footer-label">建议仓位</span>
              <span class="footer-value mono">{{ data.target_position_pct.toFixed(1) }}%</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">数据日期</span>
              <span class="footer-value mono">{{ data.date }}</span>
            </div>
            <div class="footer-item" v-if="leverageInfo">
              <span class="footer-label">杠杆建议</span>
              <span class="footer-value" style="color:var(--accent)">{{ leverageInfo }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-link" style="cursor:pointer" @click="goChart('US.SPY')">SPY K线 ↗</span>
            </div>
            <div class="footer-item">
              <span class="footer-link" style="cursor:pointer" @click="goChart('US.QQQ')">QQQ K线 ↗</span>
            </div>
            <div class="footer-item">
              <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" rel="noopener noreferrer" class="footer-link">CNN Fear &amp; Greed Index ↗</a>
            </div>
          </div>
        </div>

        <!-- SPY / QQQ -->
        <div class="card-row" v-if="data" style="margin-bottom:16px">
          <div class="card ticker-card">
            <div class="ticker-header">SPY</div>
            <div class="ticker-grid">
              <div class="ticker-item"><span class="ticker-label">价格</span><span class="ticker-val mono">{{ fmt(data.spy_price) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">日RSI</span><span class="ticker-val mono" :class="rsiCls(data.spy_daily_rsi)">{{ fmt(data.spy_daily_rsi) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">周RSI</span><span class="ticker-val mono" :class="rsiCls(data.spy_weekly_rsi)">{{ fmt(data.spy_weekly_rsi) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">MA200偏离</span><span class="ticker-val mono" :class="data.spy_ma200_dev > 0 ? 'up' : 'down'">{{ pct(data.spy_ma200_dev) }}</span></div>
            </div>
          </div>
          <div class="card ticker-card">
            <div class="ticker-header">QQQ</div>
            <div class="ticker-grid">
              <div class="ticker-item"><span class="ticker-label">价格</span><span class="ticker-val mono">{{ fmt(data.qqq_price) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">日RSI</span><span class="ticker-val mono" :class="rsiCls(data.qqq_daily_rsi)">{{ fmt(data.qqq_daily_rsi) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">周RSI</span><span class="ticker-val mono" :class="rsiCls(data.qqq_weekly_rsi)">{{ fmt(data.qqq_weekly_rsi) }}</span></div>
              <div class="ticker-item"><span class="ticker-label">MA200偏离</span><span class="ticker-val mono" :class="data.qqq_ma200_dev > 0 ? 'up' : 'down'">{{ pct(data.qqq_ma200_dev) }}</span></div>
            </div>
          </div>
        </div>

        <!-- 历史趋势 -->
        <div class="card" style="padding:20px 24px;margin-bottom:12px" v-if="historyData.length > 0">
          <div class="card-title">历史趋势</div>
          <div ref="chartRef" style="width:100%;height:300px"></div>
        </div>

        <div class="vix-tip" v-if="data">
          <span style="color:var(--accent)">⚑</span>
          交易时请观察VIX期货价格，30以上为极度恐慌，35以上往往是抄底的绝佳机会
        </div>

        <a-empty v-if="!loading && !data" description="暂无数据，请确认后端已运行 temperature 命令" />
      </template>

      <!-- ══ 黄金 / 比特币视图（共用模板）══ -->
      <template v-else>
        <template v-if="asset">
          <!-- Hero 卡片 -->
          <div class="card hero-card" style="margin-bottom:16px">
            <div class="hero-body">
              <div class="hero-left">
                <div class="hero-eyebrow">{{ asset.label }}温度</div>
                <div class="hero-score mono">{{ asset.composite_score.toFixed(1) }}</div>
                <div class="hero-sub">/ 100</div>
                <span class="status-pill" :style="pillStyle(asset.composite_score)">{{ getLevel(asset.composite_score).label }}</span>
                <div class="hero-action">{{ getLevel(asset.composite_score).action }}</div>
              </div>
              <div class="hero-right">
                <div v-for="dim in ASSET_DIMS" :key="dim.key" class="dim-block">
                  <div class="dim-value mono">{{ asset[dim.key]?.toFixed(1) }}</div>
                  <div class="dim-label">{{ dim.name }}</div>
                  <div class="dim-weight">{{ dim.weight }}</div>
                  <div class="dim-bar">
                    <div class="dim-bar-fill" :style="{ width: asset[dim.key] + '%', background: dimColor(asset[dim.key]) }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="hero-footer">
              <div class="footer-item">
                <span class="footer-label">当前价格</span>
                <span class="footer-value mono">${{ asset.price }}</span>
              </div>
              <div class="footer-item">
                <span class="footer-label">数据日期</span>
                <span class="footer-value mono">{{ data?.date }}</span>
              </div>
              <div class="footer-item">
                <span class="footer-link" style="cursor:pointer" @click="goChart(asset.code)">查看K线图 ↗</span>
              </div>
            </div>
          </div>

          <!-- 资产历史趋势 -->
          <div class="card" style="padding:20px 24px;margin-bottom:12px" v-if="assetHistory[view] && assetHistory[view].length > 0">
            <div class="card-title">历史趋势</div>
            <div ref="assetChartRef" style="width:100%;height:260px"></div>
          </div>

          <!-- 指标卡片 -->
          <div class="card ticker-card" style="padding:20px 24px">
            <div class="ticker-header" style="margin-bottom:16px;font-size:14px">技术指标</div>
            <div class="asset-metrics-grid">
              <div class="ticker-item">
                <span class="ticker-label">当前价格</span>
                <span class="ticker-val mono">${{ asset.price }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">日线 RSI6</span>
                <span class="ticker-val mono" :class="rsiCls(asset.daily_rsi)">{{ fmt(asset.daily_rsi) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">周线 RSI6</span>
                <span class="ticker-val mono" :class="rsiCls(asset.weekly_rsi)">{{ fmt(asset.weekly_rsi) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">MA200 偏离</span>
                <span class="ticker-val mono" :class="(asset.ma200_dev ?? 0) > 0 ? 'up' : 'down'">{{ pct(asset.ma200_dev) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">ATH 回撤</span>
                <span class="ticker-val mono down">{{ pct(asset.ath_drawdown) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">52 周位置</span>
                <span class="ticker-val mono">{{ pct(asset.pos_52w) }}</span>
              </div>
            </div>
            <div v-if="asset.note" class="asset-note">{{ asset.note }}</div>
          </div>
        </template>
        <a-empty v-else-if="!loading" description="暂无数据" />
      </template>

    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getMarketTemperature, getMarketTemperatureHistory, getAssetTemperatureHistory } from '../api/trader'

const router = useRouter()

// ── 常量 ──
const TABS = [
  { key: 'market', label: '美股大盘', cls: '' },
  { key: 'gold',   label: '黄金',     cls: 'gold' },
  { key: 'btc',    label: '比特币',   cls: 'orange' },
]

const TEMPERATURE_LEVELS = [
  { max: 5,   label: '极端恐慌', action: '融资+期权超配' },
  { max: 15,  label: '极度恐慌', action: '重仓逆势买入' },
  { max: 30,  label: '偏悲观',   action: '积极加仓' },
  { max: 45,  label: '略偏冷',   action: '适度加仓' },
  { max: 55,  label: '中性',     action: '维持仓位' },
  { max: 70,  label: '略偏热',   action: '适度减仓' },
  { max: 85,  label: '偏贪婪',   action: '积极减仓' },
  { max: 100, label: '极度贪婪', action: '大幅减仓' },
]

const MARKET_DIMS = [
  { key: 'daily_tech_score',  name: '日线技术', weight: '50%' },
  { key: 'weekly_tech_score', name: '周线技术', weight: '35%' },
  { key: 'price_score',       name: '价格位置', weight: '15%' },
]
const ASSET_DIMS = MARKET_DIMS

const LEVERAGE_MAP = {
  'margin':          '建议融资补仓（现货ETF）',
  'margin + OTM_call': '建议融资 + OTM Call期权超配',
}

// ── 状态 ──
const view = ref('market')
const loading = ref(true)
const data = ref(null)
const historyData = ref([])
const chartRef = ref(null)
let chartInstance = null

const assetHistory = ref({ gold: [], btc: [] })
const assetChartRef = ref(null)
let assetChartInstance = null

// ── 工具函数 ──
function getLevel(score) {
  return TEMPERATURE_LEVELS.find(l => score <= l.max) || TEMPERATURE_LEVELS[7]
}

function pillStyle(score) {
  if (score <= 30) return { color: 'var(--blue)',           background: '#e3f0ff' }
  if (score <= 55) return { color: 'var(--text-secondary)', background: 'var(--bg-hover)' }
  if (score <= 75) return { color: 'var(--accent)',         background: 'var(--accent-bg)' }
  return                  { color: 'var(--red)',            background: 'var(--red-bg)' }
}

function dimColor(score) {
  if (score == null) return 'var(--text-muted)'
  if (score <= 30) return 'var(--blue)'
  if (score <= 55) return 'var(--text-muted)'
  if (score <= 75) return 'var(--accent)'
  return 'var(--red)'
}

function fmt(val) { return val != null ? Number(val).toFixed(2) : '-' }
function pct(val) { return val != null ? (val * 100).toFixed(1) + '%' : '-' }
function rsiCls(val) {
  if (val == null) return ''
  return val <= 30 ? 'up' : val >= 70 ? 'down' : ''
}

// ── computed ──
const activeDimensions = computed(() =>
  data.value ? MARKET_DIMS.filter(d => data.value[d.key] != null) : []
)

const leverageInfo = computed(() => {
  if (!data.value) return null
  return LEVERAGE_MAP[data.value.leverage_tool] || null
})

const asset = computed(() => {
  if (!data.value) return null
  if (view.value === 'gold') return data.value.gld_temp
  if (view.value === 'btc')  return data.value.btc_temp
  return null
})

// ── 操作 ──
function switchView(key) {
  view.value = key
}

function goChart(code) {
  router.push({ name: 'chart', query: { code } })
}

// ── 历史图 ──
function renderChart() {
  if (!chartRef.value || historyData.value.length === 0) return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)
  const dates     = historyData.value.map(d => d.date)
  const scores    = historyData.value.map(d => d.composite_score)
  const positions = historyData.value.map(d => d.target_position_pct)
  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['综合评分', '建议仓位%'], textStyle: { color: '#59636e', fontSize: 12 } },
    grid: { left: 50, right: 60, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8b949e', fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '评分',  min: 0, max: 100, axisLabel: { color: '#8b949e', fontSize: 11 } },
      { type: 'value', name: '仓位%', min: 0, max: 130, axisLabel: { color: '#8b949e', fontSize: 11 } },
    ],
    series: [
      {
        name: '综合评分', type: 'line', data: scores, smooth: true,
        itemStyle: { color: '#0550ae' }, lineStyle: { color: '#0550ae' },
        markArea: { silent: true, data: [
          [{ yAxis: 0,  itemStyle: { color: 'rgba(5,80,174,0.04)'   } }, { yAxis: 30  }],
          [{ yAxis: 30, itemStyle: { color: 'rgba(139,148,158,0.04)' } }, { yAxis: 70  }],
          [{ yAxis: 70, itemStyle: { color: 'rgba(164,14,38,0.04)'  } }, { yAxis: 100 }],
        ]},
      },
      {
        name: '建议仓位%', type: 'line', yAxisIndex: 1, data: positions, smooth: true,
        lineStyle: { type: 'dashed', color: '#946800' }, itemStyle: { color: '#946800' },
      },
    ],
  })
}

// ── 资产历史图 ──
function renderAssetChart(viewKey) {
  const history = assetHistory.value[viewKey]
  if (!assetChartRef.value || !history || history.length === 0) return
  if (!assetChartInstance) assetChartInstance = echarts.init(assetChartRef.value)
  const tab = TABS.find(t => t.key === viewKey)
  const color = viewKey === 'gold' ? '#946800' : '#f7931a'
  assetChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['综合评分'], textStyle: { color: '#59636e', fontSize: 12 } },
    grid: { left: 50, right: 20, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: history.map(d => d.date), axisLabel: { color: '#8b949e', fontSize: 11 } },
    yAxis: { type: 'value', name: '评分', min: 0, max: 100, axisLabel: { color: '#8b949e', fontSize: 11 } },
    series: [{
      name: '综合评分', type: 'line', data: history.map(d => d.composite_score), smooth: true,
      itemStyle: { color }, lineStyle: { color },
      markArea: { silent: true, data: [
        [{ yAxis: 0,  itemStyle: { color: 'rgba(5,80,174,0.04)'   } }, { yAxis: 30  }],
        [{ yAxis: 30, itemStyle: { color: 'rgba(139,148,158,0.04)' } }, { yAxis: 70  }],
        [{ yAxis: 70, itemStyle: { color: 'rgba(164,14,38,0.04)'  } }, { yAxis: 100 }],
      ]},
    }],
  })
}

// 切换视图时销毁旧图实例，重建新图（v-if 会销毁/重建 DOM）
watch(view, async (v, oldV) => {
  await nextTick()
  if (oldV === 'market') {
    if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  } else {
    if (assetChartInstance) { assetChartInstance.dispose(); assetChartInstance = null }
  }
  if (v === 'market') renderChart()
  else renderAssetChart(v)
})

onMounted(async () => {
  try {
    const res = await getMarketTemperature()
    data.value = res.data
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }

  // 并行拉取三条历史曲线
  const [marketRes, gldRes, btcRes] = await Promise.allSettled([
    getMarketTemperatureHistory(60),
    getAssetTemperatureHistory('GLD', 60),
    getAssetTemperatureHistory('BTC', 60),
  ])
  historyData.value = marketRes.status === 'fulfilled' ? (marketRes.value.data.history || []) : []
  assetHistory.value.gold = gldRes.status === 'fulfilled' ? (gldRes.value.data.history || []) : []
  assetHistory.value.btc  = btcRes.status === 'fulfilled' ? (btcRes.value.data.history || []) : []

  await nextTick()
  renderChart()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  chartInstance?.resize()
  assetChartInstance?.resize()
}
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  assetChartInstance?.dispose()
})
</script>

<style scoped>
/* ── 视图切换 ── */
.view-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  margin-bottom: 16px;
}

.view-tab {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  background: transparent;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.view-tab:hover { background: var(--bg-hover); color: var(--text); }
.view-tab.active { background: var(--bg-emphasis); color: #fff; }
.view-tab.gold.active   { background: #946800; }
.view-tab.orange.active { background: #f7931a; }

/* ── Hero 卡片 ── */
.hero-card { padding: 28px 32px 20px; }

.hero-body { display: flex; align-items: flex-start; gap: 48px; }
.hero-left  { flex-shrink: 0; }

.hero-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}
.hero-score { font-size: 56px; font-weight: 700; color: var(--text); line-height: 1; }
.hero-sub   { font-size: 16px; color: var(--text-muted); margin-top: 2px; margin-bottom: 12px; }

.status-pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.hero-action { font-size: 13px; color: var(--text-secondary); }

.hero-right {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  flex: 1;
  padding-top: 8px;
}
.dim-block  { flex: 1; min-width: 90px; }
.dim-value  { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1; margin-bottom: 4px; }
.dim-label  { font-size: 12px; color: var(--text-secondary); margin-bottom: 2px; }
.dim-weight { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
.dim-bar    { height: 4px; background: var(--border-subtle); border-radius: 2px; overflow: hidden; }
.dim-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }

.hero-footer {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}
.footer-item  { display: flex; align-items: center; gap: 8px; }
.footer-label { font-size: 12px; color: var(--text-muted); }
.footer-value { font-size: 13px; font-weight: 600; color: var(--text); }
.footer-link  { font-size: 12px; color: var(--blue); text-decoration: none; }
.footer-link:hover { text-decoration: underline; }

/* ── SPY/QQQ 行 ── */
.card-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.ticker-card  { padding: 16px 20px; }
.ticker-header {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  font-family: 'DM Mono', monospace;
}
.ticker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.ticker-item { display: flex; flex-direction: column; gap: 2px; }
.ticker-label { font-size: 11px; color: var(--text-muted); }
.ticker-val   { font-size: 14px; font-weight: 600; color: var(--text); }

/* ── 资产指标网格 ── */
.asset-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 20px;
}
.asset-note {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}

/* ── 历史图 ── */
.card-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px; }

/* ── VIX ── */
.vix-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
