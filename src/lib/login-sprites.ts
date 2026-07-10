export type LoginSceneState = 'default' | 'email' | 'password' | 'passwordVisible' | 'failed'
export type LoginCharacter = 'aris' | 'kei' | 'midori' | 'momoi' | 'yuzu'

export const loginExpressions: Record<LoginSceneState, Record<LoginCharacter, string>> = {
  default: {
    yuzu: 'happy',
    momoi: 'happy',
    midori: 'happy',
    aris: 'laugh',
    kei: 'smile',
  },
  email: {
    yuzu: 'curious',
    momoi: 'smile',
    midori: 'default',
    aris: 'happy',
    kei: 'lookaway',
  },
  password: {
    yuzu: 'serious',
    momoi: 'curious',
    midori: 'surprise',
    aris: 'serious',
    kei: 'cautious',
  },
  passwordVisible: {
    yuzu: 'eyeclose',
    momoi: 'eyeclose',
    midori: 'eyeclose',
    aris: 'eyeclose',
    kei: 'veryshy',
  },
  failed: {
    yuzu: 'scare',
    momoi: 'scare',
    midori: 'scare',
    aris: 'scare',
    kei: 'disappoint',
  },
}

export function loginSprite(character: LoginCharacter, expression: string) {
  return `/assets/images/sprite/${character}/${expression}.png`
}

export const loginSpriteSources = Array.from(
  new Set(
    [
      ...Object.values(loginExpressions).flatMap((state) =>
        Object.entries(state).map(([character, expression]) => loginSprite(character as LoginCharacter, expression))
      ),
      loginSprite('kei', 'angry'),
    ]
  )
)

export const loginAssetSources = [...loginSpriteSources, '/assets/images/angry-effect.png']
export const loginAudioSources = ['/assets/sfx/SFX_Emoticon_Motion_Steam.wav']
