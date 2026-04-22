<template>
  <div>
    <!-- 查询表单 -->
    <a-card style="margin-bottom: 16px">
      <a-space wrap>
        <a-input
          v-model:value="code"
          placeholder="标的代码，如 US.SNDK"
          style="width: 200px"
          allow-clear
        />
        <a-select v-model:value="ktype" style="width: 120px">
          <a-select-option value="1d">日K</a-select-option>
          <a-select-option value="1w">周K</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="days"
          :min="10"
          :max="500"
          addonBefore="K线数量"
          style="width: 180px"
        />
        <a-button type="primary" :loading="loading" @click="fetchData">查询</a-button>
      </a-space>
    </a-card>

    <!-- 指标开关 -->
    <a-card style="margin-bottom: 16px" size="small">
      <template #title>
        <span style="font-size: 13px; color: #666">指标开关</span>
      </template>
      <a-space wrap :size="[4, 8]">
        <span class="tag-group-label">均线</span>
        <a-tag
          v-for="key in maKeys"
          :key="key"
          :color="visible[key] ? maTagColors[key] : ''"
          class="indicator-tag"
          @click="visible[key] = !visible[key]"
        >
          {{ key.toUpperCase() }}
        </a-tag>

        <a-divider type="vertical" />

        <a-tag
          :color="visible.boll ? '#795548' : ''"
          class="indicator-tag"
          @click="visible.boll = !visible.boll"
        >
          BOLL
        </a-tag>

        <a-divider type="vertical" />

        <span class="tag-group-label">副图</span>
        <a-tag
          :color="visible.vol ? '#607d8b' : ''"
          class="indicator-tag"
          @click="visible.vol = !visible.vol"
        >
          成交量
        </a-tag>
        <a-tag
          :color="visible.macd ? '#1976d2' : ''"
          class="indicator-tag"
          @click="visible.macd = !visible.macd"
        >
          MACD
        </a-tag>
        <a-tag
          :color="visible.rsi ? '#ff5722' : ''"
          class="indicator-tag"
          @click="visible.rsi = !visible.rsi"
        >
          RSI
        </a-tag>
      </a-space>
    </a-card>

    <!-- 图表 -->
    <a-card :loading="loading">
      <a-empty v-if="!hasData && !loading" description="请输入标的代码并点击查询" />
      <indicator-chart v-else :data="chartData" :visible="visible" :height="800" />
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getIndicators } from '../api/trader'
import IndicatorChart from '../components/IndicatorChart.vue'

const code = ref('US.SNDK')
const ktype = ref('1d')
const days = ref(250)
const loading = ref(false)
const chartData = ref([])

const hasData = computed(() => chartData.value.length > 0)

// ── 指标可见性 ──
const maKeys = ['ma5', 'ma10', 'ma20', 'ma60']
const maTagColors = { ma5: '#ff9800', ma10: '#2196f3', ma20: '#e91e63', ma60: '#9c27b0' }

const visible = reactive({
  ma5: true,
  ma10: true,
  ma20: false,
  ma60: false,
  boll: true,
  vol: true,
  macd: true,
  rsi: true,
})

async function fetchData() {
  if (!code.value) {
    message.warning('请输入标的代码')
    return
  }
  loading.value = true
  try {
    const res = await getIndicators(code.value, ktype.value, days.value)
    chartData.value = res.data.data
  } catch {
    message.error('获取数据失败，请检查后端连接')
    chartData.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.indicator-tag {
  cursor: pointer;
  user-select: none;
  min-width: 48px;
  text-align: center;
}
.tag-group-label {
  font-size: 12px;
  color: #999;
  margin-right: 2px;
}
</style>
