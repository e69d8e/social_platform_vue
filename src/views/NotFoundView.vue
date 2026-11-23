<template>
  <div class="not-found-page">
    <PageHeader title="页面不存在" />
    <el-empty description="你访问的页面不存在或已被移除">
      <el-button type="primary" round @click="$router.push('/home')"
        >回到首页</el-button
      >
    </el-empty>
  </div>
</template>

<script setup>
import PageHeader from "@/components/PageHeader.vue";
</script>

<style lang="scss" scoped>
.not-found-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
}
</style>
