<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { searchPostsApi } from "@/api/searchApi";
import PostCard from "@/components/PostCard.vue";
import { searchUsersApi } from "@/api/userApi";
import UserCard from "@/components/UserCard.vue";
const route = useRoute();
const pageNum = ref(1);
const pageSize = ref(8);

const searchQuery = computed(() => route.query.keyword || "");
const posts = ref([]);
const users = ref([]);
const postTotal = ref(0);
const usersTotal = ref(0);
onMounted(async () => {
  await searchPosts(searchQuery.value);
  await searchUsers(searchQuery.value);
});
const searchPosts = async (search) => {
  const res = await searchPostsApi({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    search,
  });
  posts.value = res.data.data;
  postTotal.value = res.data.total;
};
const searchUsers = async (search) => {
  const res = await searchUsersApi({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    nickname: search,
  });
  users.value = res.data.data;
  usersTotal.value = res.data.total;
};
const pageChange = async (newPageNum) => {
  pageNum.value = newPageNum;
  await searchPosts(searchQuery.value);
  await searchUsers(searchQuery.value);
};
const activeName = ref("1");
watch(
  () => route.query.keyword,
  async (newSearchQuery) => {
    pageSize.value = 8;
    pageNum.value = 1;
    await searchPosts(newSearchQuery);
    await searchUsers(newSearchQuery);
  },
);
</script>
<template>
  <div class="search">
    <div class="pointer back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <el-tabs :stretch="true" v-model="activeName" class="demo-tabs">
      <el-tab-pane label="帖子" name="1">
        <template #label>
          <span class="custom-tabs-label">
            <span>帖子</span>
          </span>
        </template>
        <el-row>
          <el-col
            class="colItem"
            v-for="post in posts"
            :key="post.id"
            :span="6"
          >
            <PostCard
              class="postCard"
              :id="post.id"
              :img-url="post.imgUrl"
              :title="post.title"
              :content="post.content"
              :liked="post.liked"
              :count="post.count"
              :time="post.createTime"
            />
          </el-col>
        </el-row>
      </el-tab-pane>
      <el-tab-pane label="用户" name="2">
        <template #label>
          <span class="custom-tabs-label">
            <span>用户</span>
          </span>
        </template>
        <el-row>
          <el-col
            class="colItem"
            v-for="user in users"
            :key="user.id"
            :span="6"
          >
            <UserCard
              class="postCard"
              :id="user.id"
              :avatar="user.avatar"
              :nickname="user.nickname"
              :bio="user.bio"
              :followed="user.followed"
              :count="user.count"
            />
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <div class="pagination">
      <el-pagination
        @current-change="pageChange"
        :total="activeName === '1' ? postTotal : usersTotal"
        :default-page-size="pageSize"
        size="large"
        background
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.search {
  margin: 0 auto;
  text-align: center;
  .pointer {
    cursor: pointer;
  }
  .back {
    margin: 10px 0;
    text-align: start;
  }
  .colItem {
    margin-bottom: 10px;
  }
  .pagination {
    position: fixed;
    bottom: 20px; /* 距离底部的距离 */
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000; /* 确保在最上层 */
    background: white; /* 可选：添加背景色 */
    padding: 10px;
    border-radius: 8px; /* 可选：圆角 */
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 可选：阴影效果 */
  }
  .custom-tabs-label {
    font-size: 20px;
    margin-bottom: 20px;
  }
}
</style>
