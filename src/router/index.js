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
    path: '/users',
    name: 'users',
    component: () => import('../views/UserManagement.vue'),
    meta: { requireAdmin: true },
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

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 未登录 → 跳转登录页
  if (!to.meta.public && !token) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 已登录访问登录页 → 跳转首页
  if (to.name === 'login' && token) {
    return next({ name: 'home' })
  }

  // 需要 admin 权限的页面
  if (to.meta.requireAdmin && role !== 'admin') {
    return next({ name: 'home' })
  }

  next()
})

export default router
