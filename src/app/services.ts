import fs from 'node:fs/promises'
import path from 'node:path'
import { ServicesContext } from '@node-in-layers/core'
import {
  createTemporaryOutputPath,
  hasYtdlpTemplate,
  resolveTemplateSearch,
} from './libs.js'
import { AppConfig, AppServices } from './types.js'

export const create = (context: ServicesContext<AppConfig>): AppServices => {
  const resolveExistingFilePath: AppServices['resolveExistingFilePath'] = (
    args,
    crossLayerProps
  ) => {
    const log = context.log.getInnerLogger(
      'resolveExistingFilePath',
      crossLayerProps
    )

    if (!args.outputPath) {
      return Promise.resolve(undefined)
    }

    if (hasYtdlpTemplate(args.outputPath)) {
      const search = resolveTemplateSearch(args.outputPath)

      if (!search) {
        return Promise.resolve(undefined)
      }

      return fs.readdir(search.directory).then(
        fileNames => {
          const fileName = fileNames
            .filter(currentFileName =>
              currentFileName.startsWith(search.filePrefix)
            )
            .sort()[0]

          return fileName ? path.join(search.directory, fileName) : undefined
        },
        () => undefined
      )
    }

    const resolvedPath = path.resolve(args.outputPath)
    log.debug('Checking whether output file already exists', {
      outputPath: resolvedPath,
    })

    return fs.stat(resolvedPath).then(
      stats => (stats.isFile() ? resolvedPath : undefined),
      () => undefined
    )
  }

  const createTemporaryDownloadPath: AppServices['createTemporaryDownloadPath'] =
    (args, crossLayerProps) => {
      const log = context.log.getInnerLogger(
        'createTemporaryDownloadPath',
        crossLayerProps
      )
      const outputPath = createTemporaryOutputPath(args.url)

      log.debug('Created temporary yt-dlp output template', {
        outputPath,
      })

      return Promise.resolve({
        outputPath,
      })
    }

  return {
    resolveExistingFilePath,
    createTemporaryDownloadPath,
  }
}
