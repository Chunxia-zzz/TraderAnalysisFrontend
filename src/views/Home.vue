<template>
  <div class="home">
    <div class="hero">
      <h1 class="title">在最好的经济体中，持有最好的公司</h1>
      <div class="subtitle">
        <p>买股票就是买公司的一部分所有权。</p>
        <p>市场先生提供的是服务，而非指导 —— 在其极度沮丧之时执行买入，在其极度自满之时适度减仓。</p>
        <p>投资必须要有充足的安全边际，明白自己的能力圈边界，绝不让本金蒙受损失。</p>
        <p>财富是经济体中的购买力占比。价值投资的目标，是在最具活力的经济体中持有最有活力公司的股份，以此保持和增长财富。</p>
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
  margin: 0 0 12px 0;
}

.subtitle p:last-child {
  margin-bottom: 0;
}

.cta {
  margin-top: 48px;
}

.cta-btn {
  display: inline-block;
  padding: 12px 32px;
  background: var(--text);
  color: #ffffff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.cta-btn:hover {
  opacity: 0.8;
}

</style>
