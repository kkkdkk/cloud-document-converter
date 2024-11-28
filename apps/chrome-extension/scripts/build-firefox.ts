import { execa } from 'execa'
import fs from 'fs'

interface Manifest {
  background:
    | {
        scripts: string[]
      }
    | {
        service_worker: string
      }
  browser_specific_settings: {
    gecko: {
      id: string
    }
  }
}

const main = async () => {
  const distDirName = 'dist-firefox'

  for await (const line of execa('npx', ['turbo', 'run', 'build'])) {
    console.log(line)
  }

  await execa`mkdir -p ${distDirName}`

  await execa('cp', [
    '-r',
    ...(await fs.promises
      .readdir('dist')
      .then(paths => paths.map(path => `dist/${path}`))),
    distDirName,
  ])
  console.log(`building: copy dist to ${distDirName}`)

  const chromeManifestFilePath = './dist/manifest.json'
  const firefoxManifestFilePath = `./${distDirName}/manifest.json`

  const manifest: Manifest = JSON.parse(
    await fs.promises.readFile(chromeManifestFilePath, { encoding: 'utf-8' }),
  )

  if ('service_worker' in manifest.background) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
    }
  }

  manifest.browser_specific_settings = {
    gecko: {
      id: 'whale.4113@gmail.com',
    },
  }

  await fs.promises.writeFile(
    firefoxManifestFilePath,
    JSON.stringify(manifest),
    {
      encoding: 'utf-8',
    },
  )

  for await (const line of execa('npx', [
    'web-ext',
    'lint',
    '--source-dir',
    distDirName,
  ])) {
    console.log(`web-ext lint: ${line}`)
  }
}

main()