<script setup>
import { useUserStore } from "@/stores/user";
import { ref, onMounted, reactive } from "vue";
import { getUserInfoApi, updateUserInfoApi } from "@/api/userApi";
const userStore = useUserStore();
const userInfo = userStore.userInfo;
const imageUrl = ref(userInfo.avatar);
onMounted(async () => {
  await getUserInfoApi();
});
const newImgUrl = ref("");
newImgUrl.value = userInfo.avatar;
const handleAvatarSuccess = (response, uploadFile) => {
  console.log(response.data);
  newImgUrl.value = response.data.data;
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

const ruleFormRef = ref();
const ruleForm = reactive({
  ...userInfo,
});
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
      const res = await updateUserInfoApi({
        ...ruleForm,
      });
      // eslint-disable-next-line no-undef
      ElMessage.success(res.data.message);
    }
  });
};
</script>
<template>
  <div class="my">
    <!-- <div class="avatar">
      <el-avatar
        style="width: 80px; height: 80px"
        src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
      />
    </div> -->
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
    <div class="info">
      <div class="nickname">账号: {{ userInfo.nickname }}</div>
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
          <el-radio :value="1">男</el-radio>
          <el-radio :value="2">女</el-radio>
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
      </el-form-item>
    </el-form>
  </div>
</template>
<style lang="scss" scoped>
.my {
  margin: 140px auto;
  width: 400px;
  text-align: center;
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
