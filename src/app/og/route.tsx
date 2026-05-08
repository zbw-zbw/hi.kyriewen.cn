import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE_NAME = 'Kyriewen';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? SITE_NAME;
  const subtitle =
    searchParams.get('subtitle') ??
    'Indie Hacker · Frontend Developer · Chrome extension builder';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)',
          color: '#fafafa',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 光晕效果 */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #64FFDA 0%, transparent 60%)',
            opacity: 0.25,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '22px',
            color: '#a1a1aa',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#64FFDA',
            }}
          />
          hi.kyriewen.cn
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '68px',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '960px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#a1a1aa',
              maxWidth: '900px',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '22px',
            color: '#71717a',
          }}
        >
          <span>{SITE_NAME}</span>
          <span>— Indie hacker</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
