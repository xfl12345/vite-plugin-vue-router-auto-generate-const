import type { Plugin } from 'vite-plus'

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface FileEncoding {
  /** 自动生成的常量文件的读写编码。@default 'utf-8' */
  generatedConstFile?: BufferEncoding
  /** vue-router 类型文件的读写编码。@default 'utf-8' */
  typedRouterFile?: BufferEncoding
}

export interface VueRouterAutoGenerateConstOptions {
  /**
   * 自动生成的常量文件输出路径（相对于项目根目录）。
   * @default 'src/router/TheConst.ts'
   */
  generatedConstFile?: string
  /**
   * vue-router 自动生成的类型文件路径（相对于项目根目录）。
   * @default 'typed-router.d.ts'
   */
  typedRouterFile?: string
  /**
   * 按文件区分的读写编码，key 对应上面的路径配置字段名。
   * @default { generatedConstFile: 'utf-8', typedRouterFile: 'utf-8' }
   */
  fileEncoding?: FileEncoding
}

/**
 * Vite 插件：在 vue-router/vite 生成路由后，自动生成路由名常量文件。
 * 必须放在 VueRouter() 之后、vue() 之前。
 */
export function VueRouterAutoGenerateConst(
  options: VueRouterAutoGenerateConstOptions = {}
): Plugin {
  let root: string
  let generatedConstPath: string
  let typedRouterPath: string
  let constFileEncoding: BufferEncoding
  let typedRouterFileEncoding: BufferEncoding

  return {
    name: 'vue-router-auto-generate-const',
    enforce: 'pre',

    configResolved(config) {
      root = config.root
      generatedConstPath = resolve(root, options.generatedConstFile ?? 'src/router/TheConst.ts')
      typedRouterPath = resolve(root, options.typedRouterFile ?? 'typed-router.d.ts')
      constFileEncoding = options.fileEncoding?.generatedConstFile ?? 'utf-8'
      typedRouterFileEncoding = options.fileEncoding?.typedRouterFile ?? 'utf-8'
    },

    buildStart() {
      syncConst()
    },

    handleHotUpdate({ file }) {
      if (file === typedRouterPath) {
        syncConst()
      }
    },
  }

  function syncConst(): void {
    const routeNames = extractRouteNames()
    if (routeNames.length === 0) return

    const content = generateConstContent(routeNames)
    writeFileSync(generatedConstPath, content, { encoding: constFileEncoding })
  }

  function extractRouteNames(): string[] {
    let content: string
    try {
      content = readFileSync(typedRouterPath, { encoding: typedRouterFileEncoding })
    } catch {
      return []
    }

    const names: string[] = []
    const regex = /^\s*'([^']+)':\s*RouteRecordInfo/gm
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      names.push(match[1]!)
    }
    return names
  }

  function generateConstContent(routeNames: string[]): string {
    const entries = routeNames
      .map((name) => `  ${routePathToConstKey(name)}: '${name}'`)
      .join(',\n')
    const ending = entries === '' ? '' : ','
    return `import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {
${entries}${ending}
} as const satisfies Record<string, keyof RouteNamedMap>
`
  }

  /** 将路由路径转为全大写下划线常量名，如 '/first-time-loading-page' → 'FIRST_TIME_LOADING_PAGE' */
  function routePathToConstKey(path: string): string {
    if (path === '/') return 'INDEX'
    const isIndex = path.endsWith('/')
    const key = path
      .replace(/\/+$/, '') // 去掉尾随 /
      .slice(1) // 去掉开头的 /
      .replace(/\/-/g, '_') // 中间的 / 和 - 统一转为下划线分隔
      .replace(/[/-]/g, '_')
      .toUpperCase()
    return isIndex ? `${key}_INDEX` : key
  }
}
