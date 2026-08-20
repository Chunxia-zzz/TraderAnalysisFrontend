<template>
  <div>
    <!-- 工具栏 -->
    <div class="card toolbar" style="margin-bottom: 16px">
      <div class="toolbar-left">
        <div class="review-tabs">
          <span class="review-tab" :class="{ active: reviewType === 'daily' }" @click="switchType('daily')">日复盘</span>
          <span class="review-tab" :class="{ active: reviewType === 'weekly' }" @click="switchType('weekly')">周复盘</span>
        </div>
        <a-button size="small" @click="loadReview" :loading="loading">刷新</a-button>
        <a-button size="small" @click="openTemplates">模板编辑</a-button>
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
          <div class="section-header"><span class="section-title">一、大盘概览</span></div>
          <div class="asset-grid">
            <div v-for="a in review.macro" :key="a.code" class="asset-card">
              <div class="asset-top">
                <span class="asset-label">{{ a.label }}</span>
                <span class="asset-ticker mono">{{ a.code.split('.')[1] }}</span>
              </div>
              <div class="asset-close mono">${{ a.close }}</div>
              <div class="asset-meta">
                <span class="change" :class="a.change_pct >= 0 ? 'up' : 'down'">{{ a.change_pct >= 0 ? '+' : '' }}{{ a.change_pct }}%</span>
                <span class="trend" :class="a.trend === '多头' ? 'up' : (a.trend === '空头' ? 'down' : '')">{{ a.trend }}{{ a.trend === '多头' ? '↑' : (a.trend === '空头' ? '↓' : '→') }}</span>
                <span class="rsi mono">RSI {{ a.rsi }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 七姐妹 -->
        <div class="card section" style="margin-bottom: 16px">
          <div class="section-header"><span class="section-title">二、七姐妹</span></div>
          <div class="asset-grid seven">
            <div v-for="a in review.mag7" :key="a.code" class="asset-card">
              <div class="asset-top">
                <span class="asset-label">{{ a.label }}</span>
                <span class="asset-ticker mono">{{ a.code.split('.')[1] }}</span>
              </div>
              <div class="asset-close mono">${{ a.close }}</div>
              <div class="asset-meta">
                <span class="change" :class="a.change_pct >= 0 ? 'up' : 'down'">{{ a.change_pct >= 0 ? '+' : '' }}{{ a.change_pct }}%</span>
                <span class="trend" :class="a.trend === '多头' ? 'up' : (a.trend === '空头' ? 'down' : '')">{{ a.trend }}{{ a.trend === '多头' ? '↑' : (a.trend === '空头' ? '↓' : '→') }}</span>
                <span class="rsi mono">RSI {{ a.rsi }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易机会（可展开生成荐股文案） -->
        <div class="card section" style="margin-bottom: 16px" v-if="review.picks?.length">
          <div class="section-header">
            <span class="section-title">三、交易机会</span>
            <span class="section-hint">点击「生成文案」展开荐股文案</span>
          </div>
          <div class="pick-list">
            <div v-for="p in review.picks" :key="p.code" class="pick-block">
              <div class="pick-row">
                <span class="pick-ticker mono">{{ p.code.replace('US.', '').replace('HK.', '') }}</span>
                <span class="score-pill" :class="p.score >= 80 ? 'high' : 'mid'">{{ p.score }}</span>
                <span class="pick-discount mono up">折价 {{ p.discount_pct }}%</span>
                <span class="pick-signal">{{ p.signal }}</span>
                <a-button size="small" @click="togglePickContent(p)">{{ expandedPick === p.code ? '收起文案' : '生成文案' }}</a-button>
              </div>
              <!-- 荐股文案面板 -->
              <div v-if="expandedPick === p.code" class="pick-content">
                <div class="platform-tabs">
                  <span
                    v-for="pl in platforms"
                    :key="pl.key"
                    class="platform-tab"
                    :class="{ active: pickPlatform === pl.key }"
                    @click="loadPickContent(p.code, pl.key)"
                  >{{ pl.label }}</span>
                </div>
                <a-spin :spinning="pickGenerating">
                  <div v-if="pickContent">
                    <div class="field-label">标题</div>
                    <a-input v-model:value="pickContent.title" class="pick-title" />
                    <div class="field-label" style="margin-top: 12px">正文</div>
                    <a-textarea v-model:value="pickContent.body" class="pick-body" :auto-size="{ minRows: 8, maxRows: 16 }" />
                    <div class="pick-actions">
                      <a-button type="primary" size="small" @click="copyPick">{{ pickCopied ? '已复制 ✓' : '复制文案' }}</a-button>
                      <span class="section-hint">可编辑微调后复制</span>
                    </div>
                  </div>
                </a-spin>
              </div>
            </div>
          </div>
        </div>

        <!-- 完整复盘文案 -->
        <div class="card section">
          <div class="section-header">
            <span class="section-title">完整复盘文案</span>
            <a-button type="primary" size="small" @click="copyBody">{{ copied ? '已复制 ✓' : '复制全文' }}</a-button>
          </div>
          <a-textarea v-model:value="body" class="review-body" :auto-size="{ minRows: 20, maxRows: 40 }" />
          <div class="review-hint">文案可编辑微调，改完再复制</div>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="暂无复盘数据" style="padding: 60px 0" />
    </a-spin>

    <!-- 模板编辑弹窗 -->
    <a-modal v-model:open="tplModalVisible" title="模板编辑" :width="820" :footer="null">
      <div class="tpl-layout">
        <div class="tpl-list">
          <div
            v-for="t in templateList"
            :key="t.key"
            class="tpl-item"
            :class="{ active: editingKey === t.key }"
            @click="selectTemplate(t)"
          >{{ tplLabel(t.key) }}</div>
        </div>
        <div class="tpl-edit" v-if="editingKey">
          <div class="field-label">标题模板</div>
          <a-input v-model:value="editingTitle" />
          <div class="field-label" style="margin-top: 12px">正文模板</div>
          <a-textarea v-model:value="editingBody" :auto-size="{ minRows: 10, maxRows: 20 }" class="tpl-body" />
          <div class="field-label" style="margin-top: 12px">标签（逗号分隔，支持 {ticker} 占位符）</div>
          <a-input v-model:value="editingHashtags" />
          <div class="tpl-placeholders">
            <span class="section-hint">可用占位符：</span>
            <span v-for="ph in placeholderHints" :key="ph" class="ph-chip mono">{{ ph }}</span>
          </div>
          <div class="tpl-actions">
            <a-button type="primary" @click="saveTemplate" :loading="savingTpl">保存</a-button>
            <a-button @click="resetTemplate">恢复默认</a-button>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getReview, getContentGenerator, listContentTemplates, saveContentTemplate, deleteContentTemplate } from '../api/trader'

const reviewType = ref('daily')
const review = ref(null)
const body = ref('')
const loading = ref(false)
const copied = ref(false)

const platforms = [
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'zhihu', label: '知乎' },
  { key: 'gongzhonghao', label: '公众号' },
]
const expandedPick = ref('')
const pickPlatform = ref('xiaohongshu')
const pickContent = ref(null)
const pickGenerating = ref(false)
const pickCopied = ref(false)

const tplModalVisible = ref(false)
const templateList = ref([])
const editingKey = ref('')
const editingTitle = ref('')
const editingBody = ref('')
const editingHashtags = ref('')
const savingTpl = ref(false)

const placeholderHints = ['ticker', 'name', 'score', 'close', 'morningstar', 'discount_text', 'signal', 'trade_hint']

const tplLabels = {
  pick_xiaohongshu: '小红书文案',
  pick_zhihu: '知乎文案',
  pick_gongzhonghao: '公众号文案',
  review_asset_line: '复盘-单标的行',
  review_skeleton: '复盘-报告骨架',
}
function tplLabel(key) {
  return tplLabels[key] || key
}

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

async function togglePickContent(p) {
  if (expandedPick.value === p.code) {
    expandedPick.value = ''
    pickContent.value = null
    return
  }
  expandedPick.value = p.code
  pickPlatform.value = 'xiaohongshu'
  await loadPickContent(p.code, 'xiaohongshu')
}

async function loadPickContent(code, platform) {
  pickPlatform.value = platform
  pickGenerating.value = true
  try {
    const res = await getContentGenerator(code, platform)
    pickContent.value = res.data?.content || null
  } catch (e) {
    message.error('生成失败：' + (e.response?.data?.message || e.message))
  } finally {
    pickGenerating.value = false
  }
}

async function copyPick() {
  const c = pickContent.value
  if (!c) return
  const tagLine = c.hashtags?.length ? '\n\n' + c.hashtags.map((h) => '#' + h).join(' ') : ''
  const full = c.title + '\n\n' + c.body + tagLine
  try {
    await navigator.clipboard.writeText(full)
    pickCopied.value = true
    setTimeout(() => (pickCopied.value = false), 2000)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
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

async function openTemplates() {
  tplModalVisible.value = true
  try {
    const res = await listContentTemplates()
    templateList.value = res.data?.templates || []
    if (templateList.value.length) selectTemplate(templateList.value[0])
  } catch (e) {
    message.error('加载模板失败：' + (e.response?.data?.message || e.message))
  }
}

function selectTemplate(t) {
  editingKey.value = t.key
  editingTitle.value = t.title
  editingBody.value = t.body
  editingHashtags.value = (t.hashtags || []).join(',')
}

async function saveTemplate() {
  savingTpl.value = true
  try {
    const hashtags = editingHashtags.value ? editingHashtags.value.split(',').map((s) => s.trim()).filter(Boolean) : []
    await saveContentTemplate(editingKey.value, { title: editingTitle.value, body: editingBody.value, hashtags })
    message.success('模板已保存')
  } catch (e) {
    message.error('保存失败：' + (e.response?.data?.message || e.message))
  } finally {
    savingTpl.value = false
  }
}

async function resetTemplate() {
  try {
    await deleteContentTemplate(editingKey.value)
    message.success('已恢复默认模板')
    const res = await listContentTemplates()
    templateList.value = res.data?.templates || []
    const cur = templateList.value.find((t) => t.key === editingKey.value)
    if (cur) selectTemplate(cur)
  } catch (e) {
    message.error('恢复失败：' + (e.response?.data?.message || e.message))
  }
}

onMounted(loadReview)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-stats { display: flex; gap: 8px; }
.stat-chip { font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 500; }
.stat-chip.green { color: var(--green); background: var(--green-bg); }
.stat-chip.gray { color: var(--text-secondary); background: var(--bg-hover); }

.review-tabs { display: flex; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 2px; }
.review-tab { padding: 4px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.review-tab.active { background: var(--text); color: #fff; }

.section { padding: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--text); }
.section-hint { font-size: 12px; color: var(--text-muted); }

.asset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.asset-grid.seven { grid-template-columns: repeat(7, 1fr); }
.asset-card { border: 1px solid var(--border-subtle); border-radius: 6px; padding: 12px; transition: border-color 0.15s; }
.asset-card:hover { border-color: var(--border); }
.asset-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.asset-label { font-size: 13px; font-weight: 600; color: var(--text); }
.asset-ticker { font-size: 11px; color: var(--text-muted); }
.asset-close { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.asset-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.change { font-weight: 600; }
.trend { color: var(--text-secondary); }
.rsi { color: var(--text-muted); margin-left: auto; }

.pick-list { display: flex; flex-direction: column; gap: 8px; }
.pick-block { border: 1px solid var(--border-subtle); border-radius: 6px; overflow: hidden; }
.pick-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
.pick-ticker { font-size: 13px; font-weight: 700; color: var(--text); min-width: 60px; }
.pick-discount { font-size: 12px; }
.pick-signal { font-size: 12px; color: var(--text-secondary); flex: 1; }
.pick-content { padding: 16px; border-top: 1px solid var(--border-subtle); background: var(--bg); }
.platform-tabs { display: flex; gap: 4px; margin-bottom: 14px; }
.platform-tab { padding: 4px 14px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 4px; border: 1px solid var(--border-subtle); }
.platform-tab.active { background: var(--text); color: #fff; border-color: var(--text); }
.field-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.pick-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.pick-body :deep(textarea), .tpl-body :deep(textarea) { font-size: 13px; line-height: 1.8; }

.review-body :deep(textarea) { font-size: 13px; line-height: 1.8; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.review-hint { font-size: 12px; color: var(--text-muted); margin-top: 8px; }

.tpl-layout { display: grid; grid-template-columns: 180px 1fr; gap: 16px; }
.tpl-list { display: flex; flex-direction: column; gap: 4px; }
.tpl-item { padding: 8px 12px; font-size: 13px; color: var(--text-secondary); cursor: pointer; border-radius: 6px; }
.tpl-item:hover { background: var(--bg-hover); }
.tpl-item.active { background: var(--bg-hover); color: var(--text); font-weight: 600; }
.tpl-placeholders { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
.ph-chip { font-size: 11px; color: var(--blue); background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; }
.tpl-actions { display: flex; gap: 10px; margin-top: 16px; }

@media (max-width: 1100px) {
  .asset-grid.seven { grid-template-columns: repeat(4, 1fr); }
}
</style>
