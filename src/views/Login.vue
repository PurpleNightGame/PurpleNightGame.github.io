<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-container">
        <img src="https://s21.ax1x.com/2024/12/08/pA72i5R.png" alt="系统Logo" class="logo" />
      </div>
      <h2>成员管理系统</h2>
      <div class="input-group">
        <input 
          v-model="username" 
          type="text" 
          placeholder="用户名"
          @keyup.enter="handleLogin"
        />
      </div>
      <div class="input-group password-group">
        <input 
          v-model="password" 
          :type="showPassword ? 'text' : 'password'" 
          placeholder="密码"
          @keyup.enter="handleLogin"
        />
        <button 
          type="button" 
          class="toggle-password"
          @click="showPassword = !showPassword"
          :title="showPassword ? '隐藏密码' : '显示密码'"
        >
          {{ showPassword ? '👁️' : '👁️‍🗨️' }}
        </button>
      </div>
      <div class="remember-login">
        <label class="checkbox-label">
          <div class="custom-checkbox">
            <input 
              type="checkbox" 
              v-model="rememberLogin"
            />
            <span class="checkmark"></span>
          </div>
          <span class="label-text">记住登录状态</span>
        </label>
      </div>
      <button @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { authService } from '../services/auth-service'

const router = useRouter()
const message = useMessage()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const rememberLogin = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  try {
    loading.value = true
    error.value = ''
    console.log('尝试登录:', username.value)
    const user = await authService.login(username.value, password.value)
    console.log('登录成功:', user)
    message.success('登录成功')
    
    // 如果选择了记住登录状态，将登录信息保存到 localStorage
    if (rememberLogin.value) {
      localStorage.setItem('rememberLogin', 'true')
      localStorage.setItem('username', username.value)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('sessionToken', user.sessionToken)
      localStorage.setItem('userId', user.id)
    } else {
      localStorage.removeItem('rememberLogin')
      localStorage.removeItem('username')
      localStorage.removeItem('userRole')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('userId')
    }
    
    // 根据用户角色重定向
    if (user.role === 'admin') {
      await router.push('/hr')
    } else {
      await router.push('/training')
    }
  } catch (error: any) {
    console.error('登录错误:', error)
    message.error('登录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 在组件挂载时检查是否有保存的登录状态
onMounted(async () => {
  const remembered = localStorage.getItem('rememberLogin')
  const savedUsername = localStorage.getItem('username')
  const sessionToken = localStorage.getItem('sessionToken')
  const userRole = localStorage.getItem('userRole')
  const userId = localStorage.getItem('userId')

  if (remembered === 'true' && savedUsername && sessionToken && userRole && userId) {
    try {
      // 验证保存的会话是否有效
      const user = await authService.validateSession(sessionToken)
      if (user) {
        username.value = savedUsername
        rememberLogin.value = true
        // 自动重定向到相应页面
        if (userRole === 'admin') {
          await router.push('/hr')
        } else {
          await router.push('/training')
        }
      }
    } catch (error) {
      // 如果会话无效，清除所有存储的登录信息
      localStorage.removeItem('rememberLogin')
      localStorage.removeItem('username')
      localStorage.removeItem('userRole')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('userId')
    }
  }
})
</script>

<style>
/* 全局 CSS 变量 */
:root {
  --primary-color: #6B46C1;
  --primary-light: #805AD5;
  --primary-dark: #553C9A;
  --background-start: #F3E8FF;
  --background-end: #E9D8FD;
  --border-color: #D6BCFA;
  --text-color: #2D3748;
  --placeholder-color: #A0AEC0;
  --error-color: #E53E3E;
  --shadow-color: rgba(107, 70, 193, 0.15);
  --focus-shadow-color: rgba(107, 70, 193, 0.2);
  --box-background: rgba(255, 255, 255, 0.95);
}
</style>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #9C27B0, #673AB7);
  animation: gradientBG 15s ease infinite;
  background-size: 400% 400%;
}

@keyframes gradientBG {
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
}

.login-box {
  background: var(--box-background);
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}

.logo-container {
  text-align: center;
  margin-bottom: 2rem;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  width: 180px;
  height: 180px;
  object-fit: cover;
  display: block;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 20px rgba(107, 70, 193, 0.2);
  background-color: white;
  padding: 8px;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--primary-dark);
  font-weight: 600;
  font-size: 1.75rem;
}

.input-group {
  margin-bottom: 1.2rem;
}

input {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  color: var(--text-color);
  background-color: rgba(255, 255, 255, 0.9);
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--focus-shadow-color);
  background-color: white;
}

input::placeholder {
  color: var(--placeholder-color);
}

button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(to right, #9C27B0, #673AB7);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

button:hover:not(:disabled) {
  background: linear-gradient(to right, #673AB7, #9C27B0);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(156, 39, 176, 0.3);
}

button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(156, 39, 176, 0.2);
}

button:disabled {
  background: #B39DDB;
  cursor: not-allowed;
  opacity: 0.7;
}

.error-message {
  color: var(--error-color);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  background: rgba(229, 62, 62, 0.1);
  padding: 0.5rem;
  border-radius: 8px;
}

.password-group {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--placeholder-color);
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;
  width: auto;
}

.toggle-password:hover {
  color: var(--primary-color);
  background: none;
  transform: translateY(-50%);
  box-shadow: none;
}

.toggle-password:active {
  transform: translateY(-50%);
  box-shadow: none;
}

/* 调整密码输入框的内边距，为按钮留出空间 */
.password-group input {
  padding-right: 3rem;
}

.remember-login {
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
  color: var(--text-color);
  transition: all 0.3s ease;
}

.custom-checkbox {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-right: 8px;
}

.custom-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 18px;
  width: 18px;
  background-color: white;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.custom-checkbox input:checked ~ .checkmark {
  background-color: #9C27B0;
  border-color: #9C27B0;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-label:hover .checkmark {
  border-color: #9C27B0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.label-text {
  color: var(--text-color);
  font-weight: 500;
  transition: color 0.3s ease;
}

.checkbox-label:hover .label-text {
  color: #9C27B0;
}
</style> 