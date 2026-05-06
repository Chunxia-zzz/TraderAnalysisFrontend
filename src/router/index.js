import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { public: true },
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
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局前置守卫：未登录则跳转 /login
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) {
    return { name: 'login' }
  }
})

export default router
