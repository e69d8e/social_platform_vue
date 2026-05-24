<script setup>
import { getPostCategoryApi } from "@/api/postApi";
import { ref, onMounted } from "vue";

const categoryList = ref([]);

const getCategoryList = async () => {
  const res = await getPostCategoryApi();
  categoryList.value = res.data.data;
};

onMounted(async () => {
  await getCategoryList();
});
</script>

<template>
  <div class="category">
    <el-row :gutter="12" class="category-row">
      <el-col
        v-for="category in categoryList"
        :key="category.id"
        :xs="8"
        :sm="6"
        :md="4"
        :lg="3"
        :xl="2"
        @click="$router.push({ path: '/category/' + category.id, query: { category: category.name } })"
      >
        <el-button class="category-btn" type="primary" plain>{{ category.name }}</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.category {
  margin-bottom: 16px;

  .category-row {
    margin-left: 0 !important;
    margin-right: 0 !important;

    :deep(.el-col) {
      margin-bottom: 10px;
    }
  }

  .category-btn {
    width: 100%;
    height: 42px;
    font-size: 14px;
    border-radius: var(--el-border-radius-base, 4px);
  }
}
</style>
