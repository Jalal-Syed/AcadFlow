import { readFile, writeFile } from 'node:fs/promises'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const marker = '<!-- AcadFlow auth callback -->'
const callbackData = '<data android:scheme="acadflow" android:host="auth" android:pathPrefix="/callback" />'
const callbackFilter = `
            ${marker}
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="acadflow" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>`

const manifest = await readFile(manifestPath, 'utf8')
if (!manifest.includes(callbackData)) {
  const launcherFilter = `            </intent-filter>`
  const launcherIndex = manifest.indexOf(launcherFilter)
  if (launcherIndex === -1) throw new Error('Could not locate the Android launcher intent filter.')
  const insertAt = launcherIndex + launcherFilter.length
  await writeFile(manifestPath, `${manifest.slice(0, insertAt)}${callbackFilter}${manifest.slice(insertAt)}`)
}
