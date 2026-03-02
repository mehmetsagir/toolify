import { nativeImage, nativeTheme, NativeImage } from 'electron'

const SIZE = 32 // @2x for 16pt display

export type TrayIconState = 'idle' | 'recording' | 'processing' | 'copied' | 'error'

// --- SDF primitives ---

function sdfCapsule(px: number, py: number, cx: number, y1: number, y2: number, r: number): number {
  const cy = Math.max(y1, Math.min(y2, py))
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r
}

// --- Constants ---

const BAR_R = 1.4
const BAR_CX = [6, 11, 16, 21, 26]
const CENTER_Y = 16
const MAX_HALF_H = 13
const MIN_HALF_H = 2
const IDLE_LEVELS = [0.35, 0.6, 1.0, 0.6, 0.35]
const PROCESSING_MIN = 0.12
const PROCESSING_PEAK = 0.6

export const COPIED_COLOR: [number, number, number] = [34, 197, 94] // green
export const ERROR_COLOR: [number, number, number] = [255, 59, 48] // red

// Smoothed bar levels for animation
const smoothLevels = [0, 0, 0, 0, 0]

// Last processing frame levels — captured so the transition can start from here
const lastProcessingLevels = [0.2, 0.2, 0.2, 0.2, 0.2]

// State → bar color
function barColor(state: TrayIconState, isDark: boolean): [number, number, number] {
  switch (state) {
    case 'copied':
      return COPIED_COLOR
    case 'error':
      return ERROR_COLOR
    default:
      return isDark ? [255, 255, 255] : [0, 0, 0]
  }
}

// Template images auto-adapt to light/dark. Recording is also template (white/black bars).
function isTemplateState(state: TrayIconState): boolean {
  return state === 'idle' || state === 'processing' || state === 'recording'
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// --- Rendering ---

type RGB = [number, number, number]

function renderBarsMultiColor(levels: number[], colors: RGB[]): Buffer {
  const buf = Buffer.alloc(SIZE * SIZE * 4, 0)

  function blendPixel(x: number, y: number, sr: number, sg: number, sb: number, sa: number): void {
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || sa <= 0) return
    const i = (y * SIZE + x) * 4
    const srcA = sa / 255
    const dstA = buf[i + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA <= 0) return
    buf[i] = Math.round((sb * srcA + buf[i] * dstA * (1 - srcA)) / outA)
    buf[i + 1] = Math.round((sg * srcA + buf[i + 1] * dstA * (1 - srcA)) / outA)
    buf[i + 2] = Math.round((sr * srcA + buf[i + 2] * dstA * (1 - srcA)) / outA)
    buf[i + 3] = Math.round(outA * 255)
  }

  function drawShape(
    sdfFn: (px: number, py: number) => number,
    r: number,
    g: number,
    b: number
  ): void {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const d = sdfFn(x + 0.5, y + 0.5)
        if (d < 0.7) {
          const alpha = d < -0.3 ? 1.0 : (0.7 - d) / 1.0
          blendPixel(x, y, r, g, b, Math.round(Math.max(0, Math.min(1, alpha)) * 255))
        }
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    const level = Math.max(0, Math.min(1, levels[i] ?? 0))
    const halfH = MIN_HALF_H + level * (MAX_HALF_H - MIN_HALF_H)
    const y1 = CENTER_Y - halfH
    const y2 = CENTER_Y + halfH
    const [r, g, b] = colors[i] ?? colors[0]
    drawShape((px, py) => sdfCapsule(px, py, BAR_CX[i], y1, y2, BAR_R), r, g, b)
  }

  return buf
}

/** Get uniform color array for a state. */
function uniformColors(state: TrayIconState): RGB[] {
  const isDark = nativeTheme.shouldUseDarkColors
  const useTemplate = isTemplateState(state)
  const c: RGB = useTemplate ? [0, 0, 0] : barColor(state, isDark)
  return [c, c, c, c, c]
}

// --- Public API ---

const staticCache = new Map<string, NativeImage>()

/** Pre-warm cache for all states to avoid first-paint lag. */
export function prewarmTrayIconCache(): void {
  const states: TrayIconState[] = ['idle', 'recording', 'processing', 'copied', 'error']
  for (const state of states) {
    createTrayIcon(state)
  }
}

/** Snapshot of where the processing animation bars were when it last ran. */
export function getLastProcessingLevels(): number[] {
  return [...lastProcessingLevels]
}

/** Static tray icon for idle / recording / copied / error states. */
export function createTrayIcon(state: TrayIconState): NativeImage {
  const isDark = nativeTheme.shouldUseDarkColors
  const key = `${state}-${isDark}`

  let img = staticCache.get(key)
  if (img) return img

  const levels = state === 'recording' ? [0.15, 0.15, 0.15, 0.15, 0.15] : IDLE_LEVELS

  const buf = renderBarsMultiColor(levels, uniformColors(state))
  img = nativeImage.createFromBitmap(buf, { width: SIZE, height: SIZE, scaleFactor: 2.0 })

  if (isTemplateState(state)) {
    img.setTemplateImage(true)
  }

  staticCache.set(key, img)
  return img
}

/**
 * Animated processing tray icon — a spotlight sweeps left↔right.
 * The bar closest to the sweep is tallest; others fall off with a gaussian.
 */
export function createProcessingTrayIcon(timeMs: number): NativeImage {
  // Ping-pong sweep across 5 bars: 0→4→0→4…
  const period = 1200 // ms for one full left→right sweep
  const phase = (timeMs % (period * 2)) / period // 0..2
  const sweep = phase < 1 ? phase * 4 : (2 - phase) * 4 // 0→4→0

  const levels: number[] = []
  for (let i = 0; i < 5; i++) {
    const dist = Math.abs(i - sweep)
    // Gaussian falloff — close bars tall, far bars short
    const v = Math.exp(-dist * dist * 0.6)
    levels.push(PROCESSING_MIN + v * (PROCESSING_PEAK - PROCESSING_MIN))
  }

  // Save for transition handoff
  for (let i = 0; i < 5; i++) lastProcessingLevels[i] = levels[i]

  const buf = renderBarsMultiColor(levels, uniformColors('processing'))
  const img = nativeImage.createFromBitmap(buf, { width: SIZE, height: SIZE, scaleFactor: 2.0 })
  img.setTemplateImage(true)
  return img
}

/**
 * Transition frame from a colored state (copied/error) back to idle.
 * Each bar independently eases from fromLevels→IDLE_LEVELS and fromColor→theme,
 * staggered center-out so the center bar settles first, edges last.
 */
export function createIdleTransitionFrame(
  progress: number,
  fromColor: RGB,
  fromLevels: number[]
): NativeImage {
  const isDark = nativeTheme.shouldUseDarkColors
  const targetColor: RGB = isDark ? [255, 255, 255] : [0, 0, 0]

  // Center-out stagger: bar 2 first, bars 1&3 next, bars 0&4 last
  const stagger = [0.5, 0.25, 0, 0.25, 0.5]
  const barDuration = 0.5

  const colors: RGB[] = []
  const levels: number[] = []

  for (let i = 0; i < 5; i++) {
    const barP = Math.max(0, Math.min(1, (progress - stagger[i]) / barDuration))
    const t = easeOutCubic(barP)

    colors.push([
      Math.round(fromColor[0] + (targetColor[0] - fromColor[0]) * t),
      Math.round(fromColor[1] + (targetColor[1] - fromColor[1]) * t),
      Math.round(fromColor[2] + (targetColor[2] - fromColor[2]) * t)
    ])

    const from = fromLevels[i] ?? PROCESSING_MIN
    const target = IDLE_LEVELS[i]
    levels.push(from + (target - from) * t)
  }

  const buf = renderBarsMultiColor(levels, colors)
  const img = nativeImage.createFromBitmap(buf, { width: SIZE, height: SIZE, scaleFactor: 2.0 })
  return img
}

/**
 * Animated recording tray icon from live audio spectrum.
 * Spectrum is resampled → center-out mapping (bass at center, treble at edges).
 */
export function createRecordingTrayIcon(spectrum: number[]): NativeImage {
  let bars: number[]

  if (spectrum.length <= 5) {
    bars = spectrum.slice()
  } else {
    bars = resampleTo5(spectrum)
  }

  // Remap: center-out so bass (loudest) drives center bar, treble drives edges
  const centerOut = [
    (bars[3] + bars[4]) / 2,
    (bars[1] + bars[2]) / 2,
    bars[0],
    (bars[1] + bars[2]) / 2,
    (bars[3] + bars[4]) / 2
  ]

  // Smooth for fluid animation
  for (let i = 0; i < 5; i++) {
    const target = centerOut[i] ?? 0
    smoothLevels[i] += (target - smoothLevels[i]) * 0.35
  }

  const buf = renderBarsMultiColor(smoothLevels, uniformColors('recording'))
  const img = nativeImage.createFromBitmap(buf, { width: SIZE, height: SIZE, scaleFactor: 2.0 })
  img.setTemplateImage(true)
  return img
}

/** Reset smooth levels when recording ends. */
export function resetTrayAnimation(): void {
  for (let i = 0; i < 5; i++) smoothLevels[i] = 0
}

// --- Helpers ---

function resampleTo5(src: number[]): number[] {
  const len = src.length
  const out: number[] = []
  for (let i = 0; i < 5; i++) {
    const start = Math.floor((i / 5) * len)
    const end = Math.floor(((i + 1) / 5) * len)
    let sum = 0
    for (let j = start; j < end; j++) sum += src[j] ?? 0
    out.push(sum / Math.max(1, end - start))
  }
  return out
}

nativeTheme.on('updated', () => {
  staticCache.clear()
})
