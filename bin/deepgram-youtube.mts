#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ArgumentParser } from 'argparse'
import esMain from 'es-main'
import {
  CoreNamespace,
  isErrorObject,
  loadSystem,
  LogFormat,
  LogLevelNames,
} from '@node-in-layers/core'
import {
  DeepgramAuthenticationType,
  DeepgramNamespace,
  SpeechToTextMode,
} from '@node-in-layers/deepgram'
import * as deepgram from '@node-in-layers/deepgram'
import * as youtube from '@node-in-layers/youtube'
import * as app from '../src/app/index.js'
import { AppFeatures } from '../src/app/types.js'
import { AppNamespace } from '../src/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getVersion = () => {
  const packageJsonPath = path.join(__dirname, '../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  return packageJson.version
}

const parseArguments = () => {
  const parser = new ArgumentParser({
    prog: 'deepgram-youtube',
    description:
      'Download YouTube media if needed, then transcribe it with Deepgram.',
  })

  parser.add_argument('url', {
    help: 'The YouTube URL to download and transcribe.',
  })
  parser.add_argument('-v', '--version', {
    action: 'version',
    version: getVersion(),
  })
  parser.add_argument('-o', '--output-path', {
    help: 'Existing or desired download path. If omitted, a temporary file is used.',
    dest: 'outputPath',
  })
  parser.add_argument('-a', '--audio-only', {
    action: 'store_true',
    default: false,
    help: 'Download extracted audio instead of the full media file.',
    dest: 'audioOnly',
  })
  parser.add_argument('-f', '--format', {
    help: 'Optional yt-dlp format selector.',
    dest: 'format',
  })
  parser.add_argument('-x', '--extra-arg', {
    action: 'append',
    help: 'Additional raw yt-dlp argument. Repeat as needed.',
    dest: 'extraArgs',
  })
  parser.add_argument('--skip-auto-install-latest', {
    action: 'store_true',
    default: false,
    help: 'Skip the default yt-dlp auto-install/update behavior.',
    dest: 'skipAutoInstallLatest',
  })
  parser.add_argument('-e', '--executable-path', {
    help: 'Explicit path to the yt-dlp executable.',
    dest: 'executablePath',
  })
  parser.add_argument('-p', '--python-executable-path', {
    help: 'Explicit Python executable path for yt-dlp installation flows.',
    dest: 'pythonExecutablePath',
  })
  parser.add_argument('--pipx-executable-path', {
    help: 'Explicit pipx executable path.',
    dest: 'pipxExecutablePath',
  })
  parser.add_argument('-m', '--mode', {
    choices: Object.values(SpeechToTextMode),
    default: SpeechToTextMode.prerecorded,
    help: 'Deepgram transcription mode. Defaults to prerecorded.',
    dest: 'mode',
  })
  parser.add_argument('-d', '--deepgram-options', {
    help: 'Stringified JSON object passed through to Deepgram speech-to-text.',
    dest: 'deepgramOptions',
  })
  parser.add_argument('-j', '--json', {
    action: 'store_true',
    default: false,
    help: 'Print the full JSON response instead of just the transcript.',
    dest: 'json',
  })
  parser.add_argument('-l', '--log-level', {
    choices: Object.values(LogLevelNames),
    default: LogLevelNames.silent,
    help: 'Node In Layers log level. Defaults to silent.',
    dest: 'logLevel',
  })
  parser.add_argument('-g', '--log-format', {
    choices: Object.values(LogFormat),
    default: LogFormat.simple,
    help: 'Node In Layers log format. Defaults to simple.',
    dest: 'logFormat',
  })

  return parser.parse_args()
}

const parseDeepgramOptions = (value?: string) => {
  return Promise.resolve(value).then(currentValue =>
    currentValue ? JSON.parse(currentValue) : undefined
  )
}

const writeAndExit = (
  args: Readonly<{
    message: string
    code: number
    useErrorStream?: boolean
  }>
) => {
  const stream = args.useErrorStream ? process.stderr : process.stdout

  return new Promise<void>(resolve => {
    stream.write(`${args.message}\n`, () => resolve())
  }).then(() => {
    process.exit(args.code)
  })
}

const getConfig = (args: any, apiKey: string) => {
  return {
    environment: 'production',
    systemName: 'deepgram-youtube-cli',
    [CoreNamespace.root]: {
      domains: [youtube.ytdlp, deepgram.node, app],
      layerOrder: ['services', 'features'],
      logging: {
        logLevel: args.logLevel,
        logFormat: args.logFormat,
      },
    },
    [DeepgramNamespace.node]: {
      authentication: {
        type: DeepgramAuthenticationType.apiKey,
        apiKey,
      },
    },
  }
}

const getRequiredFeatures = <T,>(
  args: Readonly<{
    featuresRegistry: Record<string, unknown>
    namespace: string
  }>
): T => {
  const registry = args.featuresRegistry as any
  const features =
    typeof registry.getFeatures === 'function'
      ? registry.getFeatures(args.namespace)
      : registry[args.namespace]

  if (!features) {
    throw new Error(`Unable to load features for ${args.namespace}`)
  }

  return features as T
}

const main = () => {
  const args = parseArguments()

  return Promise.resolve()
    .then(async () => {
      const apiKey = process.env.DEEPGRAM_API_KEY?.trim()

      if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY is required.')
      }

      const deepgramOptions = await parseDeepgramOptions(args.deepgramOptions)
      const system = await loadSystem({
        environment: 'production',
        config: getConfig(args, apiKey),
      })
      const appFeatures = getRequiredFeatures<AppFeatures>({
        featuresRegistry: system.features as Record<string, unknown>,
        namespace: AppNamespace.app,
      })
      const result = await appFeatures.transcribeYoutubeVideo({
        url: args.url,
        outputPath: args.outputPath,
        audioOnly: args.audioOnly,
        format: args.format,
        extraArgs: args.extraArgs || [],
        skipAutoInstallLatest: args.skipAutoInstallLatest,
        executablePath: args.executablePath,
        pythonExecutablePath: args.pythonExecutablePath,
        pipxExecutablePath: args.pipxExecutablePath,
        mode: args.mode,
        options: deepgramOptions,
      })

      if (isErrorObject(result)) {
        return writeAndExit({
          message: args.json
            ? JSON.stringify(result, null, 2)
            : result.error.message,
          code: 1,
          useErrorStream: true,
        })
      }

      if (args.json) {
        return writeAndExit({
          message: JSON.stringify(result, null, 2),
          code: 0,
        })
      }

      return writeAndExit({
        message: result.transcript,
        code: 0,
      })
    })
    .catch(error => {
      return writeAndExit({
        message: error instanceof Error ? error.message : String(error),
        code: 1,
        useErrorStream: true,
      })
    })
}

if (esMain(import.meta)) {
  main()
}
