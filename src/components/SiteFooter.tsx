export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card2/80 px-4 py-4 text-center text-xs text-text sm:text-sm">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-1.5 leading-relaxed">
        <p className="max-w-5xl">
          © {currentYear} Stratónas Leaderboard · Made by{' '}
          <a
            href="https://github.com/AsahiOw"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            Asahi
          </a>{' '}
          · Credit to {' '}
          <a
            href="https://schaledb.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            SchaleDB
          </a>{' '}
          and{' '}
          <a
            href="https://www.youtube.com/@JaymieArclight/videos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            Jaymie
          </a>
          {' '}· Join{' '}
          <a
            href="https://discord.gg/stratonas"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            Stratónas
          </a>
        </p>
        <p className="max-w-5xl text-muted2">
          This is a personal project with no data collecting. Stratónas Leaderboard is not affiliated with Nexon, Nexon Games, or Yostar. All game artwork,
          information, and assets used on this website are the property and copyright of their respective owners.
        </p>
      </div>
    </footer>
  )
}
