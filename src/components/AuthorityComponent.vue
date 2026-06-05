<script setup>
import { Cpu, Avatar, Notebook } from "@element-plus/icons-vue";

defineProps({
  authorityId: {
    type: Number,
    default: 1,
  },
});
</script>

<template>
  <div class="authority">
    <el-text v-if="authorityId === 2" type="danger" class="badge">
      <el-icon><Cpu /></el-icon> 管理员
    </el-text>
    <el-text v-if="authorityId === 1" type="success" class="badge">
      <el-icon><Avatar /></el-icon> 用户
    </el-text>
    <el-text v-if="authorityId === 3" type="primary" class="badge">
      <el-icon><Notebook /></el-icon> 审核
    </el-text>
  </div>
</template>

<style lang="scss" scoped>
.authority {
  display: inline-flex;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    padding: 2px 8px;
    border-radius: $radius-full;
    background: var(--bg-subtle);
  }
}
</style>
