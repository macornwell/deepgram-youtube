import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'

const ytdlpTemplatePattern = /%\([^)]+\)s/u
const ytdlpTemplateToken = '%('
const temporaryFilePrefix = 'deepgram-youtube'
const urlNamespace = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
const httpsProtocol = 'https:'
const uuidSegmentOneEnd = 8
const uuidSegmentTwoEnd = 12
const uuidSegmentThreeEnd = 16
const uuidSegmentFourEnd = 20
const uuidSegmentFiveEnd = 32
const hashByteCount = 16
const versionByteIndex = 6
const variantByteIndex = 8
const versionMask = 0x0f
const versionFiveBits = 0x50
const variantMask = 0x3f
const variantRfcBits = 0x80
const trackingQueryKeys = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'feature',
  'si',
  'pp',
]

const hasYtdlpTemplate = (outputPath: string) => {
  return ytdlpTemplatePattern.test(outputPath)
}

const normalizeYoutubeUrl = (rawUrl: string) => {
  const url = new URL(rawUrl)
  const hostname = url.hostname.toLowerCase().replace(/^www\./u, '')
  const pathname = url.pathname.replace(/\/+$/u, '')

  if (hostname === 'youtu.be') {
    const videoId = pathname.replace(/^\//u, '')
    return `https://youtube.com/watch?v=${videoId}`
  }

  if (
    ['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(hostname) &&
    pathname.startsWith('/shorts/')
  ) {
    const videoId = pathname.replace('/shorts/', '')
    return `https://youtube.com/watch?v=${videoId}`
  }

  if (
    ['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(hostname) &&
    pathname === '/watch'
  ) {
    const videoId = url.searchParams.get('v') || ''
    return `https://youtube.com/watch?v=${videoId}`
  }

  const sortedParams = Array.from(url.searchParams.entries())
    .filter(([key]) => trackingQueryKeys.includes(key) === false)
    .sort(([left], [right]) => left.localeCompare(right))

  const query = sortedParams.length
    ? `?${sortedParams
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join('&')}`
    : ''

  return `${httpsProtocol}//${hostname}${pathname}${query}`
}

const uuidToBuffer = (uuid: string) => {
  return Buffer.from(uuid.replace(/-/gu, ''), 'hex')
}

const formatUuid = (buffer: Uint8Array) => {
  const hex = Buffer.from(buffer).toString('hex')
  return [
    hex.slice(0, uuidSegmentOneEnd),
    hex.slice(uuidSegmentOneEnd, uuidSegmentTwoEnd),
    hex.slice(uuidSegmentTwoEnd, uuidSegmentThreeEnd),
    hex.slice(uuidSegmentThreeEnd, uuidSegmentFourEnd),
    hex.slice(uuidSegmentFourEnd, uuidSegmentFiveEnd),
  ].join('-')
}

const createUrlHash = (url: string) => {
  const normalizedUrl = normalizeYoutubeUrl(url)
  const namespace = uuidToBuffer(urlNamespace)
  const hash = createHash('sha1')
    .update(Buffer.concat([namespace, Buffer.from(normalizedUrl, 'utf-8')]))
    .digest()
  const bytes = Uint8Array.from(
    hash.subarray(0, hashByteCount).map((byte, index) => {
      if (index === versionByteIndex) {
        return (byte & versionMask) | versionFiveBits
      }

      if (index === variantByteIndex) {
        return (byte & variantMask) | variantRfcBits
      }

      return byte
    })
  )

  return formatUuid(bytes)
}

const createTemporaryOutputPath = (url: string) => {
  return path.join(
    os.tmpdir(),
    `${temporaryFilePrefix}-${createUrlHash(url)}.%(ext)s`
  )
}

const resolveTemplateSearch = (outputPath: string) => {
  if (!hasYtdlpTemplate(outputPath)) {
    return undefined
  }

  const resolvedPath = path.resolve(outputPath)
  const prefix = resolvedPath.split(ytdlpTemplateToken)[0]

  return {
    directory: path.dirname(prefix),
    filePrefix: path.basename(prefix),
  }
}

const resolveDownloadFilePath = (
  args: Readonly<{
    outputPath: string
    youtubeFilePath?: string
  }>
) => {
  if (args.youtubeFilePath) {
    return args.youtubeFilePath
  }

  if (hasYtdlpTemplate(args.outputPath)) {
    return undefined
  }

  return args.outputPath
}

export {
  createTemporaryOutputPath,
  createUrlHash,
  hasYtdlpTemplate,
  normalizeYoutubeUrl,
  resolveDownloadFilePath,
  resolveTemplateSearch,
}
