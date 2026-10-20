import { useEffect } from 'react'

export default function usePageMetadata(title, description) {
  useEffect(() => {
    document.title = `${title} | KIM TAE EUN`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
