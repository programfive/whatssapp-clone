declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  const pdfjs: unknown
  export = pdfjs
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.min.mjs' {
  const workerSrc: string
  export default workerSrc
}
