import { Config } from '@node-in-layers/core'
import { DeepgramConfig } from '@node-in-layers/deepgram'
import { YtdlpConfig } from '@node-in-layers/youtube'

export enum AppNamespace {
  app = 'deepgram-youtube',
}

export type SystemConfig = Config &
  DeepgramConfig &
  YtdlpConfig &
  Readonly<object>
