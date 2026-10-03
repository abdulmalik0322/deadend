import { useEffect } from 'react';

const DEFAULT_TITLE = 'DEADEND \u2014 Before You Decide, See What Happened.';
// Idempotent: strip any trailing brand suffix before appending ours, so
// pages that pass "Page \u2014 DEADEND" don't end up with "Page \u2014 DEADEND \u2014 DEADEND".
const TRAILING_BRAND_RE = /\s*[—|–\-·]\s*DEADEND\s*$/i;

export default function useDocumentTitle(title) {
  useEffect(() => {
    const clean = (title || '').replace(TRAILING_BRAND_RE, '').trim();
    document.title =
      clean && !/^DEADEND\b/i.test(clean)
        ? `${clean} \u2014 DEADEND`
        : DEFAULT_TITLE;
  }, [title]);
}
