export const RADIO_AUDIO_DOWNLOAD_ARGS = ['-x', '--audio-format', 'm4a', '--audio-quality', '128K']

export function buildRadioPoTokenArgs(pluginDir: string, providerUrl: string) {
  return [
    '--plugin-dirs', pluginDir,
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=web_embedded,mweb',
    '--extractor-args', `youtubepot-bgutilhttp:base_url=${providerUrl}`,
  ]
}
