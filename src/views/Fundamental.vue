<template>
  <div class="fundamental-page">
    <!-- 速览模式 -->
    <a-card title="基本面速览" :bordered="false" :loading="overviewLoading" style="margin-bottom: 16px">
      <template #extra>
        <span v-if="overview" style="color: #999; font-size: 12px">数据日期: {{ overview.date }}</span>
      </template>

      <a-alert v-if="overviewMsg" :message="overviewMsg" type="warning" show-icon style="margin-bottom: 16px" />

      <template v-if="overview">
        <!-- 统计卡片 -->
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :xs="12" :md="6">
            <a-statistic title="低估" :value="overview.summary.undervalued_count" :value-style="{ color: '#2e7d32' }" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="合理" :value="overview.summary.fair_count" :value-style="{ color: '#757575' }" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="高估" :value="overview.summary.overvalued_count" :value-style="{ color: '#c62828' }" />
          </a-col>
          <a-col :xs="12" :md="6">
            <a-statistic title="跳过(ETF)" :value="overview.summary.skipped_count" :value-style="{ color: '#999' }" />
          </a-col>
        </a-row>

        <!-- 低估标的 -->
        <div v-if="overview.undervalued.length" class="signal-section">
          <h4 class="section-title undervalued">低估 (UNDERVALUED)</h4>
          <a-table
            :columns="overviewColumns"
            :data-source="overview.undervalued"
            row-key="code"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <a @click="loadDetail(record.code)">{{ record.code }}</a>
              </template>
              <template v-if="column.key === 'fundamental_score'">
                <span style="font-weight: 600; color: #2e7d32">{{ record.fundamental_score.toFixed(1) }}</span>
              </template>
              <template v-if="column.key === 'target_upside'">
                <span :style="{ color: record.target_upside > 0 ? '#2e7d32' : '#c62828' }">
                  {{ (record.target_upside * 100).toFixed(1) }}%
                </span>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 合理标的 -->
        <div v-if="overview.fair.length" class="signal-section">
          <h4 class="section-title fair">合理 (FAIR)</h4>
          <a-table
            :columns="overviewColumns"
            :data-source="overview.fair"
            row-key="code"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <a @click="loadDetail(record.code)">{{ record.code }}</a>
              </template>
              <template v-if="column.key === 'fundamental_score'">
                <span style="font-weight: 600; color: #757575">{{ record.fundamental_score.toFixed(1) }}</span>
              </template>
              <template v-if="column.key === 'target_upside'">
                <span :style="{ color: record.target_upside > 0 ? '#2e7d32' : '#c62828' }">
                  {{ (record.target_upside * 100).toFixed(1) }}%
                </span>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 高估标的 -->
        <div v-if="overview.overvalued.length" class="signal-section">
          <h4 class="section-title overvalued">高估 (OVERVALUED)</h4>
          <a-table
            :columns="overviewColumns"
            :data-source="overview.overvalued"
            row-key="code"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <a @click="loadDetail(record.code)">{{ record.code }}</a>
              </template>
              <template v-if="column.key === 'fundamental_score'">
                <span style="font-weight: 600; color: #c62828">{{ record.fundamental_score.toFixed(1) }}</span>
              </template>
              <template v-if="column.key === 'target_upside'">
                <span :style="{ color: record.target_upside > 0 ? '#2e7d32' : '#c62828' }">
                  {{ (record.target_upside * 100).toFixed(1) }}%
                </span>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </a-card>

    <!-- 单只详情弹窗 -->
    <a-modal v-model:open="detailVisible" :title="`基本面分析 — ${detailCode}`" :footer="null" width="720px">
      <a-spin :spinning="detailLoading">
        <a-alert v-if="detailMsg" :message="detailMsg" type="warning" show-icon style="margin-bottom: 16px" />

        <template v-if="detail">
          <!-- 评分概览 -->
          <div class="score-header">
            <a-statistic
              title="基本面评分"
              :value="detail.score.fundamental_score"
              :precision="1"
              :value-style="{ color: signalColor(detail.score.valuation_signal) }"
              suffix="/ 100"
            />
            <a-tag :color="signalColor(detail.score.valuation_signal)" style="margin-left: 16px; font-size: 14px">
              {{ signalLabel(detail.score.valuation_signal) }}
            </a-tag>
          </div>

          <!-- 5因子分解 -->
          <div style="margin: 24px 0">
            <div v-for="(item, key) in detail.score.breakdown" :key="key" class="factor-row">
              <span class="factor-label">{{ factorLabels[key] || key }}</span>
              <a-progress
                :percent="item.ratio !== null ? item.ratio * 100 : 0"
                :stroke-color="getRatioColor(item.ratio)"
                :show-info="false"
                style="flex: 1; margin: 0 12px"
              />
              <span class="factor-score">{{ item.score.toFixed(1) }}</span>
            </div>
          </div>

          <!-- 数据明细 -->
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-descriptions title="估值" :column="1" bordered size="small">
                <a-descriptions-item label="Forward PE">{{ fmt(detail.valuation.forward_pe) }}</a-descriptions-item>
                <a-descriptions-item label="Trailing PE">{{ fmt(detail.valuation.trailing_pe) }}</a-descriptions-item>
                <a-descriptions-item label="PEG">{{ fmt(detail.valuation.peg_ratio) }}</a-descriptions-item>
                <a-descriptions-item label="P/B">{{ fmt(detail.valuation.price_to_book) }}</a-descriptions-item>
                <a-descriptions-item label="EV/EBITDA">{{ fmt(detail.valuation.ev_to_ebitda) }}</a-descriptions-item>
              </a-descriptions>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-descriptions title="分析师" :column="1" bordered size="small">
                <a-descriptions-item label="目标价(均)">{{ fmt(detail.analyst.target_mean) }}</a-descriptions-item>
                <a-descriptions-item label="目标价(中)">{{ fmt(detail.analyst.target_median) }}</a-descriptions-item>
                <a-descriptions-item label="目标价区间">{{ fmt(detail.analyst.target_low) }} ~ {{ fmt(detail.analyst.target_high) }}</a-descriptions-item>
                <a-descriptions-item label="覆盖人数">{{ detail.analyst.analyst_count ?? '-' }}</a-descriptions-item>
                <a-descriptions-item label="推荐">
                  <a-tag>{{ detail.analyst.recommendation || '-' }}</a-tag>
                </a-descriptions-item>
              </a-descriptions>
            </a-col>
          </a-row>

          <a-row :gutter="16" style="margin-top: 16px">
            <a-col :xs="24" :md="12">
              <a-descriptions title="成长性" :column="1" bordered size="small">
                <a-descriptions-item label="营收增速">{{ pct(detail.growth.revenue_growth) }}</a-descriptions-item>
                <a-descriptions-item label="盈利增速">{{ pct(detail.growth.earnings_growth) }}</a-descriptions-item>
              </a-descriptions>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-descriptions title="财务健康" :column="1" bordered size="small">
                <a-descriptions-item label="ROE">{{ pct(detail.financial_health.roe) }}</a-descriptions-item>
                <a-descriptions-item label="净利润率">{{ pct(detail.financial_health.profit_margin) }}</a-descriptions-item>
                <a-descriptions-item label="毛利率">{{ pct(detail.financial_health.gross_margin) }}</a-descriptions-item>
                <a-descriptions-item label="负债/权益">{{ fmt(detail.financial_health.debt_to_equity) }}</a-descriptions-item>
                <a-descriptions-item label="流动比率">{{ fmt(detail.financial_health.current_ratio) }}</a-descriptions-item>
              </a-descriptions>
            </a-col>
          </a-row>

          <div style="margin-top: 12px; color: #999; font-size: 12px">
            当前价: {{ detail.current_price }} | 更新时间: {{ detail.updated_at }}
          </div>
        </template>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getFundamentalOverview, getFundamentalLatest } from '../api/trader'

// 速览
const overviewLoading = ref(false)
const overview = ref(null)
const overviewMsg = ref('')

const overviewColumns = [
  { title: '代码', key: 'code', width: 100 },
  { title: '评分', key: 'fundamental_score', width: 80 },
  { title: 'Forward PE', dataIndex: 'forward_pe', width: 100 },
  { title: '目标价空间', key: 'target_upside', width: 110 },
  { title: '推荐', dataIndex: 'recommendation', width: 80 },
]

async function fetchOverview() {
  overviewLoading.value = true
  overviewMsg.value = ''
  try {
    const { data } = await getFundamentalOverview()
    if (data.data === null) {
      overviewMsg.value = data.message
    } else {
      overview.value = data
    }
  } catch {
    message.error('加载基本面速览失败')
  } finally {
    overviewLoading.value = false
  }
}

// 详情
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailCode = ref('')
const detail = ref(null)
const detailMsg = ref('')

async function loadDetail(code) {
  detailCode.value = code
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  detailMsg.value = ''
  try {
    const { data } = await getFundamentalLatest(code)
    if (data.data === null) {
      detailMsg.value = data.message
    } else {
      detail.value = data
    }
  } catch {
    message.error('加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 工具函数
const factorLabels = {
  valuation_discount: '估值折价',
  pe_reasonability: 'PE 合理性',
  growth: '成长性',
  financial_health: '财务健康',
  analyst_consensus: '分析师共识',
}

function signalColor(signal) {
  return { UNDERVALUED: '#2e7d32', FAIR: '#757575', OVERVALUED: '#c62828' }[signal] || '#999'
}

function signalLabel(signal) {
  return { UNDERVALUED: '低估', FAIR: '合理', OVERVALUED: '高估' }[signal] || signal
}

function getRatioColor(ratio) {
  if (ratio === null) return '#e0e0e0'
  if (ratio >= 0.7) return '#2e7d32'
  if (ratio >= 0.4) return '#ff9800'
  return '#bdbdbd'
}

function fmt(val) {
  return val != null ? Number(val).toFixed(2) : '-'
}

function pct(val) {
  return val != null ? (val * 100).toFixed(1) + '%' : '-'
}

onMounted(fetchOverview)
</script>

<style scoped>
.score-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.signal-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid;
}

.section-title.undervalued { border-color: #2e7d32; color: #2e7d32; }
.section-title.fair { border-color: #757575; color: #757575; }
.section-title.overvalued { border-color: #c62828; color: #c62828; }

.factor-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.factor-label {
  width: 100px;
  font-size: 13px;
  color: #333;
}

.factor-score {
  width: 40px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
  color: #666;
}
</style>
