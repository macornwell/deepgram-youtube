import {
  jsonObjSchema,
  LayerFunction,
  NilAnnotatedFunction,
} from '@node-in-layers/core'
import {
  SpeechToTextMode,
  speechToTextResponseSchema,
} from '@node-in-layers/deepgram'
import {
  downloadVideoResponseSchema,
  DownloadVideoResponse,
} from '@node-in-layers/youtube'
import { z } from 'zod'
import { AppNamespace, SystemConfig } from '../types.js'

export const transcribeYoutubeVideoArgsSchema = z.object({
  url: z.string().url(),
  outputPath: z.string().optional(),
  audioOnly: z.boolean().optional(),
  format: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  skipAutoInstallLatest: z.boolean().optional(),
  executablePath: z.string().optional(),
  pythonExecutablePath: z.string().optional(),
  pipxExecutablePath: z.string().optional(),
  mode: z.enum(SpeechToTextMode).optional(),
  options: jsonObjSchema.optional(),
})

export type TranscribeYoutubeVideoProps = Readonly<
  z.infer<typeof transcribeYoutubeVideoArgsSchema>
>

export const transcribeYoutubeVideoResponseSchema = z.object({
  transcript: z.string(),
  filePath: z.string(),
  usedExistingFile: z.boolean(),
  deletedTemporaryFile: z.boolean(),
  deepgramResponse: speechToTextResponseSchema,
  youtubeResponse: downloadVideoResponseSchema.optional(),
})

export type TranscribeYoutubeVideoResponse = Readonly<
  z.infer<typeof transcribeYoutubeVideoResponseSchema>
>

export type ResolveExistingFilePathArgs = Readonly<{
  outputPath?: string
}>

export type CreateTemporaryDownloadPathResponse = Readonly<{
  outputPath: string
}>

export type CreateTemporaryDownloadPathArgs = Readonly<{
  url: string
}>

export type DownloadedMedia = Readonly<{
  filePath: string
  usedExistingFile: boolean
  deletedTemporaryFile: boolean
  youtubeResponse?: DownloadVideoResponse
}>

export type AppServices = Readonly<{
  resolveExistingFilePath: LayerFunction<
    (args: ResolveExistingFilePathArgs) => Promise<string | undefined>
  >
  createTemporaryDownloadPath: LayerFunction<
    (
      args: CreateTemporaryDownloadPathArgs
    ) => Promise<CreateTemporaryDownloadPathResponse>
  >
}>

export type AppServicesLayer = Readonly<{
  [AppNamespace.app]: AppServices
}>

export type AppFeatures = Readonly<{
  transcribeYoutubeVideo: NilAnnotatedFunction<
    TranscribeYoutubeVideoProps,
    TranscribeYoutubeVideoResponse
  >
}>

export type AppFeaturesLayer = Readonly<{
  [AppNamespace.app]: AppFeatures
}>

export type AppConfig = SystemConfig
