<template>
  <div class="home">
    <div class="hero">
      <h1 class="title">用数据感知市场温度，用纪律对抗人性弱点</h1>
      <div class="subtitle">
        <p>市场永远在恐惧和贪婪之间摆动。</p>
        <p>当所有人恐慌时，机会正在孕育；当所有人亢奋时，风险已经积聚。</p>
        <p>我们不预测市场，我们量化情绪、追踪趋势、计算概率。</p>
        <p>系统化交易的本质，是把决策权从情绪手中夺回来。</p>
      </div>
      <div class="cta">
        <router-link to="/market-temperature" class="cta-btn">查看市场温度</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.hero {
  max-width: 680px;
  text-align: left;
}

.title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a1a;
  margin-bottom: 32px;
}

.subtitle {
  font-size: 16px;
  line-height: 2;
  color: #666;
}

.subtitle p {
  margin: 0;
}

.cta {
  margin-top: 48px;
}

.cta-btn {
  display: inline-block;
  padding: 12px 32px;
  background: #1890ff;
  color: #ffffff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.cta-btn:hover {
  opacity: 0.8;
}
</style>
