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
          @change="loadData"
        />
      </div>
      <div class="filter-tabs" v-if="overview">
        <span class="filter-tab" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
          全部 <em>{{ overview.total_count }}</em>
        </span>
        <span class="filter-tab blue" :class="{ active: activeFilter === 'actionable' }" @click="activeFilter = 'actionable'">
          严重超卖且站上MA5 <em>{{ overview.summary.actionable_count }}</em>
        </span>
        <span class="filter-tab green" :class="{ active: activeFilter === 'strong_buy' }" @click="activeFilter = 'strong_buy'">
          严重超卖 <em>{{ overview.summary.strong_buy_count }}</em>
        </span>
        <span class="filter-tab gold" :class="{ active: activeFilter === 'buy' }" @click="activeFilter = 'buy'">
          超卖 <em>{{ overview.summary.buy_count }}</em>
        </span>
        <span class="filter-tab" :class="{ active: activeFilter === 'no_action' }" @click="activeFilter = 'no_action'">
          中性 <em>{{ overview.summary.no_action_count }}</em>
        </span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="overview">
        <!-- 可执行机会 -->
        <div v-if="overview.actionable && overview.actionable.length > 0 && (activeFilter === 'all' || activeFilter === 'actionable')" class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">严重超卖且站上MA5</span>
            <span class="section-badge">评分达标 + 站上MA5</span>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in overview.actionable"
              :key="item.code"
              class="stock-row"
              :class="{ 'ribbon-warn': item.ema_ribbon === 'red' }"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.name }}</span>
              <div class="row-badges">
                <span class="badge badge-green">MA5✓</span>
                <span v-if="item.ema_ribbon" class="badge" :class="ribbonBadgeClass(item.ema_ribbon)">
                  {{ ribbonLabel(item.ema_ribbon) }}
                </span>
              </div>
              <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- STRONG_BUY -->
        <div v-if="overview.strong_buy.length > 0 && (activeFilter === 'all' || activeFilter === 'strong_buy')" class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">严重超卖</span>
            <span class="section-badge green">≥ 80</span>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in overview.strong_buy"
              :key="item.code"
              class="stock-row"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.name }}</span>
              <div class="row-badges">
                <span v-if="item.above_ma5" class="badge badge-green">MA5上</span>
                <span v-else-if="item.above_ma5 === false" class="badge badge-gray">MA5下</span>
                <span v-if="item.ema_ribbon" class="badge" :class="ribbonBadgeClass(item.ema_ribbon)">
                  {{ ribbonLabel(item.ema_ribbon) }}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px">
                <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
                <span class="tpsl-btn" @click="toggleTpSl(item, $event)">{{ expandedCode === item.code ? '收起' : '止盈损' }}</span>
              </div>
            </div>
            <!-- TP/SL 展开 -->
            <div v-if="expandedCode && tpslData[expandedCode] && overview.strong_buy.some(i => i.code === expandedCode)" class="tpsl-row">
              <a-spin v-if="tpslLoading && !tpslData[expandedCode]" size="small" />
              <template v-else-if="!tpslData[expandedCode]?.error">
                <span class="tpsl-item">止损 <b class="down">{{ tpslData[expandedCode].stop_loss.price.toFixed(2) }}</b> ({{ (tpslData[expandedCode].stop_loss.distance_pct * 100).toFixed(1) }}%)</span>
                <span class="tpsl-item">止盈 <b class="up">{{ tpslData[expandedCode].take_profit.price.toFixed(2) }}</b></span>
                <span class="tpsl-item">R:R <b>{{ tpslData[expandedCode].risk_reward_ratio.toFixed(1) }}</b></span>
              </template>
              <span v-else style="color: var(--text-muted); font-size: 12px">{{ tpslData[expandedCode].error }}</span>
            </div>
          </div>
        </div>

        <!-- BUY -->
        <div v-if="overview.buy.length > 0 && (activeFilter === 'all' || activeFilter === 'buy')" class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">超卖</span>
            <span class="section-badge gold">60 ~ 79</span>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in overview.buy"
              :key="item.code"
              class="stock-row"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.name }}</span>
              <div class="row-badges">
                <span v-if="item.above_ma5" class="badge badge-green">MA5上</span>
                <span v-else-if="item.above_ma5 === false" class="badge badge-gray">MA5下</span>
                <span v-if="item.ema_ribbon" class="badge" :class="ribbonBadgeClass(item.ema_ribbon)">
                  {{ ribbonLabel(item.ema_ribbon) }}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px">
                <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
                <span class="tpsl-btn" @click="toggleTpSl(item, $event)">{{ expandedCode === item.code ? '收起' : '止盈损' }}</span>
              </div>
            </div>
            <div v-if="expandedCode && tpslData[expandedCode] && overview.buy.some(i => i.code === expandedCode)" class="tpsl-row">
              <a-spin v-if="tpslLoading && !tpslData[expandedCode]" size="small" />
              <template v-else-if="!tpslData[expandedCode]?.error">
                <span class="tpsl-item">止损 <b class="down">{{ tpslData[expandedCode].stop_loss.price.toFixed(2) }}</b> ({{ (tpslData[expandedCode].stop_loss.distance_pct * 100).toFixed(1) }}%)</span>
                <span class="tpsl-item">止盈 <b class="up">{{ tpslData[expandedCode].take_profit.price.toFixed(2) }}</b></span>
                <span class="tpsl-item">R:R <b>{{ tpslData[expandedCode].risk_reward_ratio.toFixed(1) }}</b></span>
              </template>
              <span v-else style="color: var(--text-muted); font-size: 12px">{{ tpslData[expandedCode].error }}</span>
            </div>
          </div>
        </div>

        <!-- NO_ACTION -->
        <div v-if="activeFilter === 'all' || activeFilter === 'no_action'" class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">中性</span>
            <span class="section-badge">< 60</span>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in overview.no_action"
              :key="item.code"
              class="stock-row"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.name }}</span>
              <div class="row-badges">
                <span v-if="item.momentum_score >= 70" class="badge badge-blue">动量 {{ item.momentum_score }}</span>
                <span v-if="item.ema_ribbon" class="badge" :class="ribbonBadgeClass(item.ema_ribbon)">
                  {{ ribbonLabel(item.ema_ribbon) }}
                </span>
              </div>
              <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
            </div>
          </div>
        </div>
      </template>

      <a-empty v-else-if="!loading" :description="emptyMessage" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScoresOverview, getTpSl } from '../api/trader'

const router = useRouter()
const selectedDate = ref(null)
const loading = ref(true)
const overview = ref(null)
const emptyMessage = ref('暂无评分数据')

const activeFilter = ref('all')

const expandedCode = ref(null)
const tpslLoading = ref(false)
const tpslData = reactive({})

function scorePillClass(score) {
  if (score >= 80) return 'score-pill high'
  if (score >= 60) return 'score-pill mid'
  return 'score-pill low'
}

function ribbonLabel(ribbon) {
  return ribbon === 'green' ? '多头带' : '空头带'
}

function ribbonBadgeClass(ribbon) {
  return ribbon === 'green' ? 'badge-green' : 'badge-red'
}

async function toggleTpSl(item, event) {
  event.stopPropagation()
  const code = item.code
  if (expandedCode.value === code) { expandedCode.value = null; return }
  expandedCode.value = code
  if (tpslData[code]) return
  tpslLoading.value = true
  try {
    const { data } = await getTpSl(code)
    tpslData[code] = (data && data.data !== null) ? data : { error: data?.message || '暂无数据' }
  } catch {
    tpslData[code] = { error: '请求失败' }
  } finally {
    tpslLoading.value = false
  }
}

async function loadData() {
  loading.value = true
  overview.value = null
  activeFilter.value = 'all'
  try {
    const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const res = await getScoresOverview(dateStr)
    const d = res.data
    if (d && d.data === null) {
      emptyMessage.value = d.message || '暂无评分数据'
    } else {
      overview.value = d
    }
  } catch {
    emptyMessage.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

function goDetail(item) {
  router.push({ name: 'chart', query: { code: item.code } })
}

onMounted(loadData)
</script>

<style scoped>
/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* Filter tabs */
.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  background: transparent;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.filter-tab em {
  font-style: normal;
  font-size: 11px;
  font-family: 'DM Mono', monospace;
  opacity: 0.7;
}
.filter-tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.filter-tab.active {
  background: var(--bg-emphasis);
  color: #fff;
}
.filter-tab.active em { opacity: 0.8; }
.filter-tab.blue.active  { background: var(--blue); }
.filter-tab.green.active { background: var(--green); }
.filter-tab.gold.active  { background: var(--accent); }

/* Section */
.section {
  padding: 0;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.section-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
.section-badge.green { color: var(--green); background: var(--green-bg); }
.section-badge.gold  { color: var(--accent); background: var(--accent-bg); }

/* Table */
.stock-table {
  display: flex;
  flex-direction: column;
}

.stock-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-subtle);
}
.stock-row:last-child {
  border-bottom: none;
}
.stock-row:hover {
  background: var(--bg-hover);
}
.stock-row.ribbon-warn {
  background: var(--red-bg);
}
.stock-row.ribbon-warn:hover {
  background: #ffd8d4;
}

.row-rank {
  width: 24px;
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
  text-align: right;
}
.row-ticker {
  width: 72px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}
.row-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Badges */
.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.badge-green { color: var(--green);   background: var(--green-bg); }
.badge-red   { color: var(--red);     background: var(--red-bg); }
.badge-gold  { color: var(--accent);  background: var(--accent-bg); }
.badge-blue  { color: var(--blue);    background: #e3f0ff; }
.badge-gray  { color: var(--text-muted); background: var(--bg-hover); }

/* TP/SL */
.tpsl-btn {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--blue);
  background: #e3f0ff;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.tpsl-btn:hover { background: #c8e0ff; }

.tpsl-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 16px 8px 116px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-secondary);
}
.tpsl-item b.up   { color: var(--green); }
.tpsl-item b.down { color: var(--red); }
</style>
