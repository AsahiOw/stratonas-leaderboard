import * as THREE from 'three'

const skies = [
  { hour: 0, top: '#101b3c', horizon: '#293b63', bottom: '#506084', night: 1 },
  { hour: 5, top: '#34436e', horizon: '#8b8fae', bottom: '#d6bdb8', night: 0.8 },
  { hour: 6.5, top: '#a394bd', horizon: '#f3b9a2', bottom: '#ffe4c4', night: 0.2 },
  { hour: 8, top: '#7eb9de', horizon: '#c9e8f3', bottom: '#edf6f8', night: 0 },
  { hour: 16, top: '#8bbada', horizon: '#d5e7ee', bottom: '#f3eee3', night: 0 },
  { hour: 18, top: '#706396', horizon: '#eead94', bottom: '#f6d5ad', night: 0.15 },
  { hour: 20, top: '#19264d', horizon: '#4b507b', bottom: '#77738e', night: 1 },
  { hour: 24, top: '#101b3c', horizon: '#293b63', bottom: '#506084', night: 1 },
]

function blend(a: string, b: string, amount: number) {
  const start = parseInt(a.slice(1), 16), end = parseInt(b.slice(1), 16)
  return `#${[16, 8, 0].map(shift => Math.round(((start >> shift) & 255) * (1 - amount) + ((end >> shift) & 255) * amount).toString(16).padStart(2, '0')).join('')}`
}

export function playgroundTimeOfDay(date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  const index = skies.findIndex(sky => sky.hour > hour), before = skies[index - 1], after = skies[index]
  const amount = (hour - before.hour) / (after.hour - before.hour)
  return {
    hour, period: hour >= 5 && hour < 8 ? 'Dawn' : hour >= 8 && hour < 17 ? 'Daytime' : hour >= 17 && hour < 20 ? 'Sunset' : 'Night',
    top: blend(before.top, after.top, amount), horizon: blend(before.horizon, after.horizon, amount), bottom: blend(before.bottom, after.bottom, amount),
    night: before.night * (1 - amount) + after.night * amount,
  }
}

export function createPlaygroundSky(scene: THREE.Scene, ambient: THREE.HemisphereLight, sunlight: THREE.DirectionalLight) {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d')!
  let texture = new THREE.CanvasTexture(canvas)
  const configureTexture = () => { texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; scene.background = texture }
  configureTexture()
  let minute = -1
  function update(date: Date) {
    const nextMinute = date.getHours() * 60 + date.getMinutes()
    if (nextMinute === minute) return
    minute = nextMinute
    const sky = playgroundTimeOfDay(date), width = canvas.width, height = canvas.height, small = Math.min(width, height)
    const gradient = context.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, sky.top); gradient.addColorStop(0.65, sky.horizon); gradient.addColorStop(1, sky.bottom)
    context.globalAlpha = 1; context.fillStyle = gradient; context.fillRect(0, 0, width, height)
    const seeded = (index: number) => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
    context.fillStyle = '#f0f5ff'; context.globalAlpha = sky.night * 0.85
    for (let i = 0; i < 80; i++) {
      const x = seeded(i + 1) * width, y = seeded(i + 91) * height * 0.76, radius = 0.6 + seeded(i + 181) * 1.1
      context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill()
      if (i % 13 === 0) { context.fillRect(x - 3, y - 0.4, 6, 0.8); context.fillRect(x - 0.4, y - 3, 0.8, 6) }
    }
    function celestial(x: number, y: number, moon: boolean, opacity: number) {
      const radius = small * (moon ? 0.029 : 0.032), color = moon ? '#d7e6ff' : '#ffde99'
      const glow = context.createRadialGradient(x, y, radius * 0.5, x, y, radius * 5)
      glow.addColorStop(0, moon ? '#c4d8ff55' : '#ffd79677'); glow.addColorStop(1, '#ffffff00')
      context.globalAlpha = opacity; context.fillStyle = glow; context.fillRect(x - radius * 5, y - radius * 5, radius * 10, radius * 10)
      context.fillStyle = color; context.beginPath()
      if (moon) { context.arc(x, y, radius, Math.PI / 2, Math.PI * 1.5); context.bezierCurveTo(x - radius * 0.15, y - radius * 0.6, x - radius * 0.15, y + radius * 0.6, x, y + radius) }
      else context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }
    const dayProgress = THREE.MathUtils.clamp((sky.hour - 5) / 15, 0, 1), nightProgress = THREE.MathUtils.clamp((sky.hour >= 12 ? sky.hour - 20 : sky.hour + 4) / 10, 0, 1)
    const skyTop = height > width ? 0.34 : 0.3, skyArc = height > width ? 0.12 : 0.17
    celestial(width * (0.12 + dayProgress * 0.76), height * (skyTop - Math.sin(dayProgress * Math.PI) * skyArc), false, 1 - sky.night)
    celestial(width * (0.85 - nightProgress * 0.7), height * (skyTop - Math.sin(nightProgress * Math.PI) * skyArc), true, sky.night)
    context.fillStyle = blend('#ffffff', '#9aabd3', sky.night); context.globalAlpha = 0.3 - sky.night * 0.24
    for (let i = 0; i < 7; i++) {
      const x = width * seeded(i + 261), y = height * (0.16 + seeded(i + 281) * 0.46), size = small * (0.035 + seeded(i + 301) * 0.035)
      context.beginPath()
      for (let puff = 0; puff < 4; puff++) { context.moveTo(x + puff * size * 0.7 + size, y); context.ellipse(x + puff * size * 0.7, y, size, size * (puff === 1 ? 0.48 : 0.33), 0, 0, Math.PI * 2) }
      context.fill()
    }
    context.globalAlpha = 1; texture.needsUpdate = true
    ambient.color.set(blend('#f5faff', '#b7c9f0', sky.night)); ambient.groundColor.set(blend('#8aa2bb', '#677292', sky.night)); ambient.intensity = 1.8 - sky.night * 0.5
    sunlight.color.set(blend(sky.bottom, '#bacbff', sky.night)); sunlight.intensity = 1.8 - sky.night * 1.2
  }
  return {
    update,
    resize(width: number, height: number) {
      const scale = Math.min(1, 1024 / Math.max(width, height))
      const nextWidth = Math.max(1, Math.round(width * scale)), nextHeight = Math.max(1, Math.round(height * scale))
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) { texture.dispose(); canvas.width = nextWidth; canvas.height = nextHeight; texture = new THREE.CanvasTexture(canvas); configureTexture() }
      minute = -1; update(new Date())
    },
    dispose() { if (scene.background === texture) scene.background = null; texture.dispose() },
  }
}
