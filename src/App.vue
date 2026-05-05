<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header class="top-header">
      <div class="header-inner">
        <router-link to="/" class="logo">JerryYang的投资世界</router-link>
        <nav class="nav-links" style="margin-left: auto">
          <router-link to="/market-temperature" class="nav-item">市场温度</router-link>
          <router-link to="/scores-overview" class="nav-item">机会速览</router-link>
          <router-link to="/chart" class="nav-item">K线图</router-link>
          <router-link to="/dashboard" class="nav-item">个股技术分析</router-link>
        </nav>
      </div>
    </a-layout-header>

    <a-layout-content class="main-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup>
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
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  text-decoration: none;
  margin-right: 48px;
}

.logo:hover {
  color: #1a1a1a;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-item {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: #1890ff;
}

.main-content {
  max-width: 1200px;
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
