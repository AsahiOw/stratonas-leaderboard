export const RADIO_AUDIO_DOWNLOAD_ARGS = ['-x', '--audio-format', 'm4a', '--audio-quality', '128K']
export const MEMORIAL_VIDEO_DOWNLOAD_ARGS = ['--http-chunk-size', '10M']

export function buildYoutubePoTokenArgs(pluginDir: string, providerUrl: string) {
  return [
    '--plugin-dirs', pluginDir,
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=web_embedded,mweb',
    '--extractor-args', `youtubepot-bgutilhttp:base_url=${providerUrl}`,
  ]
}
