import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 128,
                    background: '#075e54',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'system-ui',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '72px', fontWeight: 'bold' }}>WhatsApp Web</div>
                    <div style={{ fontSize: '32px', opacity: 0.9 }}>Mensajería simple, segura y confiable</div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
