<script setup>
import PostCard from "@/components/PostCard.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { getFollowPostsApi } from "@/api/postApi";
// 获取当前时间时间戳
const timestamp = Date.parse(new Date());
const params = ref({
  lastId: timestamp,
  offset: 0,
});
const posts = ref([]);
onMounted(async () => {
  await getPosts();
});
const getPosts = async () => {
  const postList = await getFollowPostsApi(params.value);
  posts.value = [...posts.value, ...postList.data.data.list];
  params.value.lastId = postList.data.data.minTime;
  params.value.offset = postList.data.data.offset;
  console.log(postList.data.data.minTime);
};

const isLoading = ref(false);

const handleWindowScroll = () => {
  if (isLoading.value) return;

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
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    console.log("加载更多...");
    // 数据加载逻辑
    await getPosts();
  } finally {
    isLoading.value = false;
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
  <div class="follow" v-loading="isLoading">
    <div class="back">
      <el-icon size="large">
        <ArrowLeft @click="$router.back()" />
      </el-icon>
    </div>
    <div class="text">
      <el-text size="large" type="primary">我的关注</el-text>
    </div>
    <el-row>
      <el-col class="colItem" v-for="post in posts" :key="post.id" :span="6">
        <PostCard
          class="postCard"
          :id="post.id"
          :img-url="post.imgUrl"
          :title="post.title"
          :content="post.content"
          :count="post.count"
          :liked="post.liked"
          :time="post.createTime"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.follow {
  .back {
    cursor: pointer;
  }
  .text {
    text-align: center;
    margin-bottom: 10px;
  }
  .colItem {
    margin-bottom: 20px;
  }
}
</style>
