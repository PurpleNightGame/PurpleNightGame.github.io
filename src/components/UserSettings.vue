<template>
  <n-modal
    :show="modelValue"
    @update:show="$emit('update:modelValue', $event)"
    preset="card"
    title="用户设置"
    style="width: 500px"
    :mask-closable="false"
  >
    <n-form
      ref="formRef"
      :model="formValue"
      :rules="rules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="formValue.username" placeholder="请输入用户名" />
      </n-form-item>
      <n-form-item label="头像" path="avatar">
        <n-upload
          accept="image/*"
          :max="1"
          :default-file-list="defaultFileList"
          @change="handleAvatarChange"
          list-type="image-card"
          :show-file-list="true"
          :show-preview-button="true"
          :show-remove-button="true"
          :custom-request="() => {}"
          @remove="() => {
            formValue.avatar = ''
            defaultFileList.value = []
          }"
          :max-size="2 * 1024 * 1024"
          @exceed-size="() => message.error('图片大小不能超过 2MB')"
        >
          <template #trigger>
            <n-upload-trigger>
              <n-button>上传头像</n-button>
              <div style="margin-top: 8px; color: #666; font-size: 12px;">
                支持 jpg、png 格式，大小不超过 2MB
              </div>
            </n-upload-trigger>
          </template>
        </n-upload>
      </n-form-item>
      <n-form-item label="旧密码" path="oldPassword">
        <n-input
          v-model:value="formValue.oldPassword"
          type="password"
          placeholder="请输入旧密码"
          show-password-on="click"
        />
      </n-form-item>
      <n-form-item label="新密码" path="newPassword">
        <n-input
          v-model:value="formValue.newPassword"
          type="password"
          placeholder="请输入新密码"
          show-password-on="click"
        />
      </n-form-item>
      <n-form-item label="确认密码" path="confirmPassword">
        <n-input
          v-model:value="formValue.confirmPassword"
          type="password"
          placeholder="请确认新密码"
          show-password-on="click"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">
          保存
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { authService } from '../services/auth-service'
import AV from 'leancloud-storage'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const message = useMessage()
const loading = ref(false)
const formRef = ref(null)

// 表单数据
const formValue = reactive({
  username: '',
  avatar: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 默认头像列表
const defaultFileList = ref([])

// 表单验证规则
const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  oldPassword: {
    required: false,
    message: '请输入旧密码',
    trigger: 'blur',
    validator: (rule: any, value: string) => {
      if (formValue.newPassword && !value) {
        return new Error('修改密码时需要输入旧密码')
      }
      return true
    }
  },
  newPassword: {
    required: false,
    message: '请输入新密码',
    trigger: 'blur',
    validator: (rule: any, value: string) => {
      if (formValue.oldPassword && !value) {
        return new Error('请输入新密码')
      }
      if (value && value.length < 6) {
        return new Error('密码长度不能小于6位')
      }
      return true
    }
  },
  confirmPassword: {
    required: false,
    message: '请确认新密码',
    trigger: 'blur',
    validator: (rule: any, value: string) => {
      if (formValue.newPassword && !value) {
        return new Error('请确认新密码')
      }
      if (value !== formValue.newPassword) {
        return new Error('两次输入的密码不一致')
      }
      return true
    }
  }
}

// 初始化表单数据
const initFormData = () => {
  const user = authService.getCurrentUser()
  if (user) {
    formValue.username = user.username || ''
    formValue.avatar = user.avatar || ''
    if (formValue.avatar) {
      defaultFileList.value = [
        {
          id: 'avatar',
          name: '当前头像',
          status: 'finished',
          url: formValue.avatar
        }
      ]
    }
  }
}

// 压缩图片函数
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // 限制最大尺寸为 800px
        const maxSize = 800
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 转换为 Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            reject(new Error('图片压缩失败'))
          }
        }, 'image/jpeg', 0.8) // 设置 JPEG 质量为 0.8
      }
      img.onerror = () => reject(new Error('图片加载失败'))
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
  })
}

// 处理头像上传
const handleAvatarChange = async (options: { file: { file: File, url: string } }) => {
  try {
    if (options.file.file) {
      loading.value = true
      
      // 检查文件大小（限制为 2MB）
      if (options.file.file.size > 2 * 1024 * 1024) {
        throw new Error('图片大小不能超过 2MB')
      }
      
      // 压缩图片
      const compressedFile = await compressImage(options.file.file)
      
      // 创建 LeanCloud 文件对象
      const avatarFile = new AV.File('avatar_' + Date.now() + '.jpg', compressedFile)
      
      // 上传文件到 LeanCloud
      const savedFile = await avatarFile.save()
      
      // 获取文件的 URL
      const fileUrl = savedFile.url()
      
      // 更新表单数据
      formValue.avatar = fileUrl
      // 更新默认文件列表显示
      defaultFileList.value = [{
        id: 'avatar',
        name: '当前头像',
        status: 'finished',
        url: fileUrl
      }]
      
      message.success('头像上传成功')
    }
  } catch (error: any) {
    message.error('头像上传失败：' + error.message)
    // 清空上传状态
    defaultFileList.value = []
    formValue.avatar = ''
  } finally {
    loading.value = false
  }
}

// 处理取消
const handleCancel = () => {
  emit('update:modelValue', false)
}

// 处理提交
const handleSubmit = async () => {
  try {
    loading.value = true
    await formRef.value?.validate()
    
    // 构建更新数据
    const updateData: any = {
      username: formValue.username,
      avatar: formValue.avatar
    }

    // 只有在填写了密码字段时才更新密码
    if (formValue.oldPassword && formValue.newPassword) {
      updateData.oldPassword = formValue.oldPassword
      updateData.newPassword = formValue.newPassword
    }
    
    // 检查是否修改了用户名或密码
    const currentUser = authService.getCurrentUser()
    const needsRelogin = formValue.newPassword || 
      (currentUser && currentUser.username !== formValue.username)
    
    // 调用更新用户信息的服务
    await authService.updateUserInfo(updateData)
    
    message.success('保存成功')
    emit('success')
    emit('update:modelValue', false)

    // 如果修改了用户名或密码，提示用户重新登录
    if (needsRelogin) {
      message.info('由于修改了重要信息，需要重新登录')
      setTimeout(async () => {
        await authService.logout()
        window.location.href = '/login'
      }, 1500)
    }
  } catch (error: any) {
    if (error.message) {
      message.error(error.message)
    }
  } finally {
    loading.value = false
  }
}

// 监听对话框显示状态
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      initFormData()
    } else {
      formValue.oldPassword = ''
      formValue.newPassword = ''
      formValue.confirmPassword = ''
    }
  }
)
</script>

<style scoped>
.n-upload {
  display: flex;
  justify-content: center;
}
</style> 