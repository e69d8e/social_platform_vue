# Y 社区

Y 社区是一个基于 Vue 3 的社交媒体平台前端项目，提供帖子发布、评论互动、用户关注、私信聊天、AI 助手等功能。

## 技术栈

- **框架**：Vue 3.5（Composition API，`<script setup>`）
- **构建**：Vite 7
- **状态管理**：Pinia + pinia-plugin-persistedstate
- **路由**：Vue Router 4（History 模式）
- **UI 组件**：Element Plus（自动导入）
- **HTTP 请求**：Axios
- **实时通信**：SockJS + STOMP（WebSocket）
- **富文本编辑**：WangEditor
- **样式**：Sass / SCSS
- **工具库**：lodash / lodash-es

## 功能模块

| 模块 | 说明 |
|------|------|
| 帖子 | 发布、浏览、搜索、点赞、分类浏览、删除 |
| 评论 | 发表评论、回复评论、楼中楼 |
| 用户 | 注册登录、个人主页、编辑资料、修改密码 |
| 关注 | 关注/取消关注、关注列表、粉丝列表、好友列表 |
| 私信 | 一对一聊天、会话列表、未读消息提醒、实时消息推送 |
| AI 助手 | 多会话管理、流式响应 |
| 搜索 | 搜索帖子和用户、搜索历史 |
| 签到 | 每日签到、连续签到天数统计 |
| 管理员 | 封禁/解封用户、设置审核员 |
| 审核员 | 封禁/解封帖子、删除评论 |
| 暗色模式 | 明暗主题切换 |

## 快速开始

### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器运行在 `http://127.0.0.1:5173`

### 生产构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

### 代码检查与格式化

```bash
npm run lint      # ESLint 检查并自动修复
npm run format    # Prettier 格式化 src/ 目录
```

## 项目结构

```
src/
├── api/              # API 接口模块
│   ├── userApi.js        # 用户相关
│   ├── postApi.js        # 帖子相关
│   ├── commentApi.js     # 评论相关
│   ├── followApi.js      # 关注相关
│   ├── messageApi.js     # 私信相关
│   ├── searchApi.js      # 搜索相关
│   ├── uploadApi.js      # 文件上传
│   ├── adminApi.js       # 管理员接口
│   ├── reviewerApi.js    # 审核员接口
│   └── aiApi.js          # AI 助手接口
├── components/       # 公共组件
│   ├── PostCard.vue          # 帖子卡片
│   ├── UserCard.vue          # 用户卡片
│   ├── CommentComponent.vue  # 评论组件
│   ├── CategoryComponent.vue # 分类组件
│   └── AuthorityComponent.vue# 角色标识
├── stores/           # Pinia 状态管理
│   ├── user.js         # 用户信息与令牌
│   ├── sign.js         # 签到状态
│   └── theme.js        # 主题切换
├── utils/            # 工具函数
│   ├── request.js          # Axios 实例与拦截器
│   ├── websocket.js        # WebSocket 连接
│   └── formattedCount.js   # 数字格式化
├── views/            # 页面视图
├── router/           # 路由配置
└── main.js           # 应用入口
```

## 后端接口

本项目需要配合后端服务运行：

- **REST API**：`http://127.0.0.1:8080/api`
- **WebSocket**：`http://127.0.0.1:8081/ws`（STOMP over SockJS）
- **响应格式**：`{ code: 1, data, message }`，`code === 1` 表示成功

## 角色权限

| authorityId | 角色 | 权限 |
|-------------|------|------|
| 1 | 普通用户 | 发帖、评论、关注、私信 |
| 2 | 管理员 | 封禁用户、设置审核员 |
| 3 | 审核员 | 封禁帖子、删除评论 |
