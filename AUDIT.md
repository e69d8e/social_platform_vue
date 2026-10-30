# 前后端代码审查与前端交互重构记录

审查范围：

- 前端 `JS/VueProjects/social_platform_vue`（Vue 3 + Vite + Pinia + Element Plus）
- 后端 `Java/JavaProjects/social-platform`（Spring Boot 3.4 + MyBatis-Plus + Redis + ES）

本文分两部分：**已修复问题**（含改动位置与原因）与**待处理建议**（不改动的原因）。
最后是本次确立下来的交互/工程约定，后续改代码请对照执行。

---

## 一、已修复问题

### A. 前端：基础设施与架构

| #   | 问题                                                                                            | 影响                                                                                                                                             | 修复                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | `utils/request.js` / `utils/authFetch.js` 直接 `import { router } from "@/main.js"`             | 形成 `main → router → views → api → utils → main` 循环依赖；模块初始化顺序变化时 `router` 可能是 `undefined`，表现为「401 不跳登录」这类隐性故障 | 新增 `src/utils/navigation.js` 作为跳转桥接层，`main.js` 启动时用 `registerNavigator()` 注入真实 router；utils 层只调 `navigateTo()` |
| A2  | 令牌刷新请求不带 `Authorization`                                                                | 后端 `UserServiceImpl.refresh()` 依赖该请求头把旧 accessToken 拉黑 → 刷新后旧令牌仍然可用                                                        | `refreshToken()` 现在携带旧 accessToken；`authFetch` 同步修复                                                                        |
| A3  | 403 统一 `router.push("/")` 整页跳走                                                            | 用户点错一个按钮（例如无权删他人评论）会被踢回首页，丢失阅读上下文                                                                               | 403 只提示「没有权限执行该操作」，不再整页跳转                                                                                       |
| A4  | 401 刷新失败后强制跳登录，即使当前是公开页                                                      | 游客在首页浏览时遇到一次失败刷新就被打断                                                                                                         | 抽出 `isPublicPath()`：公开页只清理本地登录态，只有需要登录的页面才跳 `/login`（并带 `redirect`）                                    |
| A5  | 登录态判定不一致：路由守卫用 `token.accessToken`，`useRequireLogin` 用 `userInfo.username`      | 可能「守卫放行但页面认为未登录」，出现提示与跳转互相打架                                                                                         | `stores/user.js` 统一为「有 accessToken 或有用户信息」；新增 `clearSession()` 一次性清干净（此前存在只清一半的调用点）               |
| A6  | `useRequireLogin()` 跳登录不带 `redirect`                                                       | 点赞/收藏被拦后登录，会回到首页而不是刚才那篇帖子                                                                                                | 跳转携带 `redirect=当前 fullPath`；登录页已支持回跳                                                                                  |
| A7  | 已登录用户访问 `/login` 仍停在登录表单                                                          | 重复登录、表单重复填写                                                                                                                           | 路由守卫：已登录访问登录页直接跳到 `redirect` 或 `/home`                                                                             |
| A8  | 角色鉴权失败 `next("/")`                                                                        | 深链访问管理页被踢回首页                                                                                                                         | 有站内来源时 `next(false)` 原地取消导航，否则回 `/home`                                                                              |
| A9  | 上传接口沿用 10s 超时                                                                           | 大图（<10MB）上传被判超时，实际已成功                                                                                                            | `api/uploadApi.js` 上传类接口 `timeout: 60000`                                                                                       |
| A10 | `utils/formattedCount.js` 输出 `1.0 k` / `1.0 w` 混搭单位，且 9999→`10.0 k`、10000→`1.0 w` 跳变 | 中文界面读数不连贯                                                                                                                               | 改为 `1234` / `1.2万` / `1.2亿` 中文单位并统一进位                                                                                   |

### B. 前端：提示与错误反馈

| #   | 问题                                                                         | 影响                                                                                                  | 修复                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | 拦截器已经提示业务失败，调用点又各自 `ElMessage.error("xx失败")`             | 一次失败弹两条提示（且第二条覆盖了服务端的具体原因）                                                  | 确立约定：**拦截器负责文案，页面只负责状态回滚/错误态渲染**。已清理 `useLike`、`useStar`、`FollowButton`、`CommentComponent`、`HomeView`、`MyFollowPostsView`、`UserView`、`AdminDashboardView`、`PostView`、`PublicPostView`、`useChat`、`useAiChat` 的重复 toast |
| B2  | `PostView` 请求详情后不校验 `code`，直接 `post = res.data.data`              | 帖子被删/私密/封禁时 `data` 为 `null`，`post.title` 触发模板异常 → 白屏，「帖子不存在」态永远不会出现 | 校验 `code` 与 `data`，失败走 `loadFailed` 空状态；浏览计数只在成功读取后上报                                                                                                                                                                                      |
| B3  | `CommentComponent` 的评论请求无互斥：首屏、触底、发表后重置可能并发          | 同一游标并发请求互相覆盖 `offset/lastId`，表现为漏评论/重复加载                                       | 引入 promise 串行队列 `runSerial()`，重置与分页都排进队列                                                                                                                                                                                                          |
| B4  | `useChat` 收到 WebSocket 消息直接 push                                       | 重连/补发会重复插入同一条消息                                                                         | 按 `id` 去重后再插入                                                                                                                                                                                                                                               |
| B5  | 发送私信失败既弹拦截器提示又弹本地提示                                       | 双提示                                                                                                | 只把气泡标记为「发送失败」供点击重试                                                                                                                                                                                                                               |
| B6  | 游客执行需登录的操作（如点赞评论）时，401 会先走一遍注定失败的刷新流程       | 全过程无任何提示，按钮「点了没反应」                                                                  | 无 `refreshToken` 时直接提示「请先登录后再操作」并带 `redirect` 跳登录页                                                                                                                                                                                           |
| B8  | 滑块校验失败时 `onSlideSuccess` 又弹了一次 `验证不通过`（拦截器已弹过）      | **一次失败出现两个相同弹窗**                                                                          | 组件只重置状态并换新验证码，文案交给拦截器；同文件的「验证码加载失败」「登录请求网络异常」两处重复提示一并清理                                                                                                                                                     |
| B7  | 登录成功后若 `/user/profile` 或 `/user/sign` 请求失败，会被外层 `catch` 捕获 | 已拿到令牌却提示「操作失败」并停留在登录页                                                            | 令牌到手即视为登录成功，资料/签到天数为「尽力而为」，失败仍然跳转；默认落地页改为 `/home`                                                                                                                                                                          |

### C. 前端：交互逻辑与状态

| #   | 问题                                                                                                      | 影响                                                                 | 修复                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | 点赞与收藏在卡片上**都用 `Star` 图标**（Element Plus 无心形图标）                                         | 用户分不清两个按钮                                                   | 新增 `components/icons/HeartIcon.vue`（描边/实心），点赞用心形、收藏用星形；`PostCard`、`PostView` 同步                                                            |
| C2  | 签到按钮永远是「点击签到」，重复点击只弹提示                                                              | 用户不知道今天到底签没签                                             | 后端 `/user/sign` 改为返回 `{days, signedToday}`（新增 `SignInVO`）；`stores/sign.js` 持久化签到日期，跨零点自动失效；顶栏按钮签到后变「已签到」并禁用             |
| C3  | 「返回」一律 `router.back()`                                                                              | 详情页/聊天页被新标签或外链直接打开时，`back()` 无历史 → 按钮无反应  | 新增 `composables/useGoBack.js`（读 `history.state.back`，无历史时回兜底页），`BackButton`、`PostView`、`PublicPostView`、`ChatView`、`ConversationsView` 统一使用 |
| C4  | 删除帖子/封禁帖子后 `router.back()`                                                                       | 从新标签进入时停在已删除内容上                                       | 改为 `useGoBack('/home')`                                                                                                                                          |
| C5  | 搜索页两个维度共用一个 `pageNum`                                                                          | 「帖子翻到第 3 页 → 切用户 → 切回帖子」页码与内容错位                | 重写为每维度独立 `page/pageTotal/loadedPage/loading/error`；切 tab 只在未加载时补请求                                                                              |
| C6  | 搜索失败时显示「未找到相关帖子」                                                                          | 把网络/服务错误伪装成「无结果」，用户误以为社区没内容                | 新增错误态卡片 + 「重新搜索」按钮                                                                                                                                  |
| C7  | 顶栏实时联想每敲一个字就调搜索接口                                                                        | 后端 `recordSearch` 会把每个前缀（"黑"、"黑神"…）都写进搜索历史      | 后端新增 `record` 参数，联想请求传 `record=0`；仅真正提交的搜索写历史                                                                                              |
| C8  | 联想请求并发且无序号                                                                                      | 慢请求返回后覆盖新关键词的结果                                       | 引入 `suggestSeq` 序号，只接受最后一次输入对应的响应；清空输入即作废在途请求                                                                                       |
| C9  | 关注/粉丝列表被对方设为私密时显示「TA还没有关注的人」                                                     | 结论错误、误导用户                                                   | `usePageList` 支持 `blocked`（业务拒绝）状态，`FollowListView`/`FansListView` 直接展示服务端原因                                                                   |
| C10 | 分页翻页后停在页面底部                                                                                    | 「点了没反应」，需要手动上滑                                         | `usePageList.pageChange` 默认回到页面顶部（可 `scrollOnPageChange:false` 关闭）                                                                                    |
| C11 | 空列表用户每次切 Tab 都重新请求（用 `list.length === 0` 判断「是否加载过」）                              | 多余请求 + 闪烁                                                      | `UserView` 增加 `postsLoaded/followingsLoaded/followersLoaded` 标记                                                                                                |
| C12 | 修改密码不校验原密码                                                                                      | 任何拿到 accessToken 的人都能改密并锁死账号                          | 后端 `PUT /user/password` 要求 `oldPassword` 并校验；改密后清 refreshToken + 拉黑当前 token；前端改密成功即清本地会话并跳登录页                                    |
| C13 | 修改资料/头像不传 `oldAvatar`、`oldBackgroundUrl`                                                         | 服务端无法清理被替换下来的旧图，MinIO 文件长期堆积                   | `MyView`、`UserView` 保存资料时补齐旧图字段                                                                                                                        |
| C14 | 退出登录只清 token/info                                                                                   | 签到天数、WebSocket 连接残留                                         | 退出（成功或失败）都走 `clearSession()` + `removeSignDay()` + `disconnect()`                                                                                       |
| C15 | 普通用户无法删除自己的评论（前端只给管理员/审核员显示删除按钮，后端也只审核员接口）                       | 发错评论无法撤回                                                     | 新增后端 `DELETE /comment/{id}`（作者本人 + 管理员/审核员，一级评论连带删除回复及其点赞记录，并同步清除 ZSet 游标）；前端删除按钮对评论作者可见                    |
| C16 | 后端返回评论总数分支不一致                                                                                | 某些分页边界下 `total` 缺省为 0，评论徽标瞬间归零                    | `CommentServiceImpl.getComments` 所有返回分支都带 `total`                                                                                                          |
| C17 | AI 助手「新对话」立即在服务端建会话                                                                       | 用户点几次就多几个空会话，侧边栏被垃圾占满                           | 改为纯前端清屏，真正会话在发出第一条消息时创建（`sendMessage` 已支持）                                                                                             |
| C18 | 删除当前 AI 会话后回到空白欢迎页                                                                          | 上下文断裂                                                           | 删除当前会话后自动切到列表中的下一个会话                                                                                                                           |
| C19 | 深链 `/chat/5`（无 `receiverId`）时头部只显示「私信」                                                     | 不知道在跟谁聊                                                       | `useChat` 从会话列表反查 `otherUserId` 再拉资料                                                                                                                    |
| C20 | 首页/关注流骨架屏 8 张，后端实际每页 12 条                                                                | 首屏布局跳动                                                         | 新增 `FEED_PAGE_SIZE = 12`（与后端 `system-constants.default-page-size` 对齐）用于这两处骨架屏                                                                     |
| C21 | `PublicPostView` 发布失败先关确认弹窗                                                                     | 失败后要重新点「发布」才能重试                                       | 仅在成功时关闭弹窗；发布中禁止关闭弹窗/遮罩，按钮带 loading                                                                                                        |
| C22 | `PublicPostView` 遗留 `localStorage.removeItem("y_community_post_draft")` 死代码                          | 误导后续维护者以为有草稿功能                                         | 删除                                                                                                                                                               |
| C23 | 评论回复的 `@昵称` 取 `nickname`，为空时显示 `@undefined`                                                 | 数据不完整用户出现脏文案                                             | `displayNameOf()` 回退 `username` → 「用户」                                                                                                                       |
| C24 | `ListPagination` 通过 `v-model:page-num` 先改写页码再抛 `change`                                          | 若用「新旧页码是否相同」判重，翻页会直接失效                         | `usePageList` 改用 `loadedPage`（真正请求过的页码）判重                                                                                                            |
| C25 | 搜索历史条在「刚提交搜索」时不刷新                                                                        | 新搜的关键词不在历史里（服务端在搜索请求中才写历史，前端先拉了一次） | `SearchView` 改为 `await fetchAll()` 之后再 `fetchHistory()`                                                                                                       |
| C27 | 前端按 `l + r*2 + 3` 自行推导拼图块尺寸与位置                                                             | 与后端几何一旦不同步就整体错位（本次裁切问题的直接原因之一）         | `SlideVerify.vue` 改用服务端下发的画布尺寸与偏移；并把拼图块与滑块改为 **1:1 跟随指针**（原为 250/270 缩放，块「跟不上手指」）                                     |
| C28 | 「我的收藏」只在顶栏有个「收藏」胶囊，而该胶囊在 ≤1140px 会被隐藏；个人中心「我的社交与内容」里也没有入口 | 窄屏/移动端用户**找不到收藏列表**（路由 `/favorites` 存在但不可达）  | 个人中心「我的社交与内容」新增「我的收藏」入口卡（含收藏数），全宽度可达；顶栏胶囊保留给宽屏快捷访问                                                               |
| C26 | `PublicPostView` 发布中仍可关闭确认弹窗                                                                   | 请求进行中误关弹窗导致状态不明                                       | `:close-on-click-modal="!loading"`、`:show-close="!loading"`、取消按钮 `:disabled="loading"`                                                                       |

### D. 后端：安全与数据正确性

| #   | 问题                                                                                             | 影响                                                                                                                            | 修复                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `PostServiceImpl.getPersonalizedPosts()` 的 ES 查询只过滤 `enabled=true`，**未排除 `isPrivate`** | **隐私泄漏**：别人的私密帖会出现在登录用户首页推荐流                                                                            | 增加 `mustNot(term isPrivate=true)`                                                                                                                                                                                             |
| D2  | `PostServiceImpl.getPost()` 在可见性判断**之前**就 `changeScore(+1)`                             | 访问私密/封禁帖也污染兴趣画像（间接把私密内容推给用户）                                                                         | 移到可见性校验之后，且排除私密帖                                                                                                                                                                                                |
| D3  | `PostServiceImpl.deletePost()` 用 `cover.substring(baseUrl.length())` 切封面路径                 | 部署环境变化（`IMG_BASE_URL` 改过）时切出非法对象名，可能删错文件                                                               | 先判断前缀再裁剪，不匹配时按原值处理（同 `UpdateFileUtil` 语义）                                                                                                                                                                |
| D4  | `LikeServiceImpl` / `StarServiceImpl` 只校验 `enabled`                                           | 可对他人的私密帖点赞/收藏，且可用来探测私密帖存在性                                                                             | 私密且非本人 → 返回「帖子不存在」                                                                                                                                                                                               |
| D5  | `FollowServiceImpl.getFollowerList/getFolloweeList` 直接 `u.getFansPrivate()`                    | 目标用户不存在时 NPE（500）                                                                                                     | 判空返回「用户不存在」                                                                                                                                                                                                          |
| D6  | `SecurityConfig` 里 `/comment/post/{id}`、`/comment/post/{id}/{commentId}` 是**已不存在的路径**  | 死配置，容易误以为评论接口是公开的                                                                                              | 清理；实际公开路径为 `GET /comment/{id}`                                                                                                                                                                                        |
| D7  | `GET /user/search-history` 在 `permitAll` 列表中                                                 | 搜索历史属于个人数据，匿名访问会走到空用户逻辑                                                                                  | 移出白名单，要求登录                                                                                                                                                                                                            |
| D8  | `POST /post/migrate/home`（数据迁移）任何登录用户都能调用                                        | 可被反复触发写库                                                                                                                | 加 `@PreAuthorize("hasRole('ADMIN')")`                                                                                                                                                                                          |
| D9  | `PUT /user/password` 不校验原密码                                                                | 见 C12                                                                                                                          | 见 C12                                                                                                                                                                                                                          |
| D11 | 拼图块画布固定 65×65，而拼图形状的实际包围盒是 83×80.7（`SlideCaptchaImageUtil`）                | **滑块验证码裁切错位**：拼图块右侧凸起与底部被画布边界切掉，块永远盖不住缺口；另外缺口 x 上限 235 会让右侧凸起超出 310 宽背景图 | 画布尺寸/方形主体偏移改为由形状包围盒计算并随响应下发（`blockWidth/blockHeight/blockOffsetX/blockOffsetY`）；缺口 x 上限收紧到 223、y 上限按底部留白收紧；描边改圆角连接（miter 尖角会在缺口肩部甩出 2~3px 尖刺并顶到画布边缘） |
| D12 | 拼图块是从「已经画好缺口」的背景上采样的                                                         | 块被半透明白蒙层洗白，拼回缺口时无法还原画面，只能靠形状对位                                                                    | 改为先从干净背景采样拼图块，再在主图上挖缺口（拼回后画面连续）                                                                                                                                                                  |
| D10 | `SearchHistoryServiceImpl.recordSearch` 是「先查后写」，而搜索页会**并发**发起帖子/用户两个请求  | 同一关键词被写入两行（实测用户 1 出现 `测试`×2、用户 2 也有重复），历史列表出现重复项                                           | 改为「直接插入 + 唯一索引 `uk_user_keyword(user_id, keyword)` 兜底」，命中重复则更新 `create_time/type`；同时裁剪关键词到 50 字符。已实测 12 个并发请求只落 1 行                                                                |

---

## 二、待处理建议（本次未改）

### 后端

1. **`PostServiceImpl.getPersonalizedPosts` 的分页语义混用**：`offset` 同时承担「游标同分偏移」与「ES 页码 × 页大小」两种含义（`PageRequest.of(offset / pageSize, pageSize)`），且排序只有 `_score`，同分时顺序不稳定。建议改为 `search_after` 或加 `id` 二级排序。
2. **写路径与缓存的双写一致性**：点赞数、粉丝数、浏览量均为「Redis 同步 + `@Async` 落库」，`AsyncTaskUtil` 失败无补偿。建议加失败重试表或定时对账任务。
3. **`UpdateUserProfile` 删除旧图的路径裁剪**同样依赖 `baseUrl` 前缀（和 D3 同类问题），本次未改（涉及 `File` 表记录匹配逻辑，需要单独回归）。
4. **`ReviewerServiceImpl.deleteComment` 与新 `CommentServiceImpl.deleteComment` 逻辑重复**，建议审核员路径复用同一实现（顺带清理子评论与点赞记录）。
5. **`checkFileHash` 秒传接口能返回他人文件的 URL**（按 hash 全局查 `file` 表），属于弱信息泄漏；建议限定同用户或返回「命中标记」而非 URL。
6. **`recordSearch` 未限制长度/频率**，超长关键词会直接落库；建议截断到 50 字符并做去噪。
7. **`listPost`/`listUser` 的 ES count 与 find 条件需要人工同步**（代码里已有注释提醒），建议抽成同一个查询构造器，避免后续改一处漏一处。
8. **私信未校验接收方是否被封禁**（`sendMessage` 只校验发送方 `enabled`）。
9. **`getComments` 一次性查出所有子评论**，热门评论下可能很大；建议二级评论分页。

### 前端

1. **首页「换一换」只是把已加载的卡片本地洗牌**，语义上像「换一批新内容」。真正实现需要后端支持随机/翻页种子；当前保留但已知语义偏弱。
2. **`useUnreadMessages` 只在 `LayoutView` 轮询**，进入全屏聊天页会停止轮询（该页自带已读上报，影响可接受）。
3. **`AIChatView` 的草稿交接依赖 `router.push({ state })` + `history.state`**，刷新后会重复填草稿；建议改为 Pinia 临时字段。
4. **`UserView`/`MyView` 依旧存在两套资料编辑入口**（抽屉 + 个人中心），字段校验规则重复；建议抽 `useProfileForm`。
5. **`AdminDashboardView` 的 echarts 分包 545kB、`PublicPostView`（WangEditor）815kB**，建议 `manualChunks` 拆分或按需引入。
6. **移动端底部导航与顶栏的动作重复**（发布、私信、关注），建议后续统一个信息架构。
7. **`el-upload` + 自研 cropper** 依赖较多手写流程，可考虑统一封装 `useImageUpload`。

---

## 三、本次确立的约定

> 前端 `CLAUDE.md` 已同步这些条目。

1. **错误文案只有一个出口**：`utils/request.js` 拦截器。页面 catch 里只做状态回滚或错误态渲染，不再 `ElMessage.error`。
2. **业务失败也是失败**：任何 `res.data.code !== 1` 都必须视为失败分支处理（空状态/回滚），不能把 `data` 当有效数据用。
3. **跳转与返回**：跳转统一走 `utils/navigation.js`（utils 层不 import router/main）；返回统一走 `composables/useGoBack.js`。
4. **分页尺寸**：翻页列表用 `constants/pagination.js` 的常量；游标流（首页/关注流）用 `FEED_PAGE_SIZE`，必须与后端 `default-page-size` 保持一致。
5. **并发请求**：同一份列表的「首屏 / 触底 / 重置」必须串行（参考 `CommentComponent` 的 `runSerial`）；联想类请求必须带序号丢弃过期响应。
6. **搜索历史**：只有用户显式提交搜索才写历史，联想请求必须带 `record: 0`。
7. **写操作的权限校验在后端**：前端隐藏按钮只是体验优化，新增接口必须同时补后端校验（本次 `DELETE /comment/{id}` 即按此实现）。

---

## 四、验证

```bash
# 前端
cd JS/VueProjects/social_platform_vue
npx eslint . --fix      # 通过
npx vite build          # 通过

# 后端
cd Java/JavaProjects/social-platform
./mvnw -o -q compile    # 通过
```

运行时验证需要中间件（MySQL/Redis/ES/MongoDB/MinIO）：

```bash
docker compose up -d sp-mysql sp-redis sp-es sp-mongodb sp-minio sp-nginx-dev
./mvnw spring-boot:run
```

重点回归清单：

1. 游客浏览首页/搜索/帖子详情/他人主页 → 不被打断；点赞 → 提示登录 → 登录后回到原页。
2. 首页推荐流里不应出现他人私密帖（需先造一条私密帖验证）。
3. 搜索结果翻页 → 切 tab → 切回，页码与内容一致；搜索历史不再被输入前缀污染。
4. 帖子详情：访问已删除/私密帖 → 「帖子不存在」态，无白屏。
5. 评论：发表/删除自己的评论（连带回复）、点赞、加载更多。
6. 签到：签到后按钮变「已签到」且刷新页面仍保持（跨天自动恢复）。
7. 修改密码：原密码错误被拒；成功后跳登录页，旧密码无法登录、旧令牌刷新失败。
8. AI 助手：点「新对话」不产生空会话；首次发消息后侧边栏才出现会话；删除当前会话自动切下一个。
