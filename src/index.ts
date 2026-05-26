import type { RequiredDeep } from 'type-fest'
import type { Plugin } from 'vite-plus'

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface FileInfo {
  /** 文件的路径（相对于项目根目录）。 */
  path: string
  /** 文件的文本编码。@default 'utf-8' */
  encoding: BufferEncoding
}

export const DEFAULT_OPTIONS: RequiredDeep<VueRouterAutoGenerateConstOptions> = {
  generatedConstFile: { path: 'src/router/TheConst.ts', encoding: 'utf-8' },
  typedRouterFile: { path: 'typed-router.d.ts', encoding: 'utf-8' },
} as const

export interface VueRouterAutoGenerateConstOptions {
  /**
   * 自动生成的常量文件。
   * @default { path: 'src/router/TheConst.ts', encoding: 'utf-8' }
   */
  generatedConstFile?: Partial<FileInfo>
  /**
   * vue-router 自动生成的类型文件。
   * @default { path: 'typed-router.d.ts', encoding: 'utf-8' }
   */
  typedRouterFile?: Partial<FileInfo>
}

/** 将路由路径转为全大写下划线常量名，如 '/first-time-loading-page' → 'FIRST_TIME_LOADING_PAGE' */
export function routePathToConstKey(path: string): string {
  if (path === '/') {
    return 'INDEX'
  }

  const isIndex = path.endsWith('/')
  const chars: string[] = []
  for (let i = 1; i < path.length; i += 1) {
    // i 从 1 开始，跳过开头的 /
    const ch = path[i]!
    switch (ch) {
      case '/':
        if (path.at(i + 1) === '-') {
          // '/-' 合并为一个 _
          chars.push('_')
          i += 1
        } else {
          chars.push('_')
        }
        break
      case '-':
        chars.push('_')
        break
      default:
        chars.push(ch.toUpperCase())
    }
  }

  const key = chars.join('')
  return isIndex ? `${key}INDEX` : key
}

/** 从 typed-router.d.ts 文件内容中提取路由名称列表 */
export function extractRouteNamesFromContent(content: string): string[] {
  const names: string[] = []
  const regex = /^\s*'([^']+)':\s*RouteRecordInfo/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    names.push(match[1]!)
  }
  return names
}

/** 根据路由名称列表生成常量文件内容 */
export function generateConstContent(routeNames: string[]): string {
  if (routeNames.length === 0) {
    return `import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {} as const
`
  }

  const entries = routeNames.map((name) => `  ${routePathToConstKey(name)}: '${name}'`).join(',\n')
  return `import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {
${entries},
} as const satisfies Record<string, keyof RouteNamedMap>
`
}

export class ConstHandler {
  constructor(
    private readonly generatedConstFile: FileInfo,
    private readonly typedRouterFile: FileInfo
  ) {}

  sync(): void {
    let content: string
    try {
      content = readFileSync(this.typedRouterFile.path, { encoding: this.typedRouterFile.encoding })
    } catch {
      return
    }

    const routeNames = extractRouteNamesFromContent(content)
    const generated = generateConstContent(routeNames)
    writeFileSync(this.generatedConstFile.path, generated, {
      encoding: this.generatedConstFile.encoding,
    })
  }

  isMatchTypedRouterFile(file: string): boolean {
    return file === this.typedRouterFile.path
  }
}

/**
 * Vite 插件：在 vue-router/vite 生成路由后，自动生成路由名常量文件。
 * 必须放在 VueRouter() 之后、vue() 之前。
 */
export function VueRouterAutoGenerateConst(
  options: VueRouterAutoGenerateConstOptions = {}
): Plugin {
  let handler: ConstHandler

  return {
    name: 'vue-router-auto-generate-const',
    enforce: 'pre',

    configResolved(config) {
      const gen = { ...DEFAULT_OPTIONS.generatedConstFile, ...options.generatedConstFile }
      const typed = { ...DEFAULT_OPTIONS.typedRouterFile, ...options.typedRouterFile }
      handler = new ConstHandler(
        { path: resolve(config.root, gen.path), encoding: gen.encoding },
        { path: resolve(config.root, typed.path), encoding: typed.encoding }
      )
    },

    buildStart() {
      handler.sync()
    },

    handleHotUpdate({ file }) {
      if (handler.isMatchTypedRouterFile(file)) {
        handler.sync()
      }
    },
  }
}
