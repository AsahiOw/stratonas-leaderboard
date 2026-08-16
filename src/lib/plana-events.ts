export const PLANA_NEWS_SUMMARY_EVENT = 'stratonas:plana-news-summary'

export type PlanaNewsSummaryRequest = {
  threadId: string
  title: string
  server: NewsServer
}

export function requestPlanaNewsSummary(request: PlanaNewsSummaryRequest) {
  window.dispatchEvent(new CustomEvent<PlanaNewsSummaryRequest>(PLANA_NEWS_SUMMARY_EVENT, {
    detail: request,
  }))
}
import type { NewsServer } from '@/lib/blue-archive-news'
