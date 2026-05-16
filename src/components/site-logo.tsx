type SiteLogoProps = {
  className?: string
  /** Use when visible text like «IceStock» is next to the mark (decorative image). */
  decorative?: boolean
}

export function SiteLogo({ className, decorative }: SiteLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={decorative ? '' : 'IceStock'}
      className={className}
      loading="eager"
      decoding="async"
      {...(decorative ? { 'aria-hidden': true as const } : {})}
    />
  )
}
