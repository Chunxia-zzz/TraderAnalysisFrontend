<template>
  <a-config-provider :theme="theme">
    <a-layout style="min-height: 100vh">
      <a-layout-header class="top-header">
        <div class="header-inner">
          <router-link to="/" class="logo">
            <span class="logo-icon">J</span>
            <span class="logo-text">JerryYang的投资世界</span>
          </router-link>
          <nav class="nav-links" style="margin-left: auto">
            <router-link to="/market-temperature" class="nav-item">市场温度</router-link>
            <router-link to="/momentum-leaders" class="nav-item">交易信号</router-link>
            <a-dropdown>
              <span class="nav-item nav-dropdown" :class="{ active: isStockRoute }">个股分析 ▾</span>
              <template #overlay>
                <a-menu @click="handleMenuClick">
                  <a-menu-item key="/dashboard">个股技术分析</a-menu-item>
                  <a-menu-item key="/chart">个股历史K线</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <router-link to="/backtest" class="nav-item">信号回测</router-link>
            <router-link to="/review" class="nav-item">市场复盘</router-link>
            <router-link to="/watchlist-manage" class="nav-item">标的管理</router-link>
            <router-link to="/content-generator" class="nav-item">文案生成</router-link>
            <span class="health-dot" :class="healthOk ? 'online' : 'offline'" :title="healthOk ? '后端在线' : '后端离线'" />
          </nav>
        </div>
      </a-layout-header>

      <a-layout-content class="main-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-config-provider>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getHealth } from './api/trader'
import theme from './styles/theme.js'

const router = useRouter()
const route = useRoute()
const healthOk = ref(false)

const stockRoutes = ['/dashboard', '/chart']
const isStockRoute = computed(() => stockRoutes.includes(route.path))

function handleMenuClick({ key }) {
  router.push(key)
}

async function checkHealth() {
  try {
    await getHealth()
    healthOk.value = true
  } catch {
    healthOk.value = false
  }
}

onMounted(checkHealth)
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
}

.top-header {
  background: #fff !important;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 32px !important;
  height: 56px;
  line-height: 56px;
}

.header-inner {
  display: flex;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  margin-right: 48px;
  white-space: nowrap;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--text);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  font-family: 'DM Mono', monospace;
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.logo:hover .logo-text {
  color: var(--text);
}

.nav-links {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s, font-weight 0.15s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.nav-item.router-link-active,
.nav-dropdown.active {
  background: var(--bg-hover);
  color: var(--text);
  font-weight: 600;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 8px;
}

.health-dot.online  { background: var(--green); }
.health-dot.offline { background: var(--red); }

.main-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 32px;
  background: transparent;
}

.ant-layout {
  background: var(--bg) !important;
}

.ant-layout-content {
  background: transparent !important;
}
</style>
