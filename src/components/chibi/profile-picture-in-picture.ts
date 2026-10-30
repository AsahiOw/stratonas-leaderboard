type PictureInPictureAPI = { requestWindow(options: { width: number; height: number }): Promise<Window> }

export function pictureInPictureAPI(host: Window): PictureInPictureAPI | undefined {
  return (host as Window & { documentPictureInPicture?: PictureInPictureAPI }).documentPictureInPicture
}

// Move the existing canvas, preserving its WebGL context and animation state.
export function moveProfileToPictureInPicture(stage: HTMLElement, pip: Window, name: string, onReturn: () => void) {
  const source = stage.ownerDocument, parent = stage.parentElement!
  const rect = stage.getBoundingClientRect()
  const originalWidth = stage.style.width, originalHeight = stage.style.height
  const placeholder = source.createElement('div')
  placeholder.style.cssText = `height:${rect.height}px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:var(--muted2)`
  placeholder.textContent = 'Your student is in the floating window.'
  stage.before(placeholder)
  for (const sheet of source.styleSheets) {
    try {
      const style = pip.document.createElement('style')
      style.textContent = [...sheet.cssRules].map(rule => rule.cssText).join('\n')
      pip.document.head.append(style)
    } catch {
      if (sheet.href) {
        const link = pip.document.createElement('link')
        link.rel = 'stylesheet'; link.href = sheet.href; pip.document.head.append(link)
      }
    }
  }
  const computed = source.defaultView!.getComputedStyle(stage)
  for (const key of computed) if (key.startsWith('--')) pip.document.body.style.setProperty(key, computed.getPropertyValue(key))
  pip.document.title = `${name} · Stratónas pet`
  Object.assign(pip.document.body.style, { margin: '0', padding: '0', overflow: 'hidden', background: 'var(--bg, #0d0d13)', color: 'var(--text, #e4e4f0)', fontFamily: '"Segoe UI", sans-serif' })
  const header = pip.document.createElement('header')
  header.style.cssText = 'position:relative;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;font-size:12px'
  const title = pip.document.createElement('span'); title.textContent = name
  const close = pip.document.createElement('button'); close.textContent = 'Return to profile'
  close.style.cssText = 'min-height:36px;padding:6px 10px;border:1px solid var(--border2,#32324a);border-radius:8px;background:var(--card,#1a1a26);color:inherit;cursor:pointer'
  close.addEventListener('click', () => pip.close())
  header.append(title, close)
  Object.assign(stage.style, { width: `${rect.width}px`, height: `${rect.height}px` })
  pip.document.body.append(header, stage)
  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    pip.removeEventListener('pagehide', restore)
    placeholder.replaceWith(stage)
    // The parent may have been detached by a route or favourite-student change.
    if (stage.parentElement !== parent) parent.append(stage)
    Object.assign(stage.style, { width: originalWidth, height: originalHeight })
    onReturn()
  }
  pip.addEventListener('pagehide', restore, { once: true })
  return { restore }
}
