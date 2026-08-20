<template>
  <div>
    <!-- 工具栏 -->
    <div class="card toolbar" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <span class="toolbar-label">日期</span>
        <a-date-picker
          v-model:value="selectedDate"
          placeholder="最新"
          :allow-clear="true"
          style="width: 140px"
        />
        <a-button type="primary" size="small" @click="loadPicks" :loading="loading">查询</a-button>
      </div>
      <div class="toolbar-stats" v-if="picks.length">
        <span class="stat-chip green">今日优选 {{ picks.length }} 只</span>
        <span class="stat-chip gray">点击左侧标的生成文案</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="gen-layout">
        <!-- 左栏：信号列表 -->
        <div class="card side-list">
          <div class="section-header">
            <span class="section-title">低估做多信号</span>
          </div>
          <div class="stock-table">
            <div
              v-for="p in picks"
              :key="p.code"
              class="stock-row"
              :class="{ selected: p.code === selectedCode }"
              @click="selectPick(p)"
            >
              <span class="row-ticker mono">{{ p.code.replace('US.', '').replace('HK.', '') }}</span>
              <span class="row-score mono" :class="p.score >= 80 ? 'high' : 'mid'">{{ p.score }}</span>
              <span class="row-discount mono up">折价 {{ p.discount_pct }}%</span>
            </div>
            <a-empty v-if="!picks.length" description="暂无低估做多信号" style="padding: 24px 0" />
          </div>
        </div>

        <!-- 右栏：文案生成器 -->
        <div class="card gen-panel">
          <a-empty
            v-if="!selectedCode"
            description="点击左侧标的，生成各平台发布文案"
            style="padding: 60px 0"
          />
          <template v-else>
            <!-- 平台 tab -->
            <div class="platform-tabs">
              <span
                v-for="p in platforms"
                :key="p.key"
                class="platform-tab"
                :class="{ active: platform === p.key }"
                @click="switchPlatform(p.key)"
              >
                {{ p.label }}
              </span>
            </div>

            <a-spin :spinning="generating">
              <div class="gen-form">
                <div class="field-label">标题</div>
                <a-input
                  v-model:value="title"
                  class="gen-title-input"
                  placeholder="标题"
                />

                <div class="field-label" style="margin-top: 16px">正文</div>
                <a-textarea
                  v-model:value="body"
                  class="gen-body-input"
                  :auto-size="{ minRows: 14, maxRows: 22 }"
                  placeholder="正文"
                />

                <div class="hashtags" v-if="hashtags.length">
                  <span v-for="h in hashtags" :key="h" class="tag-chip">#{{ h }}</span>
                </div>

                <div class="gen-actions">
                  <a-button type="primary" @click="copyAll" :icon="null">
                    {{ copied ? '已复制 ✓' : '复制全文' }}
                  </a-button>
                  <a-button @click="regenerate" :loading="generating">重新生成</a-button>
                  <span class="gen-hint">文案可直接编辑微调，改完再复制</span>
                </div>
              </div>
            </a-spin>
          </template>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getDailyPicks, getContentGenerator } from '../api/trader'

const loading = ref(false)
const generating = ref(false)
const selectedDate = ref(null)
const picks = ref([])
const selectedCode = ref('')
const platform = ref('xiaohongshu')
const title = ref('')
const body = ref('')
const hashtags = ref([])
const copied = ref(false)

const platforms = [
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'zhihu', label: '知乎' },
  { key: 'gongzhonghao', label: '公众号' },
]

async function loadPicks() {
  loading.value = true
  try {
    const date = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const res = await getDailyPicks(date)
    picks.value = res.data?.picks || []
    if (picks.value.length) {
      selectPick(picks.value[0])
    }
  } catch (e) {
    message.error('加载信号失败：' + (e.response?.data?.message || e.message))
  } finally {
    loading.value = false
  }
}

function selectPick(p) {
  selectedCode.value = p.code
  platform.value = 'xiaohongshu'
  generateContent()
}

function switchPlatform(key) {
  platform.value = key
  generateContent()
}

async function generateContent() {
  if (!selectedCode.value) return
  generating.value = true
  try {
    const date = selectedDate.value ? selectedDate.value.format('YYYY-MM-DD') : undefined
    const res = await getContentGenerator(selectedCode.value, platform.value, date)
    const content = res.data?.content
    if (!content) {
      message.warning(res.data?.message || '生成失败')
      return
    }
    title.value = content.title
    body.value = content.body
    hashtags.value = content.hashtags || []
  } catch (e) {
    message.error('生成失败：' + (e.response?.data?.message || e.message))
  } finally {
    generating.value = false
  }
}

function regenerate() {
  generateContent()
}

async function copyAll() {
  const tagLine = hashtags.value.length ? '\n\n' + hashtags.value.map((h) => '#' + h).join(' ') : ''
  const full = title.value + '\n\n' + body.value + tagLine
  try {
    await navigator.clipboard.writeText(full)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

onMounted(loadPicks)
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
  gap: 8px;
}
.toolbar-label {
  font-size: 13px;
  color: var(--text-secondary);
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

.gen-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

.side-list {
  padding: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.stock-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stock-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.stock-row:hover {
  background: var(--bg-hover);
}
.stock-row.selected {
  border-color: var(--text);
  background: var(--bg-hover);
}
.row-ticker {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  flex: 1;
}
.row-score {
  font-size: 13px;
  font-weight: 600;
}
.row-score.high { color: var(--green); }
.row-score.mid { color: var(--accent); }
.row-discount {
  font-size: 12px;
}

.gen-panel {
  padding: 20px;
  min-height: 480px;
}
.platform-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0;
}
.platform-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.platform-tab:hover {
  color: var(--text);
}
.platform-tab.active {
  color: var(--text);
  font-weight: 600;
  border-bottom-color: var(--text);
}

.gen-form {
  display: flex;
  flex-direction: column;
}
.field-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.gen-title-input :deep(input) {
  font-weight: 600;
}
.gen-body-input :deep(textarea) {
  font-size: 13px;
  line-height: 1.8;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.tag-chip {
  font-size: 12px;
  color: var(--blue);
  background: var(--bg-hover);
  padding: 3px 10px;
  border-radius: 12px;
}
.gen-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}
.gen-hint {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
