<template>
  <div class="home" :data-theme="isDark ? 'dark' : 'light'">

    <!-- 主题切换 -->
    <button class="theme-btn" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换暗色'">
      <span v-if="isDark">☀</span>
      <span v-else>◑</span>
    </button>

    <!-- ═══ S1: HERO ═══ -->
    <section class="s-hero">
      <div class="hero-grid"></div>
      <div class="hero-glow"></div>
      <div class="hero-body">
        <h1 class="anim">
          在最好的经济体中，<br>
          <span class="h-accent">持有最好的公司</span>
        </h1>
        <p class="hero-sub anim anim-d1">量化信号 · 多维评分 · 纪律仓位</p>
        <div class="anim anim-d2">
          <router-link to="/market-temperature" class="btn-primary">查看市场温度</router-link>
        </div>
      </div>
      <div class="scroll-hint">
        <span>向下滚动</span>
        <div class="hint-arrow"></div>
      </div>
    </section>

    <!-- ═══ S2: CAPABILITIES ═══ -->
    <section class="s-caps">
      <div class="inner">
        <div class="sec-hd anim">
          <h2>核心能力</h2>
          <p>驱动每一次投资决策的三大支柱</p>
        </div>
        <div class="cap-row">
          <router-link to="/dashboard" class="cap-card anim anim-d1">
            <div class="cap-icon gold">📊</div>
            <h3>技术评分</h3>
            <p>六维雷达评分，综合趋势、动量、波动率、成交量、基本面和宏观信号，汇聚为一个可执行的数值。</p>
          </router-link>
          <router-link to="/market-temperature" class="cap-card anim anim-d2">
            <div class="cap-icon green">🌡</div>
            <h3>市场温度</h3>
            <p>三维度综合评估市场整体热度，动态映射到 30–120% 仓位区间，指导仓位管理决策。</p>
          </router-link>
          <router-link to="/backtest" class="cap-card anim anim-d3">
            <div class="cap-icon blue">⚖</div>
            <h3>信号回测</h3>
            <p>基于历史数据验证信号质量，支持持股 / 波段 / 网格三种模式，量化评估策略历史胜率。</p>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ═══ S3: MARKET TEMPERATURE ═══ -->
    <section class="s-temp">
      <div class="inner">
        <div class="sec-hd anim">
          <h2>市场温度</h2>
          <p>一个数值，捕捉市场的脉搏</p>
        </div>
        <div class="gauge-block">
          <div class="gauge" ref="gaugeRef">
            <svg viewBox="0 0 200 120" aria-hidden="true">
              <defs>
                <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#34d399"/>
                  <stop offset="50%" stop-color="#f0b429"/>
                  <stop offset="100%" stop-color="#f87171"/>
                </linearGradient>
              </defs>
              <path class="g-bg" d="M 20 110 A 80 80 0 0 1 180 110"/>
              <path class="g-fill" :class="{ animated: gaugeAnimated }" d="M 20 110 A 80 80 0 0 1 180 110"/>
            </svg>
            <div class="g-val">{{ gaugeVal }}</div>
          </div>
          <div class="g-label">综合温度 / 100</div>
          <div class="temp-stats">
            <div class="ts-item anim anim-d2">
              <div class="ts-num green">{{ bullN }}</div>
              <div class="ts-lbl">看多信号</div>
            </div>
            <div class="ts-item anim anim-d3">
              <div class="ts-num gold">{{ neutN }}</div>
              <div class="ts-lbl">中性</div>
            </div>
            <div class="ts-item anim anim-d4">
              <div class="ts-num red">{{ bearN }}</div>
              <div class="ts-lbl">看空信号</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ S4: SCORING RADAR ═══ -->
    <section class="s-score">
      <div class="inner">
        <div class="sec-hd anim">
          <h2>六维评分系统</h2>
          <p>每个标的都经过多因子透镜评估</p>
        </div>
        <div class="score-layout">
          <div class="radar-wrap anim anim-d1" ref="radarRef">
            <svg viewBox="0 0 320 320" class="radar-svg" aria-hidden="true">
              <!-- Grid rings -->
              <polygon class="r-ring" points="160,40 264,100 264,220 160,280 56,220 56,100"/>
              <polygon class="r-ring" points="160,70 238,115 238,205 160,250 82,205 82,115"/>
              <polygon class="r-ring" points="160,100 212,130 212,190 160,220 108,190 108,130"/>
              <polygon class="r-ring" points="160,130 186,145 186,175 160,190 134,175 134,145"/>
              <!-- Axes -->
              <line class="r-axis" x1="160" y1="40" x2="160" y2="280"/>
              <line class="r-axis" x1="56" y1="100" x2="264" y2="220"/>
              <line class="r-axis" x1="264" y1="100" x2="56" y2="220"/>
              <!-- Data shape -->
              <polygon class="r-area" :class="{ animated: radarAnimated }"
                points="160,55 252,110 245,210 160,260 80,195 75,108"/>
              <!-- Dots -->
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="160" cy="55" r="4"/>
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="252" cy="110" r="4"/>
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="245" cy="210" r="4"/>
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="160" cy="260" r="4"/>
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="80" cy="195" r="4"/>
              <circle class="r-dot" :class="{ visible: radarAnimated }" cx="75" cy="108" r="4"/>
              <!-- Labels -->
              <text class="r-lbl" x="160" y="28">趋势</text>
              <text class="r-lbl" x="282" y="104">动量</text>
              <text class="r-lbl" x="282" y="228">波动率</text>
              <text class="r-lbl" x="160" y="300">成交量</text>
              <text class="r-lbl r-lbl-l" x="38" y="228">基本面</text>
              <text class="r-lbl r-lbl-l" x="38" y="104">宏观</text>
            </svg>
          </div>
          <div class="tiers anim anim-d2">
            <div class="tier">
              <span class="tier-badge t-strong">80 – 100</span>
              <div class="tier-info">
                <h4>强烈买入</h4>
                <p>所有维度共振，高确信度机会</p>
              </div>
            </div>
            <div class="tier">
              <span class="tier-badge t-mid">60 – 79</span>
              <div class="tier-info">
                <h4>建议买入</h4>
                <p>主要信号确认，可分批建仓</p>
              </div>
            </div>
            <div class="tier">
              <span class="tier-badge t-low">0 – 59</span>
              <div class="tier-info">
                <h4>场外观望</h4>
                <p>信号质量不足，等待更好机会</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ S5: WORKFLOW ═══ -->
    <section class="s-flow">
      <div class="inner">
        <div class="sec-hd anim">
          <h2>工作流程</h2>
          <p>从原始数据到可执行建议，四步完成</p>
        </div>
        <div class="timeline" ref="timelineRef">
          <div class="tl-fill" :class="{ animated: tlAnimated }"></div>
          <div class="step anim">
            <div class="step-dot" :class="{ lit: tlAnimated }">📡</div>
            <div class="step-body">
              <div class="step-n">STEP 01</div>
              <h3>数据采集</h3>
              <p>实时接入美股、港股行情，汇聚至本地 SQLite 时间序列存储。</p>
            </div>
          </div>
          <div class="step anim anim-d1">
            <div class="step-dot" :class="{ lit: tlAnimated }">⚙</div>
            <div class="step-body">
              <div class="step-n">STEP 02</div>
              <h3>指标计算</h3>
              <p>跨多个时间周期计算 20+ 技术指标，涵盖趋势、动量、波动率和成交量维度。</p>
            </div>
          </div>
          <div class="step anim anim-d2">
            <div class="step-dot" :class="{ lit: tlAnimated }">🧮</div>
            <div class="step-body">
              <div class="step-n">STEP 03</div>
              <h3>信号评分</h3>
              <p>六维加权综合评分，基于历史分布归一化，输出 0–100 可解释分值。</p>
            </div>
          </div>
          <div class="step anim anim-d3">
            <div class="step-dot" :class="{ lit: tlAnimated }">🎯</div>
            <div class="step-body">
              <div class="step-n">STEP 04</div>
              <h3>执行建议</h3>
              <p>仓位大小、入场区间、信号回测——根据市场温度和个股评分动态校准。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ S6: CTA ═══ -->
    <section class="s-cta">
      <div class="inner cta-center anim">
        <h2>开始做出<span class="cta-green">更聪明</span>的决策</h2>
        <p class="cta-sub">每一个功能都为了去除情绪、强化纪律而生。</p>
        <div class="cta-btns">
          <router-link to="/market-temperature" class="btn-primary">市场温度</router-link>
          <router-link to="/scores-overview" class="btn-outline">机会速览</router-link>
          <router-link to="/momentum-leaders" class="btn-outline">主升浪龙头</router-link>
          <router-link to="/backtest" class="btn-outline">信号回测</router-link>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ── 主题 ──
const isDark = ref(localStorage.getItem('home-theme') !== 'light')
function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('home-theme', isDark.value ? 'dark' : 'light')
}

// ── 动画状态 ──
const gaugeRef    = ref(null)
const radarRef    = ref(null)
const timelineRef = ref(null)

const gaugeAnimated = ref(false)
const radarAnimated = ref(false)
const tlAnimated    = ref(false)

// 仪表盘数值（展示用静态值）
const gaugeVal = ref(0)
const bullN    = ref(0)
const neutN    = ref(0)
const bearN    = ref(0)

function countUp(setter, target, duration = 1400) {
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1)
    setter(Math.round(target * (1 - Math.pow(1 - p, 3))))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ── Observer ──
const observers = []

onMounted(() => {
  // 通用滚动进场
  const animObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view') })
  }, { threshold: 0.12 })
  document.querySelectorAll('.home .anim').forEach(el => animObs.observe(el))
  observers.push(animObs)

  // 仪表盘
  if (gaugeRef.value) {
    const gObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !gaugeAnimated.value) {
          gaugeAnimated.value = true
          countUp(v => { gaugeVal.value = v }, 57)
          countUp(v => { bullN.value = v }, 14)
          countUp(v => { neutN.value = v }, 5)
          countUp(v => { bearN.value = v }, 3)
          gObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.3 })
    gObs.observe(gaugeRef.value)
    observers.push(gObs)
  }

  // 雷达图
  if (radarRef.value) {
    const rObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !radarAnimated.value) {
          radarAnimated.value = true
          rObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.3 })
    rObs.observe(radarRef.value)
    observers.push(rObs)
  }

  // 时间轴
  if (timelineRef.value) {
    const tObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !tlAnimated.value) {
          tlAnimated.value = true
          tObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.2 })
    tObs.observe(timelineRef.value)
    observers.push(tObs)
  }
})

onUnmounted(() => {
  observers.forEach(o => o.disconnect())
})
</script>

<style scoped>
/* ══════════════════════════════════════
   主题变量
   ══════════════════════════════════════ */
.home[data-theme="dark"] {
  --h-bg:       #0a0e17;
  --h-bg-alt:   #111827;
  --h-card:     rgba(255,255,255,0.04);
  --h-border:   rgba(255,255,255,0.08);
  --h-text:     #f0f2f5;
  --h-dim:      #8b949e;
  --h-accent:   #f0b429;
  --h-accent-d: rgba(240,180,41,0.15);
  --h-green:    #34d399;
  --h-green-d:  rgba(52,211,153,0.12);
  --h-red:      #f87171;
  --h-blue-d:   rgba(96,165,250,0.12);
}
.home[data-theme="light"] {
  --h-bg:       #f6f8fa;
  --h-bg-alt:   #ffffff;
  --h-card:     #ffffff;
  --h-border:   #d1d9e0;
  --h-text:     #1f2328;
  --h-dim:      #59636e;
  --h-accent:   #946800;
  --h-accent-d: rgba(148,104,0,0.1);
  --h-green:    #1a7f37;
  --h-green-d:  rgba(26,127,55,0.1);
  --h-red:      #cf222e;
  --h-blue-d:   rgba(5,80,174,0.08);
}

/* ══════════════════════════════════════
   容器突破（全宽全屏）
   ══════════════════════════════════════ */
.home {
  width: 100vw;
  position: relative;
  left: calc(-50vw + 50%);
  margin-top: -24px;
  overflow-x: hidden;
  background: var(--h-bg);
  color: var(--h-text);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.3s, color 0.3s;
}

/* ── Section 共用 ── */
section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  position: relative;
}

.inner {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

/* ── Section 标题 ── */
.sec-hd {
  text-align: center;
  margin-bottom: 56px;
}
.sec-hd h2 {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--h-text);
}
.sec-hd p {
  color: var(--h-dim);
  font-size: 16px;
}

/* ══════════════════════════════════════
   滚动进场动效
   ══════════════════════════════════════ */
.anim {
  opacity: 0;
  transform: translateY(36px);
  transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1),
              transform 0.75s cubic-bezier(0.16,1,0.3,1);
}
.anim.in-view  { opacity: 1; transform: translateY(0); }
.anim-d1 { transition-delay: 0.12s; }
.anim-d2 { transition-delay: 0.24s; }
.anim-d3 { transition-delay: 0.36s; }
.anim-d4 { transition-delay: 0.48s; }

/* ══════════════════════════════════════
   主题切换按钮
   ══════════════════════════════════════ */
.theme-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 100;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--h-border);
  background: var(--h-card);
  color: var(--h-dim);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(8px);
}
.theme-btn:hover {
  border-color: var(--h-accent);
  color: var(--h-accent);
  box-shadow: 0 0 16px var(--h-accent-d);
}

/* ══════════════════════════════════════
   S1 — HERO
   ══════════════════════════════════════ */
.s-hero {
  min-height: calc(100vh - 56px);
  text-align: center;
  overflow: hidden;
}

/* 网格背景 */
.hero-grid {
  position: absolute;
  inset: -50%;
  background-image:
    linear-gradient(rgba(240,180,41,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(240,180,41,0.05) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridMove 20s linear infinite;
  pointer-events: none;
}
.home[data-theme="light"] .hero-grid {
  background-image:
    linear-gradient(rgba(148,104,0,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,104,0,0.07) 1px, transparent 1px);
}
@keyframes gridMove {
  to { transform: translate(60px, 60px); }
}

/* 光晕 */
.hero-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(240,180,41,0.08) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: glowPulse 6s ease-in-out infinite;
  pointer-events: none;
}
.home[data-theme="light"] .hero-glow {
  background: radial-gradient(circle, rgba(148,104,0,0.06) 0%, transparent 70%);
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.15); }
}

.hero-body {
  position: relative;
  z-index: 1;
}

.hero-body h1 {
  font-size: clamp(32px, 6vw, 68px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  color: var(--h-text);
}
.h-accent { color: var(--h-accent); }

.hero-sub {
  font-size: clamp(15px, 2.2vw, 20px);
  color: var(--h-dim);
  margin-bottom: 48px;
}

/* 主按钮 */
.btn-primary {
  display: inline-block;
  padding: 13px 34px;
  background: var(--h-accent);
  color: #0a0e17;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px var(--h-accent-d);
}

/* 次按钮 */
.btn-outline {
  display: inline-block;
  padding: 11px 24px;
  border: 1px solid var(--h-border);
  color: var(--h-text);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.25s, background 0.25s;
}
.btn-outline:hover {
  border-color: var(--h-accent);
  background: var(--h-accent-d);
}

/* 向下滚动提示 */
.scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--h-dim);
  font-size: 11px;
  animation: hintBounce 2s ease-in-out infinite;
}
.hint-arrow {
  width: 18px;
  height: 18px;
  border-right: 2px solid var(--h-dim);
  border-bottom: 2px solid var(--h-dim);
  transform: rotate(45deg);
}
@keyframes hintBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(8px); }
}

/* ══════════════════════════════════════
   S2 — CAPABILITIES
   ══════════════════════════════════════ */
.s-caps { background: var(--h-bg-alt); }

.cap-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.cap-card {
  background: var(--h-card);
  border: 1px solid var(--h-border);
  border-radius: 12px;
  padding: 36px 28px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
  display: block;
}
.cap-card:hover {
  border-color: var(--h-accent);
  box-shadow: 0 0 28px var(--h-accent-d);
  transform: translateY(-3px);
}

.cap-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 20px;
}
.cap-icon.gold  { background: var(--h-accent-d); }
.cap-icon.green { background: var(--h-green-d); }
.cap-icon.blue  { background: var(--h-blue-d); }

.cap-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--h-text);
}
.cap-card p {
  color: var(--h-dim);
  font-size: 14px;
  line-height: 1.75;
}

/* ══════════════════════════════════════
   S3 — MARKET TEMPERATURE
   ══════════════════════════════════════ */
.s-temp { background: var(--h-bg); }

.gauge-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.gauge {
  position: relative;
  width: 280px;
  height: 160px;
}
.gauge svg { width: 100%; height: 100%; overflow: visible; }

.g-bg {
  fill: none;
  stroke: var(--h-border);
  stroke-width: 18;
  stroke-linecap: round;
}
.g-fill {
  fill: none;
  stroke: url(#gGrad);
  stroke-width: 18;
  stroke-linecap: round;
  stroke-dasharray: 314;
  stroke-dashoffset: 314;
  transition: stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1);
}
/* 57% → offset = 314 - 314×0.57 ≈ 135 */
.g-fill.animated { stroke-dashoffset: 135; }

.g-val {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'DM Mono', monospace;
  font-size: 52px;
  font-weight: 700;
  color: var(--h-accent);
  line-height: 1;
}
.g-label {
  font-size: 12px;
  color: var(--h-dim);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: -8px;
}

.temp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 480px;
}
.ts-item {
  text-align: center;
  padding: 20px 12px;
  background: var(--h-card);
  border: 1px solid var(--h-border);
  border-radius: 12px;
}
.ts-num {
  font-family: 'DM Mono', monospace;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}
.ts-num.green { color: var(--h-green); }
.ts-num.gold  { color: var(--h-accent); }
.ts-num.red   { color: var(--h-red); }
.ts-lbl { font-size: 12px; color: var(--h-dim); }

/* ══════════════════════════════════════
   S4 — SCORING RADAR
   ══════════════════════════════════════ */
.s-score { background: var(--h-bg-alt); }

.score-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.radar-wrap { display: flex; justify-content: center; }
.radar-svg { width: 320px; height: 320px; }

.r-ring { fill: none; stroke: var(--h-border); stroke-width: 1; }
.r-axis { stroke: var(--h-border); stroke-width: 1; }

.r-area {
  fill: var(--h-accent-d);
  stroke: var(--h-accent);
  stroke-width: 2;
  stroke-dasharray: 800;
  stroke-dashoffset: 800;
  fill-opacity: 0;
  transition: stroke-dashoffset 1.5s ease, fill-opacity 1.5s ease;
}
.r-area.animated {
  stroke-dashoffset: 0;
  fill-opacity: 1;
}

.r-dot {
  fill: var(--h-accent);
  opacity: 0;
  transition: opacity 0.4s ease 1.2s;
}
.r-dot.visible { opacity: 1; }

.r-lbl {
  fill: var(--h-dim);
  font-size: 11px;
  text-anchor: middle;
  font-family: 'DM Sans', sans-serif;
}
.r-lbl-l { text-anchor: middle; }

.tiers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tier {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: var(--h-card);
  border: 1px solid var(--h-border);
  border-radius: 12px;
  transition: border-color 0.3s;
}
.tier:hover { border-color: var(--h-accent); }

.tier-badge {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  white-space: nowrap;
}
.t-strong { background: var(--h-green-d);  color: var(--h-green); }
.t-mid    { background: var(--h-accent-d); color: var(--h-accent); }
.t-low    { background: var(--h-border);   color: var(--h-dim); }

.tier-info h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--h-text);
}
.tier-info p {
  font-size: 13px;
  color: var(--h-dim);
}

/* ══════════════════════════════════════
   S5 — WORKFLOW
   ══════════════════════════════════════ */
.s-flow { background: var(--h-bg); }

.timeline {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 27px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--h-border);
}

/* 进度线动画 */
.tl-fill {
  position: absolute;
  left: 27px;
  top: 0;
  width: 2px;
  height: 0;
  background: linear-gradient(180deg, var(--h-accent), var(--h-green));
  transition: height 1.6s cubic-bezier(0.16,1,0.3,1);
  z-index: 1;
}
.tl-fill.animated { height: 100%; }

.step {
  display: flex;
  gap: 24px;
  padding: 28px 0;
  position: relative;
  z-index: 2;
}
.step-dot {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--h-bg);
  border: 2px solid var(--h-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: border-color 0.5s ease, background 0.5s ease;
}
.step-dot.lit {
  border-color: var(--h-accent);
  background: var(--h-accent-d);
}
.step-n {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--h-dim);
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.step-body h3 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--h-text);
}
.step-body p {
  font-size: 14px;
  color: var(--h-dim);
  line-height: 1.7;
}

/* ══════════════════════════════════════
   S6 — CTA
   ══════════════════════════════════════ */
.s-cta {
  background: var(--h-bg-alt);
  position: relative;
}
.s-cta::before {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--h-green-d) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cta-center {
  text-align: center;
  position: relative;
  z-index: 1;
}
.cta-center h2 {
  font-size: clamp(26px, 4vw, 46px);
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--h-text);
}
.cta-green { color: var(--h-green); }
.cta-sub {
  color: var(--h-dim);
  font-size: 16px;
  margin-bottom: 40px;
}
.cta-btns {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ══════════════════════════════════════
   响应式
   ══════════════════════════════════════ */
@media (max-width: 768px) {
  .score-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .temp-stats { grid-template-columns: 1fr; }
  section { padding: 60px 20px; }
  .radar-svg { width: 260px; height: 260px; }
}
</style>
