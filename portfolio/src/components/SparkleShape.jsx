import './SparkleShape.scss'

function SparkleShape({
  size = 52,
  color = 'currentColor',
  className = '',
  title,
  ...props
}) {
  const labelProps = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true }

  return (
    <svg
      className={`sparkle-shape ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color, ...props.style }}
      {...labelProps}
      {...props}
    >
      <path
        fill="currentColor"
        d="M23.12 4.55c.98-2.73 4.78-2.73 5.76 0l4.03 11.22a5.2 5.2 0 0 0 3.12 3.12l11.22 4.03c2.73.98 2.73 4.78 0 5.76l-11.22 4.03a5.2 5.2 0 0 0-3.12 3.12l-4.03 11.22c-.98 2.73-4.78 2.73-5.76 0l-4.03-11.22a5.2 5.2 0 0 0-3.12-3.12L4.75 28.68c-2.73-.98-2.73-4.78 0-5.76l11.22-4.03a5.2 5.2 0 0 0 3.12-3.12l4.03-11.22Z"
      />
    </svg>
  )
}

export default SparkleShape
