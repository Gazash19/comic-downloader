import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('imageUrl');
  
  if (!imageUrl) return new NextResponse('Missing URL', { status: 400 });

  try {
    const parsed = new URL(imageUrl);
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://hentairun.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const blob = await res.blob();
    return new NextResponse(blob, { 
        headers: { 
            'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000'
        }
    });
  } catch (e) {
    return new NextResponse('Error Fetching Image', { status: 500 });
  }
}