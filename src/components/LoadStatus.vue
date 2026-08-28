<script setup>
import { Loading, RefreshRight } from "@element-plus/icons-vue";

defineProps({
  /** 是否正在加载更多 */
  loading: { type: Boolean, default: false },
  /** 是否已没有更多数据 */
  noMore: { type: Boolean, default: false },
  /** 列表有内容时才显示“已经到底了” */
  hasItems: { type: Boolean, default: true },
  /** 是否加载失败 */
  isError: { type: Boolean, default: false },
});

defineEmits(["retry"]);
</script>

<template>
  <div class="load-status">
    <div v-if="loading" class="loading-more">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="isError" class="load-error">
      <span>加载失败</span>
      <el-button
        text
        type="primary"
        size="small"
        :icon="RefreshRight"
        @click="$emit('retry')"
      >
        点击重试
      </el-button>
    </div>
    <div v-else-if="noMore && hasItems" class="no-more">
      <span>— 已经到底了 —</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.load-status {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0 32px;

  .loading-more {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;

    .loading-icon {
      animation: spin 1s linear infinite;
    }
  }

  .no-more {
    color: var(--text-muted);
    font-size: 13px;
    letter-spacing: 2px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
