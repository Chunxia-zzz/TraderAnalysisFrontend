# TraderAnalysis 视觉改造技术方案

> ⚠️ **本文档性质：v1 视觉改造设计稿（2026-06-18）。**
> 它描述的是「当时打算怎么改」，其中的色板 / 字体 / Ant token / 全局 CSS 已**落地并与代码一致**（§1、§4、§5 逐值核对无误）；
> 但 §2 与 §3 的**逐页布局描述已与现状脱节**（页面后来又重构过，Home 与 Dashboard 改动最大）。
> **判断页面现状请以 `docs/architecture.md` §6 与 `.vue` 源码为准，不要把本文档当现状依据。**
> 各节的现状对照见下方 §0。

## 0. 现状对照（2026-10-12 核对）

| 设计稿章节 | 当时的设想 | 现状 | 处理 |
|---|---|---|---|
| §1 色板 | 白/灰/金/墨绿/酒红 19 个变量 | ✅ **已落地**，与 `src/styles/tokens.css` **逐值一致** | 保留 |
| §1 色板（遗漏） | —— | 代码里另有 `--bg-emphasis: #1f2328`，**本文档未记录** | 已补入 §1 |
| §4 Ant token | 见下 | ✅ **已落地**，与 `src/styles/theme.js` **色值逐值一致**；唯 `fontFamily` / `fontFamilyCode` 两条字体串在本稿里被简化过，代码是完整版（见 §4 注） | 更正字体串 |
| §5 全局 CSS | `.mono` / `.score-pill` / `.card` 等 | ✅ **已落地**，与 `tokens.css` 一致；但 `.mono` **只作用于该类本身**，本稿并列列举的 `[data-type="number"]` / `.stock-score` / `.stock-change` 三个选择器代码中不存在（见 §5 注） | 更正选择器 |
| §2 Header 选中态 | 「用 `--bg-emphasis` 背景」 | ❌ 实际用 `--bg-hover`（`App.vue` 的 `.nav-item.router-link-active`） | 已更正 |
| §3.4 Dashboard | 顶部 3 列 stat + 左表格右 signal feed | ❌ 现为「选择器 + 基本面估值卡 + 道氏技术面卡 + 综合评分卡」，**无 signal feed** | 已更正 |
| §3.5 Grid Trading | 网格可视化改造 | ❌ **该页面已从仓库彻底删除**（`GridTrading.vue` 不存在、无路由、无 API 封装） | 已标注作废 |
| §3.7 Home | 「简化为居中标题 + 一个 CTA」 | ❌ 现为 6 段落地页（Hero / 核心能力 / 市场温度 / 六维评分系统 / 工作流程 / CTA）+ **暗浅主题切换** | 已更正 |
| §6 执行步骤 | 在 `main.ts` 中引字体 | ❌ 入口是 `src/main.js`（**无 `.ts`**） | 已更正 |

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
| **强强调底** | `--bg-emphasis` | `#1f2328` | ⚠️ 与 `--text` **同色**；只用于 seg / tab 这类需要「深底浅字」的控件，**配深色文字会隐形**（本项目曾因此踩坑，见 architecture.md §6.11） |
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
- 导航项：13px, font-weight 500, **选中态用 `--bg-hover` 背景 + font-weight 600（不用颜色高亮）**
  > ⚠️ 设计稿原写「选中态用 `--bg-emphasis` 背景」——实现时用的是 `--bg-hover`（`App.vue` 的 `.nav-item.router-link-active`）。
  > `--bg-emphasis`（`#1f2328`）只用在 Livermore 的 `.seg-item.active` 与 MarketTemperature 的 `.view-tab.active` 上。
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

### 3.2 Scores Overview 页面（⚠️ 该页当前未挂载路由）

**改造前**：stock-card 带彩色边框
**改造后**：
- 表格行布局：rank | ticker(等宽粗体) | name(灰) | score pill | 各类徽章
  > ⚠️ 设计稿原写「含 change%(等宽,涨绿跌红) 列」——**实现后的行内没有涨跌幅列**。
- Score pill：小圆角方块，高分绿底绿字，中分金底金字，低分灰底灰字
- 行 hover 效果：`--bg-hover` 背景
- 取消边框色分类，改用 score pill 颜色传达信息
- 落地时另加了**顶部 5 个筛选标签**（全部 / 可执行 / 严重超卖 / 超卖 / 中性）与止盈损展开行，设计稿未涉及

### 3.3 Momentum Leaders 页面

- 同 Scores 的表格行风格
- 额外增加 momentum 柱状进度条（紫色或蓝色）

### 3.4 Dashboard 页面

- 顶部 3 列 stat 卡片：eyebrow + 大数字 + 描述 + 底部细进度条
- 下方双列：左侧 scores 表格，右侧 signal feed

> ⚠️ **上述布局未按稿实现。** 当前 `Dashboard.vue` 是**单列三卡**结构：
> 标的选择器 + 日期 → 基本面估值卡 → 道氏技术面卡（三层趋势 / 关键位 / 盈亏比 / 形态 / 量能）→ 综合评分卡（`score.breakdown` 6 因子进度条）。
> **没有 signal feed，也没有独立的 scores 表格。**

### 3.5 Grid Trading 页面 —— ⚠️ 已作废

> **该页面已从仓库彻底删除**（2026-10-12 核对）：`src/views/GridTrading.vue` 不存在、
> `router/index.js` 无 `/grid-trading` 路由、`src/api/trader.js` 无 `getGridStatus` / `getGridOrders`。
> 后端 `/api/grid/status`、`/api/grid/orders` 与 `grid_*` 表**仍在**，前端展示层已拆掉。
> 因此本节描述的「网格可视化」在当前前端**没有对应实现**，仅作历史记录保留。

### 3.6 Chart 页面

- 指标标签改为 pill 样式
- 图表区域保持全宽

> ⚠️ 设计稿原写「选中态用 `--bg-emphasis`」。实际实现走 **ant-design `a-tag` 的 `:color` 属性**，
> 每个分组各自指定色值（如「关键位」选中为 `#d32f2f`），**不使用 `--bg-emphasis`**。

### 3.7 Home 页面

- 简化为居中标题 + 副标题 + 一个 CTA 按钮
- CTA 按钮：黑底白字，border-radius 6px，不用蓝色

> ⚠️ **实际实现远不止于此。** 当前 `Home.vue` 是**六段落地页**并带**暗/浅主题切换**：
> Hero（大标题 + 光环）→ 核心能力 → 市场温度 → 六维评分系统 → 工作流程 → CTA。
> `localStorage.home-theme` 记住主题选择，`.home[data-theme="dark|light"]` 切换。
> 另注：首页 CTA 区有一个 `<router-link to="/scores-overview">机会速览</router-link>`
> 指向**未注册路由**，属已知死链（见 architecture.md §6.4）。

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
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyCode: "'DM Mono', 'JetBrains Mono', monospace",
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

> ⚠️ **字体串核对（2026-10-12）**：上方两条字体声明已按 `src/styles/theme.js` 的真实值更正。
> 本稿初版写的是 `"'DM Sans', -apple-system, sans-serif"` 与 `"'DM Mono', monospace"`，
> 漏掉了 `BlinkMacSystemFont, 'Segoe UI'` 与 `'JetBrains Mono'` 两级回退，也与本文件 §1「字体」小节的全串不一致。
> 对比方法：`grep -n "fontFamily" src/styles/theme.js`。

---

## 5. 全局 CSS 改造要点

```css
/* 所有数字显示统一等宽 */
.mono {
  font-family: 'DM Mono', 'JetBrains Mono', SFMono-Regular, monospace;
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
  line-height: 1.4;
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

> ⚠️ **落地差异（2026-10-12 逐行核对 `src/styles/tokens.css`）**：本节三处已按真实文件更正 ——
> 1. `.mono` 初版写成选择器组 `.mono, [data-type="number"], .stock-score, .stock-change`，**后三个选择器在代码中不存在**（不存在按 `data-type` 自动套等宽的机制，需要等宽的元素直接挂 `.mono` 类）；
> 2. `.mono` 的字体串初版漏了 `'JetBrains Mono', SFMono-Regular` 两级回退；
> 3. `.score-pill` 初版漏了 `line-height: 1.4`。
>
> 上方 `.up/.positive`、`.down/.negative`、`.score-pill.high/mid/low`、`.card` 与代码一致。
> 对比方法：直接读 `src/styles/tokens.css`（全文仅 69 行）。

---

## 6. 执行步骤（给 Claude 的指令顺序）

1. **读取项目结构**：了解 src 目录、路由文件、组件目录、样式文件位置
2. **安装字体**：在 `index.html` 或 **`src/main.js`** 中引入 DM Sans + DM Mono
3. **创建 design tokens**：新建 `src/styles/tokens.css` 写入 CSS 变量
4. **覆盖 Ant Design 主题**：在 `App.vue` 或 **`src/main.js`** 中配置 ConfigProvider theme
   （实际落地在 `src/styles/theme.js`，由 `App.vue` 的 `<a-config-provider :theme="theme">` 消费）
5. **改造全局样式**：body 背景、header 样式、通用 card 样式
6. **逐页改造组件**：按 3.1-3.7 的描述，每个页面逐一调整
7. **验证**：确保所有页面在新 tokens 下视觉一致

> ⚠️ 设计稿原文写的是 `main.ts`，本项目入口是 **`src/main.js`**（无 TypeScript 文件）。

---

## 7. 参考

- 效果原型：`C:\Users\jerryyang\trader-design-demos\02-clean-financial.html`
- 设计关键词：克制、精确、等宽数字、金色强调、信息层次
