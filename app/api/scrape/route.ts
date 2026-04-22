import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url) return NextResponse.json({ error: 'URL/Kode kosong!' }, { status: 400 });

    // Auto-Convert URL / Kode Angka
    url = url.trim();
    if (/^\d+$/.test(url)) {
      url = `https://hentairun.com/gallery/${url}/`;
    } else if (url.includes('hentairun.com/view/')) {
      const match = url.match(/\/view\/(\d+)/);
      if (match) url = `https://hentairun.com/gallery/${match[1]}/`;
    }

    // 🚀 JURUS NINJA: Ambil data web TANPA buka browser Chrome (Sangat Cepat & Ringan)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      // Cache 'no-store' agar selalu ambil data terbaru
      cache: 'no-store' 
    });

    if (!res.ok) {
        throw new Error(`Web menolak akses (Status: ${res.status}). Mungkin diblokir.`);
    }

    const html = await res.text(); // Ambil seluruh teks HTML mentah

    // 1. Ekstrak Link Cover Pakai Regex
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const coverUrl = ogImageMatch ? ogImageMatch[1] : null;

    // 2. Ekstrak Total Halaman Pakai Regex
    // Mencari variasi tulisan "Pages: 30" atau "30 pages" di dalam HTML
    const pagesMatch = html.match(/Pages:[^>]*>(\d+)/i) || html.match(/Pages:\s*(\d+)/i) || html.match(/(\d+)[\s]*pages/i);
    const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    // 3. Ekstrak Judul
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - HentaiRun', '').trim() : 'Unknown Title';

    // 4. Rakit Link Gambar (Sama seperti sebelumnya)
    if (coverUrl && totalPages > 0) {
        let baseUrl = coverUrl.replace('t.hentairun', 'i.hentairun').replace(/cover\.(jpg|png|webp)/, '');
        if (!baseUrl.endsWith('/')) baseUrl = baseUrl.split('/').slice(0, -1).join('/') + '/';
        
        let images = [];
        for (let i = 1; i <= totalPages; i++) {
            images.push(baseUrl + i + '.jpg');
        }

        return NextResponse.json({
            success: true,
            data: { title, totalPages, images, coverUrl }
        });
    }

    // Jika gagal baca HTML
    return NextResponse.json({ 
        success: false, 
        error: 'Data komik tidak ditemukan. Struktur web mungkin berubah atau web diproteksi Cloudflare.' 
    }, { status: 500 });

  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}