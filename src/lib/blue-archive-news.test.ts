import assert from 'node:assert/strict'
import { isNewsCategory, NewsUpstreamError, normalizeJpNewsPage, normalizeNewsPage, plainTextFromHtml, previewImageFromContent, previewImagesFromContent, sanitizeOfficialArticleHtml } from './blue-archive-news'
import { parseNitterRss, parseSyndicationTimeline, syndicationToken } from './x-news'

const rawPage = {
  threads: [
    {
      threadId: '20', boardId: '3218', title: ' Event ', createDate: 200,
      thumbnailImageUrl: 'https://dszw1qtcnsa5e.cloudfront.net/community/event.jpg', release: 'ON',
    },
    { threadId: '10', boardId: '3028', title: 'Announcement', createDate: 100, release: 'ON' },
    { threadId: '20', boardId: '3218', title: 'Duplicate', createDate: 50, release: 'ON' },
    { threadId: '30', boardId: '9999', title: 'Unknown board', createDate: 300, release: 'ON' },
    { threadId: '40', boardId: '3217', title: 'Hidden', createDate: 400, release: 'ON', isWebHide: true },
    { threadId: '50', boardId: '3217', title: 'Bad image', createDate: 500, release: 'ON', thumbnailImageUrl: 'https://example.com/image.jpg' },
  ],
  totalPages: 3,
}

const result = normalizeNewsPage(rawPage, 1)
assert.deepEqual(result.posts.map((post) => post.id), ['50', '20', '10'])
assert.equal(result.posts[0].thumbnailUrl, null)
assert.equal(result.posts[1].thumbnailUrl, 'https://dszw1qtcnsa5e.cloudfront.net/community/event.jpg')
assert.equal(result.posts[1].category, 'Events')
assert.equal(result.posts[1].url, 'https://forum.nexon.com/bluearchive-en/board_view?board=3218&thread=20')
assert.equal(result.posts[1].summary, null)
assert.deepEqual(result.posts[1].mediaUrls, [])
assert.equal(result.posts[1].authorName, 'GM-Arona')
assert.equal(result.hasMore, true)
assert.equal(normalizeNewsPage({ threads: [], totalPages: 1 }, 1).hasMore, false)
assert.equal(isNewsCategory('all'), true)
assert.equal(isNewsCategory('Known Issues'), true)
assert.equal(isNewsCategory('Unofficial'), false)
assert.equal(isNewsCategory('メンテナンス', 'jp'), true)
assert.equal(isNewsCategory('Updates', 'jp'), false)
assert.throws(() => normalizeNewsPage({}, 1), NewsUpstreamError)
assert.equal(
  previewImageFromContent('<p><img src="https://dszw1qtcnsa5e.cloudfront.net/header.jpg"><img src="https://dszw1qtcnsa5e.cloudfront.net/preview.jpg"></p>'),
  'https://dszw1qtcnsa5e.cloudfront.net/preview.jpg'
)
assert.equal(previewImageFromContent('<img src="https://example.com/not-allowed.jpg">'), null)
assert.deepEqual(
  previewImagesFromContent('<img src="https://dszw1qtcnsa5e.cloudfront.net/header.jpg"><img src="https://dszw1qtcnsa5e.cloudfront.net/one.jpg"><img src="https://dszw1qtcnsa5e.cloudfront.net/two.jpg"><img src="https://dszw1qtcnsa5e.cloudfront.net/one.jpg">'),
  ['https://dszw1qtcnsa5e.cloudfront.net/one.jpg', 'https://dszw1qtcnsa5e.cloudfront.net/two.jpg']
)
assert.equal(
  plainTextFromHtml('<style>hidden style</style><p>Visible &amp; safe</p><script>hidden script</script>', 100),
  'Visible & safe'
)
assert.equal(plainTextFromHtml('<p>123456789</p>', 6), '12345…')
const safeArticleHtml = sanitizeOfficialArticleHtml('<script>alert(1)</script><h2>Schedule</h2><table><tr><th>Date</th><td>8/4</td></tr></table><img src="https://dszw1qtcnsa5e.cloudfront.net/post.jpg" onerror="alert(1)"><iframe src="https://example.com"></iframe>', 'global')
assert.doesNotMatch(safeArticleHtml, /script|iframe|onerror/)
assert.match(safeArticleHtml, /<h2>Schedule<\/h2>/)
assert.match(safeArticleHtml, /<table>/)
assert.match(safeArticleHtml, /\/api\/image-proxy\?url=/)

const jpResult = normalizeJpNewsPage({
  meta: { ok: true },
  data: {
    rows: [{
      id: 682,
      title: 'お知らせ',
      summary: 'キャリア決済キャンペーン開催！',
      content: '<p>公式キャンペーンです。</p><img src="https://webusstatic.yo-star.com/bluearchive_jp_web/mainsite/upload/news/example.png"><img src="https://example.com/bad.png">',
      typeId: 2,
      publishTime: 1785383700000,
    }],
    count: 13,
  },
}, 1, 12)
assert.equal(jpResult.server, 'jp')
assert.equal(jpResult.posts[0].server, 'jp')
assert.equal(jpResult.posts[0].title, 'キャリア決済キャンペーン開催！')
assert.equal(jpResult.posts[0].category, 'お知らせ')
assert.equal(jpResult.posts[0].url, 'https://bluearchive.jp/news/newsJump/682')
assert.deepEqual(jpResult.posts[0].mediaUrls, ['https://webusstatic.yo-star.com/bluearchive_jp_web/mainsite/upload/news/example.png'])
assert.equal(jpResult.hasMore, true)

const syndication = parseSyndicationTimeline(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { timeline: { entries: [
  { type: 'tweet', content: { tweet: { id_str: '2084000000000000001', full_text: 'Official &amp; new\npost', permalink: '/EN_BlueArchive/status/2084000000000000001', created_at: 'Tue Aug 04 03:02:08 +0000 2026', extended_entities: { media: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/test.jpg', expanded_url: 'https://x.com/EN_BlueArchive/status/2084000000000000001/photo/1' }] } } } },
  { type: 'tweet', content: { tweet: { id_str: '2084000000000000002', full_text: 'Reply', permalink: '/EN_BlueArchive/status/2084000000000000002', created_at: 'Tue Aug 04 03:02:08 +0000 2026', in_reply_to_status_id_str: '1' } } },
] } } } })}</script>`, 'EN_BlueArchive')
assert.equal(syndication.length, 1)
assert.equal(syndication[0].text, 'Official & new\npost')
assert.equal(syndication[0].media[0].type, 'photo')

const syndicationVideo = parseSyndicationTimeline(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { timeline: { entries: [{ type: 'tweet', content: { tweet: { id_str: '2084000000000000007', full_text: 'Video', permalink: '/EN_BlueArchive/status/2084000000000000007', created_at: 'Tue Aug 04 03:02:08 +0000 2026', extended_entities: { media: [{ type: 'video', media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/example.jpg', expanded_url: 'https://x.com/EN_BlueArchive/status/2084000000000000007/video/1', video_info: { variants: [{ bitrate: 256000, content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/low.mp4' }, { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/high.mp4' }] } }] } } } }] } } } })}</script>`, 'EN_BlueArchive')
assert.equal(syndicationVideo[0].media[0].videoUrl, 'https://video.twimg.com/amplify_video/high.mp4')

const nitter = parseNitterRss('<rss><channel><item><title><![CDATA[Maintenance notice]]></title><description><![CDATA[<p>Details &amp; dates</p><img src="https://nitter.example/pic/media%2Fexample.jpg">]]></description><link>https://nitter.example/Blue_ArchiveJP/status/2084000000000000003</link><pubDate>Tue, 04 Aug 2026 03:02:08 GMT</pubDate></item></channel></rss>', 'Blue_ArchiveJP')
assert.equal(nitter.length, 1)
assert.equal(nitter[0].url, 'https://x.com/Blue_ArchiveJP/status/2084000000000000003')
assert.equal(nitter[0].media[0].url, 'https://pbs.twimg.com/media/example.jpg')

const nitterCard = parseNitterRss('<rss><channel><item><title>Video post</title><description><![CDATA[<p>Watch this</p><div>Link<br>Official video<br>youtube.com<a href="https://youtube.com/shorts/example">Open</a><img src="https://nitter.example/pic/media%2Fcard.jpg"></div>]]></description><link>https://nitter.example/Blue_ArchiveJP/status/2084000000000000004</link><pubDate>Tue, 04 Aug 2026 03:02:08 GMT</pubDate></item></channel></rss>', 'Blue_ArchiveJP')
assert.equal(nitterCard[0].linkPreview?.url, 'https://youtube.com/shorts/example')
assert.equal(nitterCard[0].linkPreview?.imageUrl, 'https://pbs.twimg.com/media/card.jpg')

const websiteCard = parseNitterRss('<rss><channel><item><title>Website post</title><description><![CDATA[Link<br>Details here<br>bluearchive.jp<a href="https://5thanniv-vrplus.bluearchive.jp/">Open</a>]]></description><link>https://nitter.example/Blue_ArchiveJP/status/2084000000000000005</link><pubDate>Tue, 04 Aug 2026 03:02:08 GMT</pubDate></item></channel></rss>', 'Blue_ArchiveJP')
assert.equal(websiteCard[0].linkPreview?.url, 'https://5thanniv-vrplus.bluearchive.jp/')

const proxiedYoutubeCard = parseNitterRss('<rss><channel><item><title>Video post</title><description><![CDATA[<p>Post text</p><hr><b>Link</b><br><a href="https://piped.video/shorts/example"><img src="https://nitter.example/pic/pbs.twimg.com%2Fmedia%2Fyoutube-card.jpg"></a><p>Official video</p><small><a href="https://piped.video/shorts/example">youtube.com</a></small>]]></description><link>https://nitter.example/Blue_ArchiveJP/status/2084000000000000006</link><pubDate>Tue, 04 Aug 2026 03:02:08 GMT</pubDate></item></channel></rss>', 'Blue_ArchiveJP')
assert.equal(proxiedYoutubeCard[0].linkPreview?.url, 'https://youtube.com/shorts/example')
assert.equal(proxiedYoutubeCard[0].linkPreview?.imageUrl, 'https://pbs.twimg.com/media/youtube-card.jpg')
assert.deepEqual(proxiedYoutubeCard[0].media, [])

const nitterGif = parseNitterRss('<rss><channel><item><title>GIF post</title><description><![CDATA[<p>Animated post</p><img src="https://nitter.example/pic/tweet_video_thumb%2Fexample_gif.jpg">]]></description><link>https://nitter.example/Blue_ArchiveJP/status/2084000000000000008</link><pubDate>Tue, 04 Aug 2026 03:02:08 GMT</pubDate></item></channel></rss>', 'Blue_ArchiveJP')
assert.equal(nitterGif[0].media[0].videoUrl, 'https://video.twimg.com/tweet_video/example_gif.mp4')
assert.equal(syndicationToken('2082753493308465476'), '51r5vcde2wg')

console.log('Blue Archive news adapter tests passed.')
