import SparkleShape from './SparkleShape'

export default function SparkleMark({ className = '', label, href }) {
  const Tag = href ? 'a' : 'span'
  const scrollToSection = (event) => {
    if (!href?.startsWith('#') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const section = document.getElementById(href.slice(1))
    if (!section) return
    event.preventDefault()
    window.history.pushState(null, '', href)
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }
  return (
    <Tag className={`sparkle-mark ${className}`} href={href} onClick={href ? scrollToSection : undefined}>
      <SparkleShape className="sparkle-mark__icon" size={32} />
      {label && <span>{label}</span>}
    </Tag>
  )
}
