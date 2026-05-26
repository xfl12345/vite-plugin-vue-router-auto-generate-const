import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vite-plus/test'

import {
  extractRouteNamesFromContent,
  generateConstContent,
  routePathToConstKey,
} from '../src/index.ts'

const assertsDir = resolve(import.meta.dirname, 'asserts')

test('routePathToConstKey', () => {
  expect(routePathToConstKey('/')).toBe('INDEX')
  expect(routePathToConstKey('/emoji2png')).toBe('EMOJI2PNG')
  expect(routePathToConstKey('/vue-welcome')).toBe('VUE_WELCOME')
  expect(routePathToConstKey('/vue-welcome/')).toBe('VUE_WELCOME_INDEX')
  expect(routePathToConstKey('/vue-welcome/about')).toBe('VUE_WELCOME_ABOUT')
  expect(routePathToConstKey('/vue-welcome/home')).toBe('VUE_WELCOME_HOME')
})

test('extractRouteNamesFromContent', () => {
  const input = readFileSync(resolve(assertsDir, 'typed-router.d.ts'), 'utf-8')
  const names = extractRouteNamesFromContent(input)

  expect(names).toEqual([
    '/',
    '/emoji2png',
    '/vue-welcome',
    '/vue-welcome/',
    '/vue-welcome/about',
    '/vue-welcome/home',
  ])
})

test('generateConstContent matches expected output', () => {
  const input = readFileSync(resolve(assertsDir, 'typed-router.d.ts'), 'utf-8')
  const expected = readFileSync(resolve(assertsDir, 'expect.txt'), 'utf-8')

  const routeNames = extractRouteNamesFromContent(input)
  const output = generateConstContent(routeNames)

  expect(output).toBe(expected)
})

test('generateConstContent with empty route names', () => {
  const expected = readFileSync(resolve(assertsDir, 'expect-empty.txt'), 'utf-8')

  const output = generateConstContent([])

  expect(output).toBe(expected)
})
