<script setup>
import { ref } from "vue";
import { RouterView } from "vue-router";
import { Search } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { layoutApi } from "@/api/userApi";
import { useRouter } from "vue-router";
import { ElButton } from "element-plus";
const router = useRouter();
const userStore = useUserStore();
const logoUrl = "http://127.0.0.1:8080/imgs/logo.png";
const searchContent = ref("");
const logout = async () => {
  await userStore.removeInfo();
  const data = await layoutApi();
  // eslint-disable-next-line no-undef
  ElMessage.success(data.data.message);
  router.push("/login");
};
</script>

<template>
  <div class="layout">
    <el-container>
      <el-header class="header">
        <el-row :gutter="0">
          <el-col :span="6">
            <!-- logo -->
            <div class="logo" @click="$router.push('/')">
              <el-image
                style="width: 50px; height: 50px; border-radius: 50%"
                :src="logoUrl"
              />
              <div class="text">小蓝书</div>
            </div>
          </el-col>
          <el-col :span="10">
            <!-- search框 -->
            <div class="search">
              <el-input
                class="input"
                v-model="searchContent"
                placeholder="搜索"
                :prefix-icon="Search"
              />
              <el-button
                @click="$router.push('/search')"
                style="
                  height: 50px;
                  width: 60px;
                  margin-left: 10px;
                  font-size: 24px;
                  line-height: 50px;
                "
                :icon="Search"
                type="primary"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <!-- 登录按钮 -->
            <div class="lgoin" v-if="!userStore.userInfo.username">
              <el-button
                @click="$router.push('/login')"
                style="height: 50px"
                type="primary"
                >去登录</el-button
              >
            </div>
            <!-- 用户信息 -->
            <div class="user" @click="$router.push('/my')" v-else>
              <el-avatar
                style="height: 50px; width: 50px"
                :src="userStore.userInfo.avatar"
              />
              <div class="nickname">{{ userStore.userInfo.nickname }}</div>
              <el-button
                style="height: 50px; width: 60px; margin-left: 10px"
                type="primary"
                >关注</el-button
              >
              <el-button
                style="height: 50px; width: 60px; margin-left: 10px"
                type="primary"
                >粉丝</el-button
              >
              <el-button
                @click="logout"
                style="height: 50px; margin-left: 10px"
                type="warning"
                >注销</el-button
              >
            </div>
          </el-col>
        </el-row>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.layout {
  padding: 40px 180px;
  .header {
    /* background-color: orange; */
    height: 100px;
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
    .logo:hover {
      cursor: pointer;
    }
    .search {
      display: flex;
      .input {
        flex: 1;
      }
    }
    .lgoin {
      justify-content: flex-end;
      display: flex;
    }
    .nickname {
      margin: 0px 10px;
      line-height: 50px;
      white-space: nowrap; /* 强制文本不换行 */
      overflow: hidden; /* 隐藏溢出内容 */
      text-overflow: ellipsis; /* 显示省略号 */
      width: 70px; /* 需要指定宽度 */
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
