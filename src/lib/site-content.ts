export type CreditGroupId = 'site' | 'kei'

export interface SiteCredit {
  label: string
  detail: string
  href: string
  group: CreditGroupId
  initial: string
}

export interface SiteCreditGroup {
  id: CreditGroupId
  title: string
  description: string
}

export type PublicSiteIndexKind = 'overview' | 'footer' | 'page' | 'credit' | 'control' | 'metric'

export interface PublicSiteIndexRecord {
  kind: PublicSiteIndexKind
  title: string
  detail: string
  href?: string
  group?: string
  keywords?: readonly string[]
}

export const SITE_CONTENT = {
  name: 'Stratonas Leaderboard',
  displayName: 'Stratónas Leaderboard',
  purpose: 'Public leaderboard and community hub for Stratonas guild raid rankings.',
  homeIntro: {
    eyebrow: 'Glad you are here',
    title: 'Welcome to Stratónas Leaderboard.',
    body: 'This is the community home for raid results, player highlights, club pages, and season history. Start with the latest boards, or wander through the archive at your own pace.',
    features: [
      {
        label: 'Latest rankings',
        text: 'See the most recent raid submission from Stratónas discord server.',
      },
      {
        label: 'Top 50 cards',
        text: 'Top 50 stratonas local ranking and their respective student representative.',
      },
      {
        label: 'Profiles and clubs',
        text: 'Check out player profile and club.',
      },
    ],
  },
  footer: {
    author: {
      name: 'Asahi',
      label: 'Made by Asahi',
      href: 'https://github.com/AsahiOw',
    },
    community: {
      name: 'Stratónas',
      href: 'https://discord.gg/stratonas',
    },
    disclaimer: 'This is a personal project with no data collecting. Stratónas Leaderboard is not affiliated with Nexon, Nexon Games, or Yostar. All game artwork, information, and assets used on this website are the property and copyright of their respective owners.',
  },
  pages: [
    { name: 'Leaderboard', use: 'Current active raid rankings and future recruitment.' },
    { name: 'History', use: 'Archived raid rankings.' },
    { name: 'Statistic', use: 'Season overview, top players, club standings, and raid breakdowns.' },
    { name: 'Community', use: 'Club and player community summaries.' },
    { name: 'Player profiles', use: 'Individual player raid history, ranks, scores, club, and favorite student.' },
    { name: 'Club profiles', use: 'Club roster and aggregate raid performance.' },
  ],
  controls: [
    { name: 'Server filter', use: 'Leaderboard and History can be filtered by All, Global, or JP server.' },
    { name: 'Welcome', use: 'The Welcome button opens or hides the home introduction.' },
    { name: 'Settings', use: 'Settings control Kei greeting toast, Kei greeting volume, and voice preview.' },
    { name: 'Credit', use: 'Credit opens the creators and projects used by the site.' },
    { name: 'Admin Login', use: 'Admin Login opens the protected admin sign-in flow.' },
    { name: 'View Card Rankings', use: 'History raid blocks link to Top 50 card rankings for completed raids.' },
    { name: 'Download raid cards', use: 'Raid card ranking pages can download all, selected, or custom raid cards.' },
    { name: 'Player profile', use: 'Click a player to view their profile, raid history, ranks, scores, club, and favorite student.' },
    { name: 'Birthday section', use: 'The home page shows today and upcoming Blue Archive student birthdays.' },
    { name: 'Future recruitment', use: 'The home page shows future recruitment banners when a schedule is available.' },
  ],
  metrics: [
    { name: 'Total score', use: 'Combined score across all recorded raid entries for a player or club.' },
    { name: 'Entries', use: 'The number of raid submissions or recorded raid appearances.' },
    { name: 'Average score', use: 'Average raid score across recorded entries.' },
    { name: 'Best rank', use: 'The best, lowest-numbered raid rank a player or club has achieved.' },
    { name: 'Podiums', use: 'Finishes at rank 1, 2, or 3.' },
    { name: 'Top 10 finishes', use: 'How many recorded entries finished in the top 10.' },
    { name: 'Top 50 finishes', use: 'How many recorded entries finished in the top 50.' },
    { name: 'Participation rate', use: 'A player journey percentage summarizing participation across tracked raids.' },
    { name: 'Raid average score', use: 'Average score for all entries on a raid board.' },
    { name: 'Unique clubs', use: 'How many clubs appear in a raid board.' },
    { name: 'Top player', use: 'The highest scoring player shown for a raid board.' },
  ],
  creditIntro: 'Stratónas Leaderboard is built with help from these creators and projects.',
  creditGroups: [
    { id: 'site', title: 'Leaderboard', description: 'Data and community resources that power the site.' },
    { id: 'kei', title: 'Kei greeting', description: 'Animation and voice that bring her welcome to life.' },
  ] satisfies SiteCreditGroup[],
  credits: [
    { label: 'SchaleDB', detail: 'Game data & assets', href: 'https://schaledb.com/home', group: 'site', initial: 'S' },
    { label: 'Jaymie', detail: 'L2D Animation', href: 'https://www.youtube.com/@JaymieArclight/videos', group: 'site', initial: 'J' },
    { label: '@MiiverseI', detail: 'Kei animation', href: 'https://x.com/MiiverseI', group: 'kei', initial: 'M' },
    { label: '@myuton0407', detail: 'Kei avatar', href: 'https://x.com/myuton0407', group: 'kei', initial: 'm' },
    { label: 'Fish Audio', detail: 'Kei voice', href: 'https://fish.audio/app/', group: 'kei', initial: 'F' },
  ] satisfies SiteCredit[],
} as const

export function getPublicSiteIndex(): PublicSiteIndexRecord[] {
  return [
    {
      kind: 'overview',
      title: SITE_CONTENT.homeIntro.title,
      detail: [
        SITE_CONTENT.purpose,
        SITE_CONTENT.homeIntro.eyebrow,
        SITE_CONTENT.homeIntro.body,
        ...SITE_CONTENT.homeIntro.features.flatMap((feature) => [feature.label, feature.text]),
      ].join(' '),
      keywords: ['home', 'welcome', 'about', 'purpose', 'latest rankings', 'top 50', 'profiles', 'clubs'],
    },
    {
      kind: 'footer',
      title: SITE_CONTENT.footer.author.label,
      detail: `Website author: ${SITE_CONTENT.footer.author.name}`,
      href: SITE_CONTENT.footer.author.href,
      keywords: ['author', 'creator', 'developer', 'made by', 'website', 'site', 'footer'],
    },
    {
      kind: 'footer',
      title: `Join ${SITE_CONTENT.footer.community.name}`,
      detail: 'Official Stratónas community invite linked in the footer.',
      href: SITE_CONTENT.footer.community.href,
      keywords: ['discord', 'community', 'invite', 'join', 'footer'],
    },
    {
      kind: 'footer',
      title: 'Disclaimer',
      detail: SITE_CONTENT.footer.disclaimer,
      keywords: ['disclaimer', 'affiliated', 'copyright', 'artwork', 'game assets', 'nexon', 'yostar'],
    },
    ...SITE_CONTENT.pages.map((page) => ({
      kind: 'page' as const,
      title: page.name,
      detail: page.use,
      keywords: [page.name, page.use],
    })),
    ...SITE_CONTENT.controls.map((control) => ({
      kind: 'control' as const,
      title: control.name,
      detail: control.use,
      keywords: [control.name, control.use, 'button control navigation ui interface menu'],
    })),
    ...SITE_CONTENT.metrics.map((metric) => ({
      kind: 'metric' as const,
      title: metric.name,
      detail: metric.use,
      keywords: [metric.name, metric.use, 'metric meaning definition stats statistic explain'],
    })),
    ...SITE_CONTENT.credits.map((credit) => {
      const group = SITE_CONTENT.creditGroups.find((row) => row.id === credit.group)
      return {
        kind: 'credit' as const,
        title: credit.label,
        detail: credit.detail,
        href: credit.href,
        group: group?.title || credit.group,
        keywords: [
          'credit',
          'credits',
          'artist',
          'creator',
          'source',
          'attribution',
          credit.label,
          credit.detail,
          group?.title || credit.group,
          group?.description || '',
        ],
      }
    }),
  ]
}
