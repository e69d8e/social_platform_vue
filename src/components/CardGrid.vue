<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  gutter: { type: Number, default: 16 },
});

// 用法：<CardGrid :items="list"><template #item="{ item }">...</template></CardGrid>
// 注意：卡片内容必须放在名为 "item" 的具名插槽中
</script>

<template>
  <el-row :gutter="gutter" class="card-grid">
    <el-col
      v-for="(item, index) in items"
      :key="item.id ?? index"
      :xs="24"
      :sm="12"
      :md="8"
      :lg="6"
      :xl="4"
    >
      <slot name="item" :item="item" :index="index" />
    </el-col>
  </el-row>
</template>

<style lang="scss" scoped>
.card-grid {
  margin-left: 0 !important;
  margin-right: 0 !important;

  :deep(.el-col) {
    margin-bottom: 16px;
  }
}
</style>
