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
import { getStarListApi } from "@/api/starApi";
import { useSignStore } from "@/stores/sign";
import { disconnect } from "@/utils/websocket";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import PageHeader from "@/components/PageHeader.vue";
import ImageCropper from "@/components/ImageCropper.vue";
import compressImage from "@/utils/compressImage";
import { uploadWithDedup } from "@/utils/uploadDedup";
import formattedCount from "@/utils/formattedCount";
import {
  Male,
  Female,
  Plus,
  User,
  Lock,
  Document,
  Share,
  SwitchButton,
  Key,
  DataAnalysis,
  CircleCheck,
  Edit,
  CollectionTag,
} from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();
const signStore = useSignStore();

// 始终跟随 store，避免 setInfo 整体替换后本地引用失效
const userInfo = computed(() => userStore.userInfo);

const activeTab = ref("profile"); // "profile" | "social" | "security"

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

// 收藏总数：给「我的收藏」入口补一个可读的量化信息（拉 1 条只为拿 total）
const starTotal = ref(null);
const loadStarTotal = async () => {
  try {
    const res = await getStarListApi({ pageNum: 1, pageSize: 1 });
    if (res.data.code === 1) starTotal.value = Number(res.data.total ?? 0);
  } catch {
    // 计数失败不影响入口本身可用，沿用兜底文案
  }
};

const getUserInfo = async () => {
  const res = await getUserInfoApi();
  const data = res.data.data;
  Object.assign(ruleForm, data);
  userStore.setInfo(data);
  imageUrl.value = data.avatar || "";
};

onMounted(async () => {
  loadStarTotal();
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
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    ElMessage.error("图像格式应为 jpeg/png");
    return false;
  }
  return true;
};

const handleAvatarChange = (uploadFile) => {
  const raw = uploadFile.raw;
  if (!raw) return;
  if (!["image/jpeg", "image/png"].includes(raw.type)) {
    ElMessage.error("图像格式应为 jpeg/png");
    return;
  }
  cropperFile.value = raw;
  cropperVisible.value = true;
};

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
      const avatarUrl = await uploadWithDedup(file.value, {
        upload: uploadAvatar,
      });
      if (!avatarUrl) return;
      ruleForm.avatar = avatarUrl;
      imageUrl.value = avatarUrl;
    }
    const res = await updateUserInfoApi({
      ...ruleForm,
      // 服务端据此清理被替换下来的旧头像/旧背景图，否则 MinIO 里的文件会长期堆积
      oldAvatar: userStore.userInfo.avatar || "",
      oldBackgroundUrl: userStore.userInfo.backgroundUrl || "",
    });
    if (res.data.code !== 1) return;
    userStore.setInfo({ ...userStore.userInfo, ...ruleForm });
    file.value = null;
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = "";
    }
    ElMessage.success(res.data.message || "个人资料保存成功");
  } finally {
    loading.value = false;
  }
};

const passwordForm = ref({
  oldPassword: "",
  password: "",
  confirmPassword: "",
});
const passwordRules = reactive({
  oldPassword: [
    {
      validator: (rule, value, callback) => {
        if (!value) return callback(new Error("请输入原密码"));
        callback();
      },
      trigger: "blur",
    },
  ],
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
    const res = await updatePasswordApi(
      passwordForm.value.password,
      passwordForm.value.oldPassword,
    );
    if (res.data.code === 1) {
      dialogFormVisible.value = false;
      passwordForm.value = {
        oldPassword: "",
        password: "",
        confirmPassword: "",
      };
      // 服务端已注销全部会话（refreshToken 清空 + accessToken 拉黑），
      // 这里必须同步清本地登录态并跳登录页，否则用户会停留在「假登录」状态反复 401
      userStore.clearSession();
      signStore.removeSignDay();
      disconnect();
      ElMessage.success("密码已修改，请使用新密码重新登录");
      router.replace("/login");
    }
  } finally {
    loading.value = false;
  }
};

const logout = async () => {
  try {
    const res = await logoutApi();
    // 无论是服务端注销成功还是令牌已失效，本地都必须清干净，不能停在「半登录」状态
    if (res.data.code !== 1) return;
    userStore.clearSession();
    signStore.removeSignDay();
    disconnect();
    dialogVisible.value = false;
    ElMessage.success(res.data.message || "已退出登录");
    router.replace("/login");
  } catch {
    // 网络异常时也允许本地退出，避免用户被卡住
    userStore.clearSession();
    signStore.removeSignDay();
    disconnect();
    dialogVisible.value = false;
    router.replace("/login");
  }
};

const resetProfile = () => {
  Object.assign(ruleForm, { ...userStore.userInfo });
  imageUrl.value = userStore.userInfo.avatar || "";
  file.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
  ruleFormRef.value?.clearValidate();
  ElMessage.info("已重置为当前资料");
};

const fansCount = computed(() => formattedCount(userInfo.value.fansCount || 0));
</script>

<template>
  <div class="my-page-container" v-loading="initLoading">
    <PageHeader title="个人中心" large />

    <!-- 顶部概览横幅 -->
    <div class="hub-header-card">
      <div class="hub-header-left">
        <div class="hub-avatar-wrap">
          <img v-if="imageUrl" :src="imageUrl" class="hub-avatar" alt="头像" />
          <el-icon v-else class="hub-avatar-icon"><User /></el-icon>
        </div>
        <div class="hub-info-text">
          <div class="hub-title-row">
            <h2 class="hub-nickname">
              {{ userInfo.nickname || "未设置昵称" }}
            </h2>
            <AuthorityComponent :authority-id="userInfo.authorityId" />
          </div>
          <span class="hub-username">@{{ userInfo.username }}</span>
          <p class="hub-bio">{{ userInfo.bio || "还没有添加个性简介" }}</p>
        </div>
      </div>

      <div class="hub-header-right">
        <button
          class="visit-profile-btn"
          type="button"
          @click="$router.push(`/user/${userInfo.id}`)"
        >
          <el-icon><Share /></el-icon>
          <span>查看公开主页</span>
        </button>
      </div>
    </div>

    <!-- 功能导航 Tabs -->
    <div class="hub-nav-tabs">
      <button
        class="hub-tab"
        :class="{ active: activeTab === 'profile' }"
        type="button"
        @click="activeTab = 'profile'"
      >
        <el-icon><Edit /></el-icon>
        <span>基本资料设置</span>
      </button>
      <button
        class="hub-tab"
        :class="{ active: activeTab === 'social' }"
        type="button"
        @click="activeTab = 'social'"
      >
        <el-icon><Document /></el-icon>
        <span>我的社交与内容</span>
      </button>
      <button
        class="hub-tab"
        :class="{ active: activeTab === 'security' }"
        type="button"
        @click="activeTab = 'security'"
      >
        <el-icon><Lock /></el-icon>
        <span>账号安全与管理</span>
      </button>
    </div>

    <!-- Tab 1: 基本资料设置 -->
    <div v-if="activeTab === 'profile'" class="hub-tab-body">
      <div class="settings-card">
        <div class="avatar-edit-box">
          <el-upload
            class="avatar-uploader"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange"
            :before-upload="beforeAvatarUpload"
          >
            <img
              v-if="imageUrl"
              :src="imageUrl"
              class="avatar-preview"
              alt="头像"
            />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            <div class="avatar-hover-tip">点击更换头像</div>
          </el-upload>
          <div class="avatar-info-col">
            <h4>头像设置</h4>
            <p>支持 JPG、PNG 格式图片，系统将自动裁切与智能压缩优化</p>
            <span v-if="file" class="avatar-pending-tag"
              >新头像将在保存后正式生效</span
            >
          </div>
        </div>

        <el-divider />

        <el-form
          ref="ruleFormRef"
          :model="ruleForm"
          status-icon
          :rules="rules"
          label-width="auto"
          label-position="top"
          class="profile-form"
        >
          <el-form-item label="社区昵称" prop="nickname">
            <el-input
              v-model="ruleForm.nickname"
              maxlength="16"
              show-word-limit
              placeholder="请输入您的昵称"
            />
          </el-form-item>

          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="ruleForm.gender">
              <el-radio :value="0">保密</el-radio>
              <el-radio :value="1">
                <el-icon><Male /></el-icon> 男
              </el-radio>
              <el-radio :value="2">
                <el-icon><Female /></el-icon> 女
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="个性简介" prop="bio">
            <el-input
              v-model="ruleForm.bio"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="记录你的兴趣、思考或个性签名..."
            />
          </el-form-item>

          <div class="privacy-switches">
            <div class="privacy-item">
              <div class="privacy-text">
                <span class="p-title">隐藏我的关注列表</span>
                <span class="p-desc"
                  >开启后其他用户访问你的个人主页时将无法查看你的关注列表</span
                >
              </div>
              <el-switch v-model="ruleForm.followPrivate" />
            </div>

            <div class="privacy-item">
              <div class="privacy-text">
                <span class="p-title">隐藏我的粉丝列表</span>
                <span class="p-desc"
                  >开启后其他用户访问你的个人主页时将无法查看你的粉丝列表</span
                >
              </div>
              <el-switch v-model="ruleForm.fansPrivate" />
            </div>
          </div>

          <div class="form-actions">
            <el-button
              type="primary"
              size="large"
              @click="submitForm(ruleFormRef)"
              :loading="loading"
              class="save-btn"
            >
              保存修改
            </el-button>
            <el-button size="large" @click="resetProfile">放弃改动</el-button>
          </div>
        </el-form>
      </div>
    </div>

    <!-- Tab 2: 社交与内容入口 -->
    <div v-else-if="activeTab === 'social'" class="hub-tab-body">
      <div class="social-grid">
        <div
          class="social-entry-card"
          @click="$router.push('/postList/' + userInfo.id)"
        >
          <div class="entry-icon post-icon">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="entry-details">
            <span class="entry-title">我的帖子</span>
            <span class="entry-desc">管理我发布的所有公开与历史帖子</span>
          </div>
        </div>

        <div
          class="social-entry-card"
          @click="$router.push('/follow/' + userInfo.id)"
        >
          <div class="entry-icon follow-icon">
            <el-icon :size="24"><User /></el-icon>
          </div>
          <div class="entry-details">
            <span class="entry-title">我的关注</span>
            <span class="entry-desc">查看我正在关注的创作者与好友</span>
          </div>
        </div>

        <div
          class="social-entry-card"
          @click="$router.push('/fans/' + userInfo.id)"
        >
          <div class="entry-icon fan-icon">
            <el-icon :size="24"><CircleCheck /></el-icon>
          </div>
          <div class="entry-details">
            <span class="entry-title">我的粉丝</span>
            <span class="entry-desc"
              >共 {{ fansCount }} 位粉丝正在关注你的动态</span
            >
          </div>
        </div>

        <div class="social-entry-card" @click="$router.push('/favorites')">
          <div class="entry-icon star-icon">
            <el-icon :size="24"><CollectionTag /></el-icon>
          </div>
          <div class="entry-details">
            <span class="entry-title">我的收藏</span>
            <span class="entry-desc">{{
              starTotal === null
                ? "收藏的帖子会保存在这里，仅自己可见"
                : `共 ${starTotal} 篇帖子已收藏，仅自己可见`
            }}</span>
          </div>
        </div>

        <div class="social-entry-card" @click="$router.push('/friends')">
          <div class="entry-icon friend-icon">
            <el-icon :size="24"><Share /></el-icon>
          </div>
          <div class="entry-details">
            <span class="entry-title">我的好友</span>
            <span class="entry-desc">互相关注的社区好友列表</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: 账号安全与管理 -->
    <div v-else-if="activeTab === 'security'" class="hub-tab-body">
      <div class="security-card">
        <div class="security-row">
          <div class="security-info">
            <div class="row-title">
              <el-icon><Key /></el-icon>
              <span>账号登录密码</span>
            </div>
            <p class="row-desc">定期更换密码有助于保护您的账号数据与隐私安全</p>
          </div>
          <el-button type="primary" plain @click="dialogFormVisible = true"
            >修改密码</el-button
          >
        </div>

        <el-divider />

        <!-- 管理员控制台入口 (若具备权限) -->
        <template v-if="userStore.isModerator">
          <div class="security-row">
            <div class="security-info">
              <div class="row-title">
                <el-icon><DataAnalysis /></el-icon>
                <span>社区管理工具</span>
              </div>
              <p class="row-desc">审核与管理社区帖子、违规用户处理及数据看板</p>
            </div>
            <div class="admin-btn-group">
              <el-button size="small" @click="$router.push('/posts/banned')"
                >封禁帖子列表</el-button
              >
              <el-button
                v-if="userStore.isAdmin"
                size="small"
                @click="$router.push('/users/banned')"
                >封禁用户列表</el-button
              >
              <el-button
                v-if="userStore.isAdmin"
                size="small"
                type="primary"
                plain
                @click="$router.push('/admin/dashboard')"
                >数据大屏</el-button
              >
            </div>
          </div>
          <el-divider />
        </template>

        <div class="security-row">
          <div class="security-info">
            <div class="row-title danger">
              <el-icon><SwitchButton /></el-icon>
              <span>退出当前登录</span>
            </div>
            <p class="row-desc">
              退出后将清除本设备的登录凭证，需重新登录才能使用互动功能
            </p>
          </div>
          <el-button type="danger" plain @click="dialogVisible = true"
            >退出登录</el-button
          >
        </div>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="dialogFormVisible"
      title="修改账号密码"
      width="min(92vw, 420px)"
      center
    >
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-position="top"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            type="password"
            v-model="passwordForm.oldPassword"
            show-password
            placeholder="请输入当前登录密码"
          />
        </el-form-item>
        <el-form-item label="请输入新密码" prop="password">
          <el-input
            type="password"
            v-model="passwordForm.password"
            show-password
            placeholder="6-16 位密码"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            type="password"
            v-model="passwordForm.confirmPassword"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="changePassword(passwordFormRef)"
        >
          确认修改
        </el-button>
      </template>
    </el-dialog>

    <!-- 确认注销弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="确认退出登录？"
      width="min(92vw, 400px)"
      center
    >
      <p class="logout-tip">退出登录后当前会话将终止，您随时可以重新登录。</p>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="loading" @click="logout"
          >确认退出</el-button
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
.my-page-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 16px 20px 60px;
}

// 顶部概览横幅
.hub-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  padding: 24px 28px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  transition: all var(--transition-base);
}

.hub-header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.hub-avatar-wrap {
  flex-shrink: 0;

  .hub-avatar {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid transparent;
    background-image:
      linear-gradient(var(--bg-card), var(--bg-card)), var(--gradient-primary);
    background-origin: padding-box, border-box;
    background-clip: padding-box, border-box;
    box-shadow: var(--shadow-sm);
  }

  .hub-avatar-icon {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: var(--bg-subtle);
    color: var(--text-placeholder);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
  }
}

.hub-info-text {
  min-width: 0;

  .hub-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .hub-nickname {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-ink);
  }

  .hub-username {
    font-size: 13px;
    color: var(--text-muted);
    display: block;
    margin: 2px 0 6px;
  }

  .hub-bio {
    margin: 0;
    font-size: 13px;
    color: var(--text-body);
    line-height: 1.5;
    max-width: 500px;
  }
}

.visit-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-subtle);
  color: var(--text-body);
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-base);

  &:hover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    transform: translateY(-1px);
  }
}

// 导航 Tabs
.hub-nav-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 4px;
}

.hub-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    color: var(--text-ink);
    background: var(--bg-subtle);
  }

  &.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    font-weight: 600;
  }
}

// 资料设置卡
.settings-card,
.security-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  padding: 28px;
  box-shadow: var(--shadow-sm);
}

.avatar-edit-box {
  display: flex;
  align-items: center;
  gap: 20px;

  .avatar-uploader {
    position: relative;
    cursor: pointer;
    border-radius: 50%;
    overflow: hidden;
  }

  .avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    box-shadow: var(--shadow-sm);
  }

  .avatar-uploader-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 1px dashed var(--border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: var(--text-placeholder);
  }

  .avatar-hover-tip {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--transition-fast);

    .avatar-uploader:hover & {
      opacity: 1;
    }
  }

  .avatar-info-col {
    h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: var(--text-ink);
    }

    p {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
    }

    .avatar-pending-tag {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--el-color-warning);
    }
  }
}

.profile-form {
  max-width: 600px;
}

.privacy-switches {
  margin: 16px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .privacy-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 14px;
    background: var(--bg-subtle);
    border-radius: var(--radius-md);

    .privacy-text {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .p-title {
        font-size: 13.5px;
        font-weight: 500;
        color: var(--text-ink);
      }

      .p-desc {
        font-size: 12px;
        color: var(--text-muted);
      }
    }
  }
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;

  .save-btn {
    padding: 0 28px;
    background: var(--gradient-primary);
    border: none;
    box-shadow: 0 2px 8px rgba(204, 109, 78, 0.25);

    &:hover {
      box-shadow: var(--glow-primary);
    }
  }
}

// 社交网格入口
.social-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.social-entry-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--el-color-primary-light-7);
  }

  .entry-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.post-icon {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    &.follow-icon {
      background: rgba(90, 148, 122, 0.12);
      color: var(--el-color-success);
    }

    &.fan-icon {
      background: rgba(217, 148, 38, 0.12);
      color: var(--el-color-warning);
    }

    &.star-icon {
      background: rgba(230, 162, 60, 0.14);
      color: var(--el-color-warning);
    }

    &.friend-icon {
      background: rgba(74, 144, 226, 0.12);
      color: #4a90e2;
    }
  }

  .entry-details {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .entry-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-ink);
    }

    .entry-desc {
      font-size: 12.5px;
      color: var(--text-muted);
    }
  }
}

// 账号安全行
.security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .security-info {
    .row-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-ink);
      margin-bottom: 4px;

      &.danger {
        color: var(--el-color-danger);
      }
    }

    .row-desc {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
    }
  }

  .admin-btn-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.logout-tip {
  text-align: center;
  color: var(--text-secondary);
  margin: 8px 0;
}

@media (max-width: 768px) {
  .hub-header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .hub-header-right {
    width: 100%;

    .visit-profile-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .social-grid {
    grid-template-columns: 1fr;
  }

  .security-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
