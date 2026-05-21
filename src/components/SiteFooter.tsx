export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card2/80 px-4 py-6 text-center text-xs sm:text-sm text-text">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2 leading-relaxed">
        <p>
          © {currentYear} Stratonas Leaderboard · Made by{' '}
          <a
            href="https://github.com/AsahiOw"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent transition-colors hover:text-text"
          >
            Asahi
          </a>
        </p>
        <p className="max-w-5xl text-muted2">
          This is a personal project with no data collecting. Stratonas Leaderboard is not affiliated with Nexon, Nexon Games, or Yostar. All game artwork,
          information, and assets used on this website are the property and copyright of their respective owners.
        </p>
      </div>
    </footer>
  )
}