<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">TraderAnalysis</div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="onMenuClick"
      >
        <a-menu-item key="dashboard">
          <fund-outlined />
          <span>概览</span>
        </a-menu-item>
        <a-menu-item key="chart">
          <line-chart-outlined />
          <span>K线图</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header style="background: #fff; padding: 0 24px; display: flex; align-items: center">
        <a-badge :status="apiStatus" :text="apiStatusText" />
      </a-layout-header>

      <a-layout-content style="margin: 24px">
        <router-view />
      </a-layout-content>

      <a-layout-footer style="text-align: center; color: #999">
        TraderAnalysis &copy; {{ new Date().getFullYear() }}
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { FundOutlined, LineChartOutlined } from '@ant-design/icons-vue'
import { getHealth } from './api/trader'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const selectedKeys = ref([route.name || 'dashboard'])
const apiStatus = ref('default')
const apiStatusText = ref('检查后端连接...')

function onMenuClick({ key }) {
  router.push({ name: key })
  selectedKeys.value = [key]
}

onMounted(async () => {
  try {
    await getHealth()
    apiStatus.value = 'success'
    apiStatusText.value = '后端已连接'
  } catch {
    apiStatus.value = 'error'
    apiStatusText.value = '后端离线'
  }
})
</script>

<style>
* {
  box-sizing: border-box;
}

.logo {
  height: 32px;
  margin: 16px;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  white-space: nowrap;
}
</style>
