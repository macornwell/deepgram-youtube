import { assert } from 'chai'
import sinon from 'sinon'
import {
  DeepgramAuthenticationType,
  DeepgramNamespace,
  SpeechToTextMode,
} from '@node-in-layers/deepgram'
import { YoutubeNamespace } from '@node-in-layers/youtube'
import { create } from '../../../src/app/features.js'
import { AppNamespace } from '../../../src/types.js'

describe('/src/app/features.ts', () => {
  describe('#transcribeYoutubeVideo()', () => {
    it('should skip youtube download when the output file already exists', async () => {
      const input = {
        resolveExistingFilePath: sinon.stub().resolves('/tmp/already.mp3'),
        createTemporaryDownloadPath: sinon.stub().resolves({
          outputPath: '/tmp/unused-%(ext)s',
        }),
        youtubeDownloadVideo: sinon.stub().resolves({
          stdout: '',
          stderr: '',
          executablePath: 'yt-dlp',
          command: ['yt-dlp'],
          filePath: '/tmp/unused.mp3',
          wasInstallAttempted: true,
          wasUpdated: true,
        }),
        deepgramSpeechToText: sinon.stub().resolves({
          transcript: 'existing transcript',
          mode: SpeechToTextMode.realtime,
          rawResponse: {
            messages: [],
          },
        }),
      }

      const context = {
        services: {
          [AppNamespace.app]: {
            resolveExistingFilePath: input.resolveExistingFilePath,
            createTemporaryDownloadPath: input.createTemporaryDownloadPath,
          },
        },
        features: {
          getFeatures: sinon.stub().callsFake((namespace: string) => {
            return namespace === YoutubeNamespace.ytdlp
              ? {
                  downloadVideo: input.youtubeDownloadVideo,
                }
              : namespace === DeepgramNamespace.node
                ? {
                    speechToText: input.deepgramSpeechToText,
                  }
                : undefined
          }),
        },
        config: {
          [DeepgramNamespace.node]: {
            authentication: {
              type: DeepgramAuthenticationType.apiKey,
              apiKey: 'abc123',
            },
          },
        },
        log: {},
      } as any

      const actual = await create(context).transcribeYoutubeVideo({
        url: 'https://www.youtube.com/watch?v=abc123xyz00',
      })

      const expected = {
        transcript: 'existing transcript',
        filePath: '/tmp/already.mp3',
        usedExistingFile: true,
        deletedTemporaryFile: false,
      }

      assert.equal('error' in actual, false)
      if ('error' in actual) {
        return
      }

      assert.equal(actual.transcript, expected.transcript)
      assert.equal(actual.filePath, expected.filePath)
      assert.equal(actual.usedExistingFile, expected.usedExistingFile)
      assert.equal(actual.deletedTemporaryFile, expected.deletedTemporaryFile)
      assert.equal(input.youtubeDownloadVideo.callCount, 0)
      assert.equal(input.deepgramSpeechToText.callCount, 1)
    })

    it('should download to a deterministic temporary file and keep it for reuse', async () => {
      const input = {
        resolveExistingFilePath: sinon.stub().resolves(undefined),
        createTemporaryDownloadPath: sinon.stub().resolves({
          outputPath: '/tmp/generated-%(ext)s',
        }),
        youtubeDownloadVideo: sinon.stub().resolves({
          stdout: '',
          stderr: '',
          executablePath: 'yt-dlp',
          command: ['yt-dlp'],
          filePath: '/tmp/generated.mp3',
          wasInstallAttempted: true,
          wasUpdated: true,
        }),
        deepgramSpeechToText: sinon.stub().resolves({
          transcript: 'temporary transcript',
          mode: SpeechToTextMode.realtime,
          rawResponse: {
            messages: [],
          },
        }),
      }

      const context = {
        services: {
          [AppNamespace.app]: {
            resolveExistingFilePath: input.resolveExistingFilePath,
            createTemporaryDownloadPath: input.createTemporaryDownloadPath,
          },
        },
        features: {
          getFeatures: sinon.stub().callsFake((namespace: string) => {
            return namespace === YoutubeNamespace.ytdlp
              ? {
                  downloadVideo: input.youtubeDownloadVideo,
                }
              : namespace === DeepgramNamespace.node
                ? {
                    speechToText: input.deepgramSpeechToText,
                  }
                : undefined
          }),
        },
        config: {
          [DeepgramNamespace.node]: {
            authentication: {
              type: DeepgramAuthenticationType.apiKey,
              apiKey: 'abc123',
            },
          },
        },
        log: {},
      } as any

      const actual = await create(context).transcribeYoutubeVideo({
        url: 'https://www.youtube.com/watch?v=abc123xyz00',
      })

      const expected = {
        transcript: 'temporary transcript',
        filePath: '/tmp/generated.mp3',
        usedExistingFile: false,
        deletedTemporaryFile: false,
      }

      assert.equal('error' in actual, false)
      if ('error' in actual) {
        return
      }

      assert.equal(actual.transcript, expected.transcript)
      assert.equal(actual.filePath, expected.filePath)
      assert.equal(actual.usedExistingFile, expected.usedExistingFile)
      assert.equal(actual.deletedTemporaryFile, expected.deletedTemporaryFile)
      assert.equal(input.youtubeDownloadVideo.callCount, 1)
      assert.equal(input.deepgramSpeechToText.callCount, 1)
      assert.equal(input.createTemporaryDownloadPath.callCount, 1)
    })
  })
})
