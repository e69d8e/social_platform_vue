<script setup>
import PostCard from "@/components/PostCard.vue";
</script>

<template>
  <div class="home">
    <el-row>
      <el-col :span="6">
        <PostCard
          img-url="https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png"
          title="hello"
        />
      </el-col>
      <el-col :span="6">
        <PostCard
          img-url="https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png"
          title="hello"
        />
      </el-col>
      <el-col :span="6">
        <PostCard
          img-url="https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png"
          title="hello"
        />
      </el-col>
      <el-col :span="6">
        <PostCard
          img-url="https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png"
          title="hello"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style lang="sass" scoped></style>
