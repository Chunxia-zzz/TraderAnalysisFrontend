import { defineConfig } from 'vitest/config'

/**
 * 单测配置：只跑纯逻辑，不启动浏览器、不连后端。
 *
 * 为什么是 node 环境而不是 jsdom：
 *   本目录测的是「请求怎么构造」「路由表是否指向真实文件」「文档与代码是否一致」，
 *   都不需要 DOM。引入 jsdom 会多 3 个依赖，且让测试变慢 —— 收益不成比例。
 *   需要真实浏览器验证的走 scripts/smoke-*.mjs（constitution §三 的质量门）。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.js'],
    // 不开全局 API：每个用例显式 import describe/it/expect，读起来不依赖隐式约定
    globals: false,
  },
})
