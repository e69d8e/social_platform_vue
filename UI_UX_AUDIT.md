# Y社区 前端 UI/UX 全面检查报告

> 检查日期：2026-11-23  
> 检查对象：`social_platform_vue`（main@20b4752，含工作区未提交的草稿箱 / 通知中心 / 每周精选改动）  
> 技术栈：Vue 3.5 + Vite 7 + Element Plus 2.12 + Pinia  
> 检查方式：源码审查 + Playwright 桌面/移动端遍历 + 亮/暗主题截图 + WCAG 对比度计算 + 后端接口联调  
> 覆盖页面：桌面 1440×900 共 26 条路由；移动端 390×844 共 25 条路由；另测 800×900 平板断点与深色主题

## 1. 执行摘要

### 1.1 总评

| 维度                           |   评分 | 结论                                                                       |
| ------------------------------ | -----: | -------------------------------------------------------------------------- |
| 视觉与品牌一致性               | 8.5/10 | 暖米色纸张感、陶土色主色、圆角与阴影体系完整；首页、登录、帖子详情完成度高 |
| 布局与信息架构（390/800/1440） |   7/10 | 三档宽度主要页面稳定，无横向溢出；但 769–960 平板断点有导航缺口            |
| 移动端适配                     |   5/10 | 390 宽度主体可用，但底部导航有“进入即消失”的入口，发布编辑器工具栏被裁切   |
| 交互完整度                     |   6/10 | 草稿箱编辑是占位、通知筛选与分页不完整、精选页无内容/无错误态              |
| 可访问性（A11y）               | 4.5/10 | 多处点击 div 无法键盘操作、表单标签缺失、对比度与触控目标不达 WCAG AA      |
| 视觉稳定性/工程性              |   6/10 | 页面切换重复挂载 LayoutView、无 404 路由、页面标题静态、控制台存在类型警告 |

**一句话结论：视觉底子很好，但“能用”与“可访问”层面有 4 个 P0 级问题，其中草稿/定时帖公开可见属于数据与隐私风险，必须在下一轮优先处理。**

### 1.2 问题统计

| 级别            | 数量 | 说明                                                                                                                |
| --------------- | ---: | ------------------------------------------------------------------------------------------------------------------- |
| P0（阻断/隐私） |    4 | 草稿与定时帖外泄、定时发布时间偏移、平板无导航、移动端底部导航入口断链                                              |
| P1（重要体验）  |   11 | 草稿编辑占位、通知中心、通知铃铛、键盘可达性、对比度、触控目标、移动发布、页面切换、首屏错误态、入口缺失、精选页    |
| P2（打磨/一致） |   12 | 404/标题/语义标题、主题色方案、Logo 回退、PageHeader 属性、搜索死代码、复制链接兜底、横向滚动提示、后台表格与图表等 |

### 1.3 已确认的良好实践

- **设计系统集中**：`src/styles/variables.scss`（314 行）与 `src/styles/global.scss` 统一了 `--bg-page`、`--text-ink`、`--border-default`、阴影、圆角、动效和 Element Plus 覆盖；亮色/暗色模式整体观感协调。
- **卡片交互基础扎实**：`PostCard.vue` 使用绝对拉伸的 `RouterLink` + `sr-only` 标题、真实 `<button>` 的 `aria-pressed`、图片 `alt` 与 `loading="lazy"`，键盘用户可完整浏览卡片。
- **状态组件复用**：`SkeletonGrid`、`LoadStatus`、`PageHeader`、`BackButton`、`BackToTop` 等被多数列表页复用；`HomeView` 的推荐模式 tabs 已使用 `role="tablist"` / `role="tab"` / `aria-selected`。
- **移动端基础**：`ChatView`、`ChatInputBox` 使用 `100dvh`、safe-area、40×40 发送按钮与 `aria-label`；底部导航高度与 `env(safe-area-inset-bottom)` 处理正确。
- **减少动效**：全局 `prefers-reduced-motion` 规则、`BackToTop` 的 reduced-motion 处理、按钮 `:focus-visible` 轮廓均存在。

## 2. 优先级问题清单

### P0 — 必须先处理

| ID    | 位置                                                                                                                                                                                                                                                          | 问题与证据                                                                                                                                                                                                                                                                                                                                                                                                  | 影响                                                                                               | 建议                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-01 | `social-platform/src/main/java/com/li/socialplatform/config/DataInitializer.java:84-105`、`:153-178`；`recommend/HomeFeedService.java:217-246`、`:167-172`；`server/service/impl/PostServiceImpl.java:229-280`；`server/task/ScheduledPublishTask.java:61-87` | 启动同步、首页兜底 ZSET、ES 全量同步、帖子详情查询均只校验 `enabled` / `isPrivate`，**没有校验 `status = 'published'`**。实测草稿 `247683818998202372`（标题“深夜写作：关于独处的练习”，`status=draft, is_private=0`）会出现在 `/home` 首屏并可被 `/post/247683818998202372` 直接读取；定时任务更新数据库状态后，`post` 对象仍是 `scheduled`，随后 `postElasticsearchRepository.save(post)` 把旧状态写进 ES | 未发布草稿/定时内容提前公开，泄露隐私；搜索与首页可能出现空标题/草稿内容；定时发布还可能搜不到自己 | 所有公开列表、搜索、详情、启动同步、兜底 ZSET 增加 `status = 'published'` 过滤；`ScheduledPublishTask` 在 `save` 前执行 `post.setStatus("published")`；ES mapping 加 status 字段；补一个“冷启动 + 草稿”集成测试 |
| P0-02 | `src/views/PublicPostView.vue:288`；`social-platform/src/main/java/com/li/socialplatform/server/service/impl/PostServiceImpl.java:156-159`                                                                                                                    | `scheduleTime.value.toISOString().slice(0, 16)` 把用户本地时间转成 UTC 字符串；后端按 `yyyy-MM-dd'T'HH:mm` 直接解析为 `LocalDateTime`。UTC+8 的 10:00 会存成 02:00，**实际提前 8 小时发布**。`disabled-date` 仅按日期拦截，今天已过去的时刻仍可选择                                                                                                                                                         | 定时发布不可信；用户以为晚上发，实际上午泄露                                                       | 用本地日期字段拼 `yyyy-MM-ddTHH:mm`（不要走 `toISOString`），提交前校验目标时间晚于当前时间；后端按 `Asia/Shanghai` 或显式 zone 解析；补时区回归测试                                                            |
| P0-03 | `src/components/layout/AppHeader.vue:573-582`；`src/components/layout/MobileBottomNav.vue`（仅 `@media (max-width: 768px)` 显示）；截图 `docs/ui-audit/home-800.png`                                                                                          | ≤960 顶栏 `.header-actions` 和签到被 `display: none !important`；底部导航 769–960 完全不显示。800px 实测只剩 logo、搜索、主题、AI 星标、头像                                                                                                                                                                                                                                                                | 平板/小笔记本无法发布、看私信、看通知、收藏、进入关注流；核心任务不可达                            | 底部导航显示断点提升到 960（或给顶栏加“更多”菜单）；在 769/800/960/961 四个宽度回归发布、私信、通知、收藏、关注流入口                                                                                           |
| P0-04 | `src/components/layout/MobileBottomNav.vue:41/46/51`；`src/router/index.js`（`/my`、`/publicPost`、`/conversations`、`/chat/:id` 为 LayoutView 外的顶层路由）；截图 `docs/ui-audit/my-mobile.png`、`docs/ui-audit/publish-mobile-bottom.png`                  | 底部导航“发布”“私信”“我的”分别跳 `/publicPost`、`/conversations`、`/my`；这些页面都不在 LayoutView 内，渲染时没有 `MobileBottomNav`。点 5 个主 tab 中的 3 个会立刻失去底部导航，只能点页内返回                                                                                                                                                                                                              | 移动端主循环被打断；新用户容易迷路；“我的”明明是 tab 目的地却没有 tab 栏                           | 将这些路由纳入 LayoutView（聊天详情可保留沉浸式无导航），或在独立页布局中复用同一底部导航组件；保证每个 tab 目的地都有 tab 栏                                                                                   |

### P1 — 下一轮应处理

| ID    | 位置                                                                                                                                                                                                                                                                                                                               | 问题与证据                                                                                                                                                                                                                                                                                                                                                                 | 建议                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-01 | `src/views/DraftsView.vue:5-7`、`:91-101`、`:118-132`；截图 `docs/ui-audit/drafts-mobile.png`                                                                                                                                                                                                                                      | 草稿箱核心“编辑”是占位：`editDraft` 只弹 `ElMessage.info("编辑草稿功能开发中，可先发布后编辑")`，但整张卡片 `cursor:pointer`；首屏无骨架屏（加载时显示空列表）；`publishDraft` 无确认、无逐项 loading、成功后不减少 `total`，导致“加载更多”一直存在；`formatTime` 原样返回 `2026-11-23T08:45:48`；`loadMore` 无去重/防连点；`fetchDrafts` 无 catch，失败时只显示“暂无草稿” | 接上编辑流程（带 draftId 回填 PublicPostView）；加首屏骨架、错误重试、发布确认、按钮 loading、成功后 `total--`；统一使用 `formatExactTime` / `formatRelativeTime`                                     |
| P1-02 | `src/views/NotificationsView.vue:27`、`:70`、`:141-143`、`:145-163`；截图 `docs/ui-audit/notifications-desktop.png`、`notifications-mobile.png`                                                                                                                                                                                    | 筛选只对已加载的 20 条做客户端过滤（`onFilterChange` 是空函数），系统通知只在“全部”出现；空态用 `items.length` 判断，筛选无结果时显示空白而非空态；`total` 未过滤，加载更多一直存在；`formatTime` 回原串；标记已读/全部已读不刷新顶栏徽标；关注通知无 `postId`，点击只标已读（actorId 可用）；用 📄 emoji 代替图标                                                         | 后端支持 type 过滤并重置分页；`filteredItems` 为空时显示空态；按筛选后的 total 控制加载更多；成功后刷新 unread-count；关注通知跳转 `/user/:actorId`；统一图标                                         |
| P1-03 | `src/components/layout/NotificationBell.vue:2-19`、`:148-157`；`src/composables/useUnreadNotifications.js:18`；截图 `docs/ui-audit/notifications-desktop.png`                                                                                                                                                                      | popover 的 reference 是 `<el-badge>` 包裹 `<el-icon>` 的 `div`，没有 `role`、`tabindex`、`aria-label`，键盘无法打开；API 返回 `data: "4"` 字符串，`:hidden="unreadCount === 0"` 对 `"0"` 不成立，导致无未读时仍显示红色 `0` 徽标；超过 7 天的通知时间直接展示原始串                                                                                                        | 用 `<button type="button" aria-label="通知">` 包住铃铛并接入 popover；`unreadCount` 用 `Number()` 归一化，`hidden` 判断改为 `Number(unreadCount) === 0`；时间统一走共享工具                           |
| P1-04 | `src/views/LoginView.vue:343`；`src/components/layout/GlobalSearch.vue`（建议项为 `div`，热点为 `span`）；`src/views/MyView.vue:519-583`；`src/views/PostView.vue:442`；`src/views/ConversationsView.vue`（`.conversation-item`）；`src/components/UserCard.vue:41`；`src/views/FeaturedView.vue:16`；`src/views/DraftsView.vue:9` | 全项目共找到 13 处“div/span + @click”无可聚焦语义：我的页面 9 个入口卡片、会话项、用户卡片、精选卡片、草稿卡片、评论输入触发区、帖子作者/删除图标等。登录页同意勾选框与“我已阅读并同意”文本分离，checkbox 没有可访问名称；滑块验证码只支持指针拖拽                                                                                                                         | 优先用 `<button>` / `<RouterLink>`；确需容器 div 时加 `role="button"`、`tabindex="0"`、`@keydown.enter/space`；checkbox 用 `<label>` 包裹或 `aria-label`；给验证码提供键盘/替代验证方式               |
| P1-05 | `src/styles/variables.scss` 及相关按钮/标签样式                                                                                                                                                                                                                                                                                    | 计算对比度：主色 `#cc6d4e` 对白 3.58:1、对米白 `#fbf9f4` 3.40:1；白字在主色上 3.58:1；暗色主色 `#e68a6e` 上白字 2.55:1；`--text-muted-soft #9b9891` 对米白 2.74:1、暗色 `#737068` 对 `#121110` 3.81:1；精选徽标白字对 `#f7ba2a→#ea580c` 渐变约 1.9–3.1:1。WCAG AA 正文要求 4.5:1                                                                                           | 建立 `--brand-strong`（浅色文字/按钮用深一档）与 `--brand-on-dark`；暗色按钮改深色填充或深色文字；`--text-muted-soft` 提亮/加深；精选徽标改深色底或深色文字；用 contrast 工具在亮/暗两套 token 上回归 |
| P1-06 | `src/components/layout/GlobalSearch.vue`（clear 20×20、submit 24×24）；`src/components/PostCard.vue`（tag-pill h18、stat-btn h23-25、feedback 22×20）；`src/views/SearchView.vue`（hot-chip h26）；`src/views/NotificationsView.vue`（全部已读 54×18）；`src/views/AdminDashboardView.vue`（小按钮 24）；`index.html:7-8`          | 390 宽度实测：category-pill 40×21、tag-pill 65×18、stat-btn 37×25、mode-tab 70×28、clear 20×20、submit 24×24、全部已读 54×18；WCAG 2.5.8 最低 24×24，触屏建议 44×44。`index.html` 的 `maximum-scale=1.0, user-scalable=no` 禁止双指缩放                                                                                                                                    | 统一 `min-height: 24px`（触屏 44px）并增加内边距/伪元素扩大命中区；小图标按钮给 44×44 的点击热区；移除 `maximum-scale=1.0, user-scalable=no`（至少不要 `user-scalable=no`）                           |
| P1-07 | `src/views/PublicPostView.vue`；截图 `docs/ui-audit/publish-mobile-bottom.png`                                                                                                                                                                                                                                                     | 390 宽度 WangEditor `.w-e-toolbar` 可视 326px、scrollWidth 1037px，图片/列表/链接工具在 x782–834，默认完全看不到且无“更多工具”提示；页面高 1740px，存草稿/发布按钮只在页面最底部，无 sticky 操作条                                                                                                                                                                         | 移动端把工具栏改为可换行/“更多”菜单；图片工具前置或给渐隐提示；底部加 sticky 操作条（存草稿 + 发布）                                                                                                  |
| P1-08 | `src/App.vue`；`src/views/LayoutView.vue`；`src/router/index.js:157-159`                                                                                                                                                                                                                                                           | `App.vue` 用 `viewKey = route.path` 给顶层 RouterView 设 key，`LayoutView` 内部又用 `route.path` 设 key；点击分类后实测 `sameHeader:false, sameLayout:false`，整个 LayoutView/AppHeader/MobileBottomNav 重挂载；外层+内层各一次 160ms `out-in` 过渡，造成双闪和状态重置。`scrollBehavior()` 永远返回 `{ top: 0 }`，从帖子返回首页不恢复滚动位置                            | 顶层 key 改为 `route.matched[0].path` 或去掉顶层 key/transition；只保留内层子页面过渡；`scrollBehavior(to, from, savedPosition)` 优先返回 `savedPosition`，无保存值时 `{ top: 0 }`                    |
| P1-09 | `src/views/HomeView.vue:311-342`                                                                                                                                                                                                                                                                                                   | 首屏请求失败时仍渲染 `el-empty description="暂无更多内容"` 及“去发布第一篇/去登录逛逛” CTA，随后 `LoadStatus` 又显示“加载失败/点击重试”；网络异常被伪装成空内容                                                                                                                                                                                                            | 增加 `isError && !visiblePosts.length` 的独立错误态（说明 + 重试），空态只在 `!loading && !isError && visiblePosts.length===0` 时显示；错误态不要展示发布 CTA                                         |
| P1-10 | `src/components/layout/AppHeader.vue`；`src/components/layout/MobileBottomNav.vue`；`src/views/MyView.vue`                                                                                                                                                                                                                         | 手机/平板入口缺失：通知铃铛在 ≤960 随 `.header-actions` 消失，底部导航没有通知；AI 助手 ≤768 隐藏；主题切换 ≤480 隐藏；MyView 的“互动通知”入口没有未读徽标。结果：手机要进“我的”才能看通知且不知道有没有新消息；主题与 AI 无入口                                                                                                                                           | 把通知入口放进底部导航或“我的”并加徽标；在 MyView 增加“外观/主题”设置；AI 助手在移动端提供悬浮/菜单入口；确保每个隐藏入口都有替代路径                                                                 |
| P1-11 | `src/views/FeaturedView.vue:16`、`:27-31`、`:58`、`:106-172`；`src/views/FeaturedView.vue`（无 error catch）                                                                                                                                                                                                                       | 精选页内联 `request.get("/tag/featured?...")` 而非 api 模块；无错误/重试；`el-empty` 空态无 CTA；整张 `.featured-card` 为 div @click；硬编码 ❤️ 💬 ⭐ 与 `linear-gradient(135deg,#f7ba2a,#ea580c)` 白字徽标；无发布时间、无封面 `@error`；入口只在 MyView（约 575 行），顶栏/底部导航无入口；当前 `/tag/featured` 返回空数组，页面只是空壳                                 | 把接口抽到 `featuredApi`；补加载/错误/重试/空态说明；卡片改 `<RouterLink>`；图标用 Element Plus 图标；徽标用设计 token；补发布时间与封面错误占位；决定是否在顶部/底部加入口或明确“运营位”             |

### P2 — 打磨与工程一致性

| ID    | 位置                                                                                                                                                 | 问题                                                                                                                                                                                                                                               | 建议                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 | `src/router/index.js`；`src/components/PageHeader.vue:23-24`；全站                                                                                   | 无 catch-all：`/definitely-not-a-page` 渲染空白并输出 `[Vue Router warn]: No match found...`；无 `document.title`/useTitle，所有页面标签页都叫“Y社区”；PageHeader 标题是 `<span>`（`large` 时 `<h2>`），全站只有 PostView 和 UserAgreement 有 `h1` | 加 404 路由与视图；路由守卫统一设置 `document.title`；PageHeader 支持 `as="h1"` 或默认 h1；补跳转主内容的 skip link                               |
| P2-02 | `index.html`；`src/main.js:25-27`；`src/stores/theme.js`                                                                                             | 无 `<meta name="color-scheme">`、无 CSS `color-scheme`；主题只切 `html.dark`，原生控件/滚动条可能保持亮色，首屏可能在 JS 前闪白；主题切换 ≤480 隐藏                                                                                                | 在 `<html>`/CSS 声明 `color-scheme: light dark`；在 head 里做首屏 blocking theme 脚本或 `prefers-color-scheme` 初始样式；给主题切换一个移动端入口 |
| P2-03 | `src/utils/request.js:176`；`AppHeader.vue:73`、`LoginView.vue:248`、`AiSessionSidebar.vue:36`、`AiMessageList.vue:71/97`                            | `logoUrl = \`${VITE_BASE_URL}/imgs/logo.png\``依赖 MinIO/Nginx；对象存储故障时`el-image`直接渲染“加载失败”文本；项目已有`public/logo.png` 却未使用                                                                                                 | 使用本地 `public/logo.png` 作为 `error` 插槽/回退；或 `new URL('/logo.png', import.meta.env.BASE_URL)`；`el-image` 增加 `error` slot              |
| P2-04 | `src/components/PageHeader.vue:7-14`；`src/composables/usePageList.js:51-52`；`NotificationsView`/`DraftsView`/`FeaturedView` 的 `:show-back="true"` | PageHeader 无 `show-back` prop，新页面传入的是无效属性；`usePageList` 未把后端字符串 total 转 Number，/friends 出现 `Invalid prop: type check failed for prop "total". Expected Number ... got String "0"`（PageHeader 与 ListPagination 各一次）  | 删除无效 prop 或实现它；`total.value = Number(res?.total ?? 0)`；给 `PageHeader.total` 加 `Number` 校验/转换                                      |
| P2-05 | `src/components/layout/GlobalSearch.vue`                                                                                                             | 移动端 `header-search-btn-mobile` 被 `display:none !important`（1033-1036 行），模板中的 `el-dialog` 移动搜索路径永远不可达；建议项是 `div @mousedown.prevent`、热点/历史是 `span`，无 combobox/listbox 语义、无上下键                             | 删除死代码或恢复按钮+弹窗；搜索框实现 `role="combobox"` + `aria-expanded` + `aria-activedescendant` + ArrowUp/Down/Enter；热点/历史改 `<button>`  |
| P2-06 | `src/views/PostView.vue:175-183`                                                                                                                     | `navigator.clipboard?.writeText(url).then(...)`：当 `navigator.clipboard` 为 undefined 时，可选链返回 undefined，随后 `.then` 抛 TypeError；非安全上下文/旧浏览器无法分享                                                                          | 使用 `if (!navigator.clipboard) { 提示手动复制; return; }`；或增加 `document.execCommand('copy')` 回退                                            |
| P2-07 | `src/views/UserView.vue:1655-1740`；`src/views/MyView.vue:1185`                                                                                      | 移动端 `.profile-stats-bar` 与 `.hub-nav-tabs` 均 `overflow-x:auto` 且隐藏滚动条；390 宽度“关于TA”/“账号安全与管理”被裁切但无渐隐/滚动提示                                                                                                         | 增加左右渐隐遮罩或“可横滑”提示；tabs 在窄屏考虑换行/下拉；至少在选中项 `scrollIntoView`                                                           |
| P2-08 | `src/views/AdminDashboardView.vue`                                                                                                                   | 分类管理表格在 390 时 `.el-table .el-scrollbar__wrap` clientW=348/scrollW=840，只能横向滚动，简介列几乎不可读；ECharts `dataZoom` 滑块使用默认蓝色，与暖色设计系统冲突；图表无 `aria`/表格替代                                                     | 移动端把分类表改成卡片列表或隐藏次要列；重置 ECharts dataZoom 颜色为 `--brand` 系；图表加 `aria-label` + 数据表 fallback                          |
| P2-09 | `src/views/MyView.vue`；`src/views/UserView.vue`                                                                                                     | MyView 的“互动通知”入口没有未读徽标；“我的”页独立布局没有底部导航（与 P0-04 同源）；UserView 统计条初始裁切“关于TA”                                                                                                                                | 在“互动通知”入口绑定 unreadCount；按 P0-04 修复导航；给横滑容器加渐隐                                                                             |
| P2-10 | `src/views/LoginView.vue`                                                                                                                            | 无“忘记密码”入口；`清空` 只 `resetFields`，不重置验证码/verifyToken，清空后仍可沿用旧验证状态提交；登录 Logo 无 error slot；验证码只支持拖拽                                                                                                       | 补忘记密码/联系管理员入口；清空时刷新验证码并清空 token；验证码补键盘/音频替代；Logo 使用本地回退                                                 |
| P2-11 | `src/views/HomeView.vue:311-330`；`src/views/FeaturedView.vue`；`src/views/NotificationsView.vue`                                                    | 空态文案不统一：首页零内容写“暂无更多内容”，精选页无 CTA，通知空态无 CTA；部分空态没有区分“新用户”和“筛选无结果”                                                                                                                                   | 统一空态文案按场景（空数据/筛选无结果/网络错误）；空数据给“去发布/去关注”等动作；筛选空态用“没有符合条件的通知”                                   |
| P2-12 | `src/components/layout/MobileBottomNav.vue`；`src/styles/variables.scss`                                                                             | 底栏 `.tab-label` 11px、卡片元信息 10–11px、`--text-muted-soft` 2.74:1；小字号+低对比度叠加导致可读性差；底栏 tab 无 `aria-current`                                                                                                                | 基础字号提升到 12px 以上；提高 muted token 对比度；给 active tab 加 `aria-current="page"`                                                         |

## 3. 分模块详查

### 3.1 设计系统与视觉

**做得好的**

- 暖米色底 + 陶土主色 + 墨色正文的“编辑工作室”方向明确，首页在亮/暗两套主题下都保持统一气质。
- 卡片、标签、按钮、空态、骨架屏、阴影、圆角都来自同一套 token；Element Plus 的圆角/焦点覆盖较完整。
- 登录页（`docs/ui-audit/login-light.png`）、首页亮色（`docs/ui-audit/home-desktop-light.png`）、暗色首页（`docs/ui-audit/home-dark-1440.png`）视觉完成度高，首屏没有横向溢出。

**要改的**

- 主色在浅色背景上的文字对比只有 3.40–3.58:1，不能用于 12–14px 正文/按钮文字；深色主题的“白字 + 亮陶土渐变”只有 2.55:1，建议将按钮文字改为深墨色或使用更深的 brand-strong。
- 卡片元信息、标签、底栏 11px 字号偏小；在手机上叠加 `user-scalable=no` 后用户无法放大。建议统一最小 12px，并允许缩放。
- 精选页的 `❤️ 💬 ⭐` 与通知页 `📄` 与全站 SVG 图标体系不一致；建议统一 Element Plus 图标或项目图标组件。
- 精选徽标黄→橙渐变 + 白字对比不足，且与“暖米色/陶土”体系不协调；建议改为深陶土/墨色底或深色文字。

### 3.2 导航与响应式

**桌面/平板**

- 1440 下顶栏完整：签到、搜索（⌘K）、AI 助手、私信、收藏、我的关注、通知铃铛、发布、头像均在；首页 4 列/搜索等页面均无横向溢出。
- 1280 隐藏签到文字、1140 隐藏收藏/关注导航与 AI 文字、960 隐藏全部 `.header-actions` 和签到；但底部导航仅 ≤768 显示——**769–960 形成空窗**。800px 截图 `docs/ui-audit/home-800.png` 可复现。
- 1000px 时 `.header-actions` 虽显示，但收藏/关注导航已隐藏（≤1140），关注流只能从 MyView 进入；建议把关注流入口固定在“我的”页并给可发现提示。

**移动端**

- 390 下顶栏保留 logo + 搜索输入 + 头像；这是合理的“搜索优先”取舍，但移动搜索弹窗代码已被 CSS 禁用，形成死代码。
- 底部导航 5 个 tab 中“发布/私信/我的”进入独立布局后消失（P0-04）；“我的”页截图 `docs/ui-audit/my-mobile.png` 显示只有页内返回，没有底栏。
- 通知铃铛/主题/AI 在手机上不可达（P1-10）；收藏/关注可通过“我的”入口到达，但通知没有徽标。
- MyView 的第三个 tab 在 390 超出到 x425，UserView 统计条“关于TA”到 x424，均有横向滚动但无渐隐提示（P2-07）。
- 发布页截图 `docs/ui-audit/publish-mobile-bottom.png` 显示 WangEditor 工具栏右侧被截断；图片工具在 x782 之后，手机用户几乎发现不了。

### 3.3 首页 / 内容流

- 推荐模式 tabs 的 ARIA 正确（`role=tablist/tab`、`aria-selected`），换一换按钮有旋转态、`disabled`，骨架屏与 `CardGrid` 响应式列数正常。
- **错误态问题**：`HomeView.vue:311-330` 只在 `visiblePosts.length===0` 时判断空态，没有把 `isError` 排除；网络失败会同时出现“暂无更多内容 + 去发布第一篇/去登录逛逛”和底部“加载失败/点击重试”，容易误导用户发布无意义内容。
- 首页分类 chip 只有 40×21，标签 h18，统计按钮 23–25，均低于 24×24 最小触控高度；桌面/手机都有该问题（P1-06）。
- 空态文案“暂无更多内容”对零内容新用户不准确，建议用“还没有帖子，来发布第一篇吧”。

### 3.4 通知中心与 NotificationBell

- `notifications-desktop.png` 显示：5 条通知（点赞/评论/回复/关注/系统）、4 个未读红点；但顶栏铃铛显示红色 `0`——这是 `unreadCount` 字符串与 `=== 0` 比较错误（P1-03），同时说明 API 缓存/刷新不一致。
- 筛选是纯客户端、只覆盖已加载页；筛选到“关注”且当前页无关注时列表为空白（空态判断用了 `items.length` 而不是 `filteredItems.length`）；`total` 未过滤导致“加载更多”残留。
- 行点击用 `div @click`，键盘不可达；关注通知没有 `postId`，点击只标已读，不跳转到 `actorId` 的用户页。
- “全部已读”只在 `hasUnread`（当前已加载项）为真时显示；如果未读在第二页，第一页看不到按钮。
- 时间直接显示后端字符串，例 `2026-11-23 10:40:48`；系统通知 10 天前也这样显示，应该用 `formatRelativeTime`（7 天内）或 `formatExactTime`。
- 系统通知没有独立 tab（只在“全部”里出现），用户难以筛选；用 📄 emoji 代替帖子图标，视觉不统一。

### 3.5 草稿箱与发布

- 草稿卡片显示原始 ISO：`2026-11-23T08:45:48`（截图 `drafts-mobile.png`），与站内其他相对时间不一致。
- 首屏没有骨架屏：`v-if="!loading && drafts.length === 0"` 的 `el-empty` 与 `v-else` 列表在 loading 时渲染空列表，页面白屏。
- “发布”无确认、无 loading、无 `total--`；连续点击可能重复提交；删除有确认但成功后 total 也不减。
- 编辑是占位（P1-01）；这是草稿箱的核心功能缺失，用户无法继续写草稿，只能发布或删除。
- 移动端发布页工具栏被裁切；底部“存草稿/+✨AI标题/发布”只在页面最底部，长文场景需要滚 1700+px 才能发布。
- `PublicPostView` 定时发布逻辑存在 8 小时时区 bug（P0-02）；分类/标签/私密开关的视觉分组清晰，保留。

### 3.6 帖子详情与评论

- `PostView` 的阅读版式、纸张卡片、标签、作者卡、点赞/收藏 `aria-pressed`、封面 `el-image` 错误/加载 slot 都做得不错；`h1` 存在，标题层级正确。
- 作者头像/昵称是 `div @click`，管理员删除/审核图标也是 `el-icon @click`，键盘用户无法操作；评论输入触发区是 `div @click`（P1-04）。
- `copyPostLink` 对 `navigator.clipboard` 缺失无兜底（P2-06）。
- 浮动评论条在 390 下宽 364、底部 24px，与评论内容无重叠（评论底部 753.9，输入条顶部 785）；/post 无底部导航，阅读沉浸感合理。
- 建议把作者、删除、审核等所有可点击 icon 都改为真实 button + aria-label；评论条可保留外观但把 `.compact-trigger` 改为 button。

### 3.7 搜索

- `GlobalSearch` 桌面输入、⌘K 聚焦、清空、热门/历史、下拉分组都有；`DOMPurify` 高亮只允许 `mark`/class，安全做法正确。
- 建议项是 `div @mousedown.prevent`，没有 `role="combobox"`、`aria-expanded`、`aria-activedescendant`、上下键；键盘用户只能输入后按 Enter，不能选择建议。
- 搜索页历史 `.history-tag` 是 `span @click`（内部删除按钮有 aria-label），结果 tabs 无 `role=tab/aria-selected`（P1-04）。
- 移动端搜索弹窗是死代码（P2-05）；当前依赖顶栏桌面输入，触屏输入体验尚可但无快捷聚焦/建议。

### 3.8 个人中心 / 用户主页

- `/my` 是独立页：自己的返回头 + 3 个 hub tab（基本资料设置/我的社交与内容/账号安全与管理），没有底部导航（P0-04）；第三个 tab 在 390 被裁切（P2-07）。
- 9 个社交入口卡片全是 `div @click`，键盘不可达；“互动通知”没有未读徽标（P1-04/P2-09）。
- 资料表单的 label、字数限制（昵称 3/16、简介 3/200）、性别必填、隐藏关注/粉丝开关都完整；密码修改 dialog `width=min(92vw,420px)` 适配移动端。
- `/user/:id` 有 AppHeader + 底部导航、渐变背景、关注/发私信/拉黑/分享；统计条 4 个按钮在 390 可横滑但“关于TA”初始被裁切；管理员操作“设为审核/封禁账号”可见，符合权限分层。

### 3.9 管理后台

- 8 个统计卡、ECharts 图表、分类/用户管理 tabs 结构清晰；图表颜色根据主题切换（dark `#e68a6e/#6eb395/#f0b858`，light `#cc6d4e/#5a947a/#d99426`）。
- 移动端分类表被压缩为横向 840px 滚动条（视口 348），简介列几乎不可读（`docs/ui-audit/admin-categories-mobile.png`）；建议改为卡片列表或隐藏非关键列。
- ECharts `dataZoom` 滑块仍是默认蓝色，与暖色 palette 冲突；图表没有可访问数据表/aria-label（P2-08）。
- 管理后台无底部导航（管理员通常桌面使用，可接受）；`BackToTop` 与页面滚动正常。

### 3.10 可访问性清单

| 检查项               | 结果     | 证据                                                                                 |
| -------------------- | -------- | ------------------------------------------------------------------------------------ |
| 表单控件有可访问名称 | 部分失败 | 登录同意 checkbox 无 label；搜索输入有 placeholder 无明确 label                      |
| 键盘可达的点击面     | 失败     | 13 处 div/span @click；通知铃铛、我的入口、会话项、精选卡片、草稿卡片等              |
| tabs 语义            | 部分通过 | 首页模式 tabs 正确；SearchView/MyView/Admin tabs 只有 active class                   |
| 图标按钮名称         | 部分失败 | 主题切换仅 `title`，无 `aria-pressed`；帖子删除/审核图标无 label；评论触发区无 label |
| 对比度               | 失败     | 主色/白字 2.55–3.58:1；muted-soft 2.74:1                                             |
| 触控目标             | 失败     | 18–28px 高度大量存在；WCAG 2.5.8 24×24、触屏 44×44 不达标                            |
| 页面缩放             | 失败     | `maximum-scale=1.0, user-scalable=no`                                                |
| 跳转主内容 skip link | 缺失     | 全项目无 skip/跳到主内容                                                             |
| 标题层级             | 部分失败 | 仅 PostView/UserAgreement 有 h1；列表页 PageHeader 是 span                           |
| 验证码替代方式       | 缺失     | SlideVerify 仅指针拖拽                                                               |

### 3.11 路由、页面结构与性能

- **无 404**：`/definitely-not-a-page` 空白页 + Vue Router warning；建议增加 catch-all 404 与“回首页/搜索”动作。
- **页面标题**：没有 `document.title` 更新，所有标签页都显示“Y社区”；建议在路由守卫按 `meta.title` 设置。
- **重复挂载**：App.vue 顶层 `RouterView` 与 LayoutView 内部 `RouterView` 都用 `route.path` 作为 key；点击分类后整个 LayoutView/AppHeader/MobileBottomNav 重建，造成双过渡、搜索状态/轮询重置和性能浪费（P1-08）。
- **滚动恢复**：`scrollBehavior` 始终 `{ top: 0 }`；从帖子返回首页会丢失浏览位置（P1-08）。
- **PageHeader total 类型**：`usePageList` 将后端字符串直接赋给 Number prop，/friends 控制台出现两次类型警告（P2-04）；应统一 `Number()`。
- **未使用的移动搜索代码**：`GlobalSearch` 模板包含完整 `el-dialog`，但按钮被 CSS `display:none !important`；建议删除或恢复。
- **性能提示**：既有 `AUDIT.md` 记录 AdminDashboard 路由约 545KB、PublicPost 约 815KB（gzip）；本轮未重新打 bundle，建议路由懒加载/图表按需引入作为后续优化。

## 4. 修复路线图

### Phase 1（本周，先止血）

1. **P0-01 状态过滤**：`DataInitializer`、`HomeFeedService`、`PostServiceImpl.getPost`、ES 同步全部加 `status='published'`；`ScheduledPublishTask` 更新对象状态后再写 ES。
2. **P0-02 定时时间**：改为本地 `yyyy-MM-ddTHH:mm`，禁止 `toISOString().slice(0,16)`；加时区单测。
3. **P0-03 / P0-04 导航**：底部导航断点提升到 960，或加“更多”菜单；把 `/my`、`/publicPost`、`/conversations` 纳入底部导航布局。
4. **P1-03 通知铃铛**：button 化 + `Number()` + 徽标刷新；先修“红色 0”。

### Phase 2（1–2 周，核心体验）

- 草稿箱编辑闭环、骨架/错误/确认/分页；通知中心服务端筛选、空态、badge；发布页移动端工具栏与 sticky 操作条；首页错误态；对比度 token 与触控目标批量整改；键盘可达性 13 处逐项替换。

### Phase 3（收尾）

- 404/页面标题/skip link/标题层级；主题 `color-scheme`/首屏闪白；Logo 回退；PageHeader 属性与 total 类型；Admin 移动表格/图表；搜索 combobox；UserView/MyView 横滑提示。

## 5. 验证方法

- **桌面**：1440×900 遍历 26 条路由，检查 `document.scrollWidth > clientWidth`、HTTP ≥400、console error、图片 `naturalWidth===0`、固定底栏遮挡。结果：无水平溢出、0 error、0 坏图；帖子详情固定评论条与正文/评论区无重叠，BackToTop 不遮挡主操作。
- **移动**：390×844 遍历 25 条路由，检查视口溢出、底栏遮挡、可点击目标尺寸、字体；发现 `/user/2` 关于TA x424、`/my` 第三 tab x425、发布工具栏 x406+ 三处裁切。
- **断点**：800×900 与 1000px 验证顶栏动作区；800 无 `.header-actions`/bottom nav，1000 有 header-actions 但无 bottom nav。
- **对比度**：按 sRGB 相对亮度计算，结果见 P1-05。
- **接口**：`GET /api/notification/unread-count` 返回 `data:"4"` 字符串；`GET /api/message/unread` 为正确未读私信接口，`/api/message/unread-count` 404。
- **后端状态**：检查 `home_post`/`post` 数据，确认草稿 id 与详情接口无状态校验（详见 P0-01）。

## 6. 附录

### 6.1 自动化指标

| 指标            |                    桌面 1440 |                               移动 390 |
| --------------- | ---------------------------: | -------------------------------------: |
| 路由数          |                           26 |                                     25 |
| 页面级横向溢出  |                            0 |                0（仅局部滚动容器裁切） |
| console error   |                            0 | 0（本次测试未计入手工调用的 404 测试） |
| 坏图            |                            0 |                                      0 |
| 底栏/固定栏遮挡 |          0（评论条位置合理） |     评论条无重叠；底栏在部分独立页缺失 |
| h1 页面         | 2（PostView、UserAgreement） |                                   同左 |

### 6.2 截图索引

| 截图                                                                     | 说明                                          |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| [login-light.png](docs/ui-audit/login-light.png)                         | 登录页亮色，卡片/验证码/协议完整              |
| [home-desktop-light.png](docs/ui-audit/home-desktop-light.png)           | 首页亮色桌面                                  |
| [home-dark-1440.png](docs/ui-audit/home-dark-1440.png)                   | 首页暗色桌面                                  |
| [home-800.png](docs/ui-audit/home-800.png)                               | 800px 平板：顶栏无发布/私信/通知/底栏         |
| [post-desktop-light.png](docs/ui-audit/post-desktop-light.png)           | 帖子详情桌面                                  |
| [notifications-desktop.png](docs/ui-audit/notifications-desktop.png)     | 通知中心桌面：红色 0 徽标、原始时间、系统通知 |
| [notifications-mobile.png](docs/ui-audit/notifications-mobile.png)       | 通知中心移动端                                |
| [drafts-mobile.png](docs/ui-audit/drafts-mobile.png)                     | 草稿箱移动端：ISO 时间、无骨架                |
| [publish-mobile-bottom.png](docs/ui-audit/publish-mobile-bottom.png)     | 发布页底部：操作条、标签/私密开关             |
| [my-mobile.png](docs/ui-audit/my-mobile.png)                             | 我的页移动端：无底栏、第三个 tab 裁切         |
| [user-mobile.png](docs/ui-audit/user-mobile.png)                         | 用户主页移动端：统计条裁切                    |
| [admin-categories-mobile.png](docs/ui-audit/admin-categories-mobile.png) | 后台分类管理移动端：表格横向挤压              |

### 6.3 Modern Web Guidance

- 我将无障碍指南用于表单标签与键盘检查：`"Mandatory - Provide a label for all form controls"`、`"Provide a logical tab order..."`；据此定位登录同意 checkbox、通知铃铛与 13 处不可聚焦点击面。
- 我将 form-factor-adaptation 指南用于触控目标审查：`"Make every control at least 24×24 CSS pixels (WCAG 2.5.8), and at least 44×44 on touch screens"`；用于 P1-06 的尺寸清单。
- 我将 color 指南用于对比度审查：`"Maintain 4.5:1 for normal text and 3:1 for large text"`；主色/白字与 muted token 的不达标项均按此标准列出。
- 我将 navbar 指南用于响应式断点：`"Script collapses the navigation only when the inline row (brand, actions and every link) does not fit"`；据此判断 769–960 的空窗是断点策略错误，而不是合理折叠。
- 我将 tabs 指南用于 MyView / Search 的横向 tabs：`"Keep tabs on a single row. DO NOT wrap them onto multiple rows"`、`"Hide the scrollbar and fade out each edge"`；建议在保持单行的同时补渐隐与选中滚动。

另检查了 dialog、carousel、responsive-table 主题，未作为本轮关键结论的直接依据。

## 7. 修复记录（2026-11-23 第二轮）

> 本轮按第 2–5 节清单修复：P0 全部关闭，P1 主要项关闭，P2 可落地项关闭。未修改既有 `AUDIT.md`。

### 7.1 P0（全部关闭）

| ID                          | 状态   | 修复摘要                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-01 草稿/定时帖泄露       | 已修复 | 后端 `DataInitializer`、`HomeFeedService`、`PostServiceImpl.getPost`、`FollowServiceImpl`、`StarServiceImpl`、`UserStatsController`、`CommunityTools` 的公开查询统一加 `status = 'published'`；`PostServiceImpl.publishPost` 支持草稿更新；新增 `publishDraft(id)` 完整补齐 Redis ZSet、`home_post`、粉丝收件箱、兴趣分与 ES 索引；`ScheduledPublishTask` 发布前修正 `status`。已验证草稿仅作者/管理员可见，发布后进入首页且不出现在草稿列表。 |
| P0-02 定时发布提前 8 小时   | 已修复 | `PublicPostView.vue` 新增 `toLocalDateTime()`，直接使用本地 `yyyy-MM-ddTHH:mm`，不再 `toISOString().slice(0,16)`；`disabledScheduleDate` 仅禁过去日期，`validateSchedule` 校验必须晚于当前时间。                                                                                                                                                                                                                                               |
| P0-03 769–960px 导航空窗    | 已修复 | `MobileBottomNav` 与 `LayoutView` 底部留白断点由 768 提升到 960；`AppHeader` 通知铃铛移出 `.header-actions`，平板/手机均可见；800×900 已验证底栏与通知入口。                                                                                                                                                                                                                                                                                   |
| P0-04 移动端主 tab 失去底栏 | 已修复 | `/my`、`/publicPost`、`/conversations` 移入 `LayoutView` 子路由，保留 AppHeader 与 MobileBottomNav；`/chat/:id` 保持沉浸式独立布局。                                                                                                                                                                                                                                                                                                           |

### 7.2 P1（主要项关闭）

| ID                            | 状态     | 修复摘要                                                                                                                                                                                                                                                  |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-01 草稿箱体验              | 已修复   | 首屏骨架、错误重试、空态 CTA、发布确认、单项 loading、total 递减、loadMore 防重；编辑跳转 `/publicPost?draftId=...`；时间改用 `formatExactTime`。                                                                                                         |
| P1-02 通知中心筛选/空态/badge | 已修复   | 新增“系统”筛选并改为服务端 `type` 参数（comment 含 reply）；空态按当前筛选结果判断；`formatRelativeTime`；已读/全部已读派发 `notification-unread-changed` 事件，铃铛徽标即时刷新。                                                                        |
| P1-03 通知铃铛可访问性        | 已修复   | 根节点改为 `<button aria-label="打开通知" aria-haspopup="dialog">`；弹层条目改为 button；`unreadCount` 用 `Number()`；`"0"` 不再显示红色 0。                                                                                                              |
| P1-04 键盘可达性              | 主要修复 | 13 处 `div/span @click` 已替换或补 `role=button`、`tabindex=0`、Enter/Space；覆盖 MyView 九宫格、UserCard、CommentInputBar、PostView 管理图标、DraftsView、ConversationsView、SearchView、CoverUploader、Login 同意框等。滑块验证仍为指针操作（见 7.4）。 |
| P1-05 对比度                  | 已修复   | 亮色主色改为 `#b5573d`，暗色主色 `#d4785f`；主按钮暗色覆盖为 `#b5573d` 白字；muted token 调整；`--border-focus`/gradient 同步；Featured 徽标改用 token。                                                                                                  |
| P1-06 触控目标                | 主要修复 | 全局为 tag/category/stat/feedback/clear/submit/hot-chip 设 `min-width/min-height:24px`，粗指针环境 32px；实测 24–36px，达到 WCAG 2.5.8 的 24×24，但未全部达到 44×44 触屏建议。                                                                            |
| P1-07 发布编辑器移动端        | 已修复   | 工具栏加“左右滑动工具栏查看更多”提示；移动端 submit-area 固定在底部导航之上，页面留出 152px 安全区。                                                                                                                                                      |
| P1-08 页面过渡/重挂载         | 已修复   | `App.vue` 对 LayoutView 使用 `/layout` 固定 key，`LayoutView` 内保留子路由过渡；`router.scrollBehavior` 恢复 `savedPosition`。                                                                                                                            |
| P1-09 首页错误态              | 已修复   | 首屏错误显示“内容加载失败，请检查网络后重试”+重试，不再伪装成“暂无更多内容”。                                                                                                                                                                             |
| P1-10 入口缺失                | 已修复   | 通知铃铛全宽度可见；MyView 增加深色模式开关与 AI 助手入口；通知未读 badge 在 MyView 入口显示。                                                                                                                                                            |
| P1-11 精选页                  | 已修复   | 增加错误重试、空态 CTA、button 卡片、图标化互动数、`formatExactTime`、loadMore 防重；徽标改用主题渐变。                                                                                                                                                   |

### 7.3 P2（可落地项）

| ID                                | 状态     | 修复摘要                                                                                                                                                |
| --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 404/标题/标题层级/skip link | 已修复   | 新增 `NotFoundView` 与 catch-all；`PAGE_TITLES` + `router.afterEach` 设置 `document.title`；`PageHeader` 默认 `h1`；全局 skip link 与 `#main-content`。 |
| P2-02 主题首屏/原生控件           | 已修复   | `index.html` 增加 `<meta name="color-scheme" content="light dark">` 与首屏前内联主题脚本；`global.scss` 设置 `color-scheme`；暗色主按钮使用深色主色。   |
| P2-03 Logo 依赖 MinIO             | 已修复   | `src/utils/request.js` 改为 `import.meta.env.BASE_URL + "logo.png"`，复用 `public/logo.png`，不再依赖 MinIO。                                           |
| P2-04 PageHeader 属性/total 类型  | 已修复   | 移除调用方无效 `:show-back`；`total` 接受 `[Number,String]`；`usePageList` 与 `ListPagination` 统一 `Number()`。                                        |
| P2-05 搜索 combobox/移动入口      | 已修复   | GlobalSearch 增加 combobox/listbox/option 语义、`aria-expanded`、键盘 Enter；恢复 ≤640 移动搜索按钮与弹窗。                                             |
| P2-06 分享复制降级                | 已修复   | `copyPostLink` 改为 async，优先 Clipboard API，失败用 textarea + `execCommand("copy")`。                                                                |
| P2-07 横滑提示                    | 已修复   | UserView 统计条、MyView tabs 增加 mask 渐隐；Admin 分类表增加“左右滑动查看完整表格”。                                                                   |
| P2-08 Admin 表格/图表             | 主要修复 | dataZoom 滑块改用主题色；分类表仍为横向滚动（移动端只能看到 ID/分类标识/简介首字/操作）。ECharts 已启用 aria + 图形标签。                               |
| P2-09 通知入口未读 badge          | 已修复   | MyView 互动通知入口增加未读 badge。                                                                                                                     |
| P2-10 登录/滑块                   | 已修复   | 同意框已有可访问名称；清空重置表单并刷新滑块；补“忘记密码？请联系管理员”；滑块支持方向键/Enter 与 aria 属性。                                           |

### 7.4 未完成与已知边界

- `SlideVerify` 已支持方向键调整 + Enter/Space 提交及 aria 属性，但无音频替代；如需更强无障碍可换用文字验证码。
- Admin 分类表在 390px 仍横向滚动（已加“左右滑动查看完整表格”提示）；ECharts 已启用 `aria` 并加图表标签。
- AI 助手移动端入口已在“我的”九宫格补充（`/aiChat`）。
- `FeaturedView` 已改用 `getFeaturedPostsApi()`（`src/api/postApi.js`）。
- 忘记密码入口已补“请联系管理员重置密码”；`index.html` 内联脚本会在首屏前恢复 `social-platform-theme`，避免暗色闪白。
- 既有 `AUDIT.md` 未改动；本文件为新增修复记录。

### 7.5 验证记录

- 后端：`./mvnw -q compile` 通过（exit 0）；后端重启后 DataInitializer 正常完成。
- 前端：`npm run build` 通过（Vite 7.3.1，314 modules，约 3.8s；仅有 chunk-size 警告）；`npm run lint` 通过。
- API：草稿详情仅作者可见（匿名返回 `该帖子不存在`）；草稿列表 2 条；通知 type 过滤 all=5 / like=1 / comment=2；`PUT /post/draft/{id}/publish` 返回“发布成功”，详情 `status=published`，`/post/list` 不再出现草稿。
- 浏览器：390×844、800×900、1440×900 回归；`/home` 手机与平板均有底栏/通知入口；`/my`、`/publicPost`、`/conversations` 有底栏；发布页 submit bar 位于底栏上方；通知筛选/全部已读/铃铛徽标正常；移动搜索弹窗可用；404 页面正常；控制台无 error。

### 7.6 修复后截图

| 截图                                                                             | 说明                                      |
| -------------------------------------------------------------------------------- | ----------------------------------------- |
| [home-mobile-after.png](docs/ui-audit/home-mobile-after.png)                     | 390px 首页：顶栏搜索/通知/头像 + 底部导航 |
| [home-800-after.png](docs/ui-audit/home-800-after.png)                           | 800px 平板：底部导航与通知入口恢复        |
| [my-social-mobile-after.png](docs/ui-audit/my-social-mobile-after.png)           | 我的：底部导航 + 社交入口 + AI 助手入口   |
| [publish-mobile-bottom-after.png](docs/ui-audit/publish-mobile-bottom-after.png) | 发布页：操作条位于底部导航上方            |
| [notifications-mobile-after.png](docs/ui-audit/notifications-mobile-after.png)   | 通知：系统筛选、相对时间、已读状态        |
| [home-light-after.png](docs/ui-audit/home-light-after.png)                       | 亮色首页：新主色与对比度 token            |

### 7.7 ego-browser 回归（2026-11-23）

使用 ego-browser（TaskSpace 2，独立浏览器配置）注入管理员登录态，在 390×844、800×900、1440×900 三档宽度回归：

- 390 首页：无横向溢出；搜索按钮、通知铃铛、底部导航均可见；`首页` tab 带 `aria-current="page"`。
- 800 平板：底部导航与通知入口恢复；`.header-actions` 仍隐藏，符合平板简化导航的取舍；无横向溢出。
- 通知：`全部/点赞/评论/关注/系统` 服务端筛选正确（全部 5、系统 1）；键盘聚焦铃铛后 Enter 可打开，5 条通知均加载；`全部已读` 后徽标隐藏。
- 发布：`/publicPost` 操作条固定在底部导航上方（submit 731–788，nav 788–844）；工具栏“左右滑动”提示可见；编辑定时草稿时日期为本地 `2026-11-25 10:45:00`，确认不再有 8 小时时差。
- 草稿箱：时间改为 `2026-11-25 10:45` / `2026-11-22 10:45`；草稿卡片可键盘进入；新增可见“编辑”操作。
- 详情/404/主题：`/my`、`/publicPost`、`/conversations` 均有 AppHeader 与底栏；404 有标题、说明与回首页；skip link `Tab` 聚焦后 Enter 跳到 `MAIN#main-content`；深色模式开关可切换并持久化。
- 移动搜索：390 下顶栏搜索按钮打开“探索与搜索”弹窗，热点/历史可用；无横向溢出。

遗留边界：触控目标实测 24–36px，达到 WCAG 2.5.8 的 24×24，但未全部达到 44×44 触屏建议；Admin 分类表 390 下仍需横向滑动；滑块验证码仍无音频替代。

| ego 回归截图                                                   | 说明                             |
| -------------------------------------------------------------- | -------------------------------- |
| [ego-home-mobile.png](docs/ui-audit/ego-home-mobile.png)       | 390px 首页：真实浏览器、管理员态 |
| [ego-home-800.png](docs/ui-audit/ego-home-800.png)             | 800px 平板：底栏与通知入口       |
| [ego-publish-mobile.png](docs/ui-audit/ego-publish-mobile.png) | 390px 发布页：操作条在底栏上方   |
| [ego-my-dark.png](docs/ui-audit/ego-my-dark.png)               | 390px 我的页深色模式             |
| [ego-login-mobile.png](docs/ui-audit/ego-login-mobile.png)     | 390px 登录页：同意框与滑块       |
