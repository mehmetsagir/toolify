declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare const __APP_VERSION__: string

interface Window {
  electron: {
    process: {
      versions: {
        chrome: string
        electron: string
      }
    }
  }
  api: import('../../preload/index').API
}
