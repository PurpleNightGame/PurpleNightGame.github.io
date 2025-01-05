<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <img src="https://s21.ax1x.com/2024/12/08/pA72i5R.png" alt="Logo" class="logo">
      <h1>页面未找到</h1>
      <p>正在为您跳转到正确的地址...</p>
      <p class="countdown">{{ countdown }}秒后自动跳转</p>
      <n-button type="primary" @click="redirect" class="redirect-button">
        立即跳转
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'

const router = useRouter()
const countdown = ref(5)
let timer: number | null = null

const redirect = () => {
  const targetPath = '/member-management-system/'
  if (window.location.pathname !== targetPath) {
    window.location.href = targetPath
  }
}

onMounted(() => {
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      redirect()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.not-found-container {
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

.not-found-content {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.logo {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: 1rem;
  border: 4px solid rgba(156, 39, 176, 0.2);
  padding: 4px;
  background-color: white;
}

h1 {
  color: #7B1FA2;
  margin-bottom: 1rem;
  font-size: 2rem;
}

p {
  color: #666;
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.countdown {
  color: #9C27B0;
  font-weight: bold;
  font-size: 1.2rem;
  margin: 1rem 0;
}

.redirect-button {
  margin-top: 1rem;
  background: linear-gradient(to right, #9C27B0, #673AB7) !important;
  border: none !important;
  padding: 0.5rem 2rem !important;
  font-size: 1.1rem !important;
  transition: transform 0.3s ease !important;
}

.redirect-button:hover {
  transform: translateY(-2px);
  opacity: 0.9 !important;
}
</style> 