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
          <a-tag>共 {{ overview.total_count }} 只</a-tag>
          <a-tag color="green">强买 {{ overview.summary.strong_buy_count }}</a-tag>
          <a-tag color="lime">买入 {{ overview.summary.buy_count }}</a-tag>
          <a-tag color="orange">可执行 {{ overview.summary.actionable_count }}</a-tag>
          <a-tag color="volcano">主升浪 {{ overview.summary.momentum_leaders_count }}</a-tag>
          <a-tag>观望 {{ overview.summary.no_action_count }}</a-tag>
        </template>
      </a-space>
    </a-card>

    <a-spin :spinning="loading">
      <template v-if="overview">
        <!-- 可执行机会 -->
        <a-card
          v-if="overview.actionable && overview.actionable.length > 0"
          title="可执行机会（评分达标 + 站上MA5）"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #1890ff"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.actionable" :key="item.code" :xs="12" :md="6">
              <div class="stock-card actionable" @click="goDetail(item)">
                <div class="stock-left">
                  <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                  <div class="stock-meta">
                    <span class="ma5-tag confirmed">MA5确认</span>
                  </div>
                </div>
                <div class="stock-score actionable-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- 主升浪龙头 -->
        <a-card
          v-if="overview.momentum_leaders && overview.momentum_leaders.length > 0"
          title="主升浪龙头（动量评分≥70）"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #f5222d"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.momentum_leaders" :key="item.code" :xs="12" :md="6">
              <div class="stock-card momentum" @click="goDetail(item)">
                <div class="stock-left">
                  <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                  <div class="stock-meta">
                    <span class="momentum-badge">动量 {{ item.momentum_score }}</span>
                  </div>
                </div>
                <div class="stock-score momentum-score">{{ item.total_score.toFixed(1) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- STRONG_BUY -->
        <a-card
          v-if="overview.strong_buy.length > 0"
          title="强烈买入 (≥80)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #52c41a"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.strong_buy" :key="item.code" :xs="24" :md="12">
              <div class="stock-card-wrapper">
                <div class="stock-card strong-buy" @click="goDetail(item)">
                  <div class="stock-left">
                    <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                    <div class="stock-meta">
                      <span v-if="item.above_ma5" class="ma5-tag confirmed">MA5上</span>
                      <span v-else-if="item.above_ma5 === false" class="ma5-tag below">MA5下</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <div class="stock-score">{{ item.total_score.toFixed(1) }}</div>
                    <span class="tpsl-btn" @click="toggleTpSl(item, $event)">{{ expandedCode === item.code ? '收起' : '止盈损' }}</span>
                  </div>
                </div>
                <div v-if="expandedCode === item.code" class="tpsl-detail">
                  <a-spin v-if="tpslLoading && !tpslData[item.code]" size="small" />
                  <template v-else-if="tpslData[item.code] && !tpslData[item.code].error">
                    <span class="tpsl-item">止损 <b class="loss">{{ tpslData[item.code].stop_loss.price.toFixed(2) }}</b> ({{ (tpslData[item.code].stop_loss.distance_pct * 100).toFixed(1) }}%)</span>
                    <span class="tpsl-item">止盈 <b class="profit">{{ tpslData[item.code].take_profit.price.toFixed(2) }}</b></span>
                    <span class="tpsl-item">R:R <b>{{ tpslData[item.code].risk_reward_ratio.toFixed(1) }}</b></span>
                  </template>
                  <span v-else-if="tpslData[item.code]?.error" style="color: #999; font-size: 12px">{{ tpslData[item.code].error }}</span>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- BUY -->
        <a-card
          v-if="overview.buy.length > 0"
          title="建议买入 (60~79)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #faad14"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.buy" :key="item.code" :xs="24" :md="12">
              <div class="stock-card-wrapper">
                <div class="stock-card buy" @click="goDetail(item)">
                  <div class="stock-left">
                    <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                    <div class="stock-meta">
                      <span v-if="item.above_ma5" class="ma5-tag confirmed">MA5上</span>
                      <span v-else-if="item.above_ma5 === false" class="ma5-tag below">MA5下</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <div class="stock-score">{{ item.total_score.toFixed(1) }}</div>
                    <span class="tpsl-btn" @click="toggleTpSl(item, $event)">{{ expandedCode === item.code ? '收起' : '止盈损' }}</span>
                  </div>
                </div>
                <div v-if="expandedCode === item.code" class="tpsl-detail">
                  <a-spin v-if="tpslLoading && !tpslData[item.code]" size="small" />
                  <template v-else-if="tpslData[item.code] && !tpslData[item.code].error">
                    <span class="tpsl-item">止损 <b class="loss">{{ tpslData[item.code].stop_loss.price.toFixed(2) }}</b> ({{ (tpslData[item.code].stop_loss.distance_pct * 100).toFixed(1) }}%)</span>
                    <span class="tpsl-item">止盈 <b class="profit">{{ tpslData[item.code].take_profit.price.toFixed(2) }}</b></span>
                    <span class="tpsl-item">R:R <b>{{ tpslData[item.code].risk_reward_ratio.toFixed(1) }}</b></span>
                  </template>
                  <span v-else-if="tpslData[item.code]?.error" style="color: #999; font-size: 12px">{{ tpslData[item.code].error }}</span>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- NO_ACTION -->
        <a-card
          title="观望 (<60)"
          size="small"
          style="margin-bottom: 16px; border-left: 3px solid #999"
        >
          <a-row :gutter="[12, 12]">
            <a-col v-for="item in overview.no_action" :key="item.code" :xs="12" :md="6">
              <div class="stock-card no-action" @click="goDetail(item)">
                <div class="stock-left">
                  <div class="stock-code">{{ item.code.replace('US.', '') }}</div>
                  <div class="stock-meta">
                    <span v-if="item.momentum_score >= 70" class="momentum-badge">动量 {{ item.momentum_score }}</span>
                  </div>
                </div>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScoresOverview, getTpSl } from '../api/trader'

const router = useRouter()
const selectedDate = ref(null)
const loading = ref(true)
const overview = ref(null)
const emptyMessage = ref('暂无评分数据')

// 止盈止损展开
const expandedCode = ref(null)
const tpslLoading = ref(false)
const tpslData = reactive({})

async function toggleTpSl(item, event) {
  event.stopPropagation()
  const code = item.code
  if (expandedCode.value === code) {
    expandedCode.value = null
    return
  }
  expandedCode.value = code
  if (tpslData[code]) return
  tpslLoading.value = true
  try {
    const { data } = await getTpSl(code)
    if (data && data.data !== null) {
      tpslData[code] = data
    } else {
      tpslData[code] = { error: data?.message || '暂无数据' }
    }
  } catch {
    tpslData[code] = { error: '请求失败' }
  } finally {
    tpslLoading.value = false
  }
}

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

.stock-card.actionable {
  border: 1px solid #1890ff;
  background: #e6f7ff;
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

.momentum-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  color: #cf1322;
  background: #fff1f0;
  border: 1px solid #ffa39e;
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

.actionable-score {
  color: #1890ff;
}

.momentum-score {
  color: #cf1322;
}

.stock-card-wrapper {
  border-radius: 6px;
  overflow: hidden;
}

.tpsl-btn {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  color: #1890ff;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  cursor: pointer;
  white-space: nowrap;
}

.tpsl-btn:hover {
  background: #bae7ff;
}

.tpsl-detail {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 14px;
  background: #fafafa;
  border-top: 1px dashed #e8e8e8;
  font-size: 12px;
}

.tpsl-item b.loss {
  color: #cf1322;
}

.tpsl-item b.profit {
  color: #389e0d;
}
</style>
