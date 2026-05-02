<script setup>
import { ref, onMounted, shallowRef, onBeforeUnmount } from "vue";
import { getPostCategoryApi, publicPostApi } from "@/api/postApi";
import { uploadPostImgApi } from "@/api/uploadApi";
import { useRouter } from "vue-router";
import "@wangeditor/editor/dist/css/style.css"; // 引入 css
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";

const router = useRouter();
const dialogImageUrl = ref("");
const dialogVisible = ref(false);
const dialogConfirmVisible = ref(false);
const categoryId = ref("");
const title = ref("");
const loading = ref(false);

const categoryList = ref([]);
const getCategoryList = async () => {
  const res = await getPostCategoryApi();
  categoryList.value = res.data.data;
};
onMounted(async () => {
  await getCategoryList();
});
const img = ref("");
const handleSuccess = (response, uploadFile) => {
  console.log(response);
  cover.value = response.data;
  img.value = URL.createObjectURL(uploadFile.raw);
};

const beforeUpload = (rawFile) => {
  if (rawFile.type !== "image/jpeg") {
    // eslint-disable-next-line no-undef
    ElMessage.error("上传图片格式应为 jpg!");
    return false;
  } else if (rawFile.size / 1024 / 1024 > 2) {
    // eslint-disable-next-line no-undef
    ElMessage.error("图片大小不能超过 2MB!");
    return false;
  }
  return true;
};
const cover = ref("");

const publicPost = async () => {
  loading.value = true;
  console.log(cover.value);

  const res = await publicPostApi({
    cover: cover.value,
    title: title.value,
    content: valueHtml.value,
    categoryId: categoryId.value,
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

const editorRef = shallowRef();
const valueHtml = ref("");
const mode = "simple";

const toolbarConfig = {};
// 移除插入视频功能
toolbarConfig.excludeKeys = ["insertVideo"];
const editorConfig = { placeholder: "请输入内容" };
// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例
};
editorConfig.MENU_CONF = {};
editorConfig.MENU_CONF["uploadImage"] = {
  // 自定义上传
  async customUpload(file, insertFn) {
    // file 即选中的文件
    // 自己实现上传，并得到图片 url alt href
    const res = await uploadPostImgApi(file);
    const url = res.data.data;
    const alt = "图片描述";
    const href = url;
    // 最后插入图片
    insertFn(url, alt, href);
  },
};
</script>
<template>
  <div class="public" v-loading="loading">
    <div class="header">发布帖子</div>
    <div class="pointer back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <div class="img">
      <div class="please">请上传封面(图片比例为5:3)</div>
      <!-- <el-upload
        v-model:file-list="fileList"
        action="http://127.0.0.1:8080/api/upload/post"
        list-type="picture-card"
        :on-preview="handlePictureCardPreview"
        :on-remove="handleRemove"
      >
        <el-icon><Plus /></el-icon>
      </el-upload> -->
      <el-upload
        class="uploader"
        action="http://127.0.0.1:8080/api/upload/post"
        :show-file-list="false"
        :on-success="handleSuccess"
        :before-upload="beforeUpload"
      >
        <img v-if="img" :src="img" class="cover" />
        <el-icon v-else class="uploader-icon"><Plus /></el-icon>
      </el-upload>
    </div>
    <div class="title">
      <el-input
        v-model="title"
        autosize
        type="textarea"
        placeholder="请输入标题"
      />
    </div>
    <!-- <div class="content">
      <el-input
        v-model="content"
        style="width: 500px"
        :autosize="{ minRows: 2, maxRows: 4 }"
        type="textarea"
        placeholder="请输入内容"
      />
    </div> -->
    <div class="content" v-html="valueHtml"></div>
    <div class="editor" style="border: 1px solid #ccc">
      <Toolbar
        style="border-bottom: 1px solid #ccc"
        :editor="editorRef"
        :defaultConfig="toolbarConfig"
        :mode="mode"
      />
      <Editor
        style="height: 500px; overflow-y: hidden"
        v-model="valueHtml"
        :defaultConfig="editorConfig"
        :mode="mode"
        @onCreated="handleCreated"
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
  width: 800px;
  margin: 100px auto;
  .header {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
  }
  .pointer {
    cursor: pointer;
  }
  .back {
    margin: 20px 0;
  }
  .img {
    margin-bottom: 20px;
    .please {
      font-size: 16px;
      color: #999;
      height: 30px;
    }
    .uploader {
      width: 250px;
      height: 150px;
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      transition: var(--el-transition-duration-fast);
      display: block;
    }
    .cover {
      width: 250px;
      height: 150px;
    }
    .uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 250px;
      height: 150px;
      text-align: center;
    }
  }
  .editor {
    margin: 20px 0;
  }
  .category {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 50px;
  }
}
</style>
