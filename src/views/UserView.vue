<script setup>
import { ref, computed, watch, reactive, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getUserInfoByIdApi, updateUserInfoApi } from "@/api/userApi";
import { getPostListApi } from "@/api/postApi";
import {
  getUserFollowListApi,
  getUserFollowerListApi,
  getFollowListApi,
  getFollowerListApi,
} from "@/api/followApi";
import { banUserApi, setReviewerApi, setUserApi } from "@/api/adminApi";
import { uploadAvatar, uploadBackground } from "@/api/uploadApi";
import compressImage from "@/utils/compressImage";
import { uploadWithDedup } from "@/utils/uploadDedup";
import { useUserStore } from "@/stores/user";
import { useRequireLogin } from "@/composables/useRequireLogin";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import FollowButton from "@/components/FollowButton.vue";
import PostCard from "@/components/PostCard.vue";
import UserCard from "@/components/UserCard.vue";
import CardGrid from "@/components/CardGrid.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import BackButton from "@/components/BackButton.vue";
import ImageCropper from "@/components/ImageCropper.vue";
import formattedCount from "@/utils/formattedCount";
import {
  Male,
  Female,
  Warning,
  Document,
  User as UserIcon,
  ChatDotRound,
  Edit,
  Lock,
  Calendar,
  Plus,
  InfoFilled,
  Link,
  Check,
  Picture,
  View as ViewIcon,
} from "@element-plus/icons-vue";
import { POST_PAGE_SIZE, USER_PAGE_SIZE } from "@/constants/pagination";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const requireLogin = useRequireLogin();

const userId = computed(() => route.params.id);
const isSelf = computed(
  () => String(userStore.userInfo.id) === String(userId.value),
);

// ---- 他人视角预览：本人访问时模拟其他用户看到的主页（隐藏编辑入口、隐私列表加锁） ----
const previewAsOther = ref(false);
const viewAsOther = computed(() => !isSelf.value || previewAsOther.value);

// ---- 主页背景图 ----
const bannerUrl = computed(() => userInfo.value.backgroundUrl || "");
const bgCropperVisible = ref(false);
const bgCropperFile = ref(null);
const bgUploading = ref(false);

const handleBackgroundChange = (uploadFile) => {
  const raw = uploadFile.raw;
  if (!raw) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(raw.type)) {
    ElMessage.error("背景图格式应为 jpg/png/webp");
    return;
  }
  bgCropperFile.value = raw;
  bgCropperVisible.value = true;
};

const onBackgroundCropped = async (croppedFile) => {
  if (bgUploading.value) return;
  bgUploading.value = true;
  try {
    const compressed = await compressImage(croppedFile, {
      maxWidth: 1920,
      maxHeight: 720,
      quality: 0.85,
    });
    if (compressed.size / 1024 / 1024 > 5) {
      ElMessage.error("背景图压缩后仍超过 5MB，请更换图片");
      return;
    }
    const url = await uploadWithDedup(compressed, { upload: uploadBackground });
    if (!url) return;
    await saveBackground(url);
    ElMessage.success("背景已更新");
  } catch {
    ElMessage.error("背景图上传失败，请重试");
  } finally {
    bgUploading.value = false;
  }
};

const resetBackground = async () => {
  if (bgUploading.value) return;
  bgUploading.value = true;
  try {
    await saveBackground("");
    ElMessage.success("已恢复默认背景");
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally {
    bgUploading.value = false;
  }
};

// 保存背景图（PUT /user/profile 要求完整资料字段，一并携带当前值）
const saveBackground = async (url) => {
  const res = await updateUserInfoApi({
    nickname: userInfo.value.nickname,
    gender: userInfo.value.gender ?? 0,
    avatar: userInfo.value.avatar,
    bio: userInfo.value.bio,
    fansPrivate: userInfo.value.fansPrivate,
    followPrivate: userInfo.value.followPrivate,
    backgroundUrl: url,
    oldBackgroundUrl: userInfo.value.backgroundUrl || "",
  });
  if (res.data.code !== 1) {
    throw new Error(res.data.message || "保存失败");
  }
  userInfo.value.backgroundUrl = url;
  userStore.setInfo({ ...userStore.userInfo, backgroundUrl: url });
};

// 主页用户基本信息
const userInfo = ref({
  id: "",
  username: "",
  nickname: "",
  avatar: "",
  backgroundUrl: "",
  bio: "",
  followed: false,
  fansPrivate: false,
  followPrivate: false,
  fansCount: 0,
  createTime: "",
  gender: 0,
  authorityId: 1,
  enabled: true,
});
const infoLoading = ref(true);
const loadFailed = ref(false);

// 当前活跃 Tab: "posts" | "follow" | "fans" | "about"
const activeTab = ref("posts");

// ---- 帖子流状态 ----
const posts = ref([]);
const postsTotal = ref(0);
const postsPageNum = ref(1);
const postsLoading = ref(false);

// ---- 关注列表状态 ----
const followings = ref([]);
const followingsTotal = ref(0);
const followingsPageNum = ref(1);
const followingsLoading = ref(false);

// ---- 粉丝列表状态 ----
const followers = ref([]);
const followersTotal = ref(0);
const followersPageNum = ref(1);
const followersLoading = ref(false);

// ---- 获取用户基本信息 ----
const loadUserInfo = async () => {
  if (!userId.value) return;
  infoLoading.value = true;
  loadFailed.value = false;
  try {
    const res = await getUserInfoByIdApi(userId.value);
    if (res.data.code === 1) {
      userInfo.value = res.data.data;
      followersTotal.value = Number(res.data.data.fansCount ?? 0);

      // 预先查询关注数（若公开或为自己）
      if (!res.data.data.followPrivate || isSelf.value) {
        const countParams = { pageNum: 1, pageSize: 1 };
        const req = isSelf.value
          ? getFollowListApi(countParams)
          : getUserFollowListApi(countParams, userId.value);
        req
          .then((fRes) => {
            if (fRes.data.code === 1) {
              followingsTotal.value = Number(fRes.data.total ?? 0);
            }
          })
          .catch(() => {});
      }
    } else {
      loadFailed.value = true;
    }
  } catch {
    loadFailed.value = true;
  } finally {
    infoLoading.value = false;
  }
};

// ---- 加载帖子 ----
const loadPosts = async () => {
  if (!userId.value) return;
  postsLoading.value = true;
  try {
    const res = await getPostListApi(userId.value, {
      pageNum: postsPageNum.value,
      pageSize: POST_PAGE_SIZE,
    });
    if (res.data.code === 1) {
      posts.value = res.data.data || [];
      postsTotal.value = Number(res.data.total ?? 0);
    }
  } catch {
    ElMessage.error("加载帖子列表失败");
  } finally {
    postsLoading.value = false;
  }
};

const onPostPrivacyChange = ({ id, isPrivate }) => {
  const target = posts.value.find((p) => String(p.id) === String(id));
  if (target) {
    target.isPrivate = isPrivate;
  }
};

// ---- 帖子流过滤与总数（他人视角下过滤私密帖子） ----
const displayedPosts = computed(() => {
  if (viewAsOther.value) {
    return posts.value.filter((p) => !p.isPrivate);
  }
  return posts.value;
});

const displayedPostsTotal = computed(() => {
  if (viewAsOther.value && isSelf.value) {
    return displayedPosts.value.length;
  }
  return postsTotal.value;
});

// ---- 加载关注列表 ----
const loadFollowings = async () => {
  if (!userId.value) return;
  if (userInfo.value.followPrivate && viewAsOther.value) {
    followings.value = [];
    return;
  }

  followingsLoading.value = true;
  try {
    const params = {
      pageNum: followingsPageNum.value,
      pageSize: USER_PAGE_SIZE,
    };
    const req = isSelf.value
      ? getFollowListApi(params)
      : getUserFollowListApi(params, userId.value);
    const res = await req;
    if (res.data.code === 1) {
      followings.value = res.data.data || [];
      followingsTotal.value = Number(res.data.total ?? 0);
    }
  } catch {
    ElMessage.error("加载关注列表失败");
  } finally {
    followingsLoading.value = false;
  }
};

// ---- 加载粉丝列表 ----
const loadFollowers = async () => {
  if (!userId.value) return;
  if (userInfo.value.fansPrivate && viewAsOther.value) {
    followers.value = [];
    return;
  }

  followersLoading.value = true;
  try {
    const params = {
      pageNum: followersPageNum.value,
      pageSize: USER_PAGE_SIZE,
    };
    const req = isSelf.value
      ? getFollowerListApi(params)
      : getUserFollowerListApi(params, userId.value);
    const res = await req;
    if (res.data.code === 1) {
      followers.value = res.data.data || [];
      followersTotal.value = Number(res.data.total ?? 0);
    }
  } catch {
    ElMessage.error("加载粉丝列表失败");
  } finally {
    followersLoading.value = false;
  }
};

// Tab 切换时按需加载
const switchTab = (tab) => {
  activeTab.value = tab;
  if (tab === "posts" && posts.value.length === 0) {
    loadPosts();
  } else if (tab === "follow" && followings.value.length === 0) {
    loadFollowings();
  } else if (tab === "fans" && followers.value.length === 0) {
    loadFollowers();
  }
};

const onPostsPageChange = (p) => {
  postsPageNum.value = p;
  loadPosts();
};

const onFollowingsPageChange = (p) => {
  followingsPageNum.value = p;
  loadFollowings();
};

const onFollowersPageChange = (p) => {
  followersPageNum.value = p;
  loadFollowers();
};

// 发送私信
const handleSendMsg = () => {
  if (!requireLogin("请先登录后再发送私信")) return;
  router.push(`/chat/new?receiverId=${userId.value}`);
};

// 复制个人主页链接
const copied = ref(false);
const copyProfileLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    ElMessage.success("主页链接已复制到剪贴板");
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    ElMessage.info("请复制浏览器地址栏链接");
  }
};

// ---- 管理员权限操作 ----
const banLoading = ref(false);
const handleBan = async () => {
  banLoading.value = true;
  try {
    const res = await banUserApi(userId.value);
    if (res.data.code === 1) {
      userInfo.value.enabled = !userInfo.value.enabled;
      ElMessage.success(
        res.data.message || (userInfo.value.enabled ? "已解封" : "已封禁"),
      );
    }
  } finally {
    banLoading.value = false;
  }
};

const roleLoading = ref(false);
const setRole = async (api, targetRole) => {
  roleLoading.value = true;
  try {
    const res = await api(userId.value);
    if (res.data.code === 1) {
      userInfo.value.authorityId = targetRole;
      ElMessage.success(res.data.message || "角色修改成功");
    }
  } finally {
    roleLoading.value = false;
  }
};

// ---- 本人编辑资料 Drawer/Modal ----
const editDialogVisible = ref(false);
const editFormRef = ref();
const editLoading = ref(false);
const editForm = reactive({
  nickname: "",
  gender: 0,
  bio: "",
  followPrivate: false,
  fansPrivate: false,
  avatar: "",
});
const previewUrl = ref("");
const croppedAvatarFile = ref(null);
const cropperVisible = ref(false);
const cropperFile = ref(null);

const openEditModal = () => {
  Object.assign(editForm, {
    nickname: userInfo.value.nickname,
    gender: userInfo.value.gender ?? 0,
    bio: userInfo.value.bio || "",
    followPrivate: Boolean(userInfo.value.followPrivate),
    fansPrivate: Boolean(userInfo.value.fansPrivate),
    avatar: userInfo.value.avatar || "",
  });
  croppedAvatarFile.value = null;
  editDialogVisible.value = true;
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
    croppedAvatarFile.value = compressed;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(compressed);
    editForm.avatar = previewUrl.value;
  } catch {
    ElMessage.error("图片处理失败，请重试");
  }
};

const submitEditForm = async () => {
  if (!editForm.nickname || editForm.nickname.length < 2) {
    ElMessage.error("昵称长度应在 2-16 个字符");
    return;
  }

  editLoading.value = true;
  try {
    if (croppedAvatarFile.value) {
      const avatarUrl = await uploadWithDedup(croppedAvatarFile.value, {
        upload: uploadAvatar,
      });
      if (avatarUrl) {
        editForm.avatar = avatarUrl;
      }
    }

    const res = await updateUserInfoApi({ ...editForm });
    if (res.data.code === 1) {
      Object.assign(userInfo.value, editForm);
      userStore.setInfo({ ...userStore.userInfo, ...editForm });
      ElMessage.success("资料更新成功");
      editDialogVisible.value = false;
      croppedAvatarFile.value = null;
    }
  } finally {
    editLoading.value = false;
  }
};

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

// 格式化与计算属性
const fansCount = computed(() => formattedCount(userInfo.value.fansCount ?? 0));

const genderLabel = computed(() => {
  if (userInfo.value.gender === 1) return "男";
  if (userInfo.value.gender === 2) return "女";
  return "保密";
});

const formattedCreateTime = computed(() => {
  const t = userInfo.value.createTime;
  if (!t) return "—";
  const parts = String(t).split(" ");
  return parts[0] || String(t);
});

watch(
  () => route.params.id,
  () => {
    previewAsOther.value = false;
    postsPageNum.value = 1;
    followingsPageNum.value = 1;
    followersPageNum.value = 1;
    posts.value = [];
    followings.value = [];
    followers.value = [];
    loadUserInfo().then(() => {
      loadPosts();
    });
  },
  { immediate: true },
);

watch(previewAsOther, (isOther) => {
  if (isOther) {
    if (userInfo.value.followPrivate) {
      followings.value = [];
      if (activeTab.value === "follow") {
        activeTab.value = "posts";
      }
    }
    if (userInfo.value.fansPrivate) {
      followers.value = [];
      if (activeTab.value === "fans") {
        activeTab.value = "posts";
      }
    }
  } else {
    if (
      isSelf.value &&
      activeTab.value === "follow" &&
      followings.value.length === 0
    ) {
      loadFollowings();
    }
    if (
      isSelf.value &&
      activeTab.value === "fans" &&
      followers.value.length === 0
    ) {
      loadFollowers();
    }
  }
});
</script>

<template>
  <div class="profile-container" v-loading="infoLoading">
    <!-- 顶部导航 -->
    <div class="profile-top-bar">
      <BackButton :size="18" />
      <span class="top-bar-title">{{ userInfo.nickname || "个人主页" }}</span>
    </div>

    <!-- 加载失败态 -->
    <div v-if="loadFailed && !infoLoading" class="load-failed-card">
      <el-icon :size="48" color="var(--text-placeholder)"><Warning /></el-icon>
      <h3>用户不存在或账号已注销</h3>
      <el-button type="primary" round @click="$router.push('/home')"
        >返回首页</el-button
      >
    </div>

    <template v-else-if="!infoLoading">
      <!-- 个人主页 Header 综合展板 -->
      <section class="profile-header-card">
        <!-- 主页背景：优先自定义背景图，未设置时回退默认渐变壁纸 -->
        <div class="profile-banner" :class="{ 'has-custom-bg': bannerUrl }">
          <img
            v-if="bannerUrl"
            :src="bannerUrl"
            class="banner-img"
            alt="主页背景"
          />
          <template v-else>
            <div class="banner-mesh-glow"></div>
            <div class="banner-pattern-overlay"></div>
          </template>

          <!-- 本人操作：更换 / 重置背景 -->
          <div v-if="isSelf && !viewAsOther" class="banner-tools">
            <el-upload
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleBackgroundChange"
              class="bg-uploader"
            >
              <button
                class="banner-tool-btn"
                type="button"
                :disabled="bgUploading"
              >
                <el-icon><Picture /></el-icon>
                <span>更换背景</span>
              </button>
            </el-upload>
            <button
              v-if="bannerUrl"
              class="banner-tool-btn ghost"
              type="button"
              :disabled="bgUploading"
              @click="resetBackground"
            >
              恢复默认
            </button>
          </div>

          <!-- 他人视角预览开关（仅本人可见） -->
          <div
            v-if="isSelf"
            class="preview-toggle"
            :title="
              previewAsOther
                ? '退出他人视角，回到我的主页'
                : '预览其他用户看到的我的主页'
            "
          >
            <el-icon :size="14"><ViewIcon /></el-icon>
            <span class="preview-label">他人视角</span>
            <el-switch v-model="previewAsOther" size="small" />
          </div>
        </div>

        <div class="profile-main-body">
          <div class="profile-avatar-row">
            <!-- 头像 -->
            <div class="avatar-container">
              <el-avatar :size="96" :src="userInfo.avatar" class="user-avatar">
                <el-icon :size="48"><UserIcon /></el-icon>
              </el-avatar>
              <div
                v-if="userInfo.gender === 1"
                class="gender-pill male"
                title="男"
              >
                <el-icon><Male /></el-icon>
              </div>
              <div
                v-else-if="userInfo.gender === 2"
                class="gender-pill female"
                title="女"
              >
                <el-icon><Female /></el-icon>
              </div>
            </div>

            <!-- 操作按钮群 -->
            <div class="header-action-group">
              <template v-if="viewAsOther">
                <FollowButton
                  :user-id="userInfo.id"
                  :followed="userInfo.followed"
                />
                <button
                  type="button"
                  class="action-btn outline-btn"
                  :disabled="!userInfo.enabled"
                  @click="handleSendMsg"
                >
                  <el-icon><ChatDotRound /></el-icon>
                  <span>发私信</span>
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="action-btn primary-btn"
                  @click="openEditModal"
                >
                  <el-icon><Edit /></el-icon>
                  <span>编辑资料</span>
                </button>
                <button
                  type="button"
                  class="action-btn outline-btn"
                  @click="$router.push('/publicPost')"
                >
                  <el-icon><Plus /></el-icon>
                  <span>发动态</span>
                </button>
              </template>

              <!-- 复制链接按钮 -->
              <button
                type="button"
                class="action-icon-btn"
                :title="copied ? '已复制链接' : '分享主页'"
                @click="copyProfileLink"
              >
                <el-icon :size="15">
                  <Check v-if="copied" color="var(--el-color-success)" />
                  <Link v-else />
                </el-icon>
              </button>
            </div>
          </div>

          <!-- 用户名与标签信息 -->
          <div class="profile-identity">
            <div class="name-line">
              <h2 class="nickname">{{ userInfo.nickname || "未设置昵称" }}</h2>
              <span class="username-tag">@{{ userInfo.username }}</span>
              <AuthorityComponent :authority-id="userInfo.authorityId" />
            </div>

            <div v-if="!userInfo.enabled" class="banned-alert">
              <el-icon><Warning /></el-icon>
              <span>该账号已被管理员封禁，部分功能受限</span>
            </div>

            <!-- 个人简介 -->
            <div class="bio-container">
              <p v-if="userInfo.bio" class="bio-text">{{ userInfo.bio }}</p>
              <p v-else class="bio-placeholder">
                {{
                  viewAsOther
                    ? "这个人很神秘，还没有填写个性简介~"
                    : "点击「编辑资料」添加个性简介，让更多人了解你~"
                }}
              </p>
            </div>

            <!-- 附属信息 (注册时间、权限等) -->
            <div class="meta-tag-list">
              <span class="meta-chip">
                <el-icon><Calendar /></el-icon>
                <span>{{ formattedCreateTime }} 加入社区</span>
              </span>
              <span class="meta-chip">
                <span>性别: {{ genderLabel }}</span>
              </span>
            </div>
          </div>

          <!-- 统计指标与 Tab 快速切换锚点 -->
          <div class="profile-stats-bar">
            <button
              class="stat-item"
              :class="{ active: activeTab === 'posts' }"
              type="button"
              @click="switchTab('posts')"
            >
              <span class="stat-num">{{ displayedPostsTotal }}</span>
              <span class="stat-name">动态帖子</span>
            </button>
            <button
              v-if="!(userInfo.followPrivate && viewAsOther)"
              class="stat-item"
              :class="{ active: activeTab === 'follow' }"
              type="button"
              @click="switchTab('follow')"
            >
              <span class="stat-num">{{ followingsTotal }}</span>
              <span class="stat-name">关注</span>
            </button>
            <button
              v-if="!(userInfo.fansPrivate && viewAsOther)"
              class="stat-item"
              :class="{ active: activeTab === 'fans' }"
              type="button"
              @click="switchTab('fans')"
            >
              <span class="stat-num">{{ fansCount }}</span>
              <span class="stat-name">粉丝</span>
            </button>
            <button
              class="stat-item"
              :class="{ active: activeTab === 'about' }"
              type="button"
              @click="switchTab('about')"
            >
              <el-icon class="about-icon"><InfoFilled /></el-icon>
              <span class="stat-name">关于TA</span>
            </button>
          </div>

          <!-- 管理员快捷管控面板 -->
          <div v-if="userStore.isAdmin && !isSelf" class="admin-toolbox">
            <span class="admin-badge">管理员控制台:</span>
            <el-popconfirm
              v-if="userInfo.authorityId === 1"
              title="确定将该用户设置为审核员？"
              @confirm="setRole(setReviewerApi, 3)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="roleLoading"
                >
                  设为审核
                </el-button>
              </template>
            </el-popconfirm>
            <el-popconfirm
              v-else-if="userInfo.authorityId === 3"
              title="确定将该用户降级为普通用户？"
              @confirm="setRole(setUserApi, 1)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="info"
                  plain
                  :loading="roleLoading"
                >
                  设为普通用户
                </el-button>
              </template>
            </el-popconfirm>

            <el-popconfirm
              :title="
                userInfo.enabled ? '确定封禁该用户？' : '确定解封该用户？'
              "
              @confirm="handleBan"
            >
              <template #reference>
                <el-button
                  size="small"
                  :type="userInfo.enabled ? 'danger' : 'success'"
                  plain
                  :loading="banLoading"
                >
                  {{ userInfo.enabled ? "封禁账号" : "解除封禁" }}
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </section>

      <!-- 主页动态与内容切换区 -->
      <section class="profile-content-section">
        <!-- 动态/帖子 Tab -->
        <div v-if="activeTab === 'posts'" class="tab-pane">
          <SkeletonGrid
            v-if="postsLoading && posts.length === 0"
            :count="POST_PAGE_SIZE"
          />

          <div v-else-if="displayedPosts.length === 0" class="empty-tab-card">
            <div class="empty-icon-circle">
              <el-icon :size="36"><Document /></el-icon>
            </div>
            <h4>
              {{
                viewAsOther
                  ? "该用户还没有发布任何帖子"
                  : "你还没有发布任何帖子"
              }}
            </h4>
            <p>
              {{
                viewAsOther
                  ? "等待TA发布第一条精彩内容吧"
                  : "分享你的见解、创作与生活，让社区认识你"
              }}
            </p>
            <el-button
              v-if="isSelf && !viewAsOther"
              type="primary"
              round
              @click="$router.push('/publicPost')"
            >
              立即发布
            </el-button>
          </div>

          <template v-else>
            <CardGrid :items="displayedPosts">
              <template #item="{ item, index }">
                <PostCard
                  :post="item"
                  :delay="index < 12 ? index * 30 : 0"
                  @privacy-change="onPostPrivacyChange"
                />
              </template>
            </CardGrid>

            <div v-if="postsTotal > POST_PAGE_SIZE" class="pagination-row">
              <ListPagination
                v-model:page-num="postsPageNum"
                :total="postsTotal"
                :page-size="POST_PAGE_SIZE"
                show-when="zero"
                @change="onPostsPageChange"
              />
            </div>
          </template>
        </div>

        <!-- 关注列表 Tab -->
        <div v-else-if="activeTab === 'follow'" class="tab-pane">
          <div
            v-if="userInfo.followPrivate && viewAsOther"
            class="privacy-lock-card"
          >
            <el-icon :size="40" color="var(--text-placeholder)"
              ><Lock
            /></el-icon>
            <h4>关注列表已设为私密</h4>
            <p>该用户设置了隐私保护，仅自己可见关注列表</p>
          </div>

          <SkeletonGrid
            v-else-if="followingsLoading && followings.length === 0"
            type="user"
            :count="USER_PAGE_SIZE"
          />

          <div v-else-if="followings.length === 0" class="empty-tab-card">
            <div class="empty-icon-circle">
              <el-icon :size="36"><UserIcon /></el-icon>
            </div>
            <h4>
              {{
                viewAsOther ? "该用户还没有关注任何人" : "你还没有关注任何人"
              }}
            </h4>
            <p>{{ viewAsOther ? "" : "去搜索和发现更多有趣的创作者吧" }}</p>
            <el-button
              v-if="isSelf"
              type="primary"
              round
              @click="$router.push('/home')"
            >
              去首页探索
            </el-button>
          </div>

          <template v-else>
            <CardGrid :items="followings">
              <template #item="{ item, index }">
                <UserCard :user="item" :delay="index < 12 ? index * 30 : 0" />
              </template>
            </CardGrid>

            <div v-if="followingsTotal > USER_PAGE_SIZE" class="pagination-row">
              <ListPagination
                v-model:page-num="followingsPageNum"
                :total="followingsTotal"
                :page-size="USER_PAGE_SIZE"
                show-when="zero"
                @change="onFollowingsPageChange"
              />
            </div>
          </template>
        </div>

        <!-- 粉丝列表 Tab -->
        <div v-else-if="activeTab === 'fans'" class="tab-pane">
          <div
            v-if="userInfo.fansPrivate && viewAsOther"
            class="privacy-lock-card"
          >
            <el-icon :size="40" color="var(--text-placeholder)"
              ><Lock
            /></el-icon>
            <h4>粉丝列表已设为私密</h4>
            <p>该用户设置了隐私保护，仅自己可见粉丝列表</p>
          </div>

          <SkeletonGrid
            v-else-if="followersLoading && followers.length === 0"
            type="user"
            :count="USER_PAGE_SIZE"
          />

          <div v-else-if="followers.length === 0" class="empty-tab-card">
            <div class="empty-icon-circle">
              <el-icon :size="36"><UserIcon /></el-icon>
            </div>
            <h4>
              {{ viewAsOther ? "该用户暂时还没有粉丝" : "暂时还没有粉丝" }}
            </h4>
            <p>
              {{
                viewAsOther ? "" : "多发布精彩帖子，互动交流可以吸引更多粉丝哦"
              }}
            </p>
          </div>

          <template v-else>
            <CardGrid :items="followers">
              <template #item="{ item, index }">
                <UserCard :user="item" :delay="index < 12 ? index * 30 : 0" />
              </template>
            </CardGrid>

            <div v-if="followersTotal > USER_PAGE_SIZE" class="pagination-row">
              <ListPagination
                v-model:page-num="followersPageNum"
                :total="followersTotal"
                :page-size="USER_PAGE_SIZE"
                show-when="zero"
                @change="onFollowersPageChange"
              />
            </div>
          </template>
        </div>

        <!-- 详细资料 Tab -->
        <div v-else-if="activeTab === 'about'" class="tab-pane">
          <div class="about-card">
            <h3 class="about-title">账号与身份信息</h3>
            <div class="about-grid">
              <div class="about-item">
                <span class="about-label">用户 ID</span>
                <span class="about-value code-font">{{ userInfo.id }}</span>
              </div>
              <div class="about-item">
                <span class="about-label">用户名</span>
                <span class="about-value code-font"
                  >@{{ userInfo.username }}</span
                >
              </div>
              <div class="about-item">
                <span class="about-label">注册时间</span>
                <span class="about-value">{{
                  userInfo.createTime || "—"
                }}</span>
              </div>
              <div class="about-item">
                <span class="about-label">性别</span>
                <span class="about-value">{{ genderLabel }}</span>
              </div>
              <div class="about-item">
                <span class="about-label">账号权限</span>
                <span class="about-value">
                  <AuthorityComponent :authority-id="userInfo.authorityId" />
                </span>
              </div>
              <div class="about-item">
                <span class="about-label">隐私可见性</span>
                <span class="about-value">
                  {{ userInfo.followPrivate ? "隐藏关注列表" : "公开关注列表" }}
                  ·
                  {{ userInfo.fansPrivate ? "隐藏粉丝列表" : "公开粉丝列表" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- 编辑资料弹窗 (仅自己可用) -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑个人资料"
      width="min(560px, 94vw)"
      align-center
      destroy-on-close
    >
      <div class="edit-modal-body">
        <!-- 头像更换 -->
        <div class="edit-avatar-section">
          <el-upload
            class="avatar-uploader"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange"
          >
            <el-avatar
              :size="84"
              :src="editForm.avatar"
              class="edit-avatar-preview"
            >
              <el-icon :size="36"><UserIcon /></el-icon>
            </el-avatar>
            <div class="edit-avatar-mask">
              <el-icon><Edit /></el-icon>
              <span>更换头像</span>
            </div>
          </el-upload>
          <span class="avatar-tip"
            >点击图片裁切新头像（支持 JPG/PNG，2MB 内）</span
          >
        </div>

        <el-form
          ref="editFormRef"
          :model="editForm"
          label-position="top"
          class="edit-form-inner"
        >
          <el-form-item label="昵称" required>
            <el-input
              v-model="editForm.nickname"
              maxlength="16"
              show-word-limit
              placeholder="请输入 2-16 位昵称"
            />
          </el-form-item>

          <el-form-item label="性别">
            <el-radio-group v-model="editForm.gender">
              <el-radio :value="0">保密</el-radio>
              <el-radio :value="1">
                <el-icon><Male /></el-icon> 男
              </el-radio>
              <el-radio :value="2">
                <el-icon><Female /></el-icon> 女
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="个人简介">
            <el-input
              v-model="editForm.bio"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="介绍一下你自己，分享你的兴趣或专长..."
            />
          </el-form-item>

          <div class="privacy-switch-group">
            <div class="switch-row">
              <div class="switch-info">
                <span class="switch-title">隐藏我的关注列表</span>
                <span class="switch-desc"
                  >开启后其他用户访问你的主页将无法查看你关注的人</span
                >
              </div>
              <el-switch v-model="editForm.followPrivate" />
            </div>

            <div class="switch-row">
              <div class="switch-info">
                <span class="switch-title">隐藏我的粉丝列表</span>
                <span class="switch-desc"
                  >开启后其他用户访问你的主页将无法查看你的粉丝</span
                >
              </div>
              <el-switch v-model="editForm.fansPrivate" />
            </div>
          </div>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="editLoading"
            @click="submitEditForm"
          >
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 头像裁切组件 -->
    <ImageCropper
      v-model="cropperVisible"
      :file="cropperFile"
      title="裁切新头像"
      :aspect-ratio="1"
      @confirm="onAvatarCropped"
    />

    <!-- 背景图裁切组件 -->
    <ImageCropper
      v-model="bgCropperVisible"
      :file="bgCropperFile"
      title="裁切主页背景"
      :aspect-ratio="4"
      @confirm="onBackgroundCropped"
    />
  </div>
</template>

<style lang="scss" scoped>
.profile-container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 16px 20px 60px;
}

.profile-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .top-bar-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-muted);
  }
}

// 错误态
.load-failed-card {
  text-align: center;
  padding: 80px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--border-light);

  h3 {
    margin: 16px 0 20px;
    color: var(--text-ink);
  }
}

// ---- Header 综合卡片 ----
.profile-header-card {
  position: relative;
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: 24px;
  transition: all var(--transition-base);
}

// 主页背景：默认艺术渐变，支持自定义背景图
.profile-banner {
  height: 200px;
  position: relative;
  background: linear-gradient(135deg, #cc6d4e 0%, #e59a42 50%, #d47878 100%);
  overflow: hidden;

  &.has-custom-bg {
    background: var(--bg-subtle);
  }

  .banner-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .banner-mesh-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 20% 40%,
      rgba(255, 255, 255, 0.25) 0%,
      transparent 60%
    );
  }

  .banner-pattern-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.12;
    background-image: radial-gradient(#ffffff 1.5px, transparent 1.5px);
    background-size: 18px 18px;
  }
}

// 背景更换 / 重置工具（悬浮右上，本人可见）
.banner-tools {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;

  .bg-uploader {
    // el-upload 默认块级，收窄为按钮
    display: inline-flex;
  }

  .banner-tool-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: var(--radius-full);
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: rgba(0, 0, 0, 0.32);
    color: #fff;
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: all var(--transition-base);

    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.5);
      border-color: #fff;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.7;
    }

    &.ghost {
      background: rgba(255, 255, 255, 0.18);
    }
  }
}

// 他人视角预览开关（仅本人可见）
.preview-toggle {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.32);
  color: #fff;
  font-size: 12.5px;
  backdrop-filter: blur(6px);

  .preview-label {
    user-select: none;
  }
}

.profile-main-body {
  padding: 0 32px 24px;
  position: relative;
}

// 头像与操作区
.profile-avatar-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: -48px;
  margin-bottom: 16px;
  gap: 16px;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;

  .user-avatar {
    border: 4px solid var(--bg-card);
    box-shadow: var(--shadow-md);
    background-color: var(--bg-subtle);
    transition: transform var(--transition-base);

    &:hover {
      transform: scale(1.03);
    }
  }

  .gender-pill {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-card);
    font-size: 12px;
    color: #fff;

    &.male {
      background: #4a90e2;
    }

    &.female {
      background: #e26a8d;
    }
  }
}

.header-action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-base);

  &.primary-btn {
    border: none;
    background: var(--gradient-primary);
    color: #fff;
    box-shadow: 0 2px 8px rgba(204, 109, 78, 0.25);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--glow-primary);
    }
  }

  &.outline-btn {
    border: 1px solid var(--border-default);
    background: var(--bg-card);
    color: var(--text-body);

    &:hover {
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
}

.action-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-7);
    background: var(--bg-subtle);
  }
}

// 身份信息
.profile-identity {
  margin-bottom: 24px;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;

  .nickname {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.015em;
    color: var(--text-ink);
  }

  .username-tag {
    font-size: 14px;
    color: var(--text-muted);
  }
}

.banned-alert {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12.5px;
  margin-bottom: 10px;
}

.bio-container {
  margin: 10px 0 14px;
  max-width: 820px;

  .bio-text {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--text-body);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bio-placeholder {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-placeholder);
    font-style: italic;
  }
}

.meta-tag-list {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--text-muted);
  }
}

// 统计横条 & Tab 锚点
.profile-stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
  overflow-x: auto;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-subtle);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);

    .stat-num,
    .stat-name,
    .about-icon {
      color: var(--el-color-primary);
      font-weight: 700;
    }
  }

  .stat-num {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-ink);
    font-variant-numeric: tabular-nums;
  }

  .stat-name {
    font-size: 13.5px;
    color: var(--text-muted);
  }

  .about-icon {
    font-size: 16px;
    color: var(--text-muted);
  }
}

// 管理员管控条
.admin-toolbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  border: 1px dashed var(--border-default);

  .admin-badge {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }
}

// ---- 下方动态与列表区 ----
.profile-content-section {
  min-height: 400px;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

.empty-tab-card,
.privacy-lock-card {
  text-align: center;
  padding: 64px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);

  .empty-icon-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: var(--bg-subtle);
    color: var(--text-placeholder);
    margin-bottom: 16px;
  }

  h4 {
    margin: 12px 0 6px;
    font-size: 16px;
    color: var(--text-ink);
  }

  p {
    margin: 0 0 20px;
    font-size: 13.5px;
    color: var(--text-muted);
  }
}

.pagination-row {
  margin-top: 32px;
}

// 关于页面网格
.about-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  padding: 28px 32px;

  .about-title {
    margin: 0 0 20px;
    font-size: 17px;
    font-weight: 600;
    color: var(--text-ink);
  }

  .about-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px 24px;
  }

  .about-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .about-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    .about-value {
      font-size: 14.5px;
      color: var(--text-body);
      font-weight: 500;

      &.code-font {
        font-family: monospace;
      }
    }
  }
}

// ---- 编辑弹窗 ----
.edit-modal-body {
  padding: 4px 10px;
}

.edit-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;

  .avatar-uploader {
    position: relative;
    cursor: pointer;
    border-radius: 50%;
    overflow: hidden;
  }

  .edit-avatar-preview {
    border: 3px solid var(--border-light);
    display: block;
  }

  .edit-avatar-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 11px;
    opacity: 0;
    transition: opacity var(--transition-fast);

    .avatar-uploader:hover & {
      opacity: 1;
    }
  }

  .avatar-tip {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 8px;
  }
}

.privacy-switch-group {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 14px;

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    .switch-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .switch-title {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-body);
    }

    .switch-desc {
      font-size: 12px;
      color: var(--text-muted);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .profile-container {
    padding: 12px 14px 40px;
  }

  .profile-main-body {
    padding: 0 16px 20px;
  }

  .profile-avatar-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-top: -42px;
  }

  .user-avatar {
    width: 76px !important;
    height: 76px !important;
  }

  .header-action-group {
    width: 100%;
    justify-content: flex-start;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }

  .about-card .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
