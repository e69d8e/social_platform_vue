<script setup>
import { ref, onMounted, computed } from "vue";
import { getPostCategoryApi, publicPostApi } from "@/api/postApi";
import { useRouter } from "vue-router";
const fileList = ref([]);
const dialogImageUrl = ref("");
const dialogVisible = ref(false);
const dialogConfirmVisible = ref(false);
const categoryId = ref("");
const title = ref("");
const content = ref("");
const loading = ref(false);
const router = useRouter();

const handleRemove = (uploadFile, uploadFiles) => {
  console.log(uploadFile, uploadFiles);
};
const categoryList = ref([]);
const getCategoryList = async () => {
  const res = await getPostCategoryApi();
  categoryList.value = res.data.data;
};
onMounted(async () => {
  await getCategoryList();
});

const handlePictureCardPreview = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url;
  dialogVisible.value = true;
};
const images = computed(() => {
  return fileList.value.map((item) => item.response.data);
});
const publicPost = async () => {
  loading.value = true;
  console.log(fileList.value);
  const res = await publicPostApi({
    categoryId: categoryId.value,
    title: title.value,
    content: content.value,
    images: images.value,
  });
  dialogConfirmVisible.value = false;
  loading.value = false;
  // eslint-disable-next-line no-undef
  ElMessage({
    message: res.data.message,
    type: "success",
  });
  router.back();
};
</script>
<template>
  <div class="public" v-loading="loading">
    <div class="img">
      <el-upload
        v-model:file-list="fileList"
        action="http://127.0.0.1:8080/api/upload/post"
        list-type="picture-card"
        :on-preview="handlePictureCardPreview"
        :on-remove="handleRemove"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
    </div>
    <div class="title">
      <el-input
        v-model="title"
        style="width: 500px"
        autosize
        type="textarea"
        placeholder="请输入标题"
      />
    </div>
    <div class="content">
      <el-input
        v-model="content"
        style="width: 500px"
        :autosize="{ minRows: 2, maxRows: 4 }"
        type="textarea"
        placeholder="请输入内容"
      />
    </div>
    <div class="category">
      <el-select
        v-model="categoryId"
        placeholder="请选择分类"
        style="width: 240px"
      >
        <el-option
          v-for="item in categoryList"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>
    </div>
    <div class="btn">
      <el-button
        style="width: 500px"
        @click="dialogConfirmVisible = true"
        type="primary"
        >发布</el-button
      >
    </div>
    <el-dialog v-model="dialogVisible">
      <img w-full :src="dialogImageUrl" alt="Preview Image" />
    </el-dialog>

    <el-dialog v-model="dialogConfirmVisible" title="确认发布?" width="500">
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogConfirmVisible = false">取消</el-button>
          <el-button type="primary" @click="publicPost"> 确认 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<style lang="scss" scoped>
.public {
  width: 500px;
  margin: 100px auto;
  .img {
    margin-bottom: 20px;
  }
  .title {
    margin-bottom: 30px;
  }
  .content {
    margin-bottom: 40px;
  }
  .category {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 50px;
  }
}
</style>
