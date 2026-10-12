<template>
  <div>
    <!-- 工具栏 -->
    <div class="toolbar card" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <span class="toolbar-label">日期</span>
        <a-date-picker
          v-model:value="selectedDate"
          placeholder="最新"
          :allow-clear="true"
          style="width: 140px"
        />
        <span class="toolbar-label">潮汐过滤</span>
        <a-switch v-model:checked="tideOnly" size="small" />
        <a-button type="primary" size="small" :loading="loading" @click="loadData(true)">刷新</a-button>
        <a-tooltip title="潮汐过滤：只保留周线趋势向上的做多信号（利弗莫尔原则：顺势）。关闭后显示全部突破，逆势的会标注出来。">
          <span class="hint-icon">?</span>
        </a-tooltip>
      </div>
      <div class="toolbar-stats" v-if="data">
        <span class="stat-chip green">突破 {{ counts.breakouts }}</span>
        <span class="stat-chip green">逼近 {{ counts.near }}</span>
        <span class="stat-chip">上方 {{ counts.above }}</span>
        <span class="stat-chip red">风险 {{ counts.dangers }}</span>
        <span class="stat-chip" v-if="stats.filtered_by_tide">被潮汐挡 {{ stats.filtered_by_tide }}</span>
      </div>
    </div>

    <!-- 口径说明 -->
    <div class="caliber card" style="margin-bottom: 16px">
      <div class="caliber-row">
        <span class="caliber-tag">关键点</span>
        <span>整理平台（窄幅箱体）的上沿，用箱体内<b>收盘价</b>最高点定义；收盘首次越过它 = 突破买点</span>
      </div>
      <div class="caliber-row">
        <span class="caliber-tag">两类关键点</span>
        <span>
          <b>反转关键点</b> — 箱体建立时中期趋势尚未转多（MA20 ≤ MA60）；
          <b>连续关键点</b> — 趋势已向上，突破属加仓点
        </span>
      </div>
      <div class="caliber-row">
        <span class="caliber-tag">配套规则</span>
        <span>
          量比 ≥ {{ VOL_CONFIRM || 1.5 }} 才算放量确认 · 只在周线潮汐向上时做多 ·
          止损设在关键点下方 {{ STOP_ATR || 0.5 }}×ATR · 关键点上方 1/2/3 倍 ATR 为金字塔加仓位
        </span>
      </div>
      <div class="caliber-row warn">
        <span class="caliber-tag">⚠️ 独立体系</span>
        <span>
          本模块与「6 因子评分」方向相反（评分买超卖、本模块买突破），
          <b>不并入 total_score</b>，信号独立落库、独立展示
        </span>
      </div>
    </div>

    <!-- 结论条 -->
    <div class="card summary" style="margin-bottom: 16px" v-if="data">
      <span class="summary-date mono">{{ data.date || '—' }}</span>
      <span class="summary-text">
        扫描 {{ data.scanned }}/{{ data.universe }} 只，其中
        <b>{{ stats.no_platform }}</b> 只近期无有效整理平台（不参与信号）；
        今日 <b class="c-green">{{ counts.breakouts }}</b> 只突破关键点（连续 {{ stats.continuation }} / 反转 {{ stats.reversal }}），
        <b class="c-green">{{ counts.near }}</b> 只逼近关键点，
        <b class="c-red">{{ counts.dangers }}</b> 只触发风险信号。
        潮汐：涨 {{ stats.tide_up }} / 退 {{ stats.tide_down }} / 不明 {{ stats.tide_unknown }}，龙头 {{ stats.leaders }} 只。
        <template v-if="data.bench && data.bench.ret_60 != null">
          基准 SPY 60 日 {{ data.bench.ret_60 }}%。
        </template>
        <template v-if="data.source === 'db'">数据源：落库历史。</template>
      </span>
    </div>

    <a-alert
      v-if="message"
      :message="message"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <!-- 分组切换 -->
    <div class="card section-selector" style="margin-bottom: 16px">
      <div class="seg">
        <span
          v-for="g in groups"
          :key="g.key"
          class="seg-item"
          :class="{ active: tab === g.key, danger: g.danger }"
          @click="tab = g.key"
        >
          {{ g.label }} <em>{{ counts[g.countKey] }}</em>
        </span>
      </div>
      <span class="seg-note">{{ activeGroup.note }}</span>
    </div>

    <a-spin :spinning="loading">
      <div class="card section">
        <!-- 表头 -->
        <div class="tbl-head">
          <span class="c-rank">#</span>
          <span class="c-code">代码</span>
          <span class="c-name">名称</span>
          <span class="c-num">现价</span>
          <span class="c-num gold">关键点</span>
          <span class="c-num">距关键点</span>
          <span v-if="showBox" class="c-box">箱体</span>
          <span class="c-num">量比</span>
          <span class="c-tide">潮汐/波浪</span>
          <span class="c-num">RS60</span>
          <span v-if="!isDanger" class="c-strength">强度</span>
          <span v-else class="c-badge">信号</span>
          <span class="c-act"></span>
        </div>

        <div
          v-for="(item, i) in rows"
          :key="item.code + (item.signal_type || '')"
          class="tbl-row"
          @click="openDetail(item)"
        >
          <span class="c-rank c-muted mono">{{ i + 1 }}</span>
          <span class="c-code mono">
            {{ ticker(item.code) }}
            <b v-if="item.is_leader" class="leader" title="龙头：60 日相对强度 ≥ 5%">★</b>
          </span>
          <span class="c-name">{{ item.name || '—' }}</span>
          <span class="c-num mono">{{ fmt(item.close) }}</span>
          <span class="c-num mono gold">{{ fmt(item.pivotal) }}</span>
          <span class="c-num mono" :class="distClass(item)">
            {{ item.dist_pct > 0 ? '+' : '' }}{{ fmt(item.dist_pct) }}%
          </span>
          <span v-if="showBox" class="c-box mono c-muted">
            <template v-if="item.platform_bars">
              {{ item.platform_bars }}根 / {{ fmt(item.platform_range_pct) }}%
            </template>
            <template v-else>—</template>
          </span>
          <span class="c-num mono" :class="{ 'c-green': item.vol_ratio >= 1.5 }">
            {{ item.vol_ratio == null ? '—' : fmt(item.vol_ratio) }}
          </span>
          <span class="c-tide">
            <span class="tag" :class="tideClass(item.tide)">{{ tideLabel(item.tide) }}</span>
            <span class="tag" :class="waveClass(item.wave)">{{ waveLabel(item.wave) }}</span>
          </span>
          <span class="c-num mono" :class="rsClass(item.rs_60)">{{ rsText(item.rs_60) }}</span>
          <span v-if="!isDanger" class="c-strength">
            <span class="bar"><i :style="{ width: (item.strength || 0) * 100 + '%' }"></i></span>
            <span class="mono">{{ fmt(item.strength, 2) }}</span>
          </span>
          <span v-else class="c-badge">
            <span class="tag red">{{ item.signal_label }}</span>
          </span>
          <span class="c-act">
            <a-button type="link" size="small" @click.stop="goChart(item)">K线</a-button>
          </span>
        </div>

        <a-empty v-if="rows.length === 0 && !loading" :description="emptyText" style="padding: 24px 0" />
      </div>
    </a-spin>

    <!-- 单只详情 -->
    <a-drawer
      v-model:open="detailOpen"
      :title="detail ? `${detail.code}  ${detail.name || ''}` : '加载中…'"
      placement="right"
      :width="520"
      :body-style="{ padding: '16px' }"
    >
      <a-spin :spinning="detailLoading">
        <template v-if="detail && detail.panorama">
          <div v-if="!detail.panorama.pivotal" class="d-empty">
            <a-alert type="warning" show-icon :message="detail.panorama.skip_reason || '无有效整理平台'" />
          </div>
          <template v-else>
            <!-- 当前信号 -->
            <div class="d-block" v-if="detail.signals.length">
              <div class="d-title">当前信号</div>
              <div
                v-for="s in detail.signals"
                :key="s.signal_type"
                class="d-sig"
                :class="s.bullish ? 'bull' : 'bear'"
              >
                <div class="d-sig-head">
                  <span class="tag" :class="s.bullish ? 'green' : 'red'">{{ s.label }}</span>
                  <span class="mono">强度 {{ fmt(s.strength, 2) }}</span>
                </div>
                <div class="d-sig-desc">{{ s.description }}</div>
                <div class="d-sig-action" v-if="s.detail && s.detail.action">→ {{ s.detail.action }}</div>
              </div>
            </div>
            <div class="d-block" v-else>
              <a-alert type="success" show-icon message="今日无利弗莫尔信号（既未突破也无风险触发）" />
            </div>

            <!-- 关键点全景 -->
            <div class="d-block">
              <div class="d-title">关键点全景</div>
              <div class="kv"><span>关键点（箱体上沿）</span><b class="mono gold">{{ fmt(p.pivotal) }}</b></div>
              <div class="kv"><span>箱体下沿</span><b class="mono">{{ fmt(p.platform_lower) }}</b></div>
              <div class="kv"><span>箱体长度 / 振幅</span><b class="mono">{{ p.platform_bars }} 根 / {{ fmt(p.platform_range_pct) }}%</b></div>
              <div class="kv"><span>箱体区间</span><b class="mono">{{ p.platform_start_date }} ~ {{ p.platform_stop_date }}</b></div>
              <div class="kv"><span>关键点类型</span><b>{{ p.context === 'continuation' ? '连续关键点（加仓点）' : '反转关键点（建仓点）' }}</b></div>
              <div class="kv"><span>状态</span><b>{{ stateLabel(p.state, p.days_above) }}</b></div>
              <div class="kv"><span>止损位</span><b class="mono">{{ fmt(p.stop) }}（{{ fmt(p.stop_dist_pct) }}%）</b></div>
              <div class="kv" v-if="p.prior_high">
                <span>前高（区间）</span>
                <b class="mono">{{ fmt(p.prior_high) }}（{{ fmt(p.prior_high_dist_pct) }}%）</b>
              </div>
            </div>

            <!-- 金字塔加仓位 -->
            <div class="d-block" v-if="p.pyramid && p.pyramid.length">
              <div class="d-title">金字塔加仓位（关键点上方 N×ATR）</div>
              <div v-for="lv in p.pyramid" :key="lv.level" class="kv">
                <span>第 {{ lv.level }} 级</span>
                <b class="mono" :class="{ 'c-green': lv.reached }">
                  {{ fmt(lv.price) }}（+{{ fmt(lv.pct_from_pivotal) }}%）{{ lv.reached ? ' 已到' : '' }}
                </b>
              </div>
            </div>

            <!-- 趋势与强弱 -->
            <div class="d-block">
              <div class="d-title">趋势与相对强度</div>
              <div class="kv"><span>周线潮汐</span><b>{{ tideLabel(p.tide) }} <em class="c-muted">（{{ periodText(p.tide_period) }}）</em></b></div>
              <div class="kv"><span>日线波浪</span><b>MA20 {{ cmpText(p.ma20, p.ma60) }} MA60</b></div>
              <div class="kv"><span>相对强度 RS20 / RS60</span><b class="mono">{{ rsText(p.rs_20) }} / {{ rsText(p.rs_60) }}</b></div>
              <div class="kv"><span>龙头判定</span><b>{{ p.is_leader ? '是（RS60 ≥ 5%）' : '否' }}</b></div>
              <div class="kv"><span>量比 / ATR</span><b class="mono">{{ fmt(p.vol_ratio) }} / {{ fmt(p.atr14) }}</b></div>
              <div class="kv"><span>数据深度</span><b class="mono">日线 {{ p.daily_bars }} 根 / 周线 {{ p.weekly_bars }} 根</b></div>
              <div class="kv" v-if="p.tide_note"><span>潮汐口径</span><b class="c-muted">{{ p.tide_note }}</b></div>
            </div>

            <div class="d-foot">
              <a-button type="primary" size="small" @click="goChart(detail)">打开 K 线图</a-button>
            </div>
          </template>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getLivermoreSignals, getLivermoreDetail } from '../api/trader'

const VOL_CONFIRM = 1.5
const STOP_ATR = 0.5

const router = useRouter()
const selectedDate = ref(null)
const tideOnly = ref(true)
const loading = ref(true)
const data = ref(null)
const tab = ref('breakouts')
const message = ref('')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const EMPTY = { breakouts: [], near_pivots: [], above_pivot: [], dangers: [], stats: {} }

const groups = [
  { key: 'breakouts',   label: '关键点突破', countKey: 'breakouts',  danger: false,
    note: '收盘首次越过整理平台上沿 —— 利弗莫尔的买点。放量确认才可靠。' },
  { key: 'near_pivots', label: '逼近关键点', countKey: 'near',       danger: false,
    note: '在关键点下方 2% 以内，尚未突破 —— 预备名单，突破当天再动手。' },
  { key: 'above_pivot', label: '已在关键点上方', countKey: 'above',  danger: false,
    note: '已突破并延续（突破后 2 根以上）。持有中参考，回踩关键点不破可加仓。' },
  { key: 'dangers',     label: '风险信号',   countKey: 'dangers',    danger: true,
    note: '假突破收回 / 跌破关键点止损 / 高位放量滞涨 —— 按利弗莫尔原则应减仓或离场。' },
]

const isDanger = computed(() => tab.value === 'dangers')
const showBox = computed(() => tab.value !== 'dangers')

const stats = computed(() => (data.value && data.value.stats) || {})
const counts = computed(() => ({
  breakouts: stats.value.breakouts || 0,
  near: stats.value.near_pivots || 0,
  above: stats.value.above_pivot || 0,
  dangers: stats.value.dangers || 0,
}))

const rows = computed(() => (data.value && data.value[tab.value]) || [])
const activeGroup = computed(() => groups.find(g => g.key === tab.value) || groups[0])

const emptyText = computed(() => {
  if (tab.value === 'breakouts') return '今日无关键点突破（说明市场没有给出新的突破买点，属正常）'
  if (tab.value === 'near_pivots') return '没有标的逼近关键点'
  if (tab.value === 'above_pivot') return '没有已突破且延续的标的'
  return '今日无风险信号'
})

const p = computed(() => (detail.value && detail.value.panorama) || {})

function ticker(code) {
  return (code || '').replace('US.', '').replace('HK.', '')
}
function fmt(v, d = 2) {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '—'
  return Number(v).toFixed(d)
}
function distClass(item) {
  if (item.dist_pct == null) return ''
  if (tab.value === 'dangers') return 'c-red'
  if (item.dist_pct > 0) return 'c-green'
  return 'c-muted'
}
function tideLabel(t) {
  return { up: '涨潮', down: '退潮', neutral: '无潮汐', unknown: '不明' }[t] || '不明'
}
function tideClass(t) {
  return { up: 'green', down: 'red', neutral: 'gray', unknown: 'gray' }[t] || 'gray'
}
function waveLabel(w) {
  return { up: '浪上', down: '浪下', neutral: '浪平', unknown: '—' }[w] || '—'
}
function waveClass(w) {
  return { up: 'green', down: 'red', neutral: 'gray', unknown: 'gray' }[w] || 'gray'
}
function rsText(v) {
  if (v == null) return '—'
  return (v > 0 ? '+' : '') + Number(v).toFixed(1)
}
function rsClass(v) {
  if (v == null) return 'c-muted'
  return v >= 5 ? 'c-green' : 'c-muted'
}
function stateLabel(state, daysAbove) {
  const map = {
    above: `已在关键点上方第 ${daysAbove} 根`,
    approaching: '逼近关键点（下方 2% 内）',
    below: '在箱体内 / 关键点下方',
    platform: '在箱体内',
    no_platform: '无有效整理平台',
    unknown: '未知',
  }
  return map[state] || state || '—'
}
function periodText(period) {
  return period && period.length === 2 ? `周线 MA${period[0]} vs MA${period[1]}` : '口径不明'
}
function cmpText(a, b) {
  if (a == null || b == null) return '—'
  return a > b ? '>' : a < b ? '<' : '='
}

async function loadData(force = false) {
  loading.value = true
  message.value = ''
  try {
    const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const res = await getLivermoreSignals({ date: dateStr, allTide: !tideOnly.value, refresh: force })
    data.value = { ...EMPTY, ...res.data }
    if (res.data.message) message.value = res.data.message
    // 当前分组为空时自动跳到第一个有内容的分组，避免用户看到空白页
    if (!rows.value.length) {
      const hit = groups.find(g => (data.value[g.key] || []).length)
      if (hit) tab.value = hit.key
    }
  } catch {
    message.value = '获取利弗莫尔信号失败，请检查后端连接'
    data.value = { ...EMPTY }
  } finally {
    loading.value = false
  }
}

async function openDetail(item) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const res = await getLivermoreDetail(item.code)
    detail.value = res.data
  } catch {
    message.value = `获取 ${item.code} 关键点详情失败`
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function goChart(item) {
  router.push({ name: 'chart', query: { code: item.code } })
}

onMounted(() => loadData())
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-label { font-size: 12px; color: var(--text-muted); }
.toolbar-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.hint-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; border-radius: 50%; font-size: 10px; cursor: help;
  color: var(--text-muted); border: 1px solid var(--border);
}
.stat-chip {
  font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 4px;
  background: var(--bg-hover); color: var(--text-secondary);
}
.stat-chip.red   { color: var(--red);   background: var(--red-bg); }
.stat-chip.green { color: var(--green); background: var(--green-bg); }

.caliber { padding: 10px 16px; display: flex; flex-direction: column; gap: 5px; }
.caliber-row { display: flex; gap: 8px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.7; }
.caliber-row.warn { color: var(--accent); }
.caliber-tag {
  flex-shrink: 0; min-width: 74px; font-weight: 600;
  color: var(--text-muted); font-size: 11px;
}
.caliber-row b { color: var(--text); }

.summary { padding: 12px 16px; display: flex; gap: 12px; align-items: flex-start; }
.summary-date { font-size: 12px; font-weight: 700; color: var(--accent); flex-shrink: 0; padding-top: 1px; }
.summary-text { font-size: 12.5px; color: var(--text-secondary); line-height: 1.75; }
.summary-text b { color: var(--text); }

.section-selector { padding: 10px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.seg { display: flex; gap: 4px; }
.seg-item {
  font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 4px;
  cursor: pointer; color: var(--text-muted); background: var(--bg-hover); transition: all 0.15s;
}
.seg-item:hover { color: var(--text); }
.seg-item.active { color: var(--blue); background: var(--bg-emphasis); font-weight: 600; }
.seg-item.active.danger { color: var(--red); background: var(--red-bg); }
/* ⚠️ --bg-emphasis 在本主题里是深色 (#1f2328)，不能再配 var(--text)（同色 → 文字消失），必须用浅色前景 */
.seg-item.active:not(.danger) { color: #ffffff; }
.seg-item em { font-style: normal; margin-left: 3px; opacity: 0.75; }
.seg-note { font-size: 11.5px; color: var(--text-muted); }

.section { padding: 0; overflow: hidden; }

.tbl-head, .tbl-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 16px;
}
.tbl-head {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle); background: var(--bg-hover);
}
.tbl-row {
  font-size: 13px; cursor: pointer;
  border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;
}
.tbl-row:last-of-type { border-bottom: none; }
.tbl-row:hover { background: var(--bg-hover); }

.c-rank   { width: 24px; text-align: right; flex-shrink: 0; font-size: 12px; }
.c-code   { width: 84px; font-weight: 700; flex-shrink: 0; display: flex; align-items: center; gap: 3px; }
.c-name   { width: 130px; flex-shrink: 0; color: var(--text-secondary); font-size: 12px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-num    { width: 78px; text-align: right; flex-shrink: 0; }
.c-num.gold { color: var(--accent); font-weight: 600; }
.c-box    { width: 104px; text-align: right; flex-shrink: 0; font-size: 11.5px; }
.c-tide   { width: 92px; flex-shrink: 0; display: flex; gap: 3px; }
.c-strength { width: 96px; flex-shrink: 0; display: flex; align-items: center; gap: 6px; font-size: 11px; }
.c-badge  { width: 96px; flex-shrink: 0; }
.c-act    { width: 52px; flex-shrink: 0; text-align: right; }

.c-muted { color: var(--text-muted); }
.c-green { color: var(--green); }
.c-red   { color: var(--red); }
.gold    { color: var(--accent); }
.leader  { color: var(--accent); font-size: 10px; }

.tag {
  display: inline-block; font-size: 10.5px; font-weight: 500;
  padding: 1px 6px; border-radius: 4px; white-space: nowrap;
  color: var(--text-muted); background: var(--bg-hover);
}
.tag.green { color: var(--green); background: var(--green-bg); }
.tag.red   { color: var(--red);   background: var(--red-bg); }
.tag.gray  { color: var(--text-muted); background: var(--bg-hover); }

.bar {
  flex: 1; height: 4px; border-radius: 2px; overflow: hidden;
  background: var(--border-subtle);
}
.bar i { display: block; height: 100%; background: var(--accent); border-radius: 2px; }

/* Drawer */
.d-block { margin-bottom: 18px; }
.d-title {
  font-size: 12px; font-weight: 700; color: var(--text);
  margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid var(--border-subtle);
}
.kv {
  display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  font-size: 12.5px; padding: 4px 0; color: var(--text-secondary);
}
.kv b { color: var(--text); font-weight: 600; text-align: right; }
.kv em { font-style: normal; font-size: 11px; color: var(--text-muted); }
.d-sig { border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; }
.d-sig.bull { background: var(--green-bg); }
.d-sig.bear { background: var(--red-bg); }
.d-sig-head { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; margin-bottom: 5px; }
.d-sig-desc { font-size: 12px; color: var(--text); line-height: 1.65; }
.d-sig-action { font-size: 11.5px; color: var(--text-secondary); margin-top: 4px; }
.d-empty { padding: 8px 0; }
.d-foot { padding-top: 8px; border-top: 1px solid var(--border-subtle); }
</style>
