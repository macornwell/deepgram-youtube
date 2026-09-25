import {
  annotatedFunction,
  createErrorObject,
  FeaturesContext,
  isErrorObject,
} from '@node-in-layers/core'
import { DeepgramNamespace } from '@node-in-layers/deepgram'
import type {
  NodeFeatures,
  NodeFeaturesLayer,
} from '@node-in-layers/deepgram/node/types.js'
import {
  YoutubeNamespace,
  YtdlpFeaturesLayer,
  type YtdlpFeatures,
} from '@node-in-layers/youtube'
import { AppNamespace } from '../types.js'
import { resolveDownloadFilePath } from './libs.js'
import {
  AppConfig,
  AppFeatures,
  AppServicesLayer,
  DownloadedMedia,
  transcribeYoutubeVideoArgsSchema,
  transcribeYoutubeVideoResponseSchema,
  TranscribeYoutubeVideoProps,
  TranscribeYoutubeVideoResponse,
} from './types.js'

const getRequiredDomainFeatures = <T>(
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

const assertDeepgramAuthenticationConfigured = (config: AppConfig) => {
  if (!config[DeepgramNamespace.node]?.authentication) {
    throw new Error(
      'Deepgram authentication is required in config for the node domain.'
    )
  }
}

const create = (
  context: FeaturesContext<
    AppConfig,
    AppServicesLayer,
    NodeFeaturesLayer & YtdlpFeaturesLayer
  >
): AppFeatures => {
  const transcribeYoutubeVideo = annotatedFunction(
    {
      functionName: 'transcribeYoutubeVideo',
      domain: AppNamespace.app,
      description:
        'Downloads a YouTube video when needed, then transcribes it with Deepgram.',
      args: transcribeYoutubeVideoArgsSchema,
      returns: transcribeYoutubeVideoResponseSchema,
    },
    ((props: TranscribeYoutubeVideoProps, crossLayerProps) =>
      Promise.resolve()
        .then(async (): Promise<DownloadedMedia> => {
          const appServices = context.services[AppNamespace.app]
          const outputPath =
            props.outputPath ||
            (
              await appServices.createTemporaryDownloadPath(
                {
                  url: props.url,
                },
                crossLayerProps
              )
            ).outputPath
          const existingFilePath = await appServices.resolveExistingFilePath(
            {
              outputPath,
            },
            crossLayerProps
          )

          if (existingFilePath) {
            return {
              filePath: existingFilePath,
              usedExistingFile: true,
              deletedTemporaryFile: false,
            }
          }

          const youtubeResponse = await context.features[
            YoutubeNamespace.ytdlp
          ].downloadVideo(
            {
              url: props.url,
              outputPath,
              audioOnly: props.audioOnly,
              format: props.format,
              extraArgs: props.extraArgs,
              skipAutoInstallLatest: props.skipAutoInstallLatest,
              executablePath: props.executablePath,
              pythonExecutablePath: props.pythonExecutablePath,
              pipxExecutablePath: props.pipxExecutablePath,
            },
            crossLayerProps
          )

          if (isErrorObject(youtubeResponse)) {
            throw new Error(youtubeResponse.error.message)
          }

          const filePath = resolveDownloadFilePath({
            outputPath,
            youtubeFilePath: youtubeResponse.filePath,
          })

          if (!filePath) {
            throw new Error(
              'yt-dlp completed without returning a resolved file path.'
            )
          }

          return {
            filePath,
            usedExistingFile: false,
            deletedTemporaryFile: false,
            youtubeResponse,
          }
        })
        .then(async downloadedMedia => {
          const deepgramResponse = await context.features[
            DeepgramNamespace.node
          ].speechToText(
            {
              filePath: downloadedMedia.filePath,
              mode: props.mode,
              options: props.options,
            },
            crossLayerProps
          )

          if (isErrorObject(deepgramResponse)) {
            throw new Error(deepgramResponse.error.message)
          }

          return {
            transcript: deepgramResponse.transcript,
            filePath: downloadedMedia.filePath,
            usedExistingFile: downloadedMedia.usedExistingFile,
            deletedTemporaryFile: downloadedMedia.deletedTemporaryFile,
            deepgramResponse,
            ...(downloadedMedia.youtubeResponse
              ? {
                  youtubeResponse: downloadedMedia.youtubeResponse,
                }
              : {}),
          }
        })
        .catch(error =>
          createErrorObject(
            'TRANSCRIBE_YOUTUBE_VIDEO_FAILED',
            'Failed to download and transcribe the YouTube media.',
            error
          )
        )) as Parameters<
      typeof annotatedFunction<
        TranscribeYoutubeVideoProps,
        TranscribeYoutubeVideoResponse
      >
    >[1]
  ) as AppFeatures['transcribeYoutubeVideo']

  return {
    transcribeYoutubeVideo,
  }
}

export { create }
