import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/chart',
    name: 'chart',
    component: () => import('../views/Chart.vue'),
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
