<script setup>
const props = defineProps({
  authority: {
    type: String,
    default: "USER",
  },
});
</script>
<template>
  <div class="authority">
    <el-text v-if="props.authority === 'ADMIN'" type="danger">
      <el-icon><Cpu /></el-icon>管理员
    </el-text>
    <el-text v-if="props.authority === 'USER'" type="success">
      <el-icon><Avatar /></el-icon>用户
    </el-text>
    <el-text v-if="props.authority === 'REVIEWER'" type="primary">
      <el-icon><Notebook /></el-icon>审核
    </el-text>
  </div>
</template>
<style lang="scss" scoped></style>
