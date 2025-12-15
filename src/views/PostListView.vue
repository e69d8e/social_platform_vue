<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getPostListApi } from "@/api/postApi";
import PostCard from "@/components/PostCard.vue";
const route = useRoute();
const postList = ref([]);
const pageNum = ref(1);
const pageSize = ref(8);
const total = ref(0);
const loading = ref(true);
const getPostList = async () => {
  const res = await getPostListApi(route.params.id, {
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  });
  postList.value = res.data.data;
  total.value = res.data.total;
};
onMounted(async () => {
  await getPostList();
  loading.value = false;
});
const pageChange = async () => {
  loading.value = true;
  await getPostList();
  loading.value = false;
};
</script>
<template>
  <div class="post-list" v-loading="loading">
    <div class="back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <div class="text">
      <el-text size="large" type="primary">帖子列表</el-text>
    </div>
    <el-row>
      <el-col class="colItem" v-for="post in postList" :key="post.id" :span="6">
        <PostCard
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

    <div class="pagination">
      <el-pagination
        @current-change="pageChange"
        :total="total"
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        size="large"
        background
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.post-list {
  .colItem {
    margin-bottom: 10px;
  }
  .back {
    cursor: pointer;
  }
  .text {
    text-align: center;
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
}
</style>
