<template>
  <div class="stock-filter">
    <a-card title="条件选股" :bordered="false">
      <a-alert v-if="offlineMsg" :message="offlineMsg" type="warning" show-icon style="margin-bottom: 16px" />

      <!-- 筛选条件 -->
      <div class="filter-form">
        <a-space wrap>
          <a-select v-model:value="form.market" style="width: 100px">
            <a-select-option value="US">美股</a-select-option>
            <a-select-option value="HK">港股</a-select-option>
          </a-select>
          <a-input-number v-model:value="form.min_market_cap" placeholder="最小市值(亿$)" style="width: 150px" :min="0" />
          <a-input-number v-model:value="form.max_pe" placeholder="最大PE" style="width: 120px" :min="0" />
          <a-input-number v-model:value="form.min_price" placeholder="最低股价" style="width: 120px" :min="0" />
          <a-input v-model:value="form.sector" placeholder="行业板块" style="width: 140px" />
          <a-button type="primary" @click="handleSearch" :loading="loading">搜索</a-button>
        </a-space>
      </div>

      <!-- 结果表格 -->
      <a-table
        :columns="columns"
        :data-source="results"
        :loading="loading"
        row-key="code"
        :pagination="{ pageSize: 20 }"
        size="small"
        style="margin-top: 16px"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'market_cap'">
            {{ record.market_cap ? record.market_cap.toFixed(1) + '亿' : '-' }}
          </template>
          <template v-if="column.key === 'in_watchlist'">
            <a-tag v-if="record.in_watchlist" color="green">已关注</a-tag>
            <a @click="handleAddToWatchlist(record)" v-else>加入标的池</a>
          </template>
          <template v-if="column.key === 'action'">
            <a @click="handleViewInfo(record.code)">详情</a>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="infoVisible" title="个股信息" :footer="null" width="600px">
      <a-spin :spinning="infoLoading">
        <a-descriptions v-if="stockInfo" :column="2" bordered size="small">
          <a-descriptions-item label="代码">{{ stockInfo.code }}</a-descriptions-item>
          <a-descriptions-item label="名称">{{ stockInfo.name }}</a-descriptions-item>
          <a-descriptions-item label="市场">{{ stockInfo.market }}</a-descriptions-item>
          <a-descriptions-item label="行业">{{ stockInfo.sector }}</a-descriptions-item>
          <a-descriptions-item label="细分">{{ stockInfo.industry }}</a-descriptions-item>
          <a-descriptions-item label="上市日期">{{ stockInfo.listing_date }}</a-descriptions-item>
          <a-descriptions-item label="市值">{{ stockInfo.market_cap ? stockInfo.market_cap.toFixed(1) + '亿' : '-' }}</a-descriptions-item>
          <a-descriptions-item label="PE(TTM)">{{ stockInfo.trailing_pe ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="当前价">{{ stockInfo.current_price ?? '-' }}</a-descriptions-item>
        </a-descriptions>
        <a-empty v-if="!stockInfo && !infoLoading" description="暂无数据" />
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { stockFilterSearch, stockFilterInfo, addWatchlistStock } from '../api/trader'

const loading = ref(false)
const offlineMsg = ref('')
const results = ref([])
const form = reactive({ market: 'US', min_market_cap: null, max_pe: null, min_price: null, sector: '' })

const columns = [
  { title: '代码', dataIndex: 'code', key: 'code', width: 100 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '市值', key: 'market_cap', width: 100 },
  { title: 'PE(TTM)', dataIndex: 'trailing_pe', key: 'trailing_pe', width: 90 },
  { title: '当前价', dataIndex: 'current_price', key: 'current_price', width: 90 },
  { title: '标的池', key: 'in_watchlist', width: 100 },
  { title: '操作', key: 'action', width: 80 },
]

async function handleSearch() {
  loading.value = true
  offlineMsg.value = ''
  try {
    const params = { market: form.market }
    if (form.min_market_cap) params.min_market_cap = form.min_market_cap
    if (form.max_pe) params.max_pe = form.max_pe
    if (form.min_price) params.min_price = form.min_price
    if (form.sector) params.sector = form.sector
    const { data } = await stockFilterSearch(params)
    if (data.data === null) {
      offlineMsg.value = data.message
      results.value = []
    } else {
      results.value = data.results || []
    }
  } catch (e) {
    message.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
const infoVisible = ref(false)
const infoLoading = ref(false)
const stockInfo = ref(null)

async function handleViewInfo(code) {
  infoVisible.value = true
  infoLoading.value = true
  stockInfo.value = null
  try {
    const { data } = await stockFilterInfo(code)
    if (data.data === null) {
      message.warning(data.message)
    } else {
      stockInfo.value = data
    }
  } catch (e) {
    message.error('查询失败')
  } finally {
    infoLoading.value = false
  }
}

// 加入标的池
async function handleAddToWatchlist(record) {
  try {
    const { data } = await addWatchlistStock({ code: record.code })
    if (data.data === null) {
      message.warning(data.message)
    } else {
      message.success('已加入标的池')
      record.in_watchlist = true
    }
  } catch (e) {
    message.error(e.response?.data?.detail || '加入失败')
  }
}
</script>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}
</style>
