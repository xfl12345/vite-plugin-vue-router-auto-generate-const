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
  const entries = routeNames.map((name) => `  ${routePathToConstKey(name)}: '${name}'`).join(',\n')
  const ending = entries === '' ? '' : ','
  return `import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {
${entries}${ending}
} as const satisfies Record<string, keyof RouteNamedMap>
`
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
    let content: string
    try {
      content = readFileSync(typedRouterPath, { encoding: typedRouterFileEncoding })
    } catch {
      return
    }

    const routeNames = extractRouteNamesFromContent(content)
    if (routeNames.length === 0) return

    const generated = generateConstContent(routeNames)
    writeFileSync(generatedConstPath, generated, { encoding: constFileEncoding })
  }
}
