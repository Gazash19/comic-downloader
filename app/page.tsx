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
    setStatus('analyzing');
    setErrorMessage('');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal.');
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
      const safeTitle = result.title.replace(/[/\\?%*:|"<>]/g, '-').trim();
      const folder = zip.folder(safeTitle);
      let count = 0;

      const tasks = result.images.map(async (imgUrl: string, i: number) => {
        try {
          const res = await fetch(`/api/proxy?imageUrl=${encodeURIComponent(imgUrl)}`);
          const blob = await res.blob();
          const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
          folder?.file(`${String(i + 1).padStart(3, '0')}.${ext}`, blob);
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
      setErrorMessage("Gagal membuat ZIP.");
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
          Download Web Comic <span className="text-indigo-400 block">Dalam Satu Klik</span>
        </h1>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Masukkan URL atau Kode Angka..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={status === 'analyzing' || status === 'downloading'}
            />
            <button className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              {status === 'analyzing' ? <Loader2 className="animate-spin" /> : <Search />} Analyze
            </button>
          </form>
        </div>

        {status === 'error' && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{errorMessage}</div>}

        {result && (status === 'result' || status === 'downloading' || status === 'success') && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row">
            <img src={result.coverUrl} className="w-full md:w-48 h-64 object-cover" alt="cover" />
            <div className="p-6 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-2">{result.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{result.totalPages} Halaman • {result.fileSize}</p>
              
              {status === 'result' && (
                <button onClick={handleDownload} className="w-full bg-emerald-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Download /> Download ZIP FAST ⚡</button>
              )}
              {status === 'downloading' && (
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{ width: `${progress}%` }} /></div>
              )}
              {status === 'success' && <div className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle /> Selesai! Cek folder download.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}