import { useEffect } from 'react'
import { APP_NAME } from '../config.ts'

export function formatDocumentTitle(pageName?: string) {
  return pageName ? `${pageName} · ${APP_NAME}` : APP_NAME
}

export function useDocumentTitle(pageName?: string) {
  useEffect(() => {
    document.title = formatDocumentTitle(pageName)
  }, [pageName])
}
