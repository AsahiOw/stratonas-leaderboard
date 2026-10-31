# Player identity updates in the browser

There is no automatic Cloudflare purge integration. Existing public API caching
remains enabled, with `s-maxage=60, stale-while-revalidate=300`. Saving still
invalidates the Next.js data cache, but Cloudflare copies expire naturally.
No Cloudflare API token, purge permission, or new Cloudflare rule is required.
Remove unused purge environment variables if you added them for the previous design.

The full `/players/:id` page now loads its content from canonical
`/api/players/:id` in the browser, the same public API used by the player popup.
Its JSON can be served from Cloudflare. The HTML remains a lightweight page
shell; player content is client-rendered and has a loading/error state rather
than requiring a server-side player database lookup before rendering the page.

After a successful IGN or favourite-student save, `/profile` writes a small local
identity snapshot: the authenticated user ID, player ID, saved IGN, student
artwork/portrait/memorial settings, and expiration. Failed saves never write it.
It uses `stratonas:player-identity:v1` in localStorage; no credentials, permissions,
scores, or raid history are stored in this record.

Public player pages, player popups, leaderboard tables/cards and exports, club
rosters/highlights, community listings, statistics player labels, and `/profile`
overlay those saved identity fields for that player before rendering/filtering.
The original API response and all statistics stay unchanged. This adds no
identity-validation network request. Existing requests still load raid history,
scores, club information, and other data needed by each view.

The snapshot lasts up to **six minutes**, covering the existing 60-second shared
TTL plus 300-second stale-while-revalidate allowance. New page/data loads ignore
an expired snapshot and use public data. An already-rendered view retains its
last displayed data until its next load/update, as it did before. It does not
poll the origin or automatically refresh all open views at expiration.

The override is matched to the authenticated user and exact player ID, never
the IGN. It survives reloads and synchronizes between same-origin tabs. Sign-out
clears it; a different account cannot apply it. If storage is unavailable, the
current tab can still update in memory. Another device/browser does not receive
this local override and may see the old identity until CDN data catches up.
The local snapshot only changes display; authorization remains on the server.

Trade-offs: public player content is no longer server-rendered for the initial
HTML, and different visitors/devices can briefly see different identities. This
is intentional under this design. The browser does not replace the entire public
player record or change raid statistics to conceal stale data.

Run `npm run test:player-identity` for account isolation, expiry, immutable data
overlays, nested player displays, and unaffected statistics/other players.
