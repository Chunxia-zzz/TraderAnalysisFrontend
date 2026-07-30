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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
