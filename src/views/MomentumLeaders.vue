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
        <a-button type="primary" size="small" @click="loadData" :loading="loading">查询</a-button>
      </div>
      <div class="toolbar-stats" v-if="emaCross || overview">
        <span class="stat-chip green">空转多 {{ bullCount }} 只</span>
        <span class="stat-chip red">多转空 {{ bearCount }} 只</span>
        <span class="stat-chip red">主升浪龙头 {{ leaders.length }} 只</span>
        <span class="stat-chip green" v-if="oversold.length">主跌浪超卖 {{ oversold.length }} 只</span>
      </div>
    </div>

    <!-- 主 tab 选择器 -->
    <div class="card section-selector" style="margin-bottom: 16px">
      <a-select v-model:value="mainTab" style="width: 200px">
        <a-select-option value="bull">空转多</a-select-option>
        <a-select-option value="bear">多转空</a-select-option>
        <a-select-option value="leaders">主升浪龙头</a-select-option>
        <a-select-option value="oversold">主跌浪超卖</a-select-option>
      </a-select>
    </div>

    <a-spin :spinning="loading">
      <div>
        <!-- 空转多 -->
        <template v-if="emaCross && mainTab === 'bull'">
          <div class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">空转多 — EMA5 上穿 EMA30</span>
            <div class="ema-tabs">
              <span class="ema-tab" :class="{ active: emaTab === '4h' }" @click="emaTab = '4h'">
                4H <em>{{ (emaCross.bull_4h?.length || 0) }}</em>
              </span>
              <span class="ema-tab" :class="{ active: emaTab === '1d' }" @click="emaTab = '1d'">
                日线 <em>{{ (emaCross.bull_1d?.length || 0) }}</em>
              </span>
            </div>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in bullFiltered"
              :key="item.code + item.signal_type"
              class="stock-row"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.detail?.close ? '$' + item.detail.close : '' }}</span>
              <div class="row-badges">
                <span class="badge badge-green">↑ 空转多</span>
                <span class="badge badge-gray">{{ emaTab === '4h' ? '4H' : '日线' }}</span>
              </div>
              <span class="ema-detail mono">EMA5={{ item.detail?.ema5 }} / EMA30={{ item.detail?.ema30 }}</span>
            </div>
            <a-empty v-if="bullFiltered.length === 0" description="暂无空转多信号" style="padding: 16px 0" />
          </div>
        </div>
        </template>

        <!-- 多转空 -->
        <template v-else-if="emaCross && mainTab === 'bear'">
          <div class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">多转空 — EMA5 下穿 EMA30</span>
            <div class="ema-tabs">
              <span class="ema-tab" :class="{ active: emaTab === '4h' }" @click="emaTab = '4h'">
                4H <em>{{ (emaCross.bear_4h?.length || 0) }}</em>
              </span>
              <span class="ema-tab" :class="{ active: emaTab === '1d' }" @click="emaTab = '1d'">
                日线 <em>{{ (emaCross.bear_1d?.length || 0) }}</em>
              </span>
            </div>
          </div>
          <div class="stock-table">
            <div
              v-for="(item, i) in bearFiltered"
              :key="item.code + item.signal_type"
              class="stock-row"
              @click="goDetail(item)"
            >
              <span class="row-rank mono">{{ i + 1 }}</span>
              <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-name">{{ item.detail?.close ? '$' + item.detail.close : '' }}</span>
              <div class="row-badges">
                <span class="badge badge-red">↓ 多转空</span>
                <span class="badge badge-gray">{{ emaTab === '4h' ? '4H' : '日线' }}</span>
              </div>
              <span class="ema-detail mono">EMA5={{ item.detail?.ema5 }} / EMA30={{ item.detail?.ema30 }}</span>
            </div>
            <a-empty v-if="bearFiltered.length === 0" description="暂无多转空信号" style="padding: 16px 0" />
          </div>
        </div>
        </template>

        <!-- 主升浪龙头 -->
        <template v-else-if="overview && mainTab === 'leaders'">
          <div class="card section" style="margin-bottom: 16px">
            <div class="section-header">
              <span class="section-title">主升浪龙头</span>
              <span class="section-badge red">动量评分 ≥ 70</span>
            </div>
            <div class="stock-table">
              <div
                v-for="(item, i) in leaders"
                :key="item.code"
                class="stock-row"
                @click="goDetail(item)"
              >
                <span class="row-rank mono">{{ i + 1 }}</span>
                <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
                <span class="row-name">{{ item.name }}</span>
                <div class="momentum-bar-wrap">
                  <div class="momentum-bar">
                    <div class="momentum-fill" :style="{ width: item.momentum_score + '%' }"></div>
                  </div>
                  <span class="momentum-val mono">{{ item.momentum_score }}</span>
                </div>
                <div class="row-badges">
                  <span v-if="item.above_ma5" class="badge badge-green">MA5上</span>
                  <span v-else class="badge badge-gray">MA5下</span>
                  <span v-if="item.ema_ribbon === 'green'" class="badge badge-green">多头带</span>
                </div>
                <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
              </div>
              <a-empty v-if="leaders.length === 0" description="暂无数据" style="padding: 16px 0" />
            </div>
          </div>
        </template>

        <!-- 主跌浪超卖 -->
        <template v-else-if="overview && mainTab === 'oversold'">
          <div class="card section" style="margin-bottom: 16px">
            <div class="section-header">
              <span class="section-title">主跌浪超卖</span>
              <span class="section-badge green">6因子评分 ≥ 60</span>
            </div>
            <div class="stock-table">
              <div
                v-for="(item, i) in oversold"
                :key="item.code"
                class="stock-row"
                @click="goDetail(item)"
              >
                <span class="row-rank mono">{{ i + 1 }}</span>
                <span class="row-ticker mono">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
                <span class="row-name">{{ item.name }}</span>
                <div class="momentum-bar-wrap">
                  <div class="momentum-bar">
                    <div class="momentum-fill" :style="{ width: (item.momentum_score ?? 0) + '%' }"></div>
                  </div>
                  <span class="momentum-val mono">{{ item.momentum_score ?? '-' }}</span>
                </div>
                <div class="row-badges">
                  <span v-if="item.above_ma5" class="badge badge-green">MA5上</span>
                  <span v-else class="badge badge-gray">MA5下</span>
                  <span v-if="item.ema_ribbon === 'red'" class="badge badge-red">空头带</span>
                </div>
                <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
              </div>
              <a-empty v-if="oversold.length === 0" description="暂无超卖标的" style="padding: 16px 0" />
            </div>
          </div>
        </template>

        <a-empty v-else-if="!loading && !emaCross && !overview" :description="emptyMessage" />
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScoresOverview, getEmaCrossSignals } from '../api/trader'

const router = useRouter()
const selectedDate = ref(null)
const loading = ref(true)
const overview = ref(null)
const emptyMessage = ref('暂无数据')
const emaCross = ref(null)
const mainTab = ref('bull')
const emaTab = ref('4h')

/** 主升浪龙头：动量评分 ≥ 70 */
const leaders = computed(() => {
  if (!overview.value) return []
  const actionableMap = {}
  overview.value.actionable?.forEach(a => { actionableMap[a.code] = a.above_ma5 })
  return (overview.value.momentum_leaders || []).map(item => ({
    ...item,
    above_ma5: actionableMap[item.code] ?? item.above_ma5 ?? false,
  }))
})

/** 主跌浪超卖：6因子评分 ≥ 60（STRONG_BUY + BUY），按评分降序 */
const oversold = computed(() => {
  if (!overview.value) return []
  const seen = new Set()
  const items = [
    ...(overview.value.strong_buy || []),
    ...(overview.value.buy || []),
  ].filter(item => {
    if (seen.has(item.code)) return false
    seen.add(item.code)
    return true
  })
  return items.sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
})

/** 空转多信号：按周期过滤 */
const bullFiltered = computed(() => {
  if (!emaCross.value) return []
  return emaCross.value[`bull_${emaTab.value}`] || []
})

/** 多转空信号：按周期过滤 */
const bearFiltered = computed(() => {
  if (!emaCross.value) return []
  return emaCross.value[`bear_${emaTab.value}`] || []
})

/** 空转多总数量 */
const bullCount = computed(() => {
  if (!emaCross.value) return 0
  return (emaCross.value.bull_4h?.length || 0) + (emaCross.value.bull_1d?.length || 0)
})

/** 多转空总数量 */
const bearCount = computed(() => {
  if (!emaCross.value) return 0
  return (emaCross.value.bear_4h?.length || 0) + (emaCross.value.bear_1d?.length || 0)
})

function scorePillClass(score) {
  if (score >= 80) return 'score-pill high'
  if (score >= 60) return 'score-pill mid'
  return 'score-pill low'
}

async function loadData() {
  loading.value = true
  overview.value = null
  try {
    const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const [overviewRes, emaRes] = await Promise.all([
      getScoresOverview(dateStr),
      getEmaCrossSignals(dateStr),
    ])
    const d = overviewRes.data
    if (d && d.data === null) {
      emptyMessage.value = d.message || '暂无数据'
    } else {
      overview.value = d
    }
    emaCross.value = emaRes.data
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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
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
.toolbar-stats {
  display: flex;
  gap: 6px;
}
.stat-chip {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.stat-chip.red   { color: var(--red);   background: var(--red-bg); }
.stat-chip.green { color: var(--green); background: var(--green-bg); }

.section-selector {
  padding: 12px 16px;
}

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
  flex-wrap: wrap;
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
.section-badge.red   { color: var(--red);   background: var(--red-bg); }
.section-badge.green { color: var(--green); background: var(--green-bg); }

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
.stock-row:last-child { border-bottom: none; }
.stock-row:hover { background: var(--bg-hover); }

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

.momentum-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
  flex-shrink: 0;
}
.momentum-bar {
  flex: 1;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
  overflow: hidden;
}
.momentum-fill {
  height: 100%;
  background: var(--blue);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.momentum-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--blue);
  width: 28px;
  text-align: right;
}

.row-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.badge-green { color: var(--green);     background: var(--green-bg); }
.badge-red   { color: var(--red);       background: var(--red-bg); }
.badge-gray  { color: var(--text-muted); background: var(--bg-hover); }

.ema-tabs {
  display: flex;
  gap: 4px;
}
.ema-tab {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
  background: var(--bg-hover);
  transition: all 0.15s;
}
.ema-tab:hover { color: var(--text); }
.ema-tab.active {
  color: var(--blue);
  background: var(--blue-bg, rgba(59, 130, 246, 0.1));
  font-weight: 600;
}
.ema-tab em {
  font-style: normal;
  margin-left: 3px;
  opacity: 0.7;
}
.ema-detail {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.score-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.score-pill.high { color: var(--red);     background: var(--red-bg); }
.score-pill.mid  { color: var(--orange);  background: var(--orange-bg, rgba(255,159,28,0.15)); }
.score-pill.low  { color: var(--green);   background: var(--green-bg); }
</style>
