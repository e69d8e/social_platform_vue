<script setup>
import { useRouter } from "vue-router";
import { getBlacklistApi, unblockUserApi } from "@/api/blacklistApi";
import { usePageList } from "@/composables/usePageList";
import { BLACKLIST_PAGE_SIZE } from "@/constants/pagination";
import PageHeader from "@/components/PageHeader.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import formatRelativeTime from "@/utils/formatTime";
import { ElMessage, ElMessageBox } from "element-plus";
import { CircleClose, UserFilled } from "@element-plus/icons-vue";

const router = useRouter();

const { list, pageNum, pageSize, total, loading, isError, pageChange, retry } =
  usePageList({
    pageSize: BLACKLIST_PAGE_SIZE,
    fetchPage: ({ pageNum, pageSize }) =>
      getBlacklistApi({ pageNum, pageSize }).then((res) => ({
        data: res.data.data,
        total: Number(res.data.total ?? 0),
      })),
  });

const unblock = async (item) => {
  try {
    await ElMessageBox.confirm(
      `解除后你们的内容会重新互相可见，也可以继续互发私信（关注关系不会自动恢复）。确定解除对「${item.nickname || item.username || "该用户"}」的拉黑吗？`,
      "解除拉黑",
      { confirmButtonText: "解除", cancelButtonText: "取消", type: "info" },
    );
  } catch {
    return; // 用户取消
  }
  try {
    const res = await unblockUserApi(item.id);
    if (res.data.code !== 1) return;
    ElMessage.success(res.data.message || "已解除拉黑");
    // 就地移除，避免整页重载造成位置跳动
    list.value = list.value.filter((u) => String(u.id) !== String(item.id));
    total.value = Math.max(0, total.value - 1);
  } catch {
    // 提示由拦截器统一给出
  }
};
</script>

<template>
  <div class="blacklist-page" v-loading="loading && list.length > 0">
    <PageHeader title="黑名单" :total="total" unit="人">
      <template #extra>
        <span class="header-hint">
          被拉黑后双方互相看不到对方的帖子，也无法互发私信
        </span>
      </template>
    </PageHeader>

    <SkeletonGrid v-if="loading && list.length === 0" type="user" :count="6" />

    <LoadStatus
      v-else-if="isError"
      :is-error="true"
      :has-items="false"
      @retry="retry"
    />

    <el-empty v-else-if="list.length === 0" description="你还没有拉黑任何人">
      <el-button type="primary" round @click="router.push('/home')"
        >去首页逛逛</el-button
      >
    </el-empty>

    <div v-else class="blacklist-list">
      <div v-for="item in list" :key="item.id" class="blacklist-item">
        <el-avatar :size="48" :src="item.avatar" class="item-avatar">
          <el-icon><UserFilled /></el-icon>
        </el-avatar>
        <div class="item-main">
          <div class="item-name-line">
            <span class="item-name">{{ item.nickname || "已注销用户" }}</span>
            <span v-if="item.username" class="item-username"
              >@{{ item.username }}</span
            >
            <el-tag v-if="item.enabled === false" size="small" type="info"
              >已封禁</el-tag
            >
          </div>
          <span class="item-time">
            {{ formatRelativeTime(item.createTime) }}拉黑
          </span>
        </div>
        <el-button
          class="item-unblock"
          size="small"
          plain
          :icon="CircleClose"
          @click="unblock(item)"
          >解除拉黑</el-button
        >
      </div>
    </div>

    <ListPagination
      v-model:page-num="pageNum"
      :total="total"
      :page-size="pageSize"
      @change="pageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.blacklist-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}

.header-hint {
  font-size: 12px;
  color: var(--text-placeholder);
}

.blacklist-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.blacklist-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--el-color-primary-light-7);
    box-shadow: var(--shadow-md);
  }
}

.item-avatar {
  flex-shrink: 0;
  border: 2px solid var(--border-light);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-username {
  font-size: 12px;
  color: var(--text-placeholder);
}

.item-time {
  font-size: 12px;
  color: var(--text-muted);
}

.item-unblock {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .blacklist-item {
    padding: 12px 14px;
    gap: 10px;
  }

  .item-username {
    display: none;
  }
}
</style>
