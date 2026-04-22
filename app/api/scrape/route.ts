import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url) return NextResponse.json({ error: 'URL/Kode kosong!' }, { status: 400 });

    // 🚀 LOGIKA AUTO-CONVERT URL & KODE ANGKA
    url = url.trim();
    if (/^\d+$/.test(url)) {
      url = `https://hentairun.com/gallery/${url}/`;
    } else if (url.includes('hentairun.com/view/')) {
      const match = url.match(/\/view\/(\d+)/);
      if (match) url = `https://hentairun.com/gallery/${match[1]}/`;
    }

    // 🚀 JURUS NINJA: Ambil HTML langsung (Sangat Cepat, Anti-Timeout Vercel)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      cache: 'no-store' 
    });

    if (!res.ok) throw new Error(`Gagal membaca web (Status: ${res.status}).`);

    const html = await res.text(); 

    // Ekstrak Data menggunakan Regex
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const coverUrl = ogImageMatch ? ogImageMatch[1] : null;

    const pagesMatch = html.match(/Pages:[^>]*>(\d+)/i) || html.match(/Pages:\s*(\d+)/i) || html.match(/(\d+)[\s]*pages/i);
    const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - HentaiRun', '').trim() : 'Unknown Title';

    // Rakit Link Gambar
    if (coverUrl && totalPages > 0) {
        let baseUrl = coverUrl.replace('t.hentairun', 'i.hentairun').replace(/cover\.(jpg|png|webp)/, '');
        if (!baseUrl.endsWith('/')) baseUrl = baseUrl.split('/').slice(0, -1).join('/') + '/';
        
        let images = [];
        for (let i = 1; i <= totalPages; i++) images.push(baseUrl + i + '.jpg');

        return NextResponse.json({
            success: true,
            data: { title, totalPages, images, coverUrl }
        });
    }

    return NextResponse.json({ success: false, error: 'Data tidak ditemukan. Format web tidak sesuai.' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}