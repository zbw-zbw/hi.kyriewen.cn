'use client';

import { useEffect } from 'react';

/**
 * 根布局级错误兜底 — 当 [locale]/layout.tsx 本身报错时触发。
 * 因为此时 layout 已炸，必须自带完整 <html><body>。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0a0a0a',
          color: '#fafafa',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            😵
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
            Oops, something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#a3a3a3',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#525252',
                fontFamily: 'monospace',
                margin: '0 0 24px',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              borderRadius: 8,
              background: '#fafafa',
              color: '#0a0a0a',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
