import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(pluginRoot, '../../shared/capture-button-script.js')
const target = resolve(pluginRoot, 'android/src/main/assets/capture-button-script.js')

await mkdir(dirname(target), { recursive: true })
await copyFile(source, target)
