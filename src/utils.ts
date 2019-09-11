import path from 'path'
import { SpawnOptions } from 'child_process'
import execa from 'execa'
import { glob, Files, PackageJson } from '@now/build-utils'
import consola from 'consola'
import { IOptions } from 'glob'

export async function exec (cmd: string, args: string[], { env, ...opts }: SpawnOptions = {}): Promise<void> {
  args = args.filter(Boolean)

  consola.log('Running', cmd, ...args)

  await execa('npx', [cmd, ...args], {
    stdout: process.stdout,
    stderr: process.stderr,
    preferLocal: false,
    env: {
      MINIMAL: '1',
      NODE_OPTIONS: '--max_old_space_size=3000',
      ...env
    },
    ...opts
  })
}

/**
 * Validate if the entrypoint is allowed to be used
 */
export function validateEntrypoint (entrypoint: string): void {
  const filename = path.basename(entrypoint)

  if (['package.json', 'nuxt.config.js'].includes(filename) === false) {
    throw new Error(
      'Specified "src" for "@nuxt/now-builder" has to be "package.json" or "nuxt.config.js"'
    )
  }
}

// function filterFiles(files, filterFn) {
//   const newFiles = {}
//   for (const fileName in files) {
//     if (filterFn(files)) {
//       newFiles[fileName] = files[fileName]
//     }
//   }
//   return newFiles
// }

export function renameFiles (files: Files, renameFn: (fileName: string) => string): Files {
  const newFiles: Files = {}
  for (const fileName in files) {
    newFiles[renameFn(fileName)] = files[fileName]
  }
  return newFiles
}

export async function globAndRename (pattern: string, opts: IOptions | string, renameFn: (fileName: string) => string): Promise<Files> {
  const files = await glob(pattern, opts)
  return renameFiles(files, renameFn)
}

export function globAndPrefix (pattern: string, opts: IOptions | string, prefix: string): Promise<Files> {
  return globAndRename(pattern, opts, name => path.join(prefix, name))
}

interface NuxtVersion {
  name: string;
  version: string;
  semver: string;
  suffix: string;
  section: string;
}

export function findNuxtDep (pkg: PackageJson): void | NuxtVersion {
  for (const section of ['dependencies', 'devDependencies'] as const) {
    const deps = pkg[section]
    if (deps) {
      for (const suffix of ['-edge', '']) {
        const name = 'nuxt' + suffix
        const version = deps[name]
        if (version) {
          const semver = version.replace(/^[\^~><=]{1,2}/, '')
          return {
            name,
            version,
            semver,
            suffix,
            section
          }
        }
      }
    }
  }
}

export function preparePkgForProd (pkg: PackageJson): NuxtVersion {
  // Ensure fields exist
  if (!pkg.dependencies) {
    pkg.dependencies = {}
  }
  if (!pkg.devDependencies) {
    pkg.devDependencies = {}
  }

  // Find nuxt dependency
  const nuxtDependency = findNuxtDep(pkg)
  if (!nuxtDependency) {
    throw new Error('No nuxt dependency found in package.json')
  }

  // Remove nuxt form dependencies
  for (const distro of ['nuxt', 'nuxt-start']) {
    for (const suffix of ['-edge', '']) {
      delete pkg.dependencies[distro + suffix]
    }
  }

  // Delete all devDependencies
  delete pkg.devDependencies

  // Add @nuxt/core to dependencies
  pkg.dependencies['@nuxt/core' + nuxtDependency.suffix] = nuxtDependency.version

  // Return nuxtDependency
  return nuxtDependency
}

let _step: string | undefined
let _stepStartTime: [number, number] | undefined

const dash = ' ----------------- '

export function hrToMs (hr: [number, number]): number {
  const hrTime = process.hrtime(hr)
  return ((hrTime[0] * 1e9) + hrTime[1]) / 1e6
}

export function endStep (): void {
  if (!_step) {
    return
  }
  if (_step && _stepStartTime) {
    consola.info(`${_step} took: ${hrToMs(_stepStartTime)} ms`)
  }
  _step = undefined
  _stepStartTime = undefined
}

export function startStep (step: string): void {
  endStep()
  consola.log(dash + step + dash)
  _step = step
  _stepStartTime = process.hrtime()
}