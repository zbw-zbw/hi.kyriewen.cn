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
          borderRadius: 16,
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#64ffda',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'sans-serif',
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size },
  );
}
