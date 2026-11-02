/** 列表分页尺寸集中定义，避免魔法数字散落各视图 */

/** 帖子卡片网格（每行 4 列 × 2 行） */
export const POST_PAGE_SIZE = 8;

/**
 * 推荐流/关注流每页条数。
 * 这两条接口是游标分页，页大小由后端 system-constants.default-page-size 决定（12），
 * 前端只用它渲染骨架屏，必须与后端保持一致，否则首屏会缺 4 张占位卡。
 */
export const FEED_PAGE_SIZE = 12;

/** 用户卡片网格（每行 4 列 × 3 行） */
export const USER_PAGE_SIZE = 12;

/** 私信历史消息 / 会话列表 */
export const CHAT_PAGE_SIZE = 20;

/** AI 助手会话列表 */
export const AI_SESSION_PAGE_SIZE = 10;

/** 搜索页展示的历史条数 */
export const SEARCH_HISTORY_PAGE_SIZE = 20;

/** 顶栏搜索下拉展示的历史条数 */
export const HEADER_HISTORY_PAGE_SIZE = 10;

/** 黑名单列表（每页人数） */
export const BLACKLIST_PAGE_SIZE = 10;
