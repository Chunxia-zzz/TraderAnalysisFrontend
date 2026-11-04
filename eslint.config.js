import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * ESLint flat config —— 强度刻意定为「essential」。
 *
 * 为什么不用 eslint-plugin-vue 的 flat/recommended：
 *   recommended 含大量纯风格规则（attributes-order / html-indent 等），在 6588 行存量代码上
 *   会产生成百条违例。为了避免「改一遍业务代码只为对齐缩进」，本项目只保留能挡住真 bug 的规则。
 *   **要升级强度需单独提 spec**（见 AGENTS.md §5、specs/003-frontend-ci-pipeline/plan.md）。
 *
 * 判定标准：这条规则能否指出一个「运行时会出错 / 逻辑写错」的问题？
 *   能 → 开；只是「看起来不够整齐」→ 不开。
 */
export default [
  {
    // 产物与依赖不参与检查（并不在版本控制里，但本地跑 lint 时要显式排除）
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },

  // 基础：真问题集合（no-unused-vars、no-undef、no-dupe-keys 等）
  js.configs.recommended,

  // Vue：essential = 只保留「写错就会坏」的规则
  ...pluginVue.configs['flat/essential'],

  {
    // 浏览器端源码
    files: ['src/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },

  {
    // 视图文件是「路由级页面」，不是可复用的基础组件，不存在与 HTML 原生标签重名的风险
    // （Backtest / Chart / Dashboard / Home / Livermore / Review ... 均非 HTML 元素）。
    // 启用该规则需要重命名 10 个视图文件并同步路由与 3 个 smoke 脚本 —— 属纯改名收益，
    // 与本次「接入 CI」的目标无关，故关闭并在此记录。
    files: ['src/views/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    // Node 侧：构建配置、验收脚本、单测
    files: [
      '*.config.js',
      'eslint.config.js',
      'scripts/**/*.mjs',
      'tests/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
]
