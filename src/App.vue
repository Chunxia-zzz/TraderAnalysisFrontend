<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header v-if="showHeader" class="top-header">
      <div class="header-inner">
        <router-link to="/" class="logo">JerryYang的投资世界</router-link>
        <nav class="nav-links" style="margin-left: auto">
          <router-link to="/market-temperature" class="nav-item">市场温度</router-link>
          <router-link to="/scores-overview" class="nav-item">机会速览（价值）</router-link>
          <router-link to="/momentum-leaders" class="nav-item">主升浪龙头</router-link>
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
          <router-link to="/watchlist-manage" class="nav-item">标的管理</router-link>
          <router-link v-if="isAdmin" to="/users" class="nav-item">用户管理</router-link>
          <span class="health-dot" :class="healthOk ? 'online' : 'offline'" :title="healthOk ? '后端在线' : '后端离线'" />
          <a-dropdown>
            <span class="nav-item nav-dropdown">{{ currentUser }} ▾</span>
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </nav>
      </div>
    </a-layout-header>

    <a-layout-content :class="showHeader ? 'main-content' : ''">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getHealth } from './api/trader'

const router = useRouter()
const route = useRoute()
const healthOk = ref(false)

const showHeader = computed(() => route.name !== 'login')
const currentUser = computed(() => localStorage.getItem('username') || '我')
const isAdmin = computed(() => localStorage.getItem('role') === 'admin')

const stockRoutes = ['/dashboard', '/chart']
const isStockRoute = computed(() => stockRoutes.includes(route.path))

function handleMenuClick({ key }) {
  router.push(key)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('username')
  router.push({ name: 'login' })
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: #ffffff;
  color: #333333;
}

.top-header {
  background: #fff !important;
  border-bottom: 1px solid #e8e8e8;
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
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  text-decoration: none;
  margin-right: 48px;
  white-space: nowrap;
}

.logo:hover {
  color: #1a1a1a;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-item {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
  cursor: pointer;
  white-space: nowrap;
}

.nav-item:hover,
.nav-item.router-link-active,
.nav-dropdown.active {
  color: #1890ff;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.health-dot.online {
  background: #52c41a;
}

.health-dot.offline {
  background: #ff4d4f;
}

.main-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 32px;
  background: #ffffff;
}

.ant-layout {
  background: #f5f5f5 !important;
}

.ant-layout-content {
  background: #ffffff !important;
}
</style>
