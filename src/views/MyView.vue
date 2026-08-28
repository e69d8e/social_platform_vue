<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  updateUserInfoApi,
  updatePasswordApi,
  logoutApi,
  getUserInfoApi,
} from "@/api/userApi";
import { uploadAvatar } from "@/api/uploadApi";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import PageHeader from "@/components/PageHeader.vue";
import ImageCropper from "@/components/ImageCropper.vue";
import compressImage from "@/utils/compressImage";
import formattedCount from "@/utils/formattedCount";
import { Male, Female, Plus } from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();

// 始终跟随 store，避免 setInfo 整体替换后本地引用失效
const userInfo = computed(() => userStore.userInfo);

const imageUrl = ref(userStore.userInfo.avatar || "");
const previewUrl = ref("");
const file = ref(null);
const loading = ref(false);
const initLoading = ref(true);

const ruleFormRef = ref();
const passwordFormRef = ref();
const dialogFormVisible = ref(false);
const dialogVisible = ref(false);
const cropperVisible = ref(false);
const cropperFile = ref(null);

const ruleForm = reactive({ ...userStore.userInfo });

const getUserInfo = async () => {
  const res = await getUserInfoApi();
  const data = res.data.data;
  Object.assign(ruleForm, data);
  userStore.setInfo(data);
  imageUrl.value = data.avatar || "";
};

onMounted(async () => {
  try {
    await getUserInfo();
  } finally {
    initLoading.value = false;
  }
});

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

const rules = reactive({
  nickname: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length < 2 || value.length > 16)
          callback(new Error("用户名长度不能小于 2 或大于 16"));
        else callback();
      },
      trigger: "blur",
    },
  ],
  gender: [{ required: true, message: "请选择性别", trigger: "blur" }],
});

const beforeAvatarUpload = (rawFile) => {
  // 大小校验放在裁切压缩之后，这里只校验格式
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    ElMessage.error("图像格式应为 jpeg/png");
    return false;
  }
  return true;
};

const handleAvatarChange = (uploadFile) => {
  const raw = uploadFile.raw;
  if (!raw) return;

  // auto-upload=false 时 before-upload 不一定触发，这里只兜底校验格式
  if (!["image/jpeg", "image/png"].includes(raw.type)) {
    ElMessage.error("图像格式应为 jpeg/png");
    return;
  }

  cropperFile.value = raw;
  cropperVisible.value = true;
};

// 头像裁切完成：先压缩再校验大小（针对压缩结果），通过后替换待上传文件
const onAvatarCropped = async (croppedFile) => {
  try {
    const compressed = await compressImage(croppedFile, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.85,
    });
    if (compressed.size / 1024 / 1024 > 2) {
      ElMessage.error("头像压缩后仍超过 2MB，请更换图片");
      return;
    }
    file.value = compressed;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(compressed);
    imageUrl.value = previewUrl.value;
  } catch {
    ElMessage.error("图片处理失败，请重新选择");
  }
};

const submitForm = async (formEl) => {
  if (!formEl) return;
  try {
    await formEl.validate();
  } catch {
    ElMessage.error("请填写正确的信息");
    return;
  }

  loading.value = true;
  try {
    if (file.value) {
      const res = await uploadAvatar(file.value);
      if (res.data.code !== 1) return;
      ruleForm.avatar = res.data.data;
      imageUrl.value = res.data.data;
    }
    const res = await updateUserInfoApi({ ...ruleForm });
    if (res.data.code !== 1) return;
    // 同步 store，让全局头像/昵称即时更新
    userStore.setInfo({ ...userStore.userInfo, ...ruleForm });
    file.value = null;
    ElMessage.success(res.data.message || "修改成功");
  } finally {
    loading.value = false;
  }
};

const passwordForm = ref({ password: "", confirmPassword: "" });
const passwordRules = reactive({
  password: [
    {
      validator: (rule, value, callback) => {
        if (!value) return callback(new Error("密码不能为空"));
        if (value.length < 6 || value.length > 16)
          callback(new Error("密码应该为 6-16 位字符"));
        else callback();
      },
      trigger: "blur",
    },
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (!value) return callback(new Error("请输入确认密码"));
        if (value !== passwordForm.value.password)
          callback(new Error("两次输入的密码不一致"));
        else callback();
      },
      trigger: "blur",
    },
  ],
});

const changePassword = async (formEl) => {
  if (!formEl) return;
  try {
    await formEl.validate();
  } catch {
    ElMessage.error("请检查输入");
    return;
  }

  loading.value = true;
  try {
    const res = await updatePasswordApi(passwordForm.value.password);
    if (res.data.code === 1) {
      ElMessage.success(res.data.message || "修改成功");
      dialogFormVisible.value = false;
      passwordForm.value = { password: "", confirmPassword: "" };
    }
  } finally {
    loading.value = false;
  }
};

const logout = async () => {
  try {
    const res = await logoutApi();
    if (res.data.code !== 1) return;
    userStore.removeInfo();
    dialogVisible.value = false;
    ElMessage.success(res.data.message || "已注销");
    router.push("/login");
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
};

const fansCount = computed(() => formattedCount(userInfo.value.fansCount || 0));
</script>

<template>
  <div class="my-page" v-loading="initLoading">
    <PageHeader title="个人中心" large />

    <div class="profile-card">
      <el-upload
        class="avatar-uploader"
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleAvatarChange"
        :before-upload="beforeAvatarUpload"
      >
        <img v-if="imageUrl" :src="imageUrl" class="avatar" alt="头像" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>

      <div class="user-meta">
        <h3 class="nickname">{{ userInfo.nickname || "未设置昵称" }}</h3>
        <el-text
          :type="
            userInfo.authorityId === 3
              ? 'primary'
              : userInfo.authorityId === 2
                ? 'danger'
                : 'success'
          "
          size="small"
        >
          @{{ userInfo.username }}
        </el-text>
        <AuthorityComponent :authority-id="userInfo.authorityId" />
      </div>

      <div class="stat-buttons">
        <el-button
          size="small"
          @click="$router.push('/fans/' + userInfo.id)"
          type="primary"
          plain
          >{{ fansCount }} 粉丝</el-button
        >
        <el-button
          size="small"
          @click="$router.push('/follow/' + userInfo.id)"
          type="primary"
          plain
          >我的关注</el-button
        >
        <el-button
          size="small"
          @click="$router.push('/friends')"
          type="primary"
          plain
          >我的好友</el-button
        >
        <el-button
          v-if="userInfo.authorityId === 3"
          size="small"
          @click="$router.push('/posts/banned')"
          type="primary"
          plain
          >我的封禁</el-button
        >
        <el-button
          v-if="userInfo.authorityId === 2"
          size="small"
          @click="$router.push('/users/banned')"
          type="primary"
          plain
          >我的封禁</el-button
        >
        <el-button
          v-if="userInfo.authorityId === 2"
          size="small"
          @click="$router.push('/admin/dashboard')"
          type="primary"
          plain
          >数据面板</el-button
        >
      </div>

      <div class="security-actions">
        <el-button size="small" @click="dialogFormVisible = true"
          >修改密码</el-button
        >
        <el-button
          size="small"
          type="danger"
          :loading="loading"
          @click="dialogVisible = true"
          >注销</el-button
        >
      </div>
    </div>

    <div class="form-card">
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        status-icon
        :rules="rules"
        label-width="auto"
        label-position="top"
      >
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="ruleForm.nickname"
            maxlength="16"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="ruleForm.gender">
            <el-radio :value="0">未知</el-radio>
            <el-radio :value="1"
              ><el-icon><Male /></el-icon> 男</el-radio
            >
            <el-radio :value="2"
              ><el-icon><Female /></el-icon> 女</el-radio
            >
          </el-radio-group>
        </el-form-item>
        <el-form-item label="隐藏我的关注" prop="followPrivate">
          <el-radio-group v-model="ruleForm.followPrivate">
            <el-radio :value="true">隐私</el-radio>
            <el-radio :value="false">可见</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="隐藏我的粉丝" prop="fansPrivate">
          <el-radio-group v-model="ruleForm.fansPrivate">
            <el-radio :value="true">隐私</el-radio>
            <el-radio :value="false">可见</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="简介" prop="bio">
          <el-input
            v-model="ruleForm.bio"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="submitForm(ruleFormRef)"
            :loading="loading"
            >确认修改</el-button
          >
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-dialog v-model="dialogFormVisible" title="修改密码" width="440" center>
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-position="top"
      >
        <el-form-item label="请输入新密码" prop="password">
          <el-input
            type="password"
            v-model="passwordForm.password"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            type="password"
            v-model="passwordForm.confirmPassword"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="changePassword(passwordFormRef)"
          >确认</el-button
        >
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" title="确认注销？" width="400" center>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="logout"
          >确认</el-button
        >
      </template>
    </el-dialog>

    <ImageCropper
      v-model="cropperVisible"
      :file="cropperFile"
      title="裁切头像"
      :aspect-ratio="1"
      @confirm="onAvatarCropped"
    />
  </div>
</template>

<style lang="scss" scoped>
.my-page {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px 16px 40px;
}

.profile-card {
  text-align: center;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 28px 24px 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  margin-bottom: 20px;

  .avatar-uploader {
    display: block;
    margin: 0 auto 16px;
  }

  .avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    object-fit: cover;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    border: 3px solid transparent;
    background-image: var(--gradient-primary);
    background-origin: border-box;
    background-clip: padding-box, border-box;
    transition: transform var(--transition-base);

    &:hover {
      transform: scale(1.05);
    }
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 14px 0 8px;
  }

  .nickname {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: var(--text-placeholder);
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 1px dashed var(--border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color var(--transition-base);

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  .stat-buttons {
    display: flex;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 16px 0;

    :deep(.el-button) {
      border-radius: var(--radius-full);
    }
  }

  .security-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--border-light);
  }
}

.form-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 24px 24px 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}
</style>
