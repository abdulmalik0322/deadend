import { useEffect } from 'react';

// Sets document.title to "<title> — DEADEND", or the default tagline title.
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} \u2014 DEADEND`
      : 'DEADEND \u2014 Before You Decide, See What Happened.';
  }, [title]);
}
