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
        >
          <n-button>上传头像</n-button>
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

// 处理头像上传
const handleAvatarChange = (options: { file: { url: string } }) => {
  if (options.file.url) {
    formValue.avatar = options.file.url
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
    
    // 调用更新用户信息的服务
    await authService.updateUserInfo(updateData)
    
    message.success('保存成功')
    emit('success')
    emit('update:modelValue', false)
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