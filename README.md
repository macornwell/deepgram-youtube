# deepgram-youtube

Download YouTube media and transcribe it with Deepgram from a single CLI.

## Install

```bash
npm install -g deepgram-youtube
```

## Requirements

- a Deepgram API key exposed as `DEEPGRAM_API_KEY`
- a machine that can run `yt-dlp`

By default, the YouTube layer will attempt to install or update the latest `yt-dlp` on each run unless you explicitly disable that behavior with `--skip-auto-install-latest`.

## Quick Start

Set your API key:

```bash
export DEEPGRAM_API_KEY="your-deepgram-api-key"
```

Transcribe a YouTube URL and print plain text:

```bash
deepgram-youtube "https://www.youtube.com/watch?v=VIDEO_ID"
```

Save the downloaded media so future runs can skip the download:

```bash
deepgram-youtube \
  "https://www.youtube.com/watch?v=VIDEO_ID" \
  --output-path ./downloads/my-video.mp4
```

Download audio only:

```bash
deepgram-youtube \
  "https://www.youtube.com/watch?v=VIDEO_ID" \
  --audio-only \
  --output-path ./downloads/my-audio.mp3
```

Print the full JSON result:

```bash
deepgram-youtube \
  "https://www.youtube.com/watch?v=VIDEO_ID" \
  --json
```

Pass extra Deepgram options:

```bash
deepgram-youtube \
  "https://www.youtube.com/watch?v=VIDEO_ID" \
  --deepgram-options '{"model":"nova-3","smart_format":true,"punctuate":true}'
```

Use prerecorded mode instead of the default realtime mode:

```bash
deepgram-youtube \
  "https://www.youtube.com/watch?v=VIDEO_ID" \
  --mode prerecorded
```

## How Existing Files Work

If you pass `--output-path` and that file already exists, the tool will skip `yt-dlp` and send the existing file straight to Deepgram.

If you do not pass `--output-path`, the tool downloads to a temporary file, transcribes it, and removes that temporary file afterward.

## Common Options

```text
deepgram-youtube <url>

  -o, --output-path <path>
      Existing or desired download path.

  -a, --audio-only
      Download extracted audio instead of the full media file.

  -f, --format <selector>
      Pass a yt-dlp format selector.

  -x, --extra-arg <arg>
      Pass a raw extra yt-dlp argument. Repeat as needed.

  --skip-auto-install-latest
      Skip the default yt-dlp install/update attempt.

  -e, --executable-path <path>
      Use an explicit yt-dlp executable.

  -p, --python-executable-path <path>
      Use an explicit Python executable for yt-dlp installation flows.

  --pipx-executable-path <path>
      Use an explicit pipx executable.

  -m, --mode <realtime|prerecorded>
      Choose the Deepgram transcription mode.

  -d, --deepgram-options <json>
      Pass a JSON object through to Deepgram speech-to-text.

  -j, --json
      Print the full JSON response instead of only the transcript.

  -l, --log-level <level>
      Set the Node In Layers log level.

  -g, --log-format <format>
      Set the Node In Layers log format.
```

## Notes

- `DEEPGRAM_API_KEY` is required.
- Plain output prints only the transcript text.
- JSON output includes download details, resolved file path, and the full Deepgram response payload returned by the app feature.
