import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import { initializeTables } from './utils/leancloud-init'

// 初始化数据表
initializeTables().then(() => {
  console.log('数据表初始化完成')
}).catch(error => {
  console.error('数据表初始化失败:', error)
})

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(naive)
app.mount('#app') 