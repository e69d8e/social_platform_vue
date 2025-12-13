<script setup>
import { ref, onMounted } from "vue";
import { getPostDetailApi } from "@/api/postApi";
import { useRoute } from "vue-router";
import { likeApi } from "@/api/postApi";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
const route = useRoute();
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
const getPost = async (id) => {
  const res = await getPostDetailApi(id);
  post.value = res.data.data;
  followed.value = post.value.followed;
  liked.value = post.value.liked;
  count.value = post.value.count;
};
onMounted(async () => {
  await getPost(route.params.id);
  console.log(post.value);
});
const followed = ref(false);
const liked = ref(false);
const count = ref(0);
const like = async () => {
  await likeApi(post.value.id);
  liked.value = true;
  count.value++;
  // eslint-disable-next-line no-undef
  ElMessage({
    message: "点赞成功",
    type: "success",
  });
};
const unLike = async () => {
  await likeApi(post.value.id);
  liked.value = false;
  count.value--;
  // eslint-disable-next-line no-undef
  ElMessage({
    message: "取消成功",
    type: "success",
  });
};
const follow = async () => {
  await followUserApi(post.value.userId);
  followed.value = true;
  // eslint-disable-next-line no-undef
  ElMessage({
    message: "关注成功",
    type: "success",
  });
};
const unFollow = async () => {
  await unfollowUserApi(post.value.userId);
  followed.value = false;
  // eslint-disable-next-line no-undef
  ElMessage({
    message: "取消成功",
    type: "success",
  });
};
</script>

<template>
  <div class="post">
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
      <el-button @click="follow" type="primary" v-if="!followed"
        >关注</el-button
      >
      <el-button @click="unFollow" v-else>已关注</el-button>
    </div>
    <div class="other">
      <el-text type="primary" class="time">
        {{ post.createTime }}
      </el-text>
      <div class="like">
        <el-icon @click="like" size="large" v-if="!liked"><Star /></el-icon>
        <el-icon @click="unLike" size="large" v-else><StarFilled /></el-icon>
        <el-text class="text" type="primary">{{ count }} 赞</el-text>
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
