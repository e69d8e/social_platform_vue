<script setup>
import { useUserStore } from "@/stores/user";
import { ref, reactive, onMounted } from "vue";
import { updateUserInfoApi, updatePasswordApi } from "@/api/userApi";
import AuthorityBox from "@/components/AuthorityBox.vue";
import { ElText } from "element-plus";
import { getUserInfoApi } from "@/api/userApi";
import { useRouter } from "vue-router";
const router = useRouter();
const userStore = useUserStore();
const userInfo = userStore.userInfo;
const imageUrl = ref(userInfo.avatar);
const dialogFormVisible = ref(false);
const ruleFormRef = ref();
const ruleForm = reactive({
  ...userInfo,
});
const getUserInfo = async () => {
  const res = await getUserInfoApi();
  Object.assign(ruleForm, res.data.data);
  userStore.setInfo(res.data.data);
};
onMounted(async () => {
  await getUserInfo();
});
const newImgUrl = ref("");
newImgUrl.value = userInfo.avatar;
const handleAvatarSuccess = (response, uploadFile) => {
  console.log(response.data);
  newImgUrl.value = response.data;
  imageUrl.value = URL.createObjectURL(uploadFile.raw);
};

const beforeAvatarUpload = (rawFile) => {
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    // eslint-disable-next-line no-undef
    ElMessage.error("图像格式应为 jepg/png");
    return false;
  } else if (rawFile.size / 1024 / 1024 > 2) {
    // eslint-disable-next-line no-undef
    ElMessage.error("头像大小不能超过 2MB");
    return false;
  }
  return true;
};

const validateNickname = (rule, value, callback) => {
  if (value.length < 4 || value.length > 16) {
    callback(new Error("用户名长度不能小于 2"));
  } else {
    callback();
  }
};
const rules = reactive({
  nickname: [{ validator: validateNickname, trigger: "blur" }],
  gender: [{ required: true, message: "请选择性别", trigger: "blur" }],
});
const submitForm = async (ref) => {
  await ref.validate(async (valid) => {
    if (valid) {
      ruleForm.avatar = newImgUrl.value;
      console.log(ruleForm);
      const res = await updateUserInfoApi({
        ...ruleForm,
      });
      // await getUserInfo();
      // eslint-disable-next-line no-undef
      ElMessage.success(res.data.message);
    } else {
      // eslint-disable-next-line no-undef
      ElMessage.error("请填写正确的信息");
    }
  });
};
const toFollow = () => {
  router.push({
    path: "/follow/" + userStore.userInfo.id,
  });
};
const toFans = () => {
  router.push({
    path: "/fans/" + userStore.userInfo.id,
  });
};
const toBanPosts = () => {
  router.push({
    path: "/banPosts",
  });
};
const toBanUsers = () => {
  router.push({
    path: "/banUsers",
  });
};
const form = reactive({
  password: "",
});
const changePassword = async () => {
  const res = await updatePasswordApi(form.password);
  if (res.data.code === 1) {
    // eslint-disable-next-line no-undef
    ElMessage.success(res.data.message);
  }
  dialogFormVisible.value = false;
};
</script>
<template>
  <div class="my">
    <div class="back" @click="$router.back()">
      <el-icon><ArrowLeft size="large" /></el-icon>
    </div>
    <el-upload
      class="avatar-uploader"
      action="http://127.0.0.1:8080/api/upload/avatar"
      :show-file-list="false"
      :on-success="handleAvatarSuccess"
      :before-upload="beforeAvatarUpload"
    >
      <img v-if="imageUrl" :src="imageUrl" class="avatar" />
      <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
    </el-upload>
    <div class="info" v-if="userInfo.authority === 'USER'">
      <el-text type="success">账号: {{ userInfo.username }}</el-text>
    </div>
    <div class="info" v-if="userInfo.authority === 'ADMIN'">
      <el-text type="danger">账号: {{ userInfo.username }}</el-text>
    </div>
    <div class="info" v-if="userInfo.authority === 'REVIEWER'">
      <el-text type="primary">账号: {{ userInfo.username }}</el-text>
    </div>
    <AuthorityBox :authority="userInfo.authority" />
    <div style="margin: 10px 0">
      <el-button @click="toFans()" type="primary"
        >{{ userInfo.count }} 粉丝</el-button
      >
      <el-button style="margin-left: 20px" @click="toFollow()" type="primary"
        >我的关注</el-button
      >
      <el-button
        v-if="userInfo.authority === 'REVIEWER'"
        style="margin-left: 20px"
        @click="toBanPosts"
        type="primary"
        >我的封禁</el-button
      >
      <el-button
        v-if="userInfo.authority === 'ADMIN'"
        style="margin-left: 20px"
        @click="toBanUsers"
        type="primary"
        >我的封禁</el-button
      >
    </div>
    <div class="password">
      <el-button @click="dialogFormVisible = true">修改密码</el-button>
    </div>
    <el-form
      ref="ruleFormRef"
      style="max-width: 600px"
      :model="ruleForm"
      status-icon
      :rules="rules"
      label-width="auto"
      label-position="top"
      class="demo-ruleForm"
    >
      <el-form-item label="昵称" prop="pass">
        <el-input v-model="ruleForm.nickname" autocomplete="off" />
      </el-form-item>
      <el-form-item label="性别" prop="resource">
        <el-radio-group v-model="ruleForm.gender">
          <el-radio :value="0">未知</el-radio>
          <el-radio :value="1"
            ><el-icon><Male /></el-icon>男</el-radio
          >
          <el-radio :value="2"
            ><el-icon><Female /></el-icon>女</el-radio
          >
        </el-radio-group>
      </el-form-item>
      <el-form-item label="隐藏我的关注" prop="resource">
        <el-radio-group v-model="ruleForm.followPrivate">
          <el-radio :value="true">隐私</el-radio>
          <el-radio :value="false">可见</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="隐藏我的粉丝" prop="resource">
        <el-radio-group v-model="ruleForm.fansPrivate">
          <el-radio :value="true">隐私</el-radio>
          <el-radio :value="false">可见</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="简介" prop="desc">
        <el-input v-model="ruleForm.bio" type="textarea" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm(ruleFormRef)">
          确认修改
        </el-button>
        <!-- /返回上一页 -->
        <el-button @click="$router.back()">取消修改</el-button>
      </el-form-item>
    </el-form>

    <el-dialog v-model="dialogFormVisible" title="修改密码" width="500">
      <el-form :model="form">
        <el-form-item label="密码">
          <el-input
            type="password"
            v-model="form.password"
            autocomplete="off"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="changePassword"> 确认 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<style lang="scss" scoped>
.my {
  margin: 140px auto;
  width: 400px;
  text-align: center;
  .pointer {
    cursor: pointer;
  }
  .back {
    height: 30px;
    display: flex;
    justify-content: flex-start;
  }
  .back {
    cursor: pointer;
  }
  .avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
  }
  .info {
    margin: 20px 0;
  }
}
</style>
