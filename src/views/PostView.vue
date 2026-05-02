<script setup>
import { ref, onMounted } from "vue";
import { getPostDetailApi } from "@/api/postApi";
import { useRoute, useRouter } from "vue-router";
import { likeApi, deletePostApi } from "@/api/postApi";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { useUserStore } from "@/stores/user";
import { banPostApi } from "@/api/reviewerApi";
import CommentBox from "@/components/CommentBox.vue";
import { throttle } from "lodash";
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const post = ref({
  id: "",
  title: "标题",
  content: "内容",
  category: "分类",
  createTime: "",
  cover: "",
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
const likeLoading = ref(false);

const toggleLike = throttle(async () => {
  if (likeLoading.value) return;

  likeLoading.value = true;

  // 记录旧状态（用于回滚）
  const oldLiked = post.value.liked;
  const oldCount = post.value.count;

  // 乐观更新（UI 先变）
  if (post.value.liked) {
    post.value.liked = false;
    post.value.count--;
  } else {
    post.value.liked = true;
    post.value.count++;
  }

  try {
    //（点赞 / 取消点赞）
    const res = await likeApi(post.value.id);

    if (res.data.code !== 1) {
      throw new Error("操作失败");
    }
    // eslint-disable-next-line no-undef
    ElMessage.success(res.data.message);
  } catch (e) {
    // 失败回滚
    post.value.liked = oldLiked;
    post.value.count = oldCount;
    console.log(e);

    // eslint-disable-next-line no-undef
    ElMessage({
      message: "操作失败，请重试",
      type: "error",
    });
  } finally {
    likeLoading.value = false;
  }
}, 800);

const followLoading = ref(false);
const toggleFollow = throttle(async () => {
  // 不能关注自己
  if (userStore.userInfo.id === post.value.userId) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: "不能关注自己",
      type: "warning",
    });
    return;
  }

  // 防并发
  if (followLoading.value) return;
  followLoading.value = true;

  // 记录旧状态（用于回滚）
  const oldFollowed = post.value.followed;

  // 乐观更新（UI先变）
  post.value.followed = !post.value.followed;

  try {
    // 根据状态调用不同接口
    const res = post.value.followed
      ? await followUserApi(post.value.userId)
      : await unfollowUserApi(post.value.userId);

    if (res.data.code !== 1) {
      throw new Error("操作失败");
    }

    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  } catch (e) {
    // 失败回滚
    post.value.followed = oldFollowed;
    console.log(e);

    // eslint-disable-next-line no-undef
    ElMessage({
      message: "操作失败，请重试",
      type: "error",
    });
  } finally {
    followLoading.value = false;
  }
}, 800);
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
      <el-button @click="toggleFollow" type="primary" v-if="!post.followed"
        >关注</el-button
      >
      <el-button @click="toggleFollow" v-else>已关注</el-button>
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
        <el-icon @click="toggleLike" size="large" v-if="!post.liked"
          ><Star
        /></el-icon>
        <el-icon @click="toggleLike" size="large" v-else
          ><StarFilled
        /></el-icon>
        <el-text class="text" type="primary">{{ post.count }} 赞</el-text>
      </div>
      <div class="category">
        <el-tag>{{ post.category }}</el-tag>
      </div>
    </div>
    <div class="other"></div>
    <div class="cover" v-show="post.cover">
      <el-image :src="post.cover"></el-image>
    </div>
    <div class="line"></div>
    <div class="content" v-html="post.content"></div>
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
  .line {
    border-top: 2px solid #dcdfe6;
    margin: 20px 0;
  }
}
</style>
