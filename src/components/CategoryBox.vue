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
    <el-row :gutter="60">
      <el-col
        @click="
          $router.push({
            path: '/category/' + category.id,
            query: { category: category.name },
          })
        "
        :span="4"
        v-for="category in categoryList"
        :key="category.id"
      >
        <div class="text">
          <el-button class="button" type="primary" plain>{{
            category.name
          }}</el-button>
        </div>
      </el-col>
    </el-row>
  </div>
</template>
<style lang="scss" scoped>
.category {
  margin-bottom: 20px;
  .text {
    margin-bottom: 10px;
    .button {
      width: 100%;
      height: 50px;
      font-size: large;
    }
  }
}
</style>
