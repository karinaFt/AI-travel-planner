import path from 'node:path'
import express, { Router } from 'express'

const IMMUTABLE = 'public, max-age=31536000, immutable'
const NO_CACHE = 'no-cache'

/**
 * Serves the built client from `dir`: its files, and `index.html` for any other GET so app routes such as
 * /trips/:id load directly. Mount it after the /api routes and their 404, so API paths never reach it.
 */
export function clientApp(dir: string) {
  const router = Router()
  const indexHtml = path.join(dir, 'index.html')

  router.use(
    express.static(dir, {
      index: false,
      cacheControl: false,
      // Vite puts content-hashed files in assets/, so they never change; everything else may.
      setHeaders: (res, file) => {
        const inAssets = path.relative(dir, file).split(path.sep)[0] === 'assets'
        res.setHeader('Cache-Control', inAssets ? IMMUTABLE : NO_CACHE)
      },
    }),
  )

  router.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    res.setHeader('Cache-Control', NO_CACHE)
    res.sendFile(indexHtml, { cacheControl: false }, (error) => {
      if (error) next(error)
    })
  })

  return router
}
