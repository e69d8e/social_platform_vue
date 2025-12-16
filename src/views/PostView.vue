<script setup>
import { ref, onMounted } from "vue";
import { getPostDetailApi } from "@/api/postApi";
import { useRoute, useRouter } from "vue-router";
import { likeApi, deletePostApi } from "@/api/postApi";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { useUserStore } from "@/stores/user";
import { banPostApi } from "@/api/reviewerApi";
import CommentBox from "@/components/CommentBox.vue";
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const post = ref({
  id: "",
  title: "标题",
  content: "内容",
  category: "分类",
  createTime: "",
  postImages: [{ id: "", url: "" }],
  liked: false,
  count: 0,
  userId: "",
  nickname: "",
  avatar: "",
  followed: false,
});
const dialogVisible = ref(false);
const loading = ref(false);
const getPost = async (id) => {
  const res = await getPostDetailApi(id);
  post.value = res.data.data;
};
onMounted(async () => {
  await getPost(route.params.id);
  loading.value = false;
});
const like = async () => {
  const res = await likeApi(post.value.id);

  if (res.data.code === 1) {
    post.value.liked = true;
    post.value.count++;
    // eslint-disable-next-line no-undef
    ElMessage({
      message: "点赞成功",
      type: "success",
    });
  }
};
const unLike = async () => {
  const res = await likeApi(post.value.id);

  if (res.data.code === 1) {
    post.value.liked = false;
    post.value.count--;
    // eslint-disable-next-line no-undef
    ElMessage({
      message: "取消成功",
      type: "success",
    });
  }
};
const follow = async () => {
  if (userStore.userInfo.id === post.value.userId) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: "不能关注自己",
      type: "warning",
    });
    return;
  }
  const res = await followUserApi(post.value.userId);
  post.value.followed = true;

  if (res.data.code === 1) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
};
const unFollow = async () => {
  const res = await unfollowUserApi(post.value.userId);
  post.value.followed = false;

  if (res.data.code === 1) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
};
const deletePost = async () => {
  const res = await deletePostApi(post.value.id);
  if (res.data.code === 1) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
  dialogVisible.value = false;
  router.back();
};
const banPost = async () => {
  const res = await banPostApi(post.value.id);
  if (res.data.code === 1) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
  router.back();
};
</script>

<template>
  <div class="post" v-loading="loading">
    <div class="pointer" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <div class="title">{{ post.title }}</div>
    <div class="user">
      <el-avatar
        class="pointer"
        @click="$router.push({ path: '/user/' + post.userId })"
        style="width: 40px; height: 40px"
        :src="post.avatar"
        :size="40"
      ></el-avatar>
      <el-text
        @click="$router.push({ path: '/user/' + post.userId })"
        class="nickname pointer"
        >{{ post.nickname }}</el-text
      >
      <el-button @click="follow" type="primary" v-if="!post.followed"
        >关注</el-button
      >
      <el-button @click="unFollow" v-else>已关注</el-button>
      <el-icon
        v-if="userStore.userInfo.id === post.userId"
        @click="dialogVisible = true"
        class="icon pointer"
        ><Delete
      /></el-icon>
      <el-popconfirm
        class="box-item"
        title="确定封禁/解封该文章吗？"
        placement="right-start"
        @confirm="banPost"
      >
        <template #reference>
          <el-icon
            v-if="userStore.userInfo.authority === 'REVIEWER'"
            class="icon pointer"
            ><RemoveFilled
          /></el-icon>
        </template>
      </el-popconfirm>
    </div>
    <div class="other">
      <el-text type="primary" class="time">
        {{ post.createTime }}
      </el-text>
      <div class="like">
        <el-icon @click="like" size="large" v-if="!post.liked"
          ><Star
        /></el-icon>
        <el-icon @click="unLike" size="large" v-else><StarFilled /></el-icon>
        <el-text class="text" type="primary">{{ post.count }} 赞</el-text>
      </div>
      <div class="category">
        <el-tag>{{ post.category }}</el-tag>
      </div>
    </div>
    <div class="other"></div>
    <div class="demo-image__lazy" v-if="post.postImages.length > 0">
      <el-image
        v-for="img in post.postImages"
        :key="img.id"
        :src="img.url"
        lazy
      />
    </div>
    <div class="content">
      {{ post.content }}
    </div>
    <el-dialog v-model="dialogVisible" title="确认删除?" width="500">
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="deletePost"> 确认 </el-button>
        </div>
      </template>
    </el-dialog>
    <CommentBox :post-id="route.params.id" />
  </div>
</template>

<style scoped>
.post {
  margin: 50px auto;
  width: 800px;
  .pointer {
    cursor: pointer;
  }
  .title {
    font-size: 28px;
    font-weight: bold;
    margin: 30px 0;
  }
  .user {
    display: flex;
    .nickname {
      margin: 0 20px 10px;
    }
    .icon {
      margin-left: 20px;
      font-size: 32px;
      color: red;
    }
    .icon:hover {
      color: #ff9999;
    }
  }
  .other {
    display: flex;
    margin: 20px 0;
    .time {
      margin-right: 20px;
    }
    .like {
      display: flex;
      align-items: center;
      .text {
        margin: 0 10px;
      }
    }
  }
  .demo-image__lazy {
    margin: 20px auto;
    width: 800px;
    height: 400px;
    overflow-y: auto;
  }
  .demo-image__lazy .el-image {
    display: block;
    min-height: 200px;
    margin-bottom: 10px;
  }
  .demo-image__lazy .el-image:last-child {
    margin-bottom: 0;
  }
}
</style>
