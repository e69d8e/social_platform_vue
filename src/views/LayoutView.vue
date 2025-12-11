<script setup>
import { ref } from "vue";
import { RouterView } from "vue-router";
import { Search } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { layoutApi } from "@/api/userApi";
const userStore = useUserStore();
const logoUrl = "http://localhost:8080/imgs/logo.png";
const searchContent = ref("");
const logout = async () => {
  await userStore.removeInfo();
  await layoutApi();
};
</script>

<template>
  <div class="layout">
    <el-container>
      <el-header class="header">
        <el-row :gutter="50">
          <el-col :span="7">
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
                v-model="searchContent"
                class="responsive-input"
                placeholder="搜索"
                :prefix-icon="Search"
              />
              <el-button
                @click="$router.push('/search')"
                style="height: 50px; margin-left: 10px"
                :icon="Search"
                type="primary"
              />
            </div>
          </el-col>
          <el-col :span="7">
            <!-- 登录框 -->
            <div class="lgoin" v-if="!userStore.userInfo.username">
              <el-button
                @click="$router.push('/login')"
                style="height: 50px"
                type="primary"
                >去登录</el-button
              >
            </div>
            <div class="user" v-else>
              <el-avatar
                style="height: 50px; width: 50px"
                :src="userStore.userInfo.avatar"
              />
              <div class="nickname">{{ userStore.userInfo.nickname }}</div>
              <el-button
                @click="logout"
                style="height: 50px; margin: 0 20px"
                type="primary"
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
    .search {
      display: flex;
    }
    .lgoin {
      justify-content: flex-end;
      display: flex;
    }
    .nickname {
      margin: 0px 10px;
      line-height: 50px;
    }
    .user {
      justify-content: flex-end;
      display: flex;
    }
  }
  .main {
    background-color: #ffffff;
  }
}
</style>
