<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2 class="login-title">登录</h2>
      <a-alert
        v-if="errorMsg"
        :message="errorMsg"
        type="error"
        show-icon
        style="margin-bottom: 24px"
      />
      <a-form :model="form" @finish="handleLogin" layout="vertical">
        <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="form.username" placeholder="请输入用户名" size="large" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" placeholder="请输入密码" size="large" @pressEnter="handleLogin" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading" block size="large">
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await axios.post('/api/auth/login', {
      username: form.username,
      password: form.password,
    })
    if (data.access_token) {
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('username', form.username)
      const redirect = router.currentRoute.value.query.redirect || '/'
      router.replace(redirect)
    } else {
      errorMsg.value = data.message || '用户名或密码错误'
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.detail || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 32px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.login-title {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 32px;
}
</style>
