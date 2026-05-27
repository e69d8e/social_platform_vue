<script setup>
import { useUserStore } from "@/stores/user";
import { ref, reactive, onMounted, computed } from "vue";
import {
  updateUserInfoApi,
  updatePasswordApi,
  layoutApi,
  getUserInfoApi,
} from "@/api/userApi";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import { useRouter } from "vue-router";
import formattedCount from "@/utils/formattedCount";
// import { ElMessage } from "element-plus";
import { uploadAvatar } from "@/api/uploadApi";
import { ArrowLeft, Male, Female, Plus } from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();
const userInfo = userStore.userInfo;
const imageUrl = ref(userInfo.avatar);
const dialogFormVisible = ref(false);
const dialogVisible = ref(false);
const loading = ref(false);
const file = ref();
const ruleFormRef = ref();
const passwordFormRef = ref();

const ruleForm = reactive({ oldAvatar: userInfo.avatar, ...userInfo });

const getUserInfo = async () => {
  const res = await getUserInfoApi();
  Object.assign(ruleForm, res.data.data);
  userStore.setInfo(res.data.data);
};

const initLoading = ref(true);
onMounted(async () => {
  await getUserInfo();
  initLoading.value = false;
});

const beforeAvatarUpload = (rawFile) => {
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    ElMessage.error("图像格式应为 jpeg/png");
    return false;
  } else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error("头像大小不能超过 2MB");
    return false;
  }
  return true;
};

const rules = reactive({
  nickname: [
    {
      validator: (rule, value, callback) => {
        if (value.length < 2 || value.length > 16)
          callback(new Error("用户名长度不能小于 2"));
        else callback();
      },
      trigger: "blur",
    },
  ],
  gender: [{ required: true, message: "请选择性别", trigger: "blur" }],
});

const submitForm = async (ref) => {
  await ref.validate(async (valid) => {
    loading.value = true;
    if (valid) {
      if (file.value) {
        const newAvatar = await uploadAvatar(file.value);
        if (newAvatar.data.code === 0) {
          ElMessage.error(newAvatar.data.message);
          loading.value = false;
          return;
        }
        ruleForm.avatar = newAvatar.data.data;
      }
      const res = await updateUserInfoApi({ ...ruleForm });
      if (!res || res.data.code === 0) {
        loading.value = false;
        return;
      }
      ElMessage.success(res.data.message);
    } else {
      ElMessage.error("请填写正确的信息");
    }
    loading.value = false;
  });
};

const passwordForm = ref({ password: "", confirmPassword: "" });
const passwordRules = reactive({
  password: [
    {
      validator: (rule, value, callback) => {
        if (value === "") return callback(new Error("密码不能为空"));
        if (value.length < 6 || value.length > 16)
          callback(new Error("密码应该为6-16位字符"));
        else callback();
      },
      trigger: "blur",
    },
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (value === "") return callback(new Error("请输入确认密码"));
        if (value !== passwordForm.value.password)
          callback(new Error("两次输入的密码不一致"));
        else callback();
      },
      trigger: "blur",
    },
  ],
});

const changePassword = (formEl) => {
  if (!formEl) return;
  formEl.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const res = await updatePasswordApi(passwordForm.value.password);
        passwordForm.value = { password: "", confirmPassword: "" };
        if (res.data.code !== 1) {
          loading.value = false;
          return;
        }
        ElMessage.success(res.data.message);
      } finally {
        loading.value = false;
        dialogFormVisible.value = false;
      }
    } else {
      ElMessage.error("请检查输入");
    }
  });
};

const logout = async () => {
  const res = await layoutApi();
  userStore.removeInfo();
  dialogVisible.value = false;
  ElMessage.success(res.data.message);
  router.push("/login");
};

const handleAvatarChange = (uploadFile) => {
  imageUrl.value = URL.createObjectURL(uploadFile.raw);
  file.value = uploadFile.raw;
};

const fansCount = computed(() => formattedCount(userInfo.fansCount));
</script>

<template>
  <div class="my-page" v-loading="initLoading">
    <div class="back" @click="$router.back()">
      <el-icon size="18"><ArrowLeft /></el-icon>
      <span>返回</span>
    </div>

    <div class="profile-card">
      <el-upload
        class="avatar-uploader"
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleAvatarChange"
        :before-upload="beforeAvatarUpload"
      >
        <img v-if="imageUrl" :src="imageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>

      <div class="user-meta">
        <div class="meta-item">
          <span class="meta-label">昵称</span>
          <h3 class="nickname">{{ userInfo.nickname }}</h3>
        </div>
        <div class="meta-item">
          <span class="meta-label">账号</span>
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
        </div>
        <div class="meta-item">
          <span class="meta-label">角色</span>
          <AuthorityComponent :authority-id="userInfo.authorityId" />
        </div>
      </div>

      <div class="stat-buttons">
        <el-button
          size="small"
          @click="$router.push('/fans/' + userStore.userInfo.id)"
          type="primary"
          plain
          >{{ fansCount }} 粉</el-button
        >
        <el-button
          size="small"
          @click="$router.push('/follow/' + userStore.userInfo.id)"
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
          @click="$router.push('/banPosts')"
          type="primary"
          plain
          >我的封禁</el-button
        >
        <el-button
          v-if="userInfo.authorityId === 2"
          size="small"
          @click="$router.push('/banUsers')"
          type="primary"
          plain
          >我的封禁</el-button
        >
      </div>

      <div class="security-actions">
        <el-button size="small" @click="dialogFormVisible = true"
          >修改密码</el-button
        >
        <el-button size="small" type="danger" @click="dialogVisible = true"
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
          <el-input v-model="ruleForm.nickname" />
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
          <el-input v-model="ruleForm.bio" type="textarea" :rows="3" />
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
        <el-button type="primary" @click="changePassword(passwordFormRef)"
          >确认</el-button
        >
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" title="确认注销？" width="400" center>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="logout">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.my-page {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px 16px 40px;

  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--el-text-color-regular, #606266);
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    margin-bottom: 20px;
    &:hover {
      color: var(--el-color-primary, #409eff);
      background: var(--el-color-primary-light-9, #ecf5ff);
    }
  }
}

.profile-card {
  text-align: center;
  background: var(--el-bg-color, #ffffff);
  border-radius: 16px;
  padding: 28px 24px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;

  .avatar-uploader {
    display: block;
    margin: 0 auto 16px;
  }

  .avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
    &:hover {
      transform: scale(1.05);
    }
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 14px 0 8px;

    .meta-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .meta-label {
      font-size: 11px;
      color: var(--el-text-color-placeholder, #a8abb2);
    }
  }

  .nickname {
    font-size: 20px;
    font-weight: 700;
    color: var(--el-text-color-primary, #303133);
    margin: 0;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: var(--el-text-color-placeholder, #8c939d);
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 1px dashed var(--el-border-color, #dcdfe6);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    &:hover {
      border-color: var(--el-color-primary, #409eff);
    }
  }

  .stat-buttons {
    display: flex;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 16px 0;
  }

  .security-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light, #e4e7ed);
  }
}

.form-card {
  background: var(--el-bg-color, #ffffff);
  border-radius: 16px;
  padding: 24px 24px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
</style>
