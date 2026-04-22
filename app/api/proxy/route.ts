import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('imageUrl');
  
  if (!imageUrl) return new NextResponse('Missing URL', { status: 400 });

  try {
    const parsed = new URL(imageUrl);
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsed.origin + '/',
        'Accept': 'image/*'
      }
    });
    
    if (!res.ok) throw new Error('Gagal download gambar');
    
    const blob = await res.blob();
    return new NextResponse(blob, { 
        headers: { 'Content-Type': res.headers.get('Content-Type') || 'image/jpeg' }
    });
  } catch (e) {
    return new NextResponse('Error Fetching Image', { status: 500 });
  }
}