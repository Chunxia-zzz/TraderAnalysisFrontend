<template>
  <div>
    <!-- 工具栏 -->
    <div class="card toolbar" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <div class="env-tabs">
          <span class="env-tab" :class="{ active: env === 'REAL' }" @click="switchEnv('REAL')">实盘</span>
          <span class="env-tab" :class="{ active: env === 'SIMULATE' }" @click="switchEnv('SIMULATE')">模拟盘</span>
        </div>
        <a-button type="primary" size="small" @click="loadAllocation" :loading="loading">🔄 刷新</a-button>
        <a-button size="small" @click="openEdit">编辑目标</a-button>
        <span v-if="data?.timestamp" class="update-time mono">更新于 {{ data.timestamp }}</span>
      </div>
      <div class="toolbar-stats" v-if="data">
        <span class="stat-chip gray">总资产 ${{ fmt(data.total_assets) }}</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="data">
        <!-- 三大类概览 -->
        <div class="summary-grid" style="margin-bottom: 16px">
          <div v-for="g in data.groups" :key="g.key" class="card group-card">
            <div class="group-head">
              <span class="group-label">{{ g.label }}</span>
              <span class="group-pct mono">{{ g.weight }}%</span>
            </div>
            <div class="group-bar">
              <div class="group-bar-fill" :style="{ width: barWidth(g) + '%' }" :class="g.key"></div>
            </div>
            <div class="group-meta">
              <span class="meta-item">目标 <b class="mono">${{ fmt(g.target_value) }}</b></span>
              <span class="meta-item">实际 <b class="mono">${{ fmt(g.actual_value) }}</b></span>
              <span class="meta-item" :class="g.gap >= 0 ? 'down' : 'up'">
                差距 <b class="mono">{{ g.gap >= 0 ? '+' : '' }}{{ fmt(g.gap) }}</b>
              </span>
            </div>
          </div>
        </div>

        <!-- 分组标的明细 -->
        <div v-for="g in data.groups" :key="g.key" class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">{{ g.label }}（目标 {{ g.weight }}%）</span>
            <span class="section-hint">目标 ${{ fmt(g.target_value) }} · 实际 ${{ fmt(g.actual_value) }} · 差 {{ fmt(g.gap) }}</span>
          </div>

          <!-- 分批加仓计划 -->
          <div v-if="g.batch_plan" class="batch-plan">
            <div class="bp-header">
              <span>当前现货 ≈ <b class="mono">{{ fmt(g.batch_plan.current_spot) }}</b></span>
              <span>区间位置 {{ g.batch_plan.position_pct }}%</span>
              <span :class="g.batch_plan.exec_pct > 0 ? 'up' : ''">
                可执行 {{ g.batch_plan.exec_pct }}% ≈ ${{ fmt(g.batch_plan.exec_amount) }}
              </span>
            </div>
            <div class="bp-range">
              <span class="bp-end mono">{{ fmt(g.batch_plan.bottom) }}</span>
              <div class="bp-bar">
                <div class="bp-fill" :style="{ width: g.batch_plan.position_pct + '%' }"></div>
                <div class="bp-marker" :style="{ left: g.batch_plan.position_pct + '%' }">▼</div>
              </div>
              <span class="bp-end mono">{{ fmt(g.batch_plan.top) }}</span>
            </div>
            <div class="bp-tiers">
              <div v-for="t in g.batch_plan.tiers" :key="t.tier" class="bp-tier" :class="{ ok: t.executable }">
                <span class="mono">批{{ t.tier }} [{{ t.price_range }}]</span>
                <span>买 {{ t.pct }}%</span>
                <span class="mono">${{ fmt(t.amount) }}</span>
                <span class="bp-status">{{ t.executable ? '✅ 可买' : '⏳ 等回调' }}</span>
              </div>
            </div>
          </div>

          <!-- 子类结构（美股分大科技/半导体/灵活板块） -->
          <template v-if="g.subgroups?.length">
            <div v-for="sg in g.subgroups" :key="sg.label" class="subgroup">
              <div class="subgroup-title">
                <span>{{ sg.label }}</span>
                <span class="section-hint">目标 {{ sg.weight }}% · 实际 ${{ fmt(sg.actual_value) }}</span>
              </div>
              <div class="alloc-table">
                <div class="alloc-head">
                  <span>标的</span><span>目标%</span><span>目标$</span><span>实际$</span><span>差距</span><span>评分</span><span>RSI</span><span>建议</span>
                </div>
                <div v-for="i in sg.items" :key="i.code" class="alloc-row">
                  <span class="a-code">
                    <b class="mono">{{ i.code.replace('US.', '').replace('HK.', '') }}</b>
                    <em>{{ i.name }}</em>
                  </span>
                  <span class="mono">{{ i.weight }}%</span>
                  <span class="mono">{{ fmt(i.target_value) }}</span>
                  <span class="mono" :class="i.actual_value > 0 ? 'up' : ''">{{ i.actual_value > 0 ? fmt(i.actual_value) : '—' }}</span>
                  <span class="mono" :class="i.gap >= 0 ? 'down' : 'up'">{{ i.gap >= 0 ? '+' : '' }}{{ fmt(i.gap) }}</span>
                  <span class="mono" :class="scoreClass(i.score)">{{ i.score ?? '—' }}</span>
                  <span class="mono" :class="rsiClass(i.rsi)">{{ i.rsi ?? '—' }}</span>
                  <span class="advice" :class="'lv-' + i.level">{{ i.action }}<em v-if="i.reasons.length">（{{ i.reasons.join('、') }}）</em></span>
                </div>
              </div>
            </div>
          </template>

          <!-- 扁平结构（黄金/比特币） -->
          <div v-else class="alloc-table">
            <div class="alloc-head">
              <span>标的</span><span>目标%</span><span>目标$</span><span>实际$</span><span>差距</span><span>评分</span><span>RSI</span><span>建议</span>
            </div>
            <div v-for="i in g.items" :key="i.code" class="alloc-row">
              <span class="a-code">
                <b class="mono">{{ i.code.replace('US.', '').replace('HK.', '') }}</b>
                <em>{{ i.name }}</em>
              </span>
              <span class="mono">{{ i.weight }}%</span>
              <span class="mono">{{ fmt(i.target_value) }}</span>
              <span class="mono" :class="i.actual_value > 0 ? 'up' : ''">{{ i.actual_value > 0 ? fmt(i.actual_value) : '—' }}</span>
              <span class="mono" :class="i.gap >= 0 ? 'down' : 'up'">{{ i.gap >= 0 ? '+' : '' }}{{ fmt(i.gap) }}</span>
              <span class="mono" :class="scoreClass(i.score)">{{ i.score ?? '—' }}</span>
              <span class="mono" :class="rsiClass(i.rsi)">{{ i.rsi ?? '—' }}</span>
              <span class="advice" :class="'lv-' + i.level">{{ i.action }}<em v-if="i.reasons.length">（{{ i.reasons.join('、') }}）</em></span>
            </div>
          </div>
        </div>

        <!-- 加仓优先级 -->
        <div class="card section" v-if="data.buy_priority?.length">
          <div class="section-header">
            <span class="section-title">加仓优先级（未达目标，按金额排序）</span>
            <span class="section-hint">低估或情绪低时优先买入</span>
          </div>
          <div class="priority-list">
            <div v-for="(i, idx) in data.buy_priority" :key="i.code" class="priority-row">
              <span class="pri-rank mono">{{ idx + 1 }}</span>
              <span class="pri-code mono">{{ i.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="pri-name">{{ i.name }}</span>
              <span class="pri-gap mono down">+${{ fmt(i.gap) }}</span>
              <span class="advice" :class="'lv-' + i.level">{{ i.action }}</span>
            </div>
          </div>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="点击「刷新」获取目标仓位对比" style="padding: 60px 0" />
    </a-spin>

    <!-- 编辑目标配置 -->
    <a-modal v-model:open="editVisible" title="编辑目标仓位" :width="560" :footer="null">
      <div class="edit-form">
        <div v-for="(g, gi) in editGroups" :key="g.key" class="edit-group">
          <div class="edit-group-head">
            <span class="edit-group-label">{{ g.label }}</span>
            <span class="edit-group-weight">组权重
              <a-input-number v-model:value="g.weight" :min="0" :max="100" size="small" style="width: 70px" />%
            </span>
          </div>
          <div v-if="g.calib_etf1" class="edit-range">
            <div class="edit-calib">
              <span class="edit-range-label">ETF↔期货校准</span>
              <a-input-number v-model:value="g.calib_etf1" :min="0" size="small" style="width: 80px" />
              <span class="edit-unit">→</span>
              <a-input-number v-model:value="g.calib_fut1" :min="0" size="small" style="width: 100px" />
              <span class="edit-unit">│</span>
              <a-input-number v-model:value="g.calib_etf2" :min="0" size="small" style="width: 80px" />
              <span class="edit-unit">→</span>
              <a-input-number v-model:value="g.calib_fut2" :min="0" size="small" style="width: 100px" />
            </div>
            <div class="edit-calib">
              <span class="edit-range-label">短期区间</span>
              <a-input-number v-model:value="g.short_bottom" :min="0" size="small" style="width: 100px" placeholder="底部" />
              <span class="edit-unit">~</span>
              <a-input-number v-model:value="g.short_top" :min="0" size="small" style="width: 100px" placeholder="顶部" />
            </div>
          </div>

          <!-- 子类结构编辑 -->
          <template v-if="g.subgroups?.length">
            <div v-for="(sg, sgi) in g.subgroups" :key="sg.label" class="edit-subgroup">
              <div class="edit-subgroup-title">{{ sg.label }}（{{ sg.weight }}%）</div>
              <div class="edit-items">
                <div v-for="(item, ii) in sg.items" :key="item.code" class="edit-item">
                  <span class="mono edit-code">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
                  <a-input-number v-model:value="item.weight" :min="0" :max="100" size="small" style="width: 70px" />
                  <span class="edit-unit">%</span>
                </div>
                <div class="edit-sum" :class="sgSum(sg) !== sg.weight ? 'down' : ''">
                  {{ sg.label }}合计 {{ sgSum(sg) }}%（须等于 {{ sg.weight }}%）
                </div>
              </div>
            </div>
          </template>

          <!-- 扁平结构编辑 -->
          <div v-else class="edit-items">
            <div v-for="(item, ii) in g.items" :key="item.code" class="edit-item">
              <span class="mono edit-code">{{ item.code.replace('US.', '').replace('HK.', '') }}</span>
              <a-input-number v-model:value="item.weight" :min="0" :max="100" size="small" style="width: 70px" />
              <span class="edit-unit">%</span>
            </div>
            <div class="edit-sum" :class="groupSum(g) !== g.weight ? 'down' : ''">
              组内合计 {{ groupSum(g) }}%（须等于组权重 {{ g.weight }}%）
            </div>
          </div>
        </div>
        <div class="edit-total" :class="totalWeight() !== 100 ? 'down' : ''">
          三大类合计：{{ totalWeight() }}%（须 = 100%）
        </div>
        <div class="edit-actions">
          <a-button type="primary" @click="saveEdit" :loading="saving" :disabled="totalWeight() !== 100">保存配置</a-button>
          <a-button @click="editVisible = false">取消</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getAllocation, saveAllocationConfig } from '../api/trader'

const env = ref('REAL')
const data = ref(null)
const loading = ref(false)
const editVisible = ref(false)
const editGroups = ref([])
const saving = ref(false)

function fmt(v) {
  if (v === null || v === undefined) return '-'
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function barWidth(g) {
  const max = Math.max(g.target_value, g.actual_value, 1)
  return Math.min(100, g.actual_value / max * 100)
}
function scoreClass(s) {
  if (s === null || s === undefined) return ''
  return s >= 80 ? 'up' : s >= 60 ? '' : 'down'
}
function rsiClass(r) {
  if (r === null || r === undefined) return ''
  return r < 40 ? 'up' : r > 70 ? 'down' : ''
}
function groupSum(g) {
  if (g.subgroups?.length) {
    return g.subgroups.reduce((s, sg) => s + sg.items.reduce((x, i) => x + (Number(i.weight) || 0), 0), 0)
  }
  return g.items.reduce((s, i) => s + (Number(i.weight) || 0), 0)
}
function sgSum(sg) {
  return sg.items.reduce((s, i) => s + (Number(i.weight) || 0), 0)
}
function totalWeight() {
  return editGroups.value.reduce((s, g) => s + (Number(g.weight) || 0), 0)
}

async function loadAllocation() {
  loading.value = true
  try {
    const res = await getAllocation(env.value)
    if (res.data?.data) {
      data.value = res.data.data
    } else {
      message.warning(res.data?.message || '获取失败')
      data.value = null
    }
  } catch (e) {
    message.error('获取失败：' + (e.response?.data?.message || e.message))
  } finally {
    loading.value = false
  }
}

function switchEnv(e) {
  if (env.value === e) return
  env.value = e
  loadAllocation()
}

function openEdit() {
  if (!data.value) {
    message.warning('请先刷新数据')
    return
  }
  // 深拷贝当前配置结构（保留 subgroups / 现货区间）
  editGroups.value = JSON.parse(JSON.stringify(data.value.groups.map((g) => {
    const base = { key: g.key, label: g.label, weight: g.weight }
    if (g.calib_etf1) {
      base.calib_etf1 = g.calib_etf1
      base.calib_fut1 = g.calib_fut1
      base.calib_etf2 = g.calib_etf2
      base.calib_fut2 = g.calib_fut2
      base.short_bottom = g.short_bottom
      base.short_top = g.short_top
    }
    if (g.subgroups?.length) {
      base.subgroups = g.subgroups.map((sg) => ({
        label: sg.label, weight: sg.weight,
        items: sg.items.map((i) => ({ code: i.code, weight: i.weight })),
      }))
    } else {
      base.items = g.items.map((i) => ({ code: i.code, weight: i.weight }))
    }
    return base
  })))
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    const payload = { groups: editGroups.value, note: '永久投资组合：美股+黄金+比特币' }
    const res = await saveAllocationConfig(payload)
    if (res.data?.data) {
      message.success('目标配置已保存')
      editVisible.value = false
      loadAllocation()
    } else {
      message.warning(res.data?.message || '保存失败')
    }
  } catch (e) {
    message.error('保存失败：' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

onMounted(loadAllocation)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-stats { display: flex; gap: 8px; }
.update-time { font-size: 12px; color: var(--text-muted); }
.stat-chip { font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 500; }
.stat-chip.gray { color: var(--text-secondary); background: var(--bg-hover); }

.env-tabs { display: flex; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 2px; }
.env-tab { padding: 4px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.env-tab.active { background: var(--text); color: #fff; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.group-card { padding: 16px; }
.group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.group-label { font-size: 15px; font-weight: 600; color: var(--text); }
.group-pct { font-size: 20px; font-weight: 700; }
.group-bar { height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
.group-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
.group-bar-fill.stock { background: var(--blue); }
.group-bar-fill.gold { background: var(--accent); }
.group-bar-fill.btc { background: var(--green); }
.group-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); }
.meta-item b { color: var(--text); }

.section { padding: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--text); }
.section-hint { font-size: 12px; color: var(--text-muted); }

.subgroup { margin-bottom: 14px; }
.subgroup:last-child { margin-bottom: 0; }
.subgroup-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; font-weight: 600; color: var(--text);
  padding: 6px 10px; margin-bottom: 6px;
  background: var(--bg-hover); border-radius: 6px;
}
.subgroup-title .section-hint { font-weight: 400; }

.batch-plan {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: var(--bg);
}
.bp-header { display: flex; gap: 16px; align-items: center; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
.bp-header b { color: var(--text); }
.bp-range { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.bp-end { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.bp-bar { position: relative; flex: 1; height: 8px; background: var(--border-subtle); border-radius: 4px; }
.bp-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--accent)); border-radius: 4px; }
.bp-marker { position: absolute; top: -7px; transform: translateX(-50%); font-size: 12px; color: var(--text); }
.bp-tiers { display: flex; flex-direction: column; gap: 4px; }
.bp-tier {
  display: grid; grid-template-columns: 1.2fr 0.6fr 1fr 0.8fr;
  gap: 10px; padding: 6px 10px; font-size: 12px;
  border-radius: 6px; background: var(--bg-card);
  color: var(--text-secondary);
}
.bp-tier.ok { background: var(--green-bg); color: var(--green); font-weight: 500; }
.bp-status { text-align: right; }

.alloc-table { display: flex; flex-direction: column; }
.alloc-head, .alloc-row {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1.2fr 1.2fr 1.2fr 0.8fr 0.8fr 2fr;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  font-size: 13px;
}
.alloc-head { color: var(--text-muted); font-size: 12px; border-bottom: 1px solid var(--border-subtle); }
.alloc-row { border-bottom: 1px solid var(--border-subtle); }
.alloc-row:last-child { border-bottom: none; }
.alloc-row:hover { background: var(--bg-hover); }
.a-code { display: flex; flex-direction: column; }
.a-code b { color: var(--text); }
.a-code em { font-style: normal; font-size: 11px; color: var(--text-muted); }
.advice { font-size: 12px; font-weight: 500; }
.advice em { font-style: normal; font-size: 11px; color: var(--text-muted); }
.lv-buy { color: var(--green); }
.lv-watch { color: var(--text-secondary); }
.lv-hold { color: var(--text-muted); }
.lv-expensive { color: var(--accent); font-weight: 600; }
.lv-strong_buy {
  color: var(--green);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--green-bg);
}

.priority-list { display: flex; flex-direction: column; }
.priority-row {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 13px;
}
.priority-row:hover { background: var(--bg-hover); }
.pri-rank { width: 22px; color: var(--text-muted); }
.pri-code { font-weight: 700; color: var(--text); min-width: 55px; }
.pri-name { flex: 1; color: var(--text-secondary); font-size: 12px; }
.pri-gap { font-weight: 600; }

.edit-form { display: flex; flex-direction: column; gap: 16px; }
.edit-group { border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; }
.edit-group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.edit-group-label { font-size: 14px; font-weight: 600; }
.edit-group-weight { font-size: 12px; color: var(--text-secondary); }
.edit-range { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; font-size: 12px; color: var(--text-secondary); }
.edit-calib { display: flex; align-items: center; gap: 6px; }
.edit-range-label { min-width: 80px; }
.edit-subgroup { margin-bottom: 10px; padding: 8px; background: var(--bg-hover); border-radius: 6px; }
.edit-subgroup:last-child { margin-bottom: 0; }
.edit-subgroup-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.edit-items { display: flex; flex-direction: column; gap: 6px; }
.edit-item { display: flex; align-items: center; gap: 8px; }
.edit-code { min-width: 70px; font-weight: 600; color: var(--text); }
.edit-unit { font-size: 12px; color: var(--text-muted); }
.edit-sum { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }
.edit-total { font-size: 13px; font-weight: 600; }
.edit-actions { display: flex; gap: 10px; margin-top: 4px; }

@media (max-width: 900px) {
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
