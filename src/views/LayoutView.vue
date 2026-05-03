<script setup>
import { ref, onUnmounted, computed } from "vue";
import { RouterView } from "vue-router";
import { Search } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { signInApi } from "@/api/userApi";
import { useRouter } from "vue-router";
import { useSignStore } from "@/stores/sign";
import { debounce } from "lodash-es";
import formattedCount from "@/utils/formattedCount";

const signStore = useSignStore();
const router = useRouter();
const userStore = useUserStore();
const logoUrl = "http://127.0.0.1:8080/imgs/logo.png";
const searchContent = ref("");

const search = debounce(() => {
  if (searchContent.value.trim() === "") {
    // eslint-disable-next-line no-undef
    ElMessage.warning("请输入搜索内容");
    return;
  }
  router.push({
    path: "/search",
    query: {
      keyword: searchContent.value,
    },
  });
}, 300);
onUnmounted(() => {
  search.cancel(); // 清理
});
const myFollowPosts = () => {
  router.push({
    path: "/followPosts",
  });
};
const myPosts = () => {
  router.push({
    path: "/postList/" + userStore.userInfo.id,
  });
};
const toFans = () => {
  router.push({
    path: "/fans/" + userStore.userInfo.id,
  });
};
const sign = async () => {
  const res = await signInApi();
  if (res.data.code === 1) {
    if (signStore.signDay < res.data.data) {
      // eslint-disable-next-line no-undef
      ElMessage.success("签到成功");
    } else {
      // eslint-disable-next-line no-undef
      ElMessage.info("今天已经签到过了");
    }
    signStore.signDay = res.data.data;
  } else {
    // eslint-disable-next-line no-undef
    ElMessage.error(res.data.message);
  }
};
const fansCount = computed(() => {
  return formattedCount(userStore.userInfo.count);
});
</script>

<template>
  <div class="layout">
    <el-container>
      <el-header class="header">
        <el-row justify="space-between">
          <el-col :xs="12" :sm="8" :md="6" :lg="6" :xl="6">
            <!-- logo -->
            <div class="logo" @click="$router.push('/')">
              <el-image
                style="width: 50px; height: 50px; border-radius: 20%"
                :src="logoUrl"
              />
              <div class="text">声迹</div>
              <el-icon style="margin-left: 10px; width: 20px"
                ><HomeFilled
              /></el-icon>
            </div>
            <div class="sign" v-if="userStore.userInfo.username" @click="sign">
              <el-tag>点击签到</el-tag>
              <el-tag>本月已经连续签到{{ signStore.signDay }}天</el-tag>
            </div>
          </el-col>
          <el-col :xs="0" :sm="0" :md="0" :lg="7" :xl="8">
            <!-- search框 -->
            <div class="search">
              <el-input
                v-model="searchContent"
                placeholder="搜索"
                :prefix-icon="Search"
                @keyup.enter="search"
              />
              <el-button
                @click="search"
                style="margin-left: 4px; font-size: 24px; width: 32px"
                :icon="Search"
              />
            </div>
          </el-col>
          <!-- 按钮 -->
          <el-col :push="2" :xs="0" :sm="9" :md="9" :lg="6" :xl="6">
            <el-button type="success" @click="myPosts">我的帖子</el-button>
            <el-button type="primary" @click="myFollowPosts"
              >我的关注</el-button
            >
            <el-button @click="$router.push('/publicPost')" type="warning"
              >发布</el-button
            >
          </el-col>
          <el-col :xs="12" :sm="7" :md="7" :lg="4" :xl="4">
            <!-- 登录按钮 -->
            <div class="login" v-if="!userStore.userInfo.username">
              <el-button @click="$router.push('/login')" type="primary"
                >去登录</el-button
              >
            </div>
            <!-- 用户信息 -->
            <div class="user" v-else>
              <el-avatar
                @click="$router.push('/my')"
                style="height: 50px; width: 50px"
                :src="userStore.userInfo.avatar"
              />
              <div class="box">
                <div class="nickname" @click="$router.push('/my')">
                  {{ userStore.userInfo.nickname }}
                </div>
                <el-text @click="toFans" size="small" type="primary"
                  >{{ fansCount }} 粉</el-text
                >
              </div>
            </div>
          </el-col>
        </el-row>
      </el-header>

      <el-main class="main">
        <el-row>
          <el-col :span="1"></el-col>
          <el-col :span="22"> <router-view /> </el-col>
          <el-col :span="1"></el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.layout {
  padding: 20px 0;
  .header {
    margin-bottom: 16px;
    .logo {
      display: flex;
      align-items: center;
      .text {
        margin-left: 10px;
        font-size: 18px;
        font-weight: bold;
        color: #409eff;
        text-align: center;
      }
    }
    .sign {
      margin-left: 10px;
      cursor: pointer;
    }
    .logo:hover {
      cursor: pointer;
    }
    .search {
      display: flex;
    }
    .login {
      justify-content: flex-end;
      display: flex;
    }
    .box {
      margin-left: 10px;
      .nickname {
        line-height: 30px;
        white-space: nowrap; /* 强制文本不换行 */
        overflow: hidden; /* 隐藏溢出内容 */
        text-overflow: ellipsis; /* 显示省略号 */
        width: 70px; /* 需要指定宽度 */
      }
    }
    .user {
      justify-content: flex-end;
      display: flex;
    }
    .user:hover {
      cursor: pointer;
    }
  }
  .main {
    background-color: #ffffff;
  }
}
</style>
