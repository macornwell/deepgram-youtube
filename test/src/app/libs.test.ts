import { assert } from 'chai'
import {
  createTemporaryOutputPath,
  createUrlHash,
  hasYtdlpTemplate,
  normalizeYoutubeUrl,
  resolveDownloadFilePath,
  resolveTemplateSearch,
} from '../../../src/app/libs.js'

describe('/src/app/libs.ts', () => {
  describe('#hasYtdlpTemplate()', () => {
    it('should return true when the output path contains yt-dlp tokens', () => {
      const input = {
        outputPath: '/tmp/audio-%(ext)s',
      }

      const actual = hasYtdlpTemplate(input.outputPath)
      const expected = true

      assert.equal(actual, expected)
    })

    it('should return false when the output path is a plain file path', () => {
      const input = {
        outputPath: '/tmp/audio.mp3',
      }

      const actual = hasYtdlpTemplate(input.outputPath)
      const expected = false

      assert.equal(actual, expected)
    })
  })

  describe('#resolveDownloadFilePath()', () => {
    it('should prefer the resolved youtube file path when provided', () => {
      const input = {
        outputPath: '/tmp/audio-%(ext)s',
        youtubeFilePath: '/tmp/audio.mp3',
      }

      const actual = resolveDownloadFilePath(input)
      const expected = '/tmp/audio.mp3'

      assert.equal(actual, expected)
    })

    it('should return the plain output path when no youtube file path is provided', () => {
      const input = {
        outputPath: '/tmp/audio.mp3',
      }

      const actual = resolveDownloadFilePath(input)
      const expected = '/tmp/audio.mp3'

      assert.equal(actual, expected)
    })
  })

  describe('#normalizeYoutubeUrl()', () => {
    it('should normalize youtu.be links to a canonical watch url', () => {
      const input = {
        url: 'https://youtu.be/abc123xyz00?si=test',
      }

      const actual = normalizeYoutubeUrl(input.url)
      const expected = 'https://youtube.com/watch?v=abc123xyz00'

      assert.equal(actual, expected)
    })
  })

  describe('#createUrlHash()', () => {
    it('should return the same hash for equivalent youtube urls', () => {
      const input = {
        left: 'https://youtu.be/abc123xyz00?si=test',
        right: 'https://www.youtube.com/watch?v=abc123xyz00',
      }

      const actual = createUrlHash(input.left)
      const expected = createUrlHash(input.right)

      assert.equal(actual, expected)
    })
  })

  describe('#createTemporaryOutputPath()', () => {
    it('should use the deterministic hash in the temporary output template', () => {
      const input = {
        url: 'https://www.youtube.com/watch?v=abc123xyz00',
      }

      const actual = createTemporaryOutputPath(input.url)

      assert.match(actual, /deepgram-youtube-[0-9a-f-]+\.%\(ext\)s$/u)
    })
  })

  describe('#resolveTemplateSearch()', () => {
    it('should return a file prefix search for template paths', () => {
      const input = {
        outputPath: '/tmp/deepgram-youtube-abc.%(ext)s',
      }

      const actual = resolveTemplateSearch(input.outputPath)
      const expected = {
        directory: '/tmp',
        filePrefix: 'deepgram-youtube-abc.',
      }

      assert.deepEqual(actual, expected)
    })
  })
})
