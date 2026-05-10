<template>
  <div>
    <!-- 状态概览 -->
    <a-card title="网格交易状态" :bordered="false" :loading="statusLoading" style="margin-bottom: 16px">
      <template #extra>
        <a-button size="small" @click="refresh">刷新</a-button>
      </template>

      <a-alert v-if="errorMsg" :message="errorMsg" type="warning" show-icon style="margin-bottom: 16px" />

      <template v-if="grid">
        <!-- 基本信息 -->
        <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
          <a-col :xs="12" :md="6">
            <a-statistic title="标的" :value="grid.code" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="运行状态">
              <template #formatter>
                <a-tag :color="statusColor">{{ statusLabel }}</a-tag>
              </template>
            </a-statistic>
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="环境">
              <template #formatter>
                <a-tag :color="grid.env === 'live' ? 'red' : 'blue'">{{ grid.env === 'live' ? '实盘' : '模拟' }}</a-tag>
              </template>
            </a-statistic>
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="最新价" :value="grid.state.last_price" :precision="2" prefix="$" />
          </a-col>
        </a-row>

        <!-- 网格参数 -->
        <a-descriptions title="网格参数" :column="{ xs: 2, md: 3, lg: 6 }" bordered size="small" style="margin-bottom: 20px">
          <a-descriptions-item label="价格上限">${{ grid.params.price_upper }}</a-descriptions-item>
          <a-descriptions-item label="价格下限">${{ grid.params.price_lower }}</a-descriptions-item>
          <a-descriptions-item label="网格数量">{{ grid.params.grid_count }}</a-descriptions-item>
          <a-descriptions-item label="网格间距">${{ grid.params.grid_spacing }}</a-descriptions-item>
          <a-descriptions-item label="每格数量">{{ grid.params.order_qty }} 股</a-descriptions-item>
          <a-descriptions-item label="最大持仓">{{ grid.params.max_position }} 股</a-descriptions-item>
        </a-descriptions>

        <!-- 实时状态 -->
        <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
          <a-col :xs="12" :md="6">
            <a-statistic title="当前持仓" :value="grid.state.current_position" suffix="股" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="持仓成本" :value="grid.state.cost_basis" :precision="2" prefix="$" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic
              title="当日盈亏"
              :value="grid.state.daily_pnl"
              :precision="2"
              prefix="$"
              :value-style="{ color: grid.state.daily_pnl >= 0 ? '#2e7d32' : '#c62828' }"
            />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="当日交易次数" :value="grid.state.daily_trades" />
          </a-col>
        </a-row>

        <!-- 网格线可视化 -->
        <div v-if="grid.grid_lines && grid.grid_lines.length" class="grid-lines-section">
          <h4 style="margin-bottom: 12px; color: #333">网格线分布</h4>
          <div class="grid-lines-bar">
            <div
              v-for="(line, idx) in grid.grid_lines"
              :key="idx"
              class="grid-line-mark"
              :style="{ left: getLinePosition(line) + '%' }"
              :class="{ 'at-price': isNearPrice(line) }"
            >
              <span class="grid-line-label">{{ line }}</span>
            </div>
            <div
              v-if="grid.state.last_price"
              class="current-price-mark"
              :style="{ left: getLinePosition(grid.state.last_price) + '%' }"
            >
              <span class="price-label">{{ grid.state.last_price }}</span>
            </div>
          </div>
        </div>
      </template>

      <a-empty v-else-if="!statusLoading && !errorMsg" description="暂无网格配置数据" />
    </a-card>

    <!-- 交易记录 -->
    <a-card title="交易记录" :bordered="false" :loading="ordersLoading">
      <a-table
        v-if="orders.length"
        :columns="orderColumns"
        :data-source="orders"
        row-key="id"
        :pagination="{ pageSize: 20 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'side'">
            <a-tag :color="record.side === 'buy' ? 'green' : 'red'">{{ record.side === 'buy' ? '买入' : '卖出' }}</a-tag>
          </template>
          <template v-if="column.key === 'pnl'">
            <span v-if="record.pnl != null" :style="{ color: record.pnl >= 0 ? '#2e7d32' : '#c62828', fontWeight: 600 }">
              {{ record.pnl >= 0 ? '+' : '' }}{{ record.pnl.toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
      <a-empty v-else-if="!ordersLoading" description="暂无交易记录" />
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getGridStatus, getGridOrders } from '../api/trader'

const configId = 1
const statusLoading = ref(false)
const ordersLoading = ref(false)
const grid = ref(null)
const orders = ref([])
const errorMsg = ref('')

const statusColor = computed(() => {
  if (!grid.value) return 'default'
  const s = grid.value.status
  if (s === 'running') return 'green'
  if (s === 'stopped') return 'default'
  if (s === 'error') return 'red'
  return 'blue'
})

const statusLabel = computed(() => {
  if (!grid.value) return ''
  const labels = { running: '运行中', stopped: '已停止', error: '异常', paused: '暂停' }
  return labels[grid.value.status] || grid.value.status
})

function getLinePosition(price) {
  if (!grid.value || !grid.value.grid_lines.length) return 0
  const lines = grid.value.grid_lines
  const min = lines[0]
  const max = lines[lines.length - 1]
  if (max === min) return 50
  return ((price - min) / (max - min)) * 100
}

function isNearPrice(line) {
  if (!grid.value?.state?.last_price) return false
  return Math.abs(line - grid.value.state.last_price) < grid.value.params.grid_spacing * 0.5
}

const orderColumns = [
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 160 },
  { title: '方向', key: 'side', width: 70 },
  { title: '价格', dataIndex: 'price', key: 'price', width: 90 },
  { title: '数量', dataIndex: 'qty', key: 'qty', width: 70 },
  { title: '网格线', dataIndex: 'grid_line', key: 'grid_line', width: 90 },
  { title: '盈亏', key: 'pnl', width: 90 },
]

async function fetchStatus() {
  statusLoading.value = true
  errorMsg.value = ''
  try {
    const { data } = await getGridStatus(configId)
    if (data.data === null) {
      errorMsg.value = data.message
    } else {
      grid.value = data
    }
  } catch {
    message.error('获取网格状态失败')
  } finally {
    statusLoading.value = false
  }
}

async function fetchOrders() {
  ordersLoading.value = true
  try {
    const { data } = await getGridOrders(configId)
    orders.value = data.orders || []
  } catch {
    message.error('获取交易记录失败')
  } finally {
    ordersLoading.value = false
  }
}

function refresh() {
  fetchStatus()
  fetchOrders()
}

onMounted(refresh)
</script>

<style scoped>
.grid-lines-section {
  margin-top: 16px;
}

.grid-lines-bar {
  position: relative;
  height: 40px;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 8px 0;
}

.grid-line-mark {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background: #d9d9d9;
}

.grid-line-mark.at-price {
  background: #1890ff;
  width: 2px;
}

.grid-line-label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #999;
  white-space: nowrap;
}

.current-price-mark {
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background: #ff4d4f;
}

.price-label {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #ff4d4f;
  font-weight: 600;
  white-space: nowrap;
}
</style>
