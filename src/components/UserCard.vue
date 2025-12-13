<script setup>
const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  avatar: {
    type: String,
    default: "http://127.0.0.1:8080/imgs/avatar/default.jpg",
  },
  nickname: {
    type: String,
    default: "用户名",
  },
  bio: {
    type: String,
    default: "个性签名",
  },
  followed: {
    type: Boolean,
    default: false,
  },
  count: {
    type: Number,
    default: 0,
  },
});
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { ref } from "vue";
const followed = ref(props.followed);
const count = ref(props.count);
const follow = async () => {
  const res = await followUserApi(props.id);
  // eslint-disable-next-line no-undef
  ElMessage.success(res.data.message);
  followed.value = true;
  count.value++;
};
const unfollow = async () => {
  const res = await unfollowUserApi(props.id);
  // eslint-disable-next-line no-undef
  ElMessage.success(res.data.message);
  followed.value = false;
  count.value--;
};
</script>

<template>
  <div class="userCard">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-avatar
            class="pointer"
            @click="$router.push(`/user/${props.id}`)"
            :src="props.avatar"
          />
          <span
            @click="$router.push(`/user/${props.id}`)"
            class="nickname pointer"
            >{{ props.nickname }}</span
          >
          <el-button
            @click="follow"
            v-if="!followed"
            type="primary"
            class="follow"
            >关注</el-button
          >
          <el-button @click="unfollow" v-else class="follow">已关注</el-button>
        </div>
        <el-text
          style="display: flex; justify-content: flex-start; cursor: pointer"
          type="primary"
          >{{ count }} 粉丝</el-text
        >
      </template>
      <div class="bio">
        {{ props.bio }}
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.userCard {
  .card-header {
    .pointer {
      cursor: pointer;
    }
    display: flex;
    align-items: center;
    line-height: 50px;
  }
  width: 280px;
  .content {
    text-align: left;
    // 限制显示一行内容
  }
  .nickname {
    text-align: left;

    white-space: 1; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    width: 50%; /* 需要指定宽度 */
    margin-left: 10px;
  }
  .bio {
    text-align: left;
    // 限制显示一行内容
    white-space: nowrap; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    width: 100%; /* 需要指定宽度 */
  }
}
@keyframes grow {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.05);
  }
}
@keyframes shrink {
  0% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
.userCard:hover {
  animation: grow 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
.userCard:not(:hover) {
  animation: shrink 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
</style>
