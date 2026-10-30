<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  gutter: { type: Number, default: 16 },
});

// 用法：<CardGrid :items="list"><template #item="{ item }">...</template></CardGrid>
// 注意：卡片内容必须放在名为 "item" 的具名插槽中
// 布局采用 CSS Grid（参考 B 站首页密度）：移动端 2 列，随屏幕加宽增至 5 列
</script>

<template>
  <div class="card-grid">
    <div v-for="(item, index) in items" :key="item.id ?? index" class="cell">
      <slot name="item" :item="item" :index="index" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (min-width: 680px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 980px) {
  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 1240px) {
  .card-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 18px;
  }
}

@media (max-width: 440px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
