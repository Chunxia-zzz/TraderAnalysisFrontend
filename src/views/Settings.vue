<template>
  <div class="settings-page">
    <!-- 用户信息 -->
    <a-card title="账户信息" :bordered="false" style="margin-bottom: 16px">
      <a-spin :spinning="userLoading">
        <a-descriptions v-if="userInfo" :column="2">
          <a-descriptions-item label="用户名">{{ userInfo.username }}</a-descriptions-item>
          <a-descriptions-item label="角色">
            <a-tag :color="userInfo.role === 'admin' ? 'red' : 'blue'">{{ userInfo.role }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ userInfo.created_at }}</a-descriptions-item>
          <a-descriptions-item label="最后登录">{{ userInfo.last_login }}</a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-card>

    <!-- 修改密码 -->
    <a-card title="修改密码" :bordered="false">
      <a-alert v-if="pwdMsg" :message="pwdMsg" :type="pwdSuccess ? 'success' : 'error'" show-icon style="margin-bottom: 16px" />
      <a-form :model="pwdForm" layout="vertical" style="max-width: 400px" @finish="handleChangePassword">
        <a-form-item label="当前密码" name="old_password" :rules="[{ required: true, message: '请输入当前密码' }]">
          <a-input-password v-model:value="pwdForm.old_password" placeholder="当前密码" />
        </a-form-item>
        <a-form-item label="新密码" name="new_password" :rules="[{ required: true, message: '请输入新密码' }]">
          <a-input-password v-model:value="pwdForm.new_password" placeholder="新密码" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirm_password" :rules="[{ required: true, message: '请确认新密码' }]">
          <a-input-password v-model:value="pwdForm.confirm_password" placeholder="确认新密码" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="pwdLoading">确认修改</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAuthMe, changePassword } from '../api/trader'

// 用户信息
const userLoading = ref(false)
const userInfo = ref(null)

async function fetchUser() {
  userLoading.value = true
  try {
    const { data } = await getAuthMe()
    userInfo.value = data
  } catch (e) {
    // 401 由拦截器处理
  } finally {
    userLoading.value = false
  }
}

// 修改密码
const pwdLoading = ref(false)
const pwdMsg = ref('')
const pwdSuccess = ref(false)
const pwdForm = reactive({ old_password: '', new_password: '', confirm_password: '' })

async function handleChangePassword() {
  pwdMsg.value = ''
  if (pwdForm.new_password !== pwdForm.confirm_password) {
    pwdMsg.value = '两次输入的新密码不一致'
    pwdSuccess.value = false
    return
  }
  pwdLoading.value = true
  try {
    const { data } = await changePassword(pwdForm.old_password, pwdForm.new_password)
    if (data.data === null) {
      pwdMsg.value = data.message
      pwdSuccess.value = false
    } else {
      pwdMsg.value = data.message || '密码修改成功'
      pwdSuccess.value = true
      Object.assign(pwdForm, { old_password: '', new_password: '', confirm_password: '' })
    }
  } catch (e) {
    pwdMsg.value = e.response?.data?.detail || '修改失败'
    pwdSuccess.value = false
  } finally {
    pwdLoading.value = false
  }
}

onMounted(fetchUser)
</script>

<style scoped>
.settings-page {
  padding: 0;
}
</style>
