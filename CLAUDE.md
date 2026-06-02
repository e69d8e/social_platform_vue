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

- REST API base: `http://127.0.0.1:8080/api` (hardcoded in `src/utils/request.js`)
- WebSocket: STOMP over SockJS at `ws://127.0.0.1:8081/ws` (`src/utils/websocket.js`)
- Response convention: `{ code: 1, data, message }` — `code === 1` means success
- Axios interceptor: auto-attaches Bearer token, auto-refreshes on 401 with queued retries, redirects to `/login` on refresh failure

### State Management (`src/stores/`)

Three Pinia stores, all persisted to localStorage via `pinia-plugin-persistedstate`:

- **user** — auth tokens (`accessToken`, `refreshToken`) + user profile info
- **sign** — daily sign-in streak counter
- **theme** — dark/light toggle; applies `.dark` class on `<html>`

### Routing (`src/router/index.js`)

Layout-wrapped routes are children of `/` using `LayoutView`. Standalone routes (no layout): `/login`, `/my`, `/publicPost`, `/post/:id`, `/posts/banned`, `/users/banned`, `/admin/dashboard`, `/aiChat`, `/conversations`, `/chat/:conversationId`, `/userAgreement`. All routes lazy-loaded via dynamic `import()`. A `beforeEach` guard enforces role-based access using `meta: { roles }` — unauthorized users are redirected to `/`.

### API Modules (`src/api/`)

One file per domain: `userApi`, `postApi`, `commentApi`, `followApi`, `uploadApi`, `searchApi`, `adminApi`, `reviewerApi`, `aiApi`. All functions suffixed with `Api`.

### Roles

- `authorityId: 1` — regular user
- `authorityId: 2` — admin (ban users, assign reviewer role)
- `authorityId: 3` — reviewer (ban posts, delete comments)

## Conventions

- **Components**: PascalCase filenames (`PostCard.vue`), `<script setup>`, `<style lang="scss" scoped>`
- **API functions**: suffixed with `Api` (e.g., `loginApi`, `getPostDetailApi`)
- **Path alias**: `@` → `./src`
- **Element Plus**: auto-imported globally via `unplugin-auto-import` + `unplugin-vue-components`; `ElMessage`, `ElMessageBox`, `ElLoading`, `ElNotification` are ESLint globals
- **Styling**: SCSS scoped styles, `:deep()` for Element Plus internals, CSS variables (`var(--el-*)`) for theming
- **Infinite scroll**: window scroll + debounce (100px threshold)
- **Optimistic UI**: like/follow actions update before API call, rollback on error
- **Formatting**: Prettier — semicolons, double quotes, 80-char width; 2-space indent
