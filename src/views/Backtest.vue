<template>
  <div>
    <!-- 参数区 -->
    <a-card style="margin-bottom: 16px" size="small">
      <a-space wrap>
        <span style="color: #666">标的</span>
        <a-select
          v-model:value="code"
          placeholder="选择标的"
          style="width: 200px"
          show-search
          :loading="watchlistLoading"
          :options="watchlistOptions"
        />
        <span style="color: #666">策略</span>
        <a-select v-model:value="mode" style="width: 280px">
          <a-select-option value="trend">趋势跟踪：跌破均线卖出（推荐）</a-select-option>
          <a-select-option value="hold">买入并持有固定天数</a-select-option>
          <a-select-option value="swing">波段操作：评分下降卖出</a-select-option>
        </a-select>
        <span style="color: #666">买入阈值</span>
        <a-input-number v-model:value="threshold" :min="1" :max="100" style="width: 80px" />
        <template v-if="mode === 'hold'">
          <span style="color: #666">持仓天数</span>
          <a-input-number v-model:value="holdingDays" :min="1" :max="250" style="width: 80px" />
        </template>
        <template v-if="mode === 'swing'">
          <span style="color: #666">退出阈值</span>
          <a-input-number v-model:value="exitThreshold" :min="1" :max="100" style="width: 80px" />
          <span style="color: #666">最大持仓天数</span>
          <a-input-number v-model:value="maxHoldingDays" :min="1" :max="365" style="width: 80px" />
        </template>
        <template v-if="mode === 'trend'">
          <span style="color: #666">跟随均线</span>
          <a-select v-model:value="trailMa" style="width: 100px">
            <a-select-option value="ma5">MA5</a-select-option>
            <a-select-option value="ma10">MA10</a-select-option>
            <a-select-option value="ma20">MA20</a-select-option>
          </a-select>
          <span style="color: #666">入场确认</span>
          <a-select v-model:value="trailEntryConfirm" style="width: 130px">
            <a-select-option value="none">无</a-select-option>
            <a-select-option value="above_ma5">站上MA5</a-select-option>
          </a-select>
        </template>
        <span style="color: #666">日期范围</span>
        <a-range-picker v-model:value="dateRange" style="width: 240px" />
        <a-button type="primary" :loading="loading" @click="runBacktest">开始回测</a-button>
      </a-space>
    </a-card>

    <!-- 统计概览 -->
    <a-card title="回测统计" :bordered="false" :loading="loading" style="margin-bottom: 16px">
      <a-alert v-if="errorMsg" :message="errorMsg" type="warning" show-icon style="margin-bottom: 16px" />
      <template v-if="summary">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="总信号数" :value="summary.total_signals" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="完成交易" :value="summary.completed_trades" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="胜率" :value="summary.win_rate" suffix="%" :value-style="{ color: summary.win_rate >= 50 ? '#2e7d32' : '#c62828' }" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="平均收益" :value="summary.avg_return_pct" suffix="%" :precision="2" :value-style="{ color: summary.avg_return_pct >= 0 ? '#2e7d32' : '#c62828' }" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="累计收益" :value="summary.total_return_pct" suffix="%" :precision="1" :value-style="{ color: summary.total_return_pct >= 0 ? '#2e7d32' : '#c62828' }" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="利润因子" :value="summary.profit_factor" :precision="1" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="最大收益" :value="summary.max_return_pct" suffix="%" :precision="2" :value-style="{ color: '#2e7d32' }" />
          </a-col>
          <a-col :xs="12" :md="6" :lg="4">
            <a-statistic title="最大亏损" :value="summary.min_return_pct" suffix="%" :precision="2" :value-style="{ color: '#c62828' }" />
          </a-col>
          <a-col v-if="summary.avg_holding_days != null" :xs="12" :md="6" :lg="4">
            <a-statistic title="平均持仓天数" :value="summary.avg_holding_days" :precision="1" suffix="天" />
          </a-col>
        </a-row>
      </template>
      <a-empty v-else-if="!loading && !errorMsg" description="选择标的后点击「开始回测」" />
    </a-card>

    <!-- 交易明细 -->
    <a-card v-show="trades.length" title="交易明细" :bordered="false">
      <a-table
        :columns="columns"
        :data-source="trades"
        row-key="_key"
        :pagination="{ pageSize: 20, showTotal: (total) => `共 ${total} 笔` }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'return_pct'">
            <span :style="{ color: record.return_pct >= 0 ? '#2e7d32' : '#c62828', fontWeight: 600 }">
              {{ record.return_pct >= 0 ? '+' : '' }}{{ record.return_pct.toFixed(2) }}%
            </span>
          </template>
          <template v-if="column.key === 'exit_reason'">
            <a-tag v-if="record.exit_reason" :color="record.exit_reason === 'incomplete' ? 'default' : 'blue'">
              {{ EXIT_REASON_LABELS[record.exit_reason] || record.exit_reason }}
            </a-tag>
          </template>
          <template v-if="column.key === 'signal'">
            <a-tag :color="signalColor(record.signal)">{{ signalLabel(record.signal) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getWatchlist, getBacktestRun } from '../api/trader'

const code = ref(undefined)
const mode = ref('trend')
const threshold = ref(40)
const holdingDays = ref(10)
const exitThreshold = ref(30)
const maxHoldingDays = ref(120)
const trailMa = ref('ma5')
const trailEntryConfirm = ref('none')
const dateRange = ref(null)
const watchlistLoading = ref(false)
const watchlistOptions = ref([])
const loading = ref(false)
const summary = ref(null)
const trades = ref([])
const errorMsg = ref('')

const columns = [
  { title: '信号日期', dataIndex: 'signal_date', key: 'signal_date', width: 110 },
  { title: '入场价', dataIndex: 'entry_price', key: 'entry_price', width: 90 },
  { title: '退出日期', dataIndex: 'exit_date', key: 'exit_date', width: 110 },
  { title: '退出价', dataIndex: 'exit_price', key: 'exit_price', width: 90 },
  { title: '收益率', key: 'return_pct', width: 100 },
  { title: '持仓天数', dataIndex: 'holding_days', key: 'holding_days', width: 80 },
  { title: '退出原因', key: 'exit_reason', width: 100 },
  { title: '信号', key: 'signal', width: 90 },
]

const EXIT_REASON_LABELS = {
  hold: '持有到期',
  score_drop: '评分下降',
  max_holding: '达最大天数',
  incomplete: '未完成',
  below_ma5: '跌破MA5',
  below_ma10: '跌破MA10',
  below_ma20: '跌破MA20',
}

function signalColor(signal) {
  if (signal === 'STRONG_BUY') return 'green'
  if (signal === 'BUY') return 'lime'
  return 'default'
}

function signalLabel(signal) {
  const labels = { STRONG_BUY: '强烈买入', BUY: '建议买入', NO_ACTION: '观望' }
  return labels[signal] || signal
}

async function runBacktest() {
  if (!code.value) {
    message.warning('请先选择标的')
    return
  }
  loading.value = true
  summary.value = null
  trades.value = []
  errorMsg.value = ''
  try {
    const params = {
      code: code.value,
      mode: mode.value,
      threshold: threshold.value,
    }
    if (mode.value === 'hold') {
      params.holding_days = holdingDays.value
    } else if (mode.value === 'swing') {
      params.exit_threshold = exitThreshold.value
      params.max_holding_days = maxHoldingDays.value
    } else if (mode.value === 'trend') {
      params.trail_ma = trailMa.value
      params.max_holding_days = maxHoldingDays.value
      if (trailEntryConfirm.value !== 'none') {
        params.entry_confirm = trailEntryConfirm.value
      }
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0].format('YYYY-MM-DD')
      params.end_date = dateRange.value[1].format('YYYY-MM-DD')
    }
    const { data } = await getBacktestRun(params)
    if (data.data === null) {
      errorMsg.value = data.message
    } else {
      summary.value = data.summary
      trades.value = (data.trades || [])
        .filter((t) => t.status !== 'incomplete')
        .map((t, i) => ({ ...t, _key: i }))
    }
  } catch {
    message.error('回测请求失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  watchlistLoading.value = true
  try {
    const res = await getWatchlist()
    const list = (res.data.watchlist || []).filter((item) => item.has_data)
    watchlistOptions.value = list.map((item) => ({
      label: `${item.ticker} - ${item.name}`,
      value: item.code,
    }))
  } catch {
    message.error('获取标的列表失败')
  } finally {
    watchlistLoading.value = false
  }
})
</script>
