<template>
  <div class="login-container">
    <div class="login-wrapper">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-overlay"></div>
        <div class="brand-content">
          <div class="brand-text">
            <h1 class="brand-title">紫 夜 公 会</h1>
            <div class="title-decoration"></div>
            <p class="brand-subtitle">Guild Member Management</p>
          </div>
          <div class="decoration-circles">
            <div class="circle circle-1"></div>
            <div class="circle circle-2"></div>
            <div class="circle circle-3"></div>
          </div>
        </div>
      </div>

      <!-- 右侧登录区域 -->
      <div class="login-section">
        <div class="login-box">
          <div class="login-header">
            <h2>欢 迎 回 来</h2>
            <p class="login-subtitle">登录您的账号以继续</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="input-group">
              <label>
                <span class="label-text">用户名</span>
                <div class="input-wrapper">
                  <input 
                    v-model="username" 
                    type="text" 
                    placeholder="请输入用户名"
                    @keyup.enter="handleLogin"
                  />
                  <span class="input-focus-border"></span>
                </div>
              </label>
            </div>

            <div class="input-group">
              <label>
                <span class="label-text">密码</span>
                <div class="input-wrapper">
                  <input 
                    v-model="password" 
                    :type="showPassword ? 'text' : 'password'" 
                    placeholder="请输入密码"
                    @keyup.enter="handleLogin"
                  />
                  <button 
                    type="button" 
                    class="toggle-password"
                    @click="showPassword = !showPassword"
                  >
                    <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <span class="input-focus-border"></span>
                </div>
              </label>
            </div>

            <div class="form-footer">
              <label class="remember-me">
                <input 
                  type="checkbox" 
                  v-model="rememberLogin"
                />
                <span class="checkmark"></span>
                <span>记住登录</span>
              </label>
            </div>

            <button 
              type="submit"
              class="login-button" 
              :class="{ 'loading': loading }"
              :disabled="loading"
            >
              <span class="button-content">
                {{ loading ? '登录中...' : '登 录' }}
              </span>
            </button>

            <div v-if="error" class="error-container">
              <p class="error-message">{{ error }}</p>
            </div>
          </form>
        </div>
      </div>
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
    const user = await authService.login(username.value, password.value)
    message.success('登录成功')
    
    localStorage.setItem('sessionToken', user.sessionToken)
    localStorage.setItem('userId', user.id)
    localStorage.setItem('userRole', user.role)
    
    if (rememberLogin.value) {
      localStorage.setItem('rememberLogin', 'true')
      localStorage.setItem('username', username.value)
    } else {
      localStorage.removeItem('rememberLogin')
      localStorage.removeItem('username')
    }
    
    if (user.role === 'admin') {
      await router.push('/hr')
    } else {
      await router.push('/training')
    }
  } catch (err: any) {
    console.error('登录错误:', err)
    if (err.message.includes('Could not find user')) {
      error.value = '用户名或密码错误'
    } else if (err.message.includes('Invalid username/password')) {
      error.value = '用户名或密码错误'
    } else if (err.message.includes('Request timeout')) {
      error.value = '网络请求超时，请稍后重试'
    } else if (err.message.includes('Network error')) {
      error.value = '网络连接错误，请检查网络设置'
    } else {
      error.value = '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const remembered = localStorage.getItem('rememberLogin')
  const savedUsername = localStorage.getItem('username')
  const sessionToken = localStorage.getItem('sessionToken')
  const userRole = localStorage.getItem('userRole')
  const userId = localStorage.getItem('userId')

  if (remembered === 'true' && savedUsername && sessionToken && userRole && userId) {
    try {
      const user = await authService.validateSession(sessionToken)
      if (user) {
        username.value = savedUsername
        rememberLogin.value = true
        if (userRole === 'admin') {
          await router.push('/hr')
        } else {
          await router.push('/training')
        }
      }
    } catch (error) {
      localStorage.removeItem('rememberLogin')
      localStorage.removeItem('username')
      localStorage.removeItem('userRole')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('userId')
    }
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: url('https://s21.ax1x.com/2024/07/04/pk2OYyq.png') center/cover fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.login-wrapper {
  width: 100%;
  max-width: 1200px;
  min-height: 600px;
  display: flex;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  background: rgba(121, 40, 202, 0.3);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-overlay {
  display: none;
}

.brand-content {
  position: relative;
  z-index: 1;
  width: 100%;
}

.brand-text {
  text-align: left;
  color: white;
  position: relative;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.brand-title {
  font-size: 4rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.2;
  color: white;
  -webkit-text-fill-color: white;
  background: none;
  position: relative;
}

.title-decoration {
  width: 100px;
  height: 4px;
  background: white;
  margin: 20px 0;
  position: relative;
  overflow: hidden;
}

.title-decoration::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.3);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% { transform: translateX(200%); }
}

.brand-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.decoration-circles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -150px;
  animation: float 8s ease-in-out infinite;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: 50px;
  left: -100px;
  animation: float 12s ease-in-out infinite;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: -75px;
  right: 50px;
  animation: float 10s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

/* 右侧登录区域 */
.login-section {
  width: 480px;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  backdrop-filter: blur(10px);
}

.login-box {
  width: 100%;
}

.login-header {
  margin-bottom: 40px;
  text-align: center;
}

.login-header h2 {
  font-size: 2rem;
  color: #1a1a1a;
  margin: 0;
  font-weight: 700;
}

.login-subtitle {
  color: #666;
  margin-top: 8px;
  font-size: 1rem;
}

.login-form {
  width: 100%;
}

.input-group {
  margin-bottom: 24px;
}

.label-text {
  display: block;
  margin-bottom: 8px;
  color: #1a1a1a;
  font-weight: 500;
  font-size: 0.9rem;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1rem;
  border: 2px solid #eee;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #7928CA;
  background: white;
  box-shadow: 0 0 0 4px rgba(121, 40, 202, 0.1);
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.toggle-password:hover {
  color: #7928CA;
  background: rgba(121, 40, 202, 0.1);
}

.toggle-password svg {
  transition: all 0.3s;
}

.toggle-password:active svg {
  transform: scale(0.9);
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.remember-me input {
  position: absolute;
  opacity: 0;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-right: 8px;
  position: relative;
  transition: all 0.2s;
}

.remember-me:hover .checkmark {
  border-color: #7928CA;
}

.remember-me input:checked ~ .checkmark {
  background: #7928CA;
  border-color: #7928CA;
}

.remember-me input:checked ~ .checkmark:after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.login-button {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(121, 40, 202, 0.9), rgba(255, 0, 128, 0.9));
  backdrop-filter: blur(5px);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255,255,255,0.2),
    transparent
  );
  transition: 0.5s;
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(121,40,202,0.3);
}

.login-button:active {
  transform: translateY(0);
}

.login-button.loading {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error-container {
  margin-top: 24px;
  padding: 12px;
  background: rgba(255,59,48,0.08);
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255,59,48,0.2);
}

.error-message {
  color: #ff3b30;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

@media (max-width: 1024px) {
  .login-wrapper {
    max-width: 900px;
  }
  
  .brand-section {
    padding: 40px;
  }
  
  .brand-title {
    font-size: 3rem;
  }
}

@media (max-width: 768px) {
  .login-container {
    padding: 0;
    background-attachment: scroll;
    min-height: 100vh;
  }

  .login-container::before {
    backdrop-filter: blur(5px);
    background: rgba(0, 0, 0, 0.5);
  }

  .login-wrapper {
    flex-direction: column;
    min-height: 100vh;
    max-height: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    border: none;
  }
  
  .brand-section {
    flex: none;
    height: 35vh;
    min-height: 280px;
    padding: 20px;
    background: rgba(121, 40, 202, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .brand-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .brand-text {
    text-align: center;
  }
  
  .brand-title {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }
  
  .title-decoration {
    margin: 15px auto;
    width: 60px;
    height: 3px;
  }
  
  .brand-subtitle {
    font-size: 1rem;
  }

  .decoration-circles {
    display: none;
  }
  
  .login-section {
    flex: 1;
    width: 100%;
    padding: 30px 20px;
    background: rgba(255, 255, 255, 0.98);
    display: flex;
    align-items: flex-start;
    border-radius: 30px 30px 0 0;
    margin-top: -30px;
  }
  
  .login-box {
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }

  .login-header {
    margin-bottom: 30px;
  }

  .login-header h2 {
    font-size: 1.8rem;
  }

  .login-subtitle {
    font-size: 0.9rem;
  }

  .input-group {
    margin-bottom: 20px;
  }

  .input-wrapper input {
    padding: 12px 14px;
    font-size: 0.95rem;
  }

  .label-text {
    font-size: 0.85rem;
  }

  .form-footer {
    margin-bottom: 20px;
  }

  .login-button {
    padding: 12px;
    font-size: 0.95rem;
    border-radius: 10px;
  }

  .error-container {
    margin-top: 20px;
  }
}

@media (max-width: 480px) {
  .login-container {
    background-position: center;
  }

  .brand-section {
    height: 30vh;
    min-height: 220px;
    padding: 15px;
  }
  
  .brand-title {
    font-size: 2rem;
  }
  
  .login-section {
    padding: 25px 15px;
  }

  .login-header h2 {
    font-size: 1.6rem;
  }

  .input-wrapper input {
    padding: 10px 12px;
    font-size: 0.9rem;
  }

  .remember-me span {
    font-size: 0.85rem;
  }

  .checkmark {
    width: 16px;
    height: 16px;
  }
}

@media (max-height: 667px) {
  .brand-section {
    height: auto;
    padding: 30px 20px;
  }

  .brand-title {
    font-size: 1.8rem;
  }

  .title-decoration {
    margin: 10px auto;
  }

  .login-section {
    padding-top: 20px;
  }
}

@media (orientation: landscape) and (max-height: 480px) {
  .login-wrapper {
    flex-direction: row;
  }

  .brand-section {
    width: 35%;
    height: 100vh;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: none;
  }

  .login-section {
    width: 65%;
    margin-top: 0;
    border-radius: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .login-box {
    padding: 20px 0;
  }
}
</style> 