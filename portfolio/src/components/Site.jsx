import { useCallback, useState } from 'react'
import FloatingNavigation from './FloatingNavigation'
import PageTransition from './PageTransition'
import InitialLoader from './InitialLoader'
import CustomScrollbar from './CustomScrollbar'

export default function Site({ Page, initialLoading }) {
  const [loading, setLoading] = useState(initialLoading)
  const finishLoading = useCallback(() => setLoading(false), [])
  return (
    <>
      <div inert={loading} aria-hidden={loading ? true : undefined} data-site-content="true">
        <Page />
        <FloatingNavigation />
        <PageTransition />
      </div>
      {!loading && <CustomScrollbar />}
      {loading && <InitialLoader onComplete={finishLoading} />}
    </>
  )
}
