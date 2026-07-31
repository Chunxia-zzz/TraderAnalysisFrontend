<template>
  <div class="watchlist-manage">
    <a-card title="标的池管理" :bordered="false">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <a-space wrap>
          <a-select v-model:value="filters.category" placeholder="分类" allow-clear style="width: 120px" @change="fetchList">
            <a-select-option v-for="(label, key) in categories" :key="key" :value="key">{{ label }}</a-select-option>
          </a-select>
          <a-select v-model:value="filters.market" placeholder="市场" allow-clear style="width: 100px" @change="fetchList">
            <a-select-option value="US">美股</a-select-option>
            <a-select-option value="HK">港股</a-select-option>
          </a-select>
          <a-input-search v-model:value="filters.search" placeholder="搜索代码/名称" style="width: 200px" @search="fetchList" allow-clear />
          <a-select v-model:value="sortBy" placeholder="排序" style="width: 140px" @change="applySort">
            <a-select-option value="">默认顺序</a-select-option>
            <a-select-option value="discount_desc">折价高→低</a-select-option>
            <a-select-option value="discount_asc">折价低→高</a-select-option>
          </a-select>
        </a-space>
        <a-space>
          <a-button type="primary" @click="showAddModal">新增标的</a-button>
          <a-button @click="handleRefreshAll" :loading="refreshing">刷新快照</a-button>
        </a-space>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="code"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (total) => `共 ${total} 只` }"
        size="small"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tags'">
            <a-tag v-for="t in record.tags" :key="t" size="small">{{ t }}</a-tag>
          </template>
          <template v-if="column.key === 'ms_discount'">
            <span v-if="record.ms_discount_pct != null" :style="{ color: record.ms_discount_pct > 15 ? 'var(--red)' : record.ms_discount_pct > 0 ? 'var(--accent)' : 'var(--green)', fontWeight: 600 }">
              {{ record.ms_discount_pct > 0 ? '+' : '' }}{{ record.ms_discount_pct }}%
            </span>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="showEditModal(record)">编辑</a>
              <a-popconfirm title="确认删除？" @confirm="handleDelete(record.code)">
                <a style="color: #ff4d4f">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增弹窗 -->
    <a-modal v-model:open="addVisible" title="新增标的" @ok="handleAdd" :confirm-loading="submitting">
      <a-form :model="addForm" layout="vertical">
        <a-form-item label="代码（如 US.AAPL）" required>
          <a-input v-model:value="addForm.code" placeholder="US.AAPL" />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model:value="addForm.category" placeholder="如 mag7, cloud" />
        </a-form-item>
        <a-form-item label="标签（逗号分隔）">
          <a-input v-model:value="addForm.tagsStr" placeholder="AI, GPU" />
        </a-form-item>
        <a-form-item label="投资逻辑">
          <a-textarea v-model:value="addForm.thesis" :rows="2" />
        </a-form-item>
        <a-form-item label="目标价">
          <a-input-number v-model:value="addForm.target_price" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑弹窗 -->
    <a-modal v-model:open="editVisible" title="编辑标的" @ok="handleEdit" :confirm-loading="submitting">
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="代码">
          <a-input :value="editForm.code" disabled />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model:value="editForm.category" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="editForm.status">
            <a-select-option value="watching">观察中</a-select-option>
            <a-select-option value="holding">持仓中</a-select-option>
            <a-select-option value="exited">已退出</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标签（逗号分隔）">
          <a-input v-model:value="editForm.tagsStr" />
        </a-form-item>
        <a-form-item label="投资逻辑">
          <a-textarea v-model:value="editForm.thesis" :rows="2" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="editForm.notes" :rows="2" />
        </a-form-item>
        <a-form-item label="目标价">
          <a-input-number v-model:value="editForm.target_price" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Forward PE">
          <a-input-number v-model:value="editForm.forward_pe" style="width: 100%" />
        </a-form-item>
        <a-form-item label="分析师目标价">
          <a-input-number v-model:value="editForm.analyst_target_mean" style="width: 100%" />
        </a-form-item>
        <a-form-item label="晨星公允价值">
          <a-input-number v-model:value="editForm.morningstar_fair_value" style="width: 100%" />
        </a-form-item>
        <a-form-item label="推荐策略">
          <a-select v-model:value="editForm.recommended_strategy" allow-clear placeholder="选择策略">
            <a-select-option value="hold_10d">持有10天（稳健大票）</a-select-option>
            <a-select-option value="hold_20d">持有20天（中长线）</a-select-option>
            <a-select-option value="swing">波段操作（周期性回调股）</a-select-option>
            <a-select-option value="trend_ma5">趋势MA5（高弹性成长股）</a-select-option>
            <a-select-option value="trend_ma10">趋势MA10（强势主线）</a-select-option>
            <a-select-option value="trend_ma20">趋势MA20（长趋势）</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getWatchlist, addWatchlistStock, updateWatchlistStock, deleteWatchlistStock, refreshSnapshot } from '../api/trader'

const loading = ref(false)
const sortBy = ref('discount_desc')
const submitting = ref(false)
const list = ref([])
const categories = ref({})
const filters = reactive({ category: undefined, status: undefined, market: undefined, search: '' })

const columns = [
  { title: '代码', dataIndex: 'code', key: 'code', width: 100 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 140 },
  { title: '分类', dataIndex: 'category', key: 'category', width: 80 },
  { title: '分析师目标', dataIndex: 'analyst_target_mean', key: 'analyst_target_mean', width: 100 },
  { title: '晨星公允', dataIndex: 'morningstar_fair_value', key: 'morningstar_fair_value', width: 100 },
  { title: '晨星折价', key: 'ms_discount', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 200, ellipsis: true },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

function statusColor(s) {
  return { watching: 'blue', holding: 'green', exited: 'default' }[s] || 'default'
}
function statusLabel(s) {
  return { watching: '观察中', holding: '持仓中', exited: '已退出' }[s] || s
}

const STRATEGY_MAP = {
  hold_10d: { label: '持有10天', color: 'blue' },
  hold_20d: { label: '持有20天', color: 'cyan' },
  swing: { label: '波段操作', color: 'orange' },
  trend_ma5: { label: '趋势MA5', color: 'green' },
  trend_ma10: { label: '趋势MA10', color: 'lime' },
  trend_ma20: { label: '趋势MA20', color: 'volcano' },
}

function strategyLabel(s) {
  return STRATEGY_MAP[s]?.label || s
}
function strategyColor(s) {
  return STRATEGY_MAP[s]?.color || 'default'
}

async function fetchList() {
  loading.value = true
  try {
    const params = {}
    if (filters.category) params.category = filters.category
    if (filters.status) params.status = filters.status
    if (filters.market) params.market = filters.market
    if (filters.search) params.search = filters.search
    const { data } = await getWatchlist(params)
    list.value = data.watchlist || []
    categories.value = data.categories || {}
    applySort()
  } catch (e) {
    message.error('加载标的池失败')
  } finally {
    loading.value = false
  }
}

// 新增
const addVisible = ref(false)
const addForm = reactive({ code: '', category: '', tagsStr: '', thesis: '', target_price: null })

function showAddModal() {
  Object.assign(addForm, { code: '', category: '', tagsStr: '', thesis: '', target_price: null })
  addVisible.value = true
}

async function handleAdd() {
  if (!addForm.code) return message.warning('请输入代码')
  submitting.value = true
  try {
    const payload = { code: addForm.code }
    if (addForm.category) payload.category = addForm.category
    if (addForm.tagsStr) payload.tags = addForm.tagsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    if (addForm.thesis) payload.thesis = addForm.thesis
    if (addForm.target_price) payload.target_price = addForm.target_price
    const { data } = await addWatchlistStock(payload)
    if (data.data === null) {
      message.warning(data.message)
    } else {
      message.success(data.message || '新增成功')
      addVisible.value = false
      fetchList()
    }
  } catch (e) {
    message.error(e.response?.data?.detail || '新增失败')
  } finally {
    submitting.value = false
  }
}

// 编辑
const editVisible = ref(false)
const editForm = reactive({ code: '', category: '', status: '', tagsStr: '', thesis: '', notes: '', target_price: null, forward_pe: null, analyst_target_mean: null, morningstar_fair_value: null, recommended_strategy: null })

function showEditModal(record) {
  Object.assign(editForm, {
    code: record.code,
    category: record.category || '',
    status: record.status || 'watching',
    tagsStr: (record.tags || []).join(', '),
    thesis: record.thesis || '',
    notes: record.notes || '',
    target_price: record.target_price,
    forward_pe: record.forward_pe,
    analyst_target_mean: record.analyst_target_mean,
    morningstar_fair_value: record.morningstar_fair_value,
    recommended_strategy: record.recommended_strategy || null,
  })
  editVisible.value = true
}

async function handleEdit() {
  submitting.value = true
  try {
    const payload = {}
    if (editForm.category) payload.category = editForm.category
    if (editForm.status) payload.status = editForm.status
    payload.tags = editForm.tagsStr ? editForm.tagsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
    if (editForm.thesis) payload.thesis = editForm.thesis
    payload.notes = editForm.notes
    payload.target_price = editForm.target_price
    payload.forward_pe = editForm.forward_pe
    payload.analyst_target_mean = editForm.analyst_target_mean
    payload.morningstar_fair_value = editForm.morningstar_fair_value
    payload.recommended_strategy = editForm.recommended_strategy || null
    await updateWatchlistStock(editForm.code, payload)
    message.success('更新成功')
    editVisible.value = false
    fetchList()
  } catch (e) {
    message.error(e.response?.data?.detail || '更新失败')
  } finally {
    submitting.value = false
  }
}

// 删除
async function handleDelete(code) {
  try {
    await deleteWatchlistStock(code)
    message.success('已删除')
    fetchList()
  } catch (e) {
    message.error('删除失败')
  }
}

// 刷新快照
function applySort() {
  if (sortBy.value === 'discount_desc') {
    list.value.sort((a, b) => (b.ms_discount_pct ?? -999) - (a.ms_discount_pct ?? -999))
  } else if (sortBy.value === 'discount_asc') {
    list.value.sort((a, b) => (a.ms_discount_pct ?? 999) - (b.ms_discount_pct ?? 999))
  }
}

async function handleRefreshAll() {
  refreshing.value = true
  try {
    const { data } = await refreshSnapshot()
    message.success(data.message || '刷新完成')
    fetchList()
  } catch (e) {
    message.error(e.response?.data?.detail || '刷新失败（需要 OpenD 连接）')
  } finally {
    refreshing.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.watchlist-manage {
  padding: 0;
}
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
