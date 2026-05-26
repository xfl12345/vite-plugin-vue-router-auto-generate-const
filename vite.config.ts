import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    dts: {
      tsgo: true,
    },
    deps: {
      onlyBundle: [
        '@oxc-project/types',
        '@types/chai',
        '@types/deep-eql',
        '@voidzero-dev/vite-plus-core',
        '@voidzero-dev/vite-plus-test',
        'assertion-error',
        'oxfmt',
        'oxlint',
        'type-fest',
        'vite-plus',
      ],
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
    jsxSingleQuote: true,
    trailingComma: 'es5',
    sortImports: {
      groups: [
        'type-import',
        ['value-builtin', 'value-external'],
        'type-internal',
        'value-internal',
        ['type-parent', 'type-sibling', 'type-index'],
        ['value-parent', 'value-sibling', 'value-index'],
        'unknown',
      ],
    },
  },
})
