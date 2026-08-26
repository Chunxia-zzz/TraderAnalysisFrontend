<template>
  <div>
    <!-- 工具栏 -->
    <div class="card toolbar" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <div class="env-tabs">
          <span class="env-tab" :class="{ active: env === 'REAL' }" @click="env = 'REAL'">实盘</span>
          <span class="env-tab" :class="{ active: env === 'SIMULATE' }" @click="env = 'SIMULATE'">模拟盘</span>
        </div>
        <a-button type="primary" size="small" @click="loadPosition" :loading="loading">
          <template v-if="!loading">🔄 查询持仓</template>
          <template v-else>刷新中...</template>
        </a-button>
        <span v-if="data?.timestamp" class="update-time mono">更新于 {{ data.timestamp }}</span>
      </div>
      <div class="toolbar-stats" v-if="data">
        <span class="stat-chip gray">{{ data.base_currency }}</span>
        <span class="stat-chip" :class="data.cash_pct >= 50 ? 'gray' : 'green'">现金 {{ data.cash_pct }}%</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="data">
        <!-- 账户摘要 -->
        <div class="summary-grid" style="margin-bottom: 16px">
          <div class="card summary-card">
            <div class="summary-label">总资产</div>
            <div class="summary-value mono">{{ fmt(data.total_assets) }}</div>
          </div>
          <div class="card summary-card">
            <div class="summary-label">现金</div>
            <div class="summary-value mono">{{ fmt(data.cash) }}</div>
          </div>
          <div class="card summary-card">
            <div class="summary-label">现金占比</div>
            <div class="summary-value mono" :class="data.cash_pct >= 50 ? 'up' : ''">{{ data.cash_pct }}%</div>
          </div>
          <div class="card summary-card">
            <div class="summary-label">持仓占比</div>
            <div class="summary-value mono" :class="data.position_pct >= 50 ? '' : ''">{{ data.position_pct }}%</div>
          </div>
          <div class="card summary-card">
            <div class="summary-label">持仓数</div>
            <div class="summary-value mono">{{ data.position_count }}</div>
          </div>
        </div>

        <!-- 持仓明细 -->
        <div class="card section">
          <div class="section-header">
            <span class="section-title">持仓明细（{{ data.positions.length }} 只）</span>
            <span class="section-hint">现价为实时刷新价，占比按 {{ data.base_currency }} 统一口径</span>
          </div>
          <div class="pos-table">
            <div class="pos-head">
              <span class="c-code">标的</span>
              <span class="c-qty">股数</span>
              <span class="c-num">成本</span>
              <span class="c-num">现价</span>
              <span class="c-num">市值({{ data.base_currency }})</span>
              <span class="c-pct">占比</span>
              <span class="c-pct">盈亏</span>
            </div>
            <div v-for="p in data.positions" :key="p.code" class="pos-row">
              <span class="c-code">
                <span class="pos-ticker mono">{{ p.code.replace('US.', '').replace('HK.', '') }}</span>
                <span class="pos-name">{{ p.name }}</span>
              </span>
              <span class="c-qty mono">{{ p.qty }}</span>
              <span class="c-num mono">{{ p.cost_price }}</span>
              <span class="c-num mono">{{ p.price }}</span>
              <span class="c-num mono">{{ fmt(p.market_value_hkd) }}</span>
              <span class="c-pct mono" :class="p.weight_pct >= 0 ? 'up' : 'down'">{{ p.weight_pct }}%</span>
              <span class="c-pct mono" :class="p.pl_pct >= 0 ? 'up' : 'down'">{{ p.pl_pct >= 0 ? '+' : '' }}{{ p.pl_pct }}%</span>
            </div>
            <a-empty v-if="!data.positions.length" description="暂无持仓" style="padding: 24px 0" />
          </div>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="点击「查询持仓」获取实时持仓" style="padding: 60px 0" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getPosition } from '../api/trader'

const env = ref('REAL')
const data = ref(null)
const loading = ref(false)

function fmt(v) {
  if (v === null || v === undefined) return '-'
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadPosition() {
  loading.value = true
  try {
    const res = await getPosition(env.value)
    if (res.data?.data) {
      data.value = res.data.data
    } else {
      message.warning(res.data?.message || '查询失败')
      data.value = null
    }
  } catch (e) {
    message.error('查询失败：' + (e.response?.data?.message || e.message))
  } finally {
    loading.value = false
  }
}

onMounted(loadPosition)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-stats { display: flex; gap: 8px; }
.update-time { font-size: 12px; color: var(--text-muted); }
.stat-chip { font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 500; }
.stat-chip.green { color: var(--green); background: var(--green-bg); }
.stat-chip.gray { color: var(--text-secondary); background: var(--bg-hover); }

.env-tabs { display: flex; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 2px; }
.env-tab { padding: 4px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.env-tab.active { background: var(--text); color: #fff; }

.summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.summary-card { padding: 16px; }
.summary-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.summary-value { font-size: 20px; font-weight: 700; color: var(--text); }

.section { padding: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--text); }
.section-hint { font-size: 12px; color: var(--text-muted); }

.pos-table { display: flex; flex-direction: column; }
.pos-head, .pos-row {
  display: grid;
  grid-template-columns: 2fr 0.7fr 1fr 1fr 1.3fr 0.8fr 0.8fr;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
}
.pos-head {
  color: var(--text-muted);
  font-size: 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.pos-row {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
}
.pos-row:hover { background: var(--bg-hover); }
.pos-row:last-child { border-bottom: none; }

.c-code { display: flex; flex-direction: column; }
.pos-ticker { font-weight: 700; color: var(--text); }
.pos-name { font-size: 11px; color: var(--text-muted); }
.c-qty, .c-num, .c-pct { text-align: right; }
.c-num { color: var(--text); }
.c-pct { font-weight: 600; }

@media (max-width: 900px) {
  .summary-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
