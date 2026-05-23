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
          <a-tag color="volcano">主升浪龙头 {{ leaders.length }} 只</a-tag>
          <a-tag color="orange">可执行 {{ leaders.filter(i => i.above_ma5).length }} 只</a-tag>
        </template>
      </a-space>
    </a-card>

    <a-spin :spinning="loading">
      <template v-if="overview">
        <a-card
          v-if="leaders.length > 0"
          title="主升浪龙头（动量评分≥70）"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #f5222d"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in leaders" :key="item.code" :xs="12" :md="8">
              <div class="stock-card momentum" @click="goDetail(item)">
                <div class="stock-left">
                  <div class="stock-code">{{ item.code.replace('US.', '').replace('HK.', '') }}</div>
                  <div class="stock-meta">
                    <span class="momentum-badge">动量 {{ item.momentum_score }}</span>
                    <span v-if="item.above_ma5" class="ma5-tag confirmed">MA5上</span>
                    <span v-else class="ma5-tag below">MA5下</span>
                  </div>
                </div>
                <div class="stock-score momentum-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

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

.stock-card.momentum {
  border: 1px solid #f5222d;
  background: #fff1f0;
}

.stock-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-code {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.stock-meta {
  display: flex;
  gap: 6px;
}

.momentum-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  color: #cf1322;
  background: #fff1f0;
  border: 1px solid #ffa39e;
}

.ma5-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}

.ma5-tag.confirmed {
  color: #389e0d;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.ma5-tag.below {
  color: #999;
  background: #fafafa;
  border: 1px solid #e8e8e8;
}

.stock-score {
  font-weight: 700;
  font-size: 16px;
}

.momentum-score {
  color: #cf1322;
}
</style>
