import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('imageUrl');

  if (!imageUrl) {
    return new NextResponse('Missing imageUrl', { status: 400 });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Menggunakan origin dari URL gambar itu sendiri sebagai Referer (sangat ampuh membypass proteksi)
        'Referer': parsedUrl.origin + '/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      },
    });
  } catch (error) {
    return new NextResponse('Error fetching image', { status: 500 });
  }
}