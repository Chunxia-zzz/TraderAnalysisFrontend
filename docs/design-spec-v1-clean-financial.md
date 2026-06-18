# TraderAnalysis 视觉改造技术方案

## 设计方向：Clean Financial

参考风格：Stripe Dashboard / Linear / 高端券商研报。克制、精确、信息层次分明。

---

## 1. Design Tokens

### 色板

| 用途 | 变量名 | 色值 | 说明 |
|------|--------|------|------|
| 页面背景 | `--bg` | `#f6f8fa` | 极浅冷灰，替代纯白 |
| 卡片背景 | `--bg-card` | `#ffffff` | 纯白卡片浮于灰底之上 |
| 悬浮/选中 | `--bg-hover` | `#f0f2f4` | |
| 主边框 | `--border` | `#d1d9e0` | 仅用于卡片外框 |
| 细边框 | `--border-subtle` | `#e8ecf0` | 行分割线、内部分隔 |
| 主文字 | `--text` | `#1f2328` | 近黑 |
| 次文字 | `--text-secondary` | `#59636e` | 描述、名称 |
| 弱文字 | `--text-muted` | `#8b949e` | 时间戳、标签 |
| 强调色 | `--accent` | `#946800` | 深金，替代 Ant 蓝 |
| 强调背景 | `--accent-bg` | `#fff8e1` | |
| 涨/正向 | `--green` | `#1a7f37` | 墨绿，非荧光绿 |
| 涨背景 | `--green-bg` | `#dafbe1` | |
| 跌/负向 | `--red` | `#a40e26` | 酒红，非亮红 |
| 跌背景 | `--red-bg` | `#ffebe9` | |
| 信息色 | `--blue` | `#0550ae` | 辅助（链接、图表） |

### 字体

```css
/* 正文 */
font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 数字/代码/Ticker */
font-family: 'DM Mono', 'JetBrains Mono', SFMono-Regular, monospace;
```

- 安装方式：Google Fonts CDN 或 `@fontsource/dm-sans` + `@fontsource/dm-mono`
- 数字一律使用等宽字体，确保表格对齐

### 字号体系

| 角色 | 大小 | 字重 | 字体 |
|------|------|------|------|
| 页面大数字 | 48-56px | 700 | DM Mono |
| 卡片标题数字 | 28px | 700 | DM Mono |
| 区块标题 | 13px | 600 | DM Sans |
| 正文 | 13-14px | 400 | DM Sans |
| 辅助/标签 | 11-12px | 500 | DM Sans |
| Ticker 代码 | 13-14px | 600 | DM Mono |

### 圆角与阴影

```css
--radius: 8px;
--shadow-sm: 0 1px 2px rgba(31, 35, 40, 0.04);
--shadow-md: 0 2px 8px rgba(31, 35, 40, 0.08);
```

---

## 2. 布局改造

### Header

- 高度 56px，纯白背景 + 底部 1px `--border-subtle`
- Logo：黑色方形 icon (border-radius: 6px) + 文字，取代蓝色
- 导航项：13px, font-weight 500, 选中态用 `--bg-emphasis` 背景 + font-weight 600（不用颜色高亮）
- 右侧：等宽字体显示最后更新时间

### 页面背景

- `body` / `ant-layout` 背景统一改为 `--bg` (#f6f8fa)
- 内容区取消 max-width 白色容器，让卡片自己承载白色

### 卡片系统

- 所有内容区块包裹在 `.card` 中：白色背景 + 1px border + shadow-sm
- Card Header：13px 粗体标题 + 右侧轻量 badge（pill 样式，灰底灰字）
- 行间距用 `--border-subtle` 分隔，最后一行无下划线

---

## 3. 组件级改造清单

### 3.1 Market Temperature 页面

**改造前**：大数字 + 简单维度列表
**改造后**：
- 顶部 Hero 卡片，左侧：eyebrow 标签 + 56px 大数字 + 状态 pill（金色圆角标签） + 一行文案
- 右侧：维度数字横排（DM Mono 24px + 12px 标签）
- 维度进度条：4px 高，圆角，绿/金/红色

### 3.2 Scores Overview 页面

**改造前**：stock-card 带彩色边框
**改造后**：
- 表格行布局：rank | ticker(等宽粗体) | name(灰) | change%(等宽,涨绿跌红) | score pill
- Score pill：小圆角方块，高分绿底绿字，中分金底金字，低分灰底灰字
- 行 hover 效果：`--bg-hover` 背景
- 取消边框色分类，改用 score pill 颜色传达信息

### 3.3 Momentum Leaders 页面

- 同 Scores 的表格行风格
- 额外增加 momentum 柱状进度条（紫色或蓝色）

### 3.4 Dashboard 页面

- 顶部 3 列 stat 卡片：eyebrow + 大数字 + 描述 + 底部细进度条
- 下方双列：左侧 scores 表格，右侧 signal feed

### 3.5 Grid Trading 页面

- 网格可视化保持，但线条改为 `--border` 色
- 当前价格标记用 `--blue`
- 触发的网格线用 `--accent` 高亮

### 3.6 Chart 页面

- 指标标签改为 pill 样式，选中态用 `--bg-emphasis`
- 图表区域保持全宽

### 3.7 Home 页面

- 简化为居中标题 + 副标题 + 一个 CTA 按钮
- CTA 按钮：黑底白字，border-radius 6px，不用蓝色

---

## 4. Ant Design 主题覆盖

通过 ConfigProvider 的 `theme` 属性全局覆盖：

```js
// theme.js
export default {
  token: {
    colorPrimary: '#1f2328',      // 主色改为近黑（按钮、开关）
    colorLink: '#0550ae',          // 链接用蓝
    colorSuccess: '#1a7f37',
    colorError: '#a40e26',
    colorWarning: '#946800',
    borderRadius: 8,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontFamilyCode: "'DM Mono', monospace",
    fontSize: 13,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f6f8fa',
    colorBorder: '#d1d9e0',
    colorBorderSecondary: '#e8ecf0',
    colorText: '#1f2328',
    colorTextSecondary: '#59636e',
    colorTextTertiary: '#8b949e',
    boxShadow: '0 1px 2px rgba(31,35,40,0.04)',
    boxShadowSecondary: '0 2px 8px rgba(31,35,40,0.08)',
  },
  components: {
    Button: {
      colorPrimary: '#1f2328',
      algorithm: true,
    },
    Card: {
      paddingLG: 24,
    },
    Table: {
      fontSize: 13,
    },
  },
}
```

---

## 5. 全局 CSS 改造要点

```css
/* 所有数字显示统一等宽 */
.mono, [data-type="number"], .stock-score, .stock-change {
  font-family: 'DM Mono', monospace;
  font-variant-numeric: tabular-nums;
}

/* 涨跌色 */
.up, .positive { color: var(--green); }
.down, .negative { color: var(--red); }

/* Score pill */
.score-pill {
  display: inline-block;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 4px;
}
.score-pill.high { color: var(--green); background: var(--green-bg); }
.score-pill.mid  { color: var(--accent); background: var(--accent-bg); }
.score-pill.low  { color: var(--text-muted); background: var(--bg-hover); }

/* 卡片统一样式 */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
```

---

## 6. 执行步骤（给 Claude 的指令顺序）

1. **读取项目结构**：了解 src 目录、路由文件、组件目录、样式文件位置
2. **安装字体**：在 index.html 或 main.ts 中引入 DM Sans + DM Mono
3. **创建 design tokens**：新建 `src/styles/tokens.css` 写入 CSS 变量
4. **覆盖 Ant Design 主题**：在 App.vue 或 main.ts 中配置 ConfigProvider theme
5. **改造全局样式**：body 背景、header 样式、通用 card 样式
6. **逐页改造组件**：按 3.1-3.7 的描述，每个页面逐一调整
7. **验证**：确保所有页面在新 tokens 下视觉一致

---

## 7. 参考

- 效果原型：`C:\Users\jerryyang\trader-design-demos\02-clean-financial.html`
- 设计关键词：克制、精确、等宽数字、金色强调、信息层次
