<script setup>
import { useRoute } from "vue-router";
import { logoUrl } from "@/utils/request";
import {
  loginApi,
  registerApi,
  getUserInfoApi,
  getSignInDaysApi,
} from "@/api/userApi";
import { getSlideCaptchaApi, verifySlideCaptchaApi } from "@/api/captchaApi";
import { useUserStore } from "@/stores/user";
import { ref, reactive, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSignStore } from "@/stores/sign";
import { Loading } from "@element-plus/icons-vue";
import SlideVerify from "@/components/SlideVerify.vue";
import { ElMessage } from "element-plus";

const router = useRouter();
const route = useRoute();
const signStore = useSignStore();
const ruleFormRef = ref();
const ruleForm = ref({
  username: "",
  password: "",
  confirmPassword: "",
});
const loading = ref(false);
const userStore = useUserStore();
const isCheck = ref(false);
const isLogin = ref(true);
const slideVerified = ref(false);
const slideCaptchaId = ref("");
// 服务端渲染的验证码图片，缺口位置（答案）不再下发到前端
const slideCaptcha = ref({ bgImage: "", blockImage: "", y: 0 });
const verifyToken = ref("");
const captchaLoading = ref(false);
const captchaError = ref(false);

watch(
  () => route.query.checked,
  (val) => {
    isCheck.value = val === "true";
  },
  { immediate: true },
);

const validateUsername = (rule, value, callback) => {
  if (value === "") return callback(new Error("用户名不能为空"));
  if (!isLogin.value && (value.length > 16 || value.length < 4)) {
    callback(new Error("账号应为4-16位字符"));
  } else {
    callback();
  }
};
const validatePassword = (rule, value, callback) => {
  if (value === "") return callback(new Error("密码不能为空"));
  if (value.length < 6 || value.length > 16) {
    callback(new Error("密码长度应为6-16位"));
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

const loadSlideCaptcha = async () => {
  slideVerified.value = false;
  verifyToken.value = "";
  captchaLoading.value = true;
  captchaError.value = false;
  try {
    const res = await getSlideCaptchaApi();
    if (res.data.code !== 1) {
      captchaError.value = true;
      ElMessage.error(res.data.message || "验证码加载失败");
      return;
    }
    slideCaptchaId.value = res.data.data.captchaId;
    slideCaptcha.value = {
      bgImage: res.data.data.bgImage,
      blockImage: res.data.data.blockImage,
      y: res.data.data.y,
    };
  } catch {
    captchaError.value = true;
    ElMessage.error("验证码加载失败，请重试");
  } finally {
    captchaLoading.value = false;
  }
};

const onSlideSuccess = async (detail) => {
  try {
    const res = await verifySlideCaptchaApi(
      slideCaptchaId.value,
      detail.left,
      detail.timestamp,
    );
    if (res.data.code !== 1) {
      slideVerified.value = false;
      ElMessage.error(res.data.message || "验证失败");
      loadSlideCaptcha();
      return;
    }
    verifyToken.value = res.data.data.verifyToken;
    slideVerified.value = true;
  } catch {
    slideVerified.value = false;
    loadSlideCaptcha();
  }
};
const onSlideRefresh = () => {
  loadSlideCaptcha();
};
const resetSlideVerify = () => {
  loadSlideCaptcha();
};

onMounted(loadSlideCaptcha);

const submitForm = (formEl) => {
  if (!formEl || loading.value) return;
  formEl.validate(async (valid, invalidFields) => {
    if (valid) {
      if (!isCheck.value) {
        ElMessage.error("请勾选用户协议");
        return;
      }
      if (!slideVerified.value) {
        ElMessage.error("请完成滑块验证");
        return;
      }
      try {
        ruleForm.value.username = ruleForm.value.username.trim();
        ruleForm.value.password = ruleForm.value.password.trim();
        loading.value = true;
        if (isLogin.value) {
          const res = await loginApi(
            ruleForm.value.username,
            ruleForm.value.password,
            verifyToken.value,
          );
          if (res.data.code !== 1) {
            loading.value = false;
            resetSlideVerify();
            return;
          }
          userStore.setToken(res.data.data);
          ElMessage.success(res.data.message);
          const userInfo = await getUserInfoApi();
          userStore.setInfo(userInfo.data.data);
          const data = await getSignInDaysApi();
          signStore.setSignDay(data.data.data);
          const redirect = route.query.redirect
            ? decodeURIComponent(route.query.redirect)
            : "/";
          router.push(redirect);
        } else {
          const res = await registerApi(ruleForm.value, verifyToken.value);
          if (res.data.code !== 1) {
            loading.value = false;
            resetSlideVerify();
            return;
          }
          ElMessage.success(res.data.message);
          isLogin.value = true;
          resetSlideVerify();
        }
      } catch {
        ElMessage.error("操作失败，请重试");
      } finally {
        loading.value = false;
      }
    } else {
      // 校验失败时优先展示第一条具体错误（如"密码应该为6-16位字符或-_"），
      // 让用户无需猜测是哪个字段出了问题
      const firstError = invalidFields
        ? Object.values(invalidFields)
            .flat()
            .find((e) => e?.message)?.message
        : "";
      ElMessage.error(firstError || "请检查输入");
    }
  });
};

const toLogin = () => {
  isLogin.value = true;
  isCheck.value = false;
  ruleForm.value = { username: "", password: "", confirmPassword: "" };
  loadSlideCaptcha();
};
const toRegister = () => {
  isLogin.value = false;
  isCheck.value = false;
  ruleForm.value = { username: "", password: "", confirmPassword: "" };
  loadSlideCaptcha();
};
const resetForm = (formEl) => {
  if (!formEl) return;
  formEl.resetFields();
};

// 新窗口打开协议：当前页的表单与滑块验证状态不会丢失
const openAgreement = () => {
  const href = router.resolve("/userAgreement").href;
  window.open(href, "_blank", "noopener");
};
</script>

<template>
  <div class="login-page" v-loading="loading">
    <div class="login-card">
      <div class="logo">
        <el-image class="logo-img" :src="logoUrl" />
        <div class="brand-name">Y社区</div>
      </div>
      <div class="title">{{ isLogin ? "欢迎登录" : "创建账号" }}</div>
      <div class="subtitle">
        {{ isLogin ? "登录您的 Y社区 账号" : "注册一个新账号加入社区" }}
      </div>

      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        status-icon
        :rules="rules"
        label-width="70px"
        class="form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="ruleForm.username"
            name="username"
            autocomplete="username"
            placeholder="请输入用户名"
            @keyup.enter="submitForm(ruleFormRef)"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="ruleForm.password"
            type="password"
            name="password"
            :autocomplete="isLogin ? 'current-password' : 'new-password'"
            placeholder="请输入密码"
            show-password
            @keyup.enter="submitForm(ruleFormRef)"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword" v-if="!isLogin">
          <el-input
            v-model="ruleForm.confirmPassword"
            type="password"
            name="new-password"
            autocomplete="new-password"
            placeholder="请再次输入密码"
            show-password
            @keyup.enter="submitForm(ruleFormRef)"
          />
        </el-form-item>

        <div class="slide-verify-wrapper">
          <div v-if="captchaLoading" class="slide-verify-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>验证码加载中…</span>
          </div>
          <div
            v-else-if="captchaError || !slideCaptchaId"
            class="slide-verify-tip"
          >
            <span>验证码加载失败</span>
            <el-button link type="primary" @click="loadSlideCaptcha"
              >点击重试</el-button
            >
          </div>
          <SlideVerify
            v-else
            :key="slideCaptchaId"
            :bg-image="slideCaptcha.bgImage"
            :block-image="slideCaptcha.blockImage"
            :y="slideCaptcha.y"
            slider-text="向右滑动完成验证"
            @success="onSlideSuccess"
            @refresh="onSlideRefresh"
          />
        </div>

        <div class="switch-link">
          <template v-if="isLogin">
            <span>还没有账号？</span>
            <el-link @click="toRegister" underline="never" type="primary"
              >去注册</el-link
            >
          </template>
          <template v-else>
            <span>已有账号？</span>
            <el-link @click="toLogin" underline="never" type="primary"
              >去登录</el-link
            >
          </template>
        </div>

        <div class="agreement">
          <el-checkbox v-model="isCheck" />
          <span class="agree-text" @click="isCheck = !isCheck"
            >我已阅读并同意</span
          >
          <el-link @click="openAgreement" underline="never" type="primary"
            >《用户协议》（新窗口打开，不丢失已填内容）</el-link
          >
        </div>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="submitForm(ruleFormRef)"
            class="submit-btn"
          >
            {{ isLogin ? "登录" : "注册" }}
          </el-button>
          <el-button @click="resetForm(ruleFormRef)">清空</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(
    135deg,
    var(--bg-page) 0%,
    var(--el-color-primary-light-9) 50%,
    var(--bg-page) 100%
  );
}

.login-card {
  width: 440px;
  max-width: 100%;
  padding: 40px 36px;
  background: var(--bg-card);
  border-radius: $radius-xl;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  animation: fadeInUp 0.4s ease;

  .logo {
    text-align: center;
    margin-bottom: 20px;

    .logo-img {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      box-shadow: var(--shadow-md);
      border: 3px solid transparent;
      // 双背景渐变环：padding-box 打底（盖住图片底）+ border-box 画渐变环
      background-image:
        linear-gradient(var(--bg-card), var(--bg-card)), var(--gradient-primary);
      background-origin: padding-box, border-box;
      background-clip: padding-box, border-box;
    }

    // 品牌字标：楷体感 + 渐变字色，呼应全站章纹语言
    .brand-name {
      margin-top: 12px;
      font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-indent: 0.3em;
      background-image: var(--gradient-primary);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  .title {
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .subtitle {
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 32px;
  }

  .form {
    .slide-verify-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 210px;
      margin-bottom: 16px;

      .slide-verify-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--text-secondary);

        .el-icon.is-loading {
          font-size: 18px;
        }
      }

      :deep(.slider-verify-loading) {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-card);
        border-radius: 4px;
        z-index: 999;

        &::after {
          content: "验证码图片加载中…";
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }

    .switch-link {
      text-align: right;
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .agreement {
      display: flex;
      align-items: center;
      margin-bottom: 20px;

      .agree-text {
        cursor: pointer;
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 4px;
      }
    }

    .submit-btn {
      min-width: 100px;
      background: var(--gradient-primary);
      border: none;
      font-weight: 500;
      transition: all $transition-base;

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--glow-primary);
      }
    }
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 16px 10px;
  }

  .login-card {
    padding: 24px 14px;
    border-radius: var(--radius-lg);

    .logo-img {
      width: 56px !important;
      height: 56px !important;
    }

    .brand-name {
      font-size: 18px !important;
    }

    .title {
      font-size: 20px;
    }

    .subtitle {
      font-size: 13px;
      margin-bottom: 20px;
    }

    .slide-verify-wrapper {
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      :deep(.slide-verify) {
        max-width: 100%;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-card {
    animation: none;
  }

  .submit-btn {
    transition: none;
  }
}
</style>
