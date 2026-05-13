import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#18181b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#a1a1aa',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: -1,
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size },
  );
}
