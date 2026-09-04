import assert from 'node:assert/strict'
import { isNewsCategory, isNewsServer, NewsUpstreamError, normalizeJpNewsPage, normalizeNewsPage, plainTextFromHtml, previewImageFromContent, previewImagesFromContent, sanitizeOfficialArticleHtml } from './blue-archive-news'

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
assert.equal(isNewsServer('global'), true)
assert.equal(isNewsServer('jp'), true)
assert.equal(isNewsServer('global-x'), false)
assert.equal(isNewsServer('jp-x'), false)
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

console.log('Blue Archive news adapter tests passed.')
