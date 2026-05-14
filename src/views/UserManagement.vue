<template>
  <div>
    <div class="page-header">
      <h2>用户管理</h2>
      <a-button type="primary" @click="showCreate = true">新建用户</a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="record.role === 'admin' ? 'gold' : 'blue'">
            {{ record.role === 'admin' ? '管理员' : '普通用户' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'is_active'">
          <a-badge
            :status="record.is_active ? 'success' : 'error'"
            :text="record.is_active ? '启用' : '禁用'"
          />
        </template>
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="openResetPwd(record)">重置密码</a-button>
            <a-button
              size="small"
              :danger="record.is_active"
              @click="toggleStatus(record)"
            >
              {{ record.is_active ? '禁用' : '启用' }}
            </a-button>
            <a-popconfirm
              title="确认删除该用户？"
              ok-text="删除"
              cancel-text="取消"
              ok-type="danger"
              @confirm="removeUser(record.username)"
            >
              <a-button size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新建用户 -->
    <a-modal v-model:open="showCreate" title="新建用户" @ok="handleCreate" :confirm-loading="submitting">
      <a-form :model="createForm" layout="vertical" style="margin-top: 16px">
        <a-form-item label="用户名">
          <a-input v-model:value="createForm.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model:value="createForm.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="createForm.role">
            <a-select-option value="member">普通用户（只读）</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重置密码 -->
    <a-modal v-model:open="showReset" :title="`重置密码：${resetTarget}`" @ok="handleReset" :confirm-loading="submitting">
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="新密码">
          <a-input-password v-model:value="newPassword" placeholder="请输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { listUsers, createUser, setUserStatus, resetUserPassword, deleteUser } from '../api/trader'

const users = ref([])
const loading = ref(false)
const submitting = ref(false)
const showCreate = ref(false)
const showReset = ref(false)
const resetTarget = ref('')
const newPassword = ref('')

const createForm = ref({ username: '', password: '', role: 'member' })

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '角色', key: 'role' },
  { title: '状态', key: 'is_active' },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  { title: '最后登录', dataIndex: 'last_login', key: 'last_login' },
  { title: '操作', key: 'actions', width: 220 },
]

async function fetchUsers() {
  loading.value = true
  try {
    const { data } = await listUsers()
    users.value = data.users
  } catch {
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.value.username || !createForm.value.password) {
    return message.warning('请填写用户名和密码')
  }
  submitting.value = true
  try {
    await createUser(createForm.value)
    message.success('用户创建成功')
    showCreate.value = false
    createForm.value = { username: '', password: '', role: 'member' }
    fetchUsers()
  } catch (e) {
    message.error(e.response?.data?.detail || '创建失败')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(record) {
  try {
    await setUserStatus(record.username, !record.is_active)
    message.success(`已${record.is_active ? '禁用' : '启用'} ${record.username}`)
    fetchUsers()
  } catch (e) {
    message.error(e.response?.data?.detail || '操作失败')
  }
}

function openResetPwd(record) {
  resetTarget.value = record.username
  newPassword.value = ''
  showReset.value = true
}

async function handleReset() {
  if (!newPassword.value) return message.warning('请输入新密码')
  submitting.value = true
  try {
    await resetUserPassword(resetTarget.value, newPassword.value)
    message.success('密码已重置')
    showReset.value = false
  } catch (e) {
    message.error(e.response?.data?.detail || '重置失败')
  } finally {
    submitting.value = false
  }
}

async function removeUser(username) {
  try {
    await deleteUser(username)
    message.success(`用户 ${username} 已删除`)
    fetchUsers()
  } catch (e) {
    message.error(e.response?.data?.detail || '删除失败')
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
