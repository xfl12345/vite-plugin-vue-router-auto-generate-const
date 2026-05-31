# vite-plugin-vue-router-auto-generate-const

一个 Vite 插件，配合 [Vue Router v5 的文件路由功能](https://router.vuejs.org/file-based-routing/)使用，自动将路由名称生成为 TypeScript 常量对象。

## 为什么需要这个插件？

使用基于文件的路由时，路由名称由路径自动生成，在代码中通常只能以字符串字面量引用（如 `'vue-welcome'`）。这导致：

- 路由路径变更时，需要手动搜索替换所有字符串引用
- 无法享受 IDE 的自动补全和重构支持
- 容易因拼写错误引入 bug

本插件自动生成一个常量对象，让你可以用 `ROUTER_NAMES.VUE_WELCOME` 代替 `'vue-welcome'`。

## 安装

```bash
npm install -D vite-plugin-vue-router-auto-generate-const
```

## 用法

在 `vite.config.ts` 中注册插件，**必须放在 `VueRouter()` 之后、`vue()` 之前**：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { VueRouterAutoGenerateConst } from 'vite-plugin-vue-router-auto-generate-const'

export default defineConfig({
  plugins: [VueRouter(), VueRouterAutoGenerateConst(), vue()],
})
```

插件会在构建启动时自动生成 `src/router/TheConst.ts`，内容类似：

```typescript
import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {
  INDEX: '/',
  EMOJI2PNG: '/emoji2png',
  VUE_WELCOME: '/vue-welcome',
  VUE_WELCOME_INDEX: '/vue-welcome/',
  VUE_WELCOME_ABOUT: '/vue-welcome/about',
  VUE_WELCOME_HOME: '/vue-welcome/home',
} as const satisfies Record<string, keyof RouteNamedMap>
```

然后在代码中引用：

```typescript
import { ROUTER_NAMES } from '@/router/TheConst'

router.push(ROUTER_NAMES.VUE_WELCOME_ABOUT) // 类型安全，IDE 自动补全
```

## 配置

```typescript
VueRouterAutoGenerateConst({
  // 生成的常量文件路径和编码
  generatedConstFile: {
    path: 'src/router/TheConst.ts',
    encoding: 'utf-8',
  },
  // Vue Router 自动生成的类型文件路径和编码
  typedRouterFile: {
    path: 'typed-router.d.ts',
    encoding: 'utf-8',
  },
})
```

## 路由路径到常量名的转换规则

| 路由路径             | 常量名              |
| -------------------- | ------------------- |
| `/`                  | `INDEX`             |
| `/vue-welcome`       | `VUE_WELCOME`       |
| `/vue-welcome/`      | `VUE_WELCOME_INDEX` |
| `/vue-welcome/about` | `VUE_WELCOME_ABOUT` |

## 开发

```bash
pnpm install    # 安装依赖
pnpm test       # 运行测试
pnpm build      # 构建
```

## License

[MIT](./LICENSE)
