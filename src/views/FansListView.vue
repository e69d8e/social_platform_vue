<script setup>
import { ref, onMounted } from "vue";
import { getFollowerListApi, getUserFollowerListApi } from "@/api/followApi";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
const route = useRoute();
const userStore = useUserStore();
const fansList = ref([]);
const pageNum = ref(1);
const pageSize = ref(8);
const total = ref(0);
const getFansList = async () => {
  if (route.params.id === userStore.userInfo.id) {
    console.log(route.params.id);
    const res = await getFollowerListApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    });
    fansList.value = res.data.data;
    total.value = res.data.total;
  } else {
    const res = await getUserFollowerListApi(
      {
        pageNum: pageNum.value,
        pageSize: pageSize.value,
      },
      route.params.id,
    );
    fansList.value = res.data.data;
    total.value = res.data.total;
  }
};
onMounted(async () => {
  await getFansList();
});
const pageChange = async (pageNum) => {
  pageNum.value = pageNum;
  await getFansList();
};
</script>
<template>
  <div class="fans">
    <div class="back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <el-text size="large" type="primary">粉丝列表</el-text>
    <div class="size" style="height: 20px"></div>
    <el-row>
      <el-col class="colItem" v-for="user in fansList" :key="user.id" :span="6">
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
    <div class="pagination">
      <el-pagination
        @current-change="pageChange"
        :total="total"
        :default-page-size="pageSize"
        size="large"
        background
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.fans {
  .back {
    cursor: pointer;
    height: 40px;
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
}
</style>
