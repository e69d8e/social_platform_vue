<script setup>
const props = defineProps({
  authorityId: {
    type: Number,
    default: 1,
  },
});
</script>
<template>
  <div class="authority">
    <el-text v-if="props.authorityId === 2" type="danger">
      <el-icon><Cpu /></el-icon>管理员
    </el-text>
    <el-text v-if="props.authorityId === 1" type="success">
      <el-icon><Avatar /></el-icon>用户
    </el-text>
    <el-text v-if="props.authorityId === 3" type="primary">
      <el-icon><Notebook /></el-icon>审核
    </el-text>
  </div>
</template>
<style lang="scss" scoped></style>
