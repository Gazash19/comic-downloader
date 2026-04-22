"use client";

import React, { useState } from 'react';
import { Search, Download, Loader2, BookOpen, CheckCircle } from 'lucide-react';
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
    if (!url.trim()) return;
    
    setStatus('analyzing');
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil data.');
      
      // Estimasi ukuran file (rata-rata 700KB per gambar)
      setResult({ ...data.data, fileSize: "~" + (data.data.totalPages * 0.7).toFixed(1) + " MB" });
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
      const safeTitle = result.title.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Comic';
      const folder = zip.folder(safeTitle);
      let count = 0;

      // Download secara paralel agar super cepat
      const tasks = result.images.map(async (imgUrl: string, i: number) => {
        try {
          const res = await fetch(`/api/proxy?imageUrl=${encodeURIComponent(imgUrl)}`);
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
          folder?.file(`${String(i + 1).padStart(3, '0')}.${ext}`, blob);
        } catch (e) {
          console.error(`Gagal download gambar ke-${i + 1}`);
        } finally {
          count++;
          setProgress(Math.round((count / result.images.length) * 100));
        }
      });

      await Promise.all(tasks);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${safeTitle}.zip`);
      setStatus('success');
    } catch (err) {
      setErrorMessage("Terjadi kesalahan saat membuat file ZIP.");
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4">
      <nav className="max-w-4xl mx-auto h-16 flex items-center gap-2 text-indigo-400 font-bold text-xl">
        <BookOpen /> <span>hen-runComicZip.</span>
      </nav>

      <main className="max-w-3xl mx-auto pt-16">
        <h1 className="text-4xl font-extrabold text-center mb-10 text-white">
          Download Web Comic <span className="text-indigo-400 block mt-2">Dalam Satu Klik</span>
        </h1>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Masukkan Link Web atau Kode Angka..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              disabled={status === 'analyzing' || status === 'downloading'}
            />
            <button 
              disabled={status === 'analyzing' || status === 'downloading'}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {status === 'analyzing' ? <Loader2 className="animate-spin" /> : <Search />} Analyze
            </button>
          </form>
        </div>

        {status === 'error' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
            {errorMessage}
          </div>
        )}

        {result && (status === 'result' || status === 'downloading' || status === 'success') && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-lg">
            <img src={result.coverUrl} className="w-full md:w-56 h-72 object-cover" alt="cover" />
            <div className="p-6 flex-1 flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-2 text-white">{result.title}</h3>
              <p className="text-slate-400 font-medium mb-6 flex items-center gap-2">
                <BookOpen size={16} /> {result.totalPages} Halaman • {result.fileSize}
              </p>
              
              {status === 'result' && (
                <button onClick={handleDownload} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                  <Download /> Download ZIP SEKARANG
                </button>
              )}
              
              {status === 'downloading' && (
                <div className="w-full">
                  <div className="flex justify-between text-sm font-bold text-indigo-300 mb-2">
                    <span>Sedang mengunduh...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              
              {status === 'success' && (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-xl text-emerald-400 font-bold flex items-center justify-center gap-2">
                  <CheckCircle /> Selesai! File ZIP berhasil diunduh.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}