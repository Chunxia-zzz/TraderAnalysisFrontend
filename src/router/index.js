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
    path: '/scores-overview',
    name: 'scores-overview',
    component: () => import('../views/ScoresOverview.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/fundamental',
    name: 'fundamental',
    component: () => import('../views/Fundamental.vue'),
  },
  {
    path: '/watchlist-manage',
    name: 'watchlist-manage',
    component: () => import('../views/WatchlistManage.vue'),
  },
  {
    path: '/stock-filter',
    name: 'stock-filter',
    component: () => import('../views/StockFilter.vue'),
  },
  {
    path: '/backtest',
    name: 'backtest',
    component: () => import('../views/Backtest.vue'),
  },
  {
    path: '/grid-trading',
    name: 'grid-trading',
    component: () => import('../views/GridTrading.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
