import { SITE_CONTENT } from '@/lib/site-content'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card2/80 px-4 py-4 text-center text-xs text-text sm:text-sm">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-1.5 leading-relaxed">
        <p className="max-w-5xl">
          © {currentYear} {SITE_CONTENT.displayName} · Made by{' '}
          <a
            href={SITE_CONTENT.footer.author.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            {SITE_CONTENT.footer.author.name}
          </a>
          {' '}· Join{' '}
          <a
            href={SITE_CONTENT.footer.community.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            {SITE_CONTENT.footer.community.name}
          </a>
        </p>
        <p className="max-w-5xl text-muted2">
          {SITE_CONTENT.footer.disclaimer}
        </p>
      </div>
    </footer>
  )
}
