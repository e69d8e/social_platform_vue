<script setup>
import PostCard from "@/components/PostCard.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { getIndexPostsApi } from "@/api/postApi";
import CategoryComponent from "@/components/CategoryComponent.vue";
import { connect } from "@/utils/websocket.js";
// 获取当前时间时间戳
const timestamp = Date.parse(new Date());
const params = ref({
  lastId: timestamp,
  offset: 0,
});
const loading = ref(true);
const posts = ref([]);
onMounted(async () => {
  await getPosts();
  connect((msg) => {
    console.log("收到消息:", msg);
    const data = JSON.parse(msg);
    // eslint-disable-next-line no-undef
    ElNotification.success({
      title: data.content,
      message: "帖子标题: " + data.title,
      dangerouslyUseHTMLString: true,
      offset: 100,
    });
  });
  loading.value = false;
});
const getPosts = async () => {
  const postList = await getIndexPostsApi(params.value);
  posts.value = [...posts.value, ...postList.data.data.list];
  params.value.lastId = postList.data.data.minTime;
  params.value.offset = postList.data.data.offset;
  console.log(postList.data.data.minTime);
};
const handleWindowScroll = () => {
  if (loading.value) return;

  // 窗口滚动到底部的判断
  const scrollTop =
    document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;
  const scrollHeight =
    document.documentElement.scrollHeight || document.body.scrollHeight;

  const threshold = 50; // 距离底部100px时触发

  if (scrollTop + clientHeight >= scrollHeight - threshold) {
    loadMore();
  }
};

const loadMore = async () => {
  if (loading.value) return;

  loading.value = true;
  try {
    console.log("加载更多...");
    // 数据加载逻辑
    await getPosts();
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleWindowScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleWindowScroll);
});
</script>

<template>
  <div class="home" v-loading="loading">
    <div class="category">
      <CategoryComponent />
    </div>
    <el-row :gutter="10">
      <el-col
        class="colItem"
        justify="space-between"
        v-for="post in posts"
        :key="post.id"
        :xs="14"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="4"
      >
        <PostCard
          class="postCard"
          :id="post.id"
          :img-url="post.imgUrl"
          :title="post.title"
          :content="post.content"
          :count="post.count"
          :liked="post.liked"
          :time="post.createTime"
          :cover="post.cover"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.home {
  .category {
    padding: 0 20px;
  }
  .colItem {
  }
}
</style>
