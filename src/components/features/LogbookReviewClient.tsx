
"use client";

import { useState, useEffect, useRef } from "react";
import { LogbookRecord } from "@/services/logbook.service";
import Link from "next/link";

export default function LogbookReviewClient({
  logbook,
}: {
  logbook: LogbookRecord;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load the preview on mount
  useEffect(() => {
    let mounted = true;

    async function loadDocxPreview() {
      try {
        setIsLoadingPreview(true);
        const res = await fetch(`/api/export/logbook/download?logbook_id=${logbook.id}`);
        if (!res.ok) throw new Error("Gagal mengambil file DOCX");
        
        const blob = await res.blob();
        if (mounted) setDocxBlob(blob);

        if (containerRef.current) {
          const docx = await import("docx-preview");
          await docx.renderAsync(blob, containerRef.current, null, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
          });
        }
      } catch (err: any) {
        if (mounted) {
          console.error(err);
          setErrorMsg(err.message);
        }
      } finally {
        if (mounted) setIsLoadingPreview(false);
      }
    }

    loadDocxPreview();
    
    return () => { mounted = false; };
  }, [logbook.id]);

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      if (docxBlob) {
        const url = window.URL.createObjectURL(docxBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Logbook_${logbook.id.substring(0, 8)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
         const res = await fetch(`/api/export/logbook/download?logbook_id=${logbook.id}`);
         if (!res.ok) throw new Error("Gagal generate DOCX");
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `Logbook_${logbook.id.substring(0, 8)}.docx`;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(url);
         document.body.removeChild(a);
      }
    } catch (error: any) {
      alert(error.message || "Gagal mengunduh logbook");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* 
        Tweak CSS untuk docx-preview agar bertindak seperti penampil PDF profesional.
        - Membuang align-items: center yang memotong kiri di mobile.
        - margin: 0 auto membuat dokumen ke tengah tetapi tetap bisa discroll utuh jika layar kecil.
        - background gelap untuk kontras.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        .docx-preview-container {
          background-color: #525659 !important; /* Warna ala PDF Viewer */
        }
        .docx-wrapper {
          background: transparent !important;
          padding: 32px 16px !important;
          width: 100% !important;
          display: block !important;
        }
        .docx-wrapper > section.docx {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
          margin: 0 auto 32px auto !important; /* Tengah horizontal tanpa terpotong di kiri */
          border-radius: 4px !important;
          overflow: hidden !important;
          background: white !important;
        }
        @media (max-width: 768px) {
          .docx-wrapper {
            padding: 16px 8px !important;
          }
          .docx-wrapper > section.docx {
            transform-origin: top left;
            /* Opsional: kita biarkan scroll horizontal alami agar resolusi tidak pecah/terpotong */
          }
        }
      `}} />

      <Link
        href={`/logbook/${logbook.id}`}
        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-primary)] mb-5 hover:opacity-80 transition-all"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="ios-card p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">Preview Logbook</h1>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
            Tampilan akhir dokumen Anda siap untuk diunduh.
          </p>
        </div>

        <button
          onClick={handleExportDocx}
          disabled={isExporting}
          className="ios-btn-primary inline-flex items-center gap-2 !py-2.5 !px-5 text-[13px] whitespace-nowrap shadow-sm hover:shadow-md transition-all"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mengunduh...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download DOCX
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden h-[calc(100vh-220px)] min-h-[600px] relative shadow-inner ring-1 ring-black/5">
        {isLoadingPreview && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#525659]/80 backdrop-blur-sm">
            <svg className="w-10 h-10 text-white animate-spin mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[14px] font-medium text-white/90">Merender dokumen profesional...</p>
          </div>
        )}
        
        {errorMsg && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#525659]/90 backdrop-blur-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-white mb-1">Gagal Memuat Preview</p>
            <p className="text-[13px] text-white/70 max-w-md">{errorMsg}</p>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="w-full h-full overflow-auto docx-preview-container custom-scrollbar"
        >
        </div>
      </div>
    </div>
  );
}
