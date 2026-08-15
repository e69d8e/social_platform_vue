<script setup>
import { Search } from "@element-plus/icons-vue";
import { debounce } from "lodash-es";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "搜索..." },
  /** 防抖时长（毫秒），搜索事件在停止输入后触发 */
  debounceDelay: { type: Number, default: 300 },
});

const emit = defineEmits(["update:modelValue", "search"]);

const handleSearch = debounce(() => {
  emit("search", props.modelValue.trim());
}, props.debounceDelay);

const handleInput = (val) => {
  emit("update:modelValue", val);
  handleSearch();
};

const handleClear = () => {
  emit("update:modelValue", "");
  handleSearch.cancel();
  emit("search", "");
};
</script>

<template>
  <div class="search-input">
    <el-input
      :model-value="modelValue"
      :prefix-icon="Search"
      :placeholder="placeholder"
      clearable
      @input="handleInput"
      @clear="handleClear"
    />
  </div>
</template>

<style lang="scss" scoped>
.search-input {
  padding: 0 4px 16px;
  max-width: 400px;
}
</style>
