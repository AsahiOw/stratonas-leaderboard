import assert from 'node:assert/strict'
import { buildYoutubePoTokenArgs, MEMORIAL_VIDEO_DOWNLOAD_ARGS, RADIO_AUDIO_DOWNLOAD_ARGS } from './radio-sync-options'

assert.deepEqual(buildYoutubePoTokenArgs('C:\\radio-plugins', 'http://127.0.0.1:4416'), [
  '--plugin-dirs', 'C:\\radio-plugins',
  '--js-runtimes', 'node',
  '--extractor-args', 'youtube:player_client=web_embedded,mweb',
  '--extractor-args', 'youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416',
])

assert.deepEqual(RADIO_AUDIO_DOWNLOAD_ARGS, [
  '-x', '--audio-format', 'm4a', '--audio-quality', '128K',
])

assert.deepEqual(MEMORIAL_VIDEO_DOWNLOAD_ARGS, ['--http-chunk-size', '10M'])

console.log('Radio sync option tests passed.')
