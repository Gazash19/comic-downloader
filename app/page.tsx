"use client";

import React, { useState } from 'react';
import { Search, Download, Loader2, BookOpen, Link as LinkIcon, FileArchive, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip'; 
// @ts-ignore
import { saveAs } from 'file-saver';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle');
  // @ts-ignore
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus('analyzing');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal menganalisa URL.');
      }

      setResult({
        title: data.data.title,
        images: data.data.images,
        totalPages: data.data.totalPages,
        coverUrl: data.data.coverUrl,
        fileSize: "~" + (data.data.totalPages * 0.8).toFixed(1) + " MB"
      });
      
      setStatus('result');
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatus('error');
    }
  };

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);

    try {
      const zip = new JSZip();
      
      // 1. Menyimpan Judul Asli (Hanya membersihkan karakter yang tidak boleh ada di nama folder Windows/Mac)
      const safeTitle = result.title.replace(/[/\\?%*:|"<>]/g, '-').trim();
      const folderTitle = safeTitle || "comic_chapter";
      const folder = zip.folder(folderTitle);

      // 2. Teknik DOWNLOAD FAST (Parallel Fetching)
      let completedCount = 0;
      
      // Menjalankan semua download gambar secara bersamaan
      const fetchPromises = result.images.map(async (imageUrl: string, i: number) => {
        try {
          const response = await fetch(`/api/proxy?imageUrl=${encodeURIComponent(imageUrl)}`);
          if (!response.ok) throw new Error("Blocked by proxy");
          
          const blob = await response.blob();
          
          let ext = 'jpg';
          if (imageUrl.toLowerCase().includes('.png')) ext = 'png';
          else if (imageUrl.toLowerCase().includes('.webp')) ext = 'webp';
          else if (imageUrl.toLowerCase().includes('.gif')) ext = 'gif';

          const fileName = `${String(i + 1).padStart(3, '0')}.${ext}`;
          folder?.file(fileName, blob);
        } catch (downloadErr) {
          console.warn(`Gagal mengunduh halaman ${i + 1}`, downloadErr);
        } finally {
          // Update progress bar secara dinamis tiap ada 1 gambar selesai didownload
          completedCount++;
          setProgress(Math.round((completedCount / result.images.length) * 100));
        }
      });

      // Menunggu SEMUA proses download selesai
      await Promise.all(fetchPromises);

      // 3. Generate file ZIP dengan nama sesuai Judul Asli
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderTitle}.zip`);
      
      setStatus('success');
    } catch (err) {
      console.error("Download Error:", err);
      setErrorMessage("Gagal mengunduh file ZIP. Memori browser mungkin tidak cukup.");
      setStatus('error');
    }
  };

  const resetState = () => {
    setUrl('');
    setStatus('idle');
    setResult(null);
    setProgress(0);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight cursor-pointer" onClick={resetState}>
            <BookOpen className="w-6 h-6" />
            {/* UBAH NAMA WEB DISINI */}
            <span>hen-runComicZip.</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Download Web Comic <br className="hidden md:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Dalam Satu Klik
            </span>
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 md:p-3 rounded-2xl shadow-xl shadow-black/20 relative">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste URL chapter komik disini..."
                required
                disabled={status === 'analyzing' || status === 'downloading'}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-xl py-3 md:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'analyzing' || status === 'downloading' || !url}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 md:py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'analyzing' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Fetching...</>
              ) : (
                <><Search className="w-5 h-5" /> Analyze</>
              )}
            </button>
          </form>
        </div>

        {status === 'error' && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {(status === 'result' || status === 'downloading' || status === 'success') && result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
              <div className="md:w-48 h-48 md:h-auto bg-slate-800 relative">
                <img src={result.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent md:bg-gradient-to-l" />
              </div>

              <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full mb-3">Target Ditemukan</span>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">{result.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {result.totalPages} Halaman</span>
                    <span className="flex items-center gap-1"><FileArchive className="w-4 h-4" /> {result.fileSize}</span>
                  </div>
                </div>

                {status === 'result' && (
                  <button onClick={handleDownload} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" /> Download ZIP FAST ⚡
                  </button>
                )}

                {status === 'downloading' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-indigo-400">Mengunduh {result.totalPages} Halaman Bersamaan...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {status === 'success' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Selesai!</p>
                      <p className="text-xs text-emerald-500">File ZIP telah tersimpan dengan judul asli.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}