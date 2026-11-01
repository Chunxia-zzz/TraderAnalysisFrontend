import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/market-temperature',
    name: 'market-temperature',
    component: () => import('../views/MarketTemperature.vue'),
  },
  {
    path: '/chart',
    name: 'chart',
    component: () => import('../views/Chart.vue'),
  },
  {
    path: '/momentum-leaders',
    name: 'momentum-leaders',
    component: () => import('../views/MomentumLeaders.vue'),
  },
  {
    path: '/livermore',
    name: 'livermore',
    component: () => import('../views/Livermore.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/backtest',
    name: 'backtest',
    component: () => import('../views/Backtest.vue'),
  },
  {
    path: '/watchlist-manage',
    name: 'watchlist-manage',
    component: () => import('../views/WatchlistManage.vue'),
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('../views/Review.vue'),
  },
  // 已下线（2026-11-02）：旧地址保留重定向，避免书签/历史记录打开后白屏。
  // 见 specs/002-retire-position-allocation/
  {
    path: '/position',
    redirect: '/',
  },
  {
    path: '/allocation',
    redirect: '/',
  },
  {
    path: '/scores-overview',
    name: 'scores-overview',
    component: () => import('../views/ScoresOverview.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
