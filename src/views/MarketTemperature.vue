<template>
  <div>
    <!-- ── 一级：资产大类 ── -->
    <div class="card view-switcher">
      <span
        v-for="tab in TOP_TABS" :key="tab.key"
        class="view-tab" :class="[tab.cls, { active: topView === tab.key }]"
        @click="switchTop(tab.key)"
      >{{ tab.label }}</span>
    </div>

    <!-- ── 二级：美股细分指数（仅「美股」分组显示）── -->
    <div class="card view-switcher sub-switcher" v-if="topView === 'us_index'">
      <span
        v-for="tab in SUB_TABS" :key="tab.key"
        class="view-tab sub" :class="{ active: subView === tab.key }"
        @click="switchSub(tab.key)"
      >{{ tab.label }}</span>
    </div>

    <a-spin :spinning="loading">

      <!-- ══ 指数视图（SPY / QQQ 共用模板）══ -->
      <template v-if="isIndexView">
        <template v-if="activeIndex">
          <div class="card hero-card" style="margin-bottom:16px">
            <div class="hero-body">
              <div class="hero-left">
                <div class="hero-eyebrow">{{ activeIndex.label }}温度</div>
                <div class="hero-score mono">{{ activeIndex.composite_score.toFixed(1) }}</div>
                <div class="hero-sub">/ 100</div>
                <span class="status-pill" :style="pillStyle(activeIndex.composite_score)">{{ getLevel(activeIndex.composite_score).label }}</span>
                <div class="hero-action">{{ getLevel(activeIndex.composite_score).action }}</div>
                <div class="hero-note">分数越高 = 越恐慌 = 越值得加仓（与个股评分同向）</div>
              </div>
              <div class="hero-right">
                <div v-for="dim in activeIndex.dimensions" :key="dim.key" class="dim-block">
                  <div class="dim-value mono">{{ dim.score?.toFixed(1) }}</div>
                  <div class="dim-label">{{ dim.label }}</div>
                  <div class="dim-weight">{{ (dim.weight * 100).toFixed(0) }}%</div>
                  <div class="dim-bar">
                    <div class="dim-bar-fill" :style="{ width: dim.score + '%', background: dimColor(dim.score) }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="hero-footer">
              <div class="footer-item">
                <span class="footer-label">建议仓位</span>
                <span class="footer-value mono">{{ activeIndex.target_position_pct.toFixed(1) }}%</span>
              </div>
              <div class="footer-item">
                <span class="footer-label">数据日期</span>
                <span class="footer-value mono">{{ activeIndex.date }}</span>
              </div>
              <div class="footer-item">
                <span class="footer-label">标普-纳指温差</span>
                <span class="footer-value mono" :style="{ color: spreadColor(data?.spread?.value) }">{{ formatSpread(data?.spread?.value) }}</span>
              </div>
              <div class="footer-item" v-if="leverageInfo">
                <span class="footer-label">杠杆建议</span>
                <span class="footer-value" style="color:var(--accent)">{{ leverageInfo }}</span>
              </div>
              <div class="footer-item">
                <span class="footer-link" style="cursor:pointer" @click="goChart(activeIndex.code)">{{ activeIndex.key }} K线 ↗</span>
              </div>
            </div>
          </div>

          <!-- 口径提示（如 SOXX 高波动、RSP 宽度语义） -->
          <div class="note-bar" v-if="activeIndex.note">
            <span class="note-icon">⚑</span>
            <span>{{ activeIndex.note }}</span>
          </div>

          <!-- 技术指标 -->
          <div class="card ticker-card" style="padding:20px 24px;margin-bottom:16px">
            <div class="ticker-header" style="margin-bottom:16px;font-size:14px">技术指标</div>
            <div class="asset-metrics-grid">
              <div class="ticker-item">
                <span class="ticker-label">ETF 价格（代理）</span>
                <span class="ticker-val mono">{{ fmt(activeIndex.indicators.price) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">日线 RSI6</span>
                <span class="ticker-val mono" :class="rsiCls(activeIndex.indicators.daily_rsi)">{{ fmt(activeIndex.indicators.daily_rsi) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">周线 RSI6</span>
                <span class="ticker-val mono" :class="rsiCls(activeIndex.indicators.weekly_rsi)">{{ fmt(activeIndex.indicators.weekly_rsi) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">MA200 偏离</span>
                <span class="ticker-val mono" :class="(activeIndex.indicators.ma200_dev ?? 0) > 0 ? 'up' : 'down'">{{ pct(activeIndex.indicators.ma200_dev) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">ATH 回撤</span>
                <span class="ticker-val mono down">{{ pct(activeIndex.indicators.ath_drawdown) }}</span>
              </div>
              <div class="ticker-item">
                <span class="ticker-label">52 周位置</span>
                <span class="ticker-val mono">{{ pct(activeIndex.indicators.pos_52w) }}</span>
              </div>
            </div>
          </div>

          <!-- 历史趋势 -->
          <div class="card" style="padding:20px 24px;margin-bottom:12px" v-if="activeIndexHistory.length > 0">
            <div class="card-title">历史趋势（{{ activeIndexHistory[0]?.date }} ~ {{ activeIndexHistory[activeIndexHistory.length - 1]?.date }}）</div>
            <div ref="indexChartRef" style="width:100%;height:300px"></div>
          </div>

          <div class="vix-tip">
            <span style="color:var(--accent)">⚑</span>
            两个指数共用同一套阈值，因此两张温度卡可以直接比大小；差值见「标普-纳指温差」页
          </div>
        </template>
        <a-empty v-else-if="!loading" description="暂无指数温度数据，请确认后端已运行 temperature 命令" />
      </template>

      <!-- ══ 温差视图 ══ -->
      <template v-else-if="topView === 'us_index' && subView === 'spread'">
        <template v-if="data && data.spread">
          <div class="card hero-card" style="margin-bottom:16px">
            <div class="hero-body">
              <div class="hero-left">
                <div class="hero-eyebrow">标普 − 纳指 温差</div>
                <div class="hero-score mono" :style="{ color: spreadColor(data.spread.value) }">{{ formatSpread(data.spread.value) }}</div>
                <div class="hero-sub">SPY 温度 − QQQ 温度</div>
                <span class="status-pill" :style="pillStyle(data.spread.value > 0 ? 30 : 80)">{{ data.spread.label }}</span>
                <div class="hero-action">负值 = 标普温度更低 = 标普相对更强</div>
                <div class="hero-note">正值相反：纳指跌得更狠、温度更高，说明纳指相对更弱</div>
              </div>
              <div class="hero-right">
                <div class="dim-block" v-for="idx in data.indexes" :key="idx.key">
                  <div class="dim-value mono">{{ idx.composite_score.toFixed(1) }}</div>
                  <div class="dim-label">{{ idx.key }} 温度</div>
                  <div class="dim-weight">仓位 {{ idx.target_position_pct.toFixed(1) }}%</div>
                  <div class="dim-bar">
                    <div class="dim-bar-fill" :style="{ width: idx.composite_score + '%', background: dimColor(idx.composite_score) }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="hero-footer">
              <div class="footer-item">
                <span class="footer-label">数据日期</span>
                <span class="footer-value mono">{{ data.date }}</span>
              </div>
              <div class="footer-item">
                <span class="footer-label">走势含义</span>
                <span class="footer-value">温差长期为负 = 标普持续强于纳指</span>
              </div>
            </div>
          </div>

          <div class="card" style="padding:20px 24px;margin-bottom:12px" v-if="spreadHistory.length > 0">
            <div class="card-title">温差走势（{{ spreadHistory[0]?.date }} ~ {{ spreadHistory[spreadHistory.length - 1]?.date }}）</div>
            <div ref="spreadChartRef" style="width:100%;height:300px"></div>
          </div>
        </template>
        <a-empty v-else-if="!loading" description="暂无温差数据" />
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
                <div class="hero-note">分数越高 = 越恐慌 = 越值得加仓（与个股评分同向）</div>
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
// 2026-11-14 起三级导航：一级=资产大类，二级=美股细分指数（specs/004）
const TOP_TABS = [
  { key: 'us_index', label: '美股',   cls: '' },
  { key: 'gold',     label: '黄金',   cls: 'gold' },
  { key: 'btc',      label: '比特币', cls: 'orange' },
]

// 二级 tab 的标签来自后端 indexes[].label（单一真相源），接口未到时用兜底清单
const SUB_FALLBACK = [
  { key: 'spy',  label: '标普 500' },
  { key: 'qqq',  label: '纳指 100' },
  { key: 'dia',  label: '道琼斯工业' },
  { key: 'iwm',  label: '罗素 2000' },
  { key: 'soxx', label: '费城半导体' },
  { key: 'rsp',  label: '标普 500 等权' },
]

// 高分=恐慌=加仓机会（2026-10-19 镜像反转，与个股评分 total_score 同向）
const TEMPERATURE_LEVELS = [
  { min: 95,  label: '极端恐慌', action: '融资+期权超配' },
  { min: 85,  label: '极度恐慌', action: '重仓逆势买入' },
  { min: 70,  label: '偏悲观',   action: '积极加仓' },
  { min: 55,  label: '略偏冷',   action: '适度加仓' },
  { min: 45,  label: '中性',     action: '维持仓位' },
  { min: 30,  label: '略偏热',   action: '适度减仓' },
  { min: 15,  label: '偏贪婪',   action: '积极减仓' },
  { min: 0,   label: '极度贪婪', action: '大幅减仓' },
]

const ASSET_DIMS = [
  { key: 'daily_tech_score',  name: '日线技术', weight: '50%' },
  { key: 'weekly_tech_score', name: '周线技术', weight: '35%' },
  { key: 'price_score',       name: '价格位置', weight: '15%' },
]

const LEVERAGE_MAP = {
  'margin':          '建议融资补仓（现货ETF）',
  'margin + OTM_call': '建议融资 + OTM Call期权超配',
}

// ── 状态 ──
const topView = ref('us_index')
const subView = ref('spy')   // 切走再回来要保留（spec FR-010）
const loading = ref(true)
const data = ref(null)

// 指数历史：{ SPY: [...], QQQ: [...], ... }，温差： [{date, value}]
const indexHistory = ref({})
const spreadHistory = ref([])

const indexChartRef = ref(null)
let indexChartInstance = null
const spreadChartRef = ref(null)
let spreadChartInstance = null

const assetHistory = ref({ gold: [], btc: [] })
const assetChartRef = ref(null)
let assetChartInstance = null

// ── 工具函数 ──
function getLevel(score) {
  return TEMPERATURE_LEVELS.find(l => score >= l.min) || TEMPERATURE_LEVELS[7]
}

// 高分=恐慌=加仓机会→蓝；低分=贪婪→红
function pillStyle(score) {
  if (score >= 70) return { color: 'var(--blue)',           background: '#e3f0ff' }
  if (score >= 45) return { color: 'var(--text-secondary)', background: 'var(--bg-hover)' }
  if (score >= 25) return { color: 'var(--accent)',         background: 'var(--accent-bg)' }
  return                  { color: 'var(--red)',            background: 'var(--red-bg)' }
}

function dimColor(score) {
  if (score == null) return 'var(--text-muted)'
  if (score >= 70) return 'var(--blue)'
  if (score >= 45) return 'var(--text-muted)'
  if (score >= 25) return 'var(--accent)'
  return 'var(--red)'
}

// 温差：负=标普更强（蓝），正=纳指更弱（红），0 附近中性
function spreadColor(value) {
  if (value == null) return 'var(--text-muted)'
  if (value < 0) return 'var(--blue)'
  if (value > 0) return 'var(--red)'
  return 'var(--text-secondary)'
}

function formatSpread(value) {
  if (value == null) return '—'
  return (value > 0 ? '+' : '') + Number(value).toFixed(1)
}

function fmt(val) { return val != null ? Number(val).toFixed(2) : '-' }
function pct(val) { return val != null ? (val * 100).toFixed(1) + '%' : '-' }
function rsiCls(val) {
  if (val == null) return ''
  return val <= 30 ? 'up' : val >= 70 ? 'down' : ''
}

// ── computed ──
// 二级 tab：标签取自后端 indexes[].label（单一真相源），末尾固定追加「温差」
const SUB_TABS = computed(() => {
  const indexes = data.value?.indexes
  const base = indexes && indexes.length
    ? indexes.map(i => ({ key: i.key.toLowerCase(), label: i.label }))
    : SUB_FALLBACK
  return [...base, { key: 'spread', label: '标普-纳指温差' }]
})

const isIndexView = computed(
  () => topView.value === 'us_index' && subView.value !== 'spread'
)

const activeIndex = computed(() => {
  if (!data.value || !data.value.indexes) return null
  const key = subView.value.toUpperCase()
  return data.value.indexes.find(i => i.key === key) || null
})

const activeIndexHistory = computed(() => {
  if (!isIndexView.value) return []
  return indexHistory.value[subView.value.toUpperCase()] || []
})

const leverageInfo = computed(() => {
  if (!activeIndex.value) return null
  return LEVERAGE_MAP[activeIndex.value.leverage_tool] || null
})

const asset = computed(() => {
  if (!data.value) return null
  if (topView.value === 'gold') return data.value.gld_temp
  if (topView.value === 'btc')  return data.value.btc_temp
  return null
})

// ── 操作 ──
function switchTop(key) {
  topView.value = key
}

function switchSub(key) {
  subView.value = key
}

function goChart(code) {
  router.push({ name: 'chart', query: { code } })
}

// ── 指数历史图 ──
function renderIndexChart() {
  const history = activeIndexHistory.value
  if (!indexChartRef.value || history.length === 0) return
  if (!indexChartInstance) indexChartInstance = echarts.init(indexChartRef.value)
  indexChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['温度', '建议仓位%'], textStyle: { color: '#59636e', fontSize: 12 } },
    grid: { left: 50, right: 60, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: history.map(d => d.date), axisLabel: { color: '#8b949e', fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '温度',  min: 0, max: 100, axisLabel: { color: '#8b949e', fontSize: 11 } },
      { type: 'value', name: '仓位%', min: 0, max: 130, axisLabel: { color: '#8b949e', fontSize: 11 } },
    ],
    series: [
      {
        name: '温度', type: 'line', data: history.map(d => d.composite_score), smooth: true,
        itemStyle: { color: '#0550ae' }, lineStyle: { color: '#0550ae' },
        markArea: { silent: true, data: [
          [{ yAxis: 70, itemStyle: { color: 'rgba(5,80,174,0.04)'   } }, { yAxis: 100 }],
          [{ yAxis: 30, itemStyle: { color: 'rgba(139,148,158,0.04)' } }, { yAxis: 70  }],
          [{ yAxis: 0,  itemStyle: { color: 'rgba(164,14,38,0.04)'  } }, { yAxis: 30  }],
        ]},
      },
      {
        name: '建议仓位%', type: 'line', yAxisIndex: 1,
        data: history.map(d => d.target_position_pct), smooth: true,
        lineStyle: { type: 'dashed', color: '#946800' }, itemStyle: { color: '#946800' },
      },
    ],
  }, true)
  indexChartInstance.resize()
}

// ── 温差图 ──
function renderSpreadChart() {
  const history = spreadHistory.value
  if (!spreadChartRef.value || history.length === 0) return
  if (!spreadChartInstance) spreadChartInstance = echarts.init(spreadChartRef.value)
  spreadChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['温差 (SPY − QQQ)'], textStyle: { color: '#59636e', fontSize: 12 } },
    grid: { left: 50, right: 30, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: history.map(d => d.date), axisLabel: { color: '#8b949e', fontSize: 11 } },
    yAxis: { type: 'value', name: '温差', axisLabel: { color: '#8b949e', fontSize: 11 } },
    series: [{
      name: '温差 (SPY − QQQ)', type: 'line', data: history.map(d => d.value), smooth: true,
      itemStyle: { color: '#0550ae' }, lineStyle: { color: '#0550ae', width: 1.5 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(5,80,174,0.18)' },
          { offset: 1, color: 'rgba(5,80,174,0.02)' },
        ]),
      },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ yAxis: 0, lineStyle: { color: '#8b949e', type: 'dashed' }, label: { show: false } }],
      },
    }],
  }, true)
  spreadChartInstance.resize()
}

// ── 资产历史图 ──
function renderAssetChart(viewKey) {
  const history = assetHistory.value[viewKey]
  if (!assetChartRef.value || !history || history.length === 0) return
  if (!assetChartInstance) assetChartInstance = echarts.init(assetChartRef.value)
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
        [{ yAxis: 70, itemStyle: { color: 'rgba(5,80,174,0.04)'   } }, { yAxis: 100 }],
        [{ yAxis: 30, itemStyle: { color: 'rgba(139,148,158,0.04)' } }, { yAxis: 70  }],
        [{ yAxis: 0,  itemStyle: { color: 'rgba(164,14,38,0.04)'  } }, { yAxis: 30  }],
      ]},
    }],
  }, true)
  assetChartInstance.resize()
}

function disposeAll() {
  if (indexChartInstance)  { indexChartInstance.dispose();  indexChartInstance = null }
  if (spreadChartInstance) { spreadChartInstance.dispose(); spreadChartInstance = null }
  if (assetChartInstance)  { assetChartInstance.dispose();  assetChartInstance = null }
}

// 切换视图时销毁旧图实例，重建新图（v-if 会销毁/重建 DOM）
watch([topView, subView], async () => {
  disposeAll()
  await nextTick()
  if (isIndexView.value) renderIndexChart()
  else if (subView.value === 'spread') renderSpreadChart()
  else renderAssetChart(topView.value)
})

onMounted(async () => {
  try {
    const res = await getMarketTemperature()
    // 兼容：后端改为 indexes[] 结构；旧结构（顶层 composite_score）视为无数据
    data.value = res.data && Array.isArray(res.data.indexes) ? res.data : null
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }

  // 并行拉取三类历史曲线
  const [indexRes, gldRes, btcRes] = await Promise.allSettled([
    getMarketTemperatureHistory(),
    getAssetTemperatureHistory('GLD', 60),
    getAssetTemperatureHistory('BTC', 60),
  ])

  if (indexRes.status === 'fulfilled') {
    const payload = indexRes.value.data || {}
    const series = payload.series || []
    const map = {}
    for (const item of series) map[item.key] = item.points || []
    indexHistory.value = map
    spreadHistory.value = payload.spread || []
  }
  assetHistory.value.gold = gldRes.status === 'fulfilled' ? (gldRes.value.data.history || []) : []
  assetHistory.value.btc  = btcRes.status === 'fulfilled' ? (btcRes.value.data.history || []) : []

  await nextTick()
  if (isIndexView.value) renderIndexChart()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  indexChartInstance?.resize()
  spreadChartInstance?.resize()
  assetChartInstance?.resize()
}
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeAll()
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

/* ── 二级 tab（美股细分指数）：允许换行，窄屏不溢出 ── */
.sub-switcher {
  margin-top: -8px;
  padding: 8px 12px;
  background: var(--bg-hover);
  flex-wrap: wrap;
}
.view-tab.sub { font-size: 12px; padding: 4px 12px; }
.view-tab.sub.active { background: var(--blue); color: #fff; }

/* ── 口径提示条 ── */
.note-bar {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #7a5b00;
  background: #fff8e1;
  border: 1px solid #f0e0a8;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
}
.note-icon { color: #b8860b; }

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
.hero-note  { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

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

/* ── 指标卡 ── */
.ticker-card  { padding: 16px 20px; }
.ticker-header {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  font-family: 'DM Mono', monospace;
}
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
