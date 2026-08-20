<template>
  <div>
    <!-- 工具栏 -->
    <div class="card toolbar" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <div class="review-tabs">
          <span
            class="review-tab"
            :class="{ active: reviewType === 'daily' }"
            @click="switchType('daily')"
          >日复盘</span>
          <span
            class="review-tab"
            :class="{ active: reviewType === 'weekly' }"
            @click="switchType('weekly')"
          >周复盘</span>
        </div>
        <a-button size="small" @click="loadReview" :loading="loading">刷新</a-button>
      </div>
      <div class="toolbar-stats" v-if="review">
        <span class="stat-chip gray">复盘日期 {{ review.date }}</span>
        <span class="stat-chip green" v-if="review.picks?.length">交易机会 {{ review.picks.length }} 只</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="review">
        <!-- 大盘概览 -->
        <div class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">一、大盘概览</span>
          </div>
          <div class="asset-grid">
            <div v-for="a in review.macro" :key="a.code" class="asset-card">
              <div class="asset-top">
                <span class="asset-label">{{ a.label }}</span>
                <span class="asset-ticker mono">{{ a.code.split('.')[1] }}</span>
              </div>
              <div class="asset-close mono">${{ a.close }}</div>
              <div class="asset-meta">
                <span class="change" :class="a.change_pct >= 0 ? 'up' : 'down'">
                  {{ a.change_pct >= 0 ? '+' : '' }}{{ a.change_pct }}%
                </span>
                <span class="trend" :class="a.trend === '多头' ? 'up' : (a.trend === '空头' ? 'down' : '')">
                  {{ a.trend }}{{ a.trend === '多头' ? '↑' : (a.trend === '空头' ? '↓' : '→') }}
                </span>
                <span class="rsi mono">RSI {{ a.rsi }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 七姐妹 -->
        <div class="card section" style="margin-bottom: 16px">
          <div class="section-header">
            <span class="section-title">二、七姐妹</span>
          </div>
          <div class="asset-grid seven">
            <div v-for="a in review.mag7" :key="a.code" class="asset-card">
              <div class="asset-top">
                <span class="asset-label">{{ a.label }}</span>
                <span class="asset-ticker mono">{{ a.code.split('.')[1] }}</span>
              </div>
              <div class="asset-close mono">${{ a.close }}</div>
              <div class="asset-meta">
                <span class="change" :class="a.change_pct >= 0 ? 'up' : 'down'">
                  {{ a.change_pct >= 0 ? '+' : '' }}{{ a.change_pct }}%
                </span>
                <span class="trend" :class="a.trend === '多头' ? 'up' : (a.trend === '空头' ? 'down' : '')">
                  {{ a.trend }}{{ a.trend === '多头' ? '↑' : (a.trend === '空头' ? '↓' : '→') }}
                </span>
                <span class="rsi mono">RSI {{ a.rsi }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易机会 -->
        <div class="card section" style="margin-bottom: 16px" v-if="review.picks?.length">
          <div class="section-header">
            <span class="section-title">三、交易机会</span>
          </div>
          <div class="pick-list">
            <div v-for="p in review.picks" :key="p.code" class="pick-row">
              <span class="pick-ticker mono">{{ p.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="score-pill" :class="p.score >= 80 ? 'high' : 'mid'">{{ p.score }}</span>
              <span class="pick-discount mono up">折价 {{ p.discount_pct }}%</span>
              <span class="pick-signal">{{ p.signal }}</span>
            </div>
          </div>
        </div>

        <!-- 完整文案 -->
        <div class="card section">
          <div class="section-header">
            <span class="section-title">完整复盘文案</span>
            <a-button type="primary" size="small" @click="copyBody">{{ copied ? '已复制 ✓' : '复制全文' }}</a-button>
          </div>
          <a-textarea
            v-model:value="body"
            class="review-body"
            :auto-size="{ minRows: 20, maxRows: 40 }"
          />
          <div class="review-hint">文案可编辑微调，改完再复制</div>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="暂无复盘数据" style="padding: 60px 0" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getReview } from '../api/trader'

const reviewType = ref('daily')
const review = ref(null)
const body = ref('')
const loading = ref(false)
const copied = ref(false)

async function loadReview() {
  loading.value = true
  try {
    const res = await getReview(reviewType.value)
    review.value = res.data
    body.value = res.data?.body || ''
  } catch (e) {
    message.error('加载复盘失败：' + (e.response?.data?.message || e.message))
  } finally {
    loading.value = false
  }
}

function switchType(type) {
  if (reviewType.value === type) return
  reviewType.value = type
  loadReview()
}

async function copyBody() {
  try {
    await navigator.clipboard.writeText(body.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

onMounted(loadReview)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toolbar-stats {
  display: flex;
  gap: 8px;
}
.stat-chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}
.stat-chip.green { color: var(--green); background: var(--green-bg); }
.stat-chip.gray { color: var(--text-secondary); background: var(--bg-hover); }

.review-tabs {
  display: flex;
  gap: 4px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 2px;
}
.review-tab {
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}
.review-tab.active {
  background: var(--text);
  color: #fff;
}

.section {
  padding: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.asset-grid.seven {
  grid-template-columns: repeat(7, 1fr);
}
.asset-card {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 12px;
  transition: border-color 0.15s;
}
.asset-card:hover {
  border-color: var(--border);
}
.asset-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.asset-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.asset-ticker {
  font-size: 11px;
  color: var(--text-muted);
}
.asset-close {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}
.asset-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.change {
  font-weight: 600;
}
.trend {
  color: var(--text-secondary);
}
.rsi {
  color: var(--text-muted);
  margin-left: auto;
}

.pick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pick-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}
.pick-ticker {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  min-width: 60px;
}
.pick-discount {
  font-size: 12px;
}
.pick-signal {
  font-size: 12px;
  color: var(--text-secondary);
}

.review-body :deep(textarea) {
  font-size: 13px;
  line-height: 1.8;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.review-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .asset-grid.seven {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
