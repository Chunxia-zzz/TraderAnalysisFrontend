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
      <div class="toolbar-stats" v-if="overview">
        <span class="stat-chip red">主升浪龙头 {{ leaders.length }} 只</span>
        <span class="stat-chip green">可执行 {{ leaders.filter(i => i.above_ma5).length }} 只</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="overview">
        <div v-if="leaders.length > 0" class="card section">
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
              </div>
              <span :class="scorePillClass(item.total_score)" class="score-pill">{{ item.total_score.toFixed(1) }}</span>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无主升浪龙头" />
      </template>
      <a-empty v-else-if="!loading" :description="emptyMessage" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScoresOverview } from '../api/trader'

const router = useRouter()
const selectedDate = ref(null)
const loading = ref(true)
const overview = ref(null)
const emptyMessage = ref('暂无数据')

const leaders = computed(() => {
  if (!overview.value) return []
  const actionableMap = {}
  overview.value.actionable?.forEach(a => { actionableMap[a.code] = a.above_ma5 })
  return (overview.value.momentum_leaders || []).map(item => ({
    ...item,
    above_ma5: actionableMap[item.code] ?? false,
  }))
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
    const res = await getScoresOverview(dateStr)
    const d = res.data
    if (d && d.data === null) {
      emptyMessage.value = d.message || '暂无数据'
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
.section-badge.red { color: var(--red); background: var(--red-bg); }

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

/* Momentum bar */
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
.badge-gray  { color: var(--text-muted); background: var(--bg-hover); }
</style>
