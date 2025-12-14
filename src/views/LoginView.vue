<script setup>
const logoUrl = "http://localhost:8080/imgs/logo.png";
import {
  loginApi,
  registerApi,
  getUserInfoApi,
  getSignInDaysApi,
} from "@/api/userApi";
import { useUserStore } from "@/stores/user";
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSignStore } from "@/stores/sign";
const router = useRouter();
const signStore = useSignStore();
const ruleFormRef = ref();
const ruleForm = ref({
  username: "",
  password: "",
  confirmPassword: "",
});
// const userInfo = ref({
//   username: "",
//   avatar: "",
//   bio: "",
//   gender: 0,
//   authority: "",
//   createTime: "",
//   nickname: "",
// });
onMounted(() => {});
const userStore = useUserStore();
const validateUsername = (rule, value, callback) => {
  if (value === "") return callback(new Error("用户名不能为空"));
  else {
    callback();
  }
};
const validatePassword = (rule, value, callback) => {
  if (value === "") return callback(new Error("密码不能为空"));
  if (value.length < 6 || value.length > 16) {
    callback(new Error("密码格式错误"));
  } else {
    callback();
  }
};
const validateConfirmPassword = (rule, value, callback) => {
  if (value === "") return callback(new Error("请输入确认密码"));
  if (value !== ruleForm.value.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};
const rules = reactive({
  username: [{ validator: validateUsername, trigger: "blur" }],
  password: [{ validator: validatePassword, trigger: "blur" }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: "blur" }],
});
const submitForm = (formEl) => {
  if (!formEl) return;
  formEl.validate(async (valid) => {
    if (valid) {
      if (!isCheck.value) {
        // eslint-disable-next-line no-undef
        ElMessage.error("请勾选用户协议");
        return;
      }
      // 去掉前后空格
      ruleForm.value.username = ruleForm.value.username.trim();
      ruleForm.value.password = ruleForm.value.password.trim();
      console.log("提交");
      if (isLogin.value) {
        // 登录
        const success = await loginApi(
          ruleForm.value.username,
          ruleForm.value.password,
        );
        if (success.data.code !== 1) {
          // eslint-disable-next-line no-undef
          ElMessage.error(success.data.message);
          return;
        }
        // eslint-disable-next-line no-undef
        ElMessage.success(success.data.message);
        // 获取用户信息
        const userInfo = await getUserInfoApi();
        userStore.setInfo(userInfo.data.data);
        // 获取签到天数
        const res = await getSignInDaysApi();
        signStore.setSignDay(res.data.data);
        // 跳转
        router.push("/");
      } else {
        // 注册
        const success = await registerApi(ruleForm.value);
        // eslint-disable-next-line no-undef
        ElMessage.success(success.data.message);
        isLogin.value = true;
      }
    } else {
      console.log("校验失败");
    }
  });
};
const resetForm = (formEl) => {
  if (!formEl) return;
  formEl.resetFields();
};
const isCheck = ref(false);
const isLogin = ref(true);
</script>

<template>
  <div class="login">
    <div class="logo">
      <el-image
        style="width: 80px; height: 80px; border-radius: 50%"
        :src="logoUrl"
      />
    </div>
    <div class="title">{{ isLogin ? "登录" : "注册" }}</div>
    <div class="form">
      <el-form
        ref="ruleFormRef"
        style="max-width: 600px"
        :model="ruleForm"
        status-icon
        :rules="rules"
        label-width="auto"
        class="demo-ruleForm"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="ruleForm.username" autocomplete="off" />
        </el-form-item>
        <div class="box"></div>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="ruleForm.password"
            type="password"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword" v-if="!isLogin">
          <el-input
            v-model="ruleForm.confirmPassword"
            type="password"
            autocomplete="off"
          />
        </el-form-item>
        <div class="switch" v-if="isLogin">
          <span>还没有账号？</span>
          <el-link
            style="font-size: 14px"
            @click="isLogin = !isLogin"
            underline="never"
            >去注册</el-link
          >
        </div>
        <div class="switch" v-else>
          <span>已有账号？</span>
          <el-link
            style="font-size: 14px"
            @click="isLogin = !isLogin"
            underline="never"
            >去登录</el-link
          >
        </div>
        <!-- 用户协议 -->
        <div class="check">
          <el-checkbox v-model="isCheck" label="" size="large" />
          <span class="text">我已阅读并同意</span>
          <el-link
            underline="never"
            href="http://localhost:8080/userAgreement.html"
            >《用户协议》</el-link
          >
        </div>
        <div class="box"></div>

        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">
            {{ isLogin ? "登录" : "注册" }}
          </el-button>
          <el-button @click="resetForm(ruleFormRef)">清空</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login {
  padding: 120px;
  .title {
    text-align: center;
    font-size: 20px;
    margin-bottom: 40px;
  }
  .logo {
    text-align: center;
    margin-bottom: 40px;
  }
  .form {
    width: 400px;
    margin: 0 auto;
    .box {
      height: 10px;
    }
    .switch {
      text-align: right;
      font-size: 14px;
    }
    .check {
      display: flex;
      .text {
        line-height: 40px;
      }
    }
  }
}
</style>
