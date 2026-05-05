<template>
  <div>
    <!-- 日期选择 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a-space>
        <span style="color: #666">日期</span>
        <a-date-picker
          v-model:value="selectedDate"
          placeholder="最新"
          :allow-clear="true"
          style="width: 140px"
          @change="loadData"
        />
        <template v-if="overview">
          <a-tag>共 {{ overview.total_count }} 只标的</a-tag>
          <a-tag color="green">强买 {{ overview.summary.strong_buy_count }}</a-tag>
          <a-tag color="lime">买入 {{ overview.summary.buy_count }}</a-tag>
          <a-tag>观望 {{ overview.summary.no_action_count }}</a-tag>
        </template>
      </a-space>
    </a-card>

    <a-spin :spinning="loading">
      <template v-if="overview">
        <!-- STRONG_BUY -->
        <a-card
          v-if="overview.strong_buy.length > 0"
          title="强烈买入 (≥90)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #52c41a"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.strong_buy" :key="item.code" :xs="12" :md="6">
              <div class="stock-card strong-buy" @click="goDetail(item)">
                <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                <div class="stock-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- BUY -->
        <a-card
          v-if="overview.buy.length > 0"
          title="建议买入 (70~89)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #faad14"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.buy" :key="item.code" :xs="12" :md="6">
              <div class="stock-card buy" @click="goDetail(item)">
                <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                <div class="stock-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- NO_ACTION -->
        <a-card
          title="观望 (<70)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #999"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.no_action" :key="item.code" :xs="12" :md="6">
              <div class="stock-card no-action" @click="goDetail(item)">
                <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                <div class="stock-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </template>

      <a-empty v-else-if="!loading" :description="emptyMessage" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScoresOverview } from '../api/trader'

const router = useRouter()
const selectedDate = ref(null)
const loading = ref(true)
const overview = ref(null)
const emptyMessage = ref('暂无评分数据')

async function loadData() {
  loading.value = true
  overview.value = null
  try {
    const dateStr = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const res = await getScoresOverview(dateStr)
    const d = res.data
    if (d && d.data === null) {
      overview.value = null
      emptyMessage.value = d.message || '暂无评分数据'
    } else {
      overview.value = d
    }
  } catch {
    overview.value = null
    emptyMessage.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

function goDetail(item) {
  router.push({
    name: 'dashboard',
    query: { code: item.code, date: item.date },
  })
}

onMounted(loadData)
</script>

<style scoped>
.stock-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.stock-card:hover {
  background: #f5f5f5;
}

.stock-card.strong-buy {
  border: 1px solid #52c41a;
}

.stock-card.buy {
  border: 1px solid #faad14;
}

.stock-card.no-action {
  border: 1px solid #d9d9d9;
}

.stock-code {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.stock-score {
  font-weight: 700;
  font-size: 16px;
}

.strong-buy .stock-score {
  color: #389e0d;
}

.buy .stock-score {
  color: #d48806;
}

.no-action .stock-score {
  color: #999;
}
</style>
