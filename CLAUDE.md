# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Y社区 (Y Community) — a Chinese-language social media platform frontend built with Vue 3 + Vite.

## Commands

```bash
npm run dev      # Dev server at 127.0.0.1:5173
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint with auto-fix (flat config, ESLint 9+)
npm run format   # Prettier on src/
```

No test framework is configured.

## Tech Stack

Vue 3.5 (Composition API, `<script setup>`) · Vite 7 · Pinia + persistedstate · Vue Router 4 (history mode) · Axios · Element Plus (auto-imported) · Sass · WangEditor · STOMP/SockJS WebSocket · lodash

All plain JavaScript — no TypeScript.

## Architecture

### Backend Integration

- REST API base: `VITE_API_BASE_URL` (injected via `.env.*`; dev `http://127.0.0.1:8080/api`, prod `/api` same-origin reverse-proxied by Nginx)
- WebSocket: STOMP over SockJS at `VITE_WS_URL` (dev `http://127.0.0.1:8081/ws`, prod `/ws`)
- Response convention: `{ code: 1, data, message }` — `code === 1` means success
- Axios interceptor: auto-attaches Bearer token, auto-refreshes on 401 with queued retries, redirects to `/login` on refresh failure

### State Management (`src/stores/`)

Three Pinia stores, all persisted to localStorage via `pinia-plugin-persistedstate`:

- **user** — auth tokens (`accessToken`, `refreshToken`) + user profile info; computed getters `isLoggedIn` / `isModerator` (reviewer or admin) / `isAdmin`
- **sign** — daily sign-in streak counter
- **theme** — dark/light toggle; applies `.dark` class on `<html>`

### Shared Interaction Logic (`src/composables/`)

Reusable composables — prefer these over re-implementing inline:

- **useRequireLogin** — unified login guard (`if (!requireLogin("...")) return;`)
- **useLike** — optimistic like toggle with rollback, throttle and pop animation
- **useSearchHistory** — fetch/delete/clear search history (with confirm dialog)
- **usePageList** / **useInfiniteScroll** — paged and cursor-based list loading with error/retry states
- **useChat** / **useAiChat** — private-message and AI-assistant conversation logic
- **useUnreadMessages** — unread DM count polling (30s, pauses when tab hidden)

### Component Structure (`src/components/`)

- `layout/` — AppHeader, GlobalSearch, MobileBottomNav (composed by LayoutView)
- `comment/` — CommentItem, CommentInputBar (composed by CommentComponent)
- `chat/` — ChatMessages, ChatInputBox (composed by ChatView)
- `ai/` — AiSessionSidebar, AiMessageList, AiChatInput (composed by AIChatView)
- `publish/` — CoverUploader (drag/crop/preview cover flow)
- `PostCard.vue` / `UserCard.vue` take a single object prop (`post` / `user`) plus `delay`

### Constants (`src/constants/pagination.js`)

Centralized page sizes (`POST_PAGE_SIZE`, `USER_PAGE_SIZE`, `CHAT_PAGE_SIZE`, …) — use these instead of magic numbers.

### Routing (`src/router/index.js`)

Layout-wrapped routes are children of `/` using `LayoutView`. Standalone routes (no layout): `/login`, `/my`, `/publicPost`, `/post/:id`, `/posts/banned`, `/users/banned`, `/admin/dashboard`, `/aiChat`, `/conversations`, `/chat/:conversationId`, `/userAgreement`. All routes lazy-loaded via dynamic `import()`. A `beforeEach` guard enforces role-based access using `meta: { roles }` — unauthorized users are redirected to `/`.

### API Modules (`src/api/`)

One file per domain: `userApi`, `postApi`, `commentApi`, `followApi`, `messageApi`, `uploadApi`, `searchApi`, `adminApi`, `reviewerApi`, `aiApi`. All functions suffixed with `Api`.

### Roles

- `authorityId: 1` — regular user
- `authorityId: 2` — admin (ban users, assign reviewer role)
- `authorityId: 3` — reviewer (ban posts, delete comments)

## Conventions

- **Components**: PascalCase filenames (`PostCard.vue`), `<script setup>`, `<style lang="scss" scoped>`
- **API functions**: suffixed with `Api` (e.g., `loginApi`, `getPostDetailApi`)
- **Login guard**: use `useRequireLogin` composable instead of inline username checks
- **Path alias**: `@` → `./src`
- **Element Plus**: auto-imported globally via `unplugin-auto-import` + `unplugin-vue-components`; `ElMessage`, `ElMessageBox`, `ElLoading`, `ElNotification` are ESLint globals
- **Styling**: SCSS scoped styles, `:deep()` for Element Plus internals, CSS variables (`var(--el-*)`) for theming
- **Infinite scroll**: window scroll + debounce (100px threshold)
- **Optimistic UI**: like/follow actions update before API call, rollback on error
- **Formatting**: Prettier — semicolons, double quotes, 80-char width; 2-space indent

A husky `pre-commit` hook runs lint-staged (ESLint `--fix` + Prettier) on staged files.
