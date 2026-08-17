'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '@/lib/utils';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  '//unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

type VisorPDFInlineProps = {
  bucketName: string;
  filePath: string;
  fileName: string;
  onBack: () => void;
  className?: string;
  expandido?: boolean;
};

export default function VisorPDFInline({
  bucketName,
  filePath,
  fileName,
  onBack,
  className,
  expandido = false,
}: VisorPDFInlineProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!filePath) return;

    const fetchUrl = async () => {
      try {
        setLoadingUrl(true);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600);

        if (error) throw error;
        setUrl(data?.signedUrl ?? null);
      } catch (error) {
        console.error(error);
        setUrl(null);
      } finally {
        setLoadingUrl(false);
      }
    };

    fetchUrl();

    return () => {
      setUrl(null);
      setPageNumber(1);
      setScale(1);
      setNumPages(0);
    };
  }, [filePath, bucketName]);

  const onDocumentLoadSuccess = ({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber((prev) => {
      const next = prev + offset;
      if (next < 1) return 1;
      if (next > numPages) return prev;
      return next;
    });
  };

  const pageWidth = containerWidth > 0 ? Math.max(containerWidth - 16, 200) * scale : undefined;

  return (
    <div
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
        expandido ? 'min-h-[min(70dvh,640px)]' : 'min-h-[320px]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100" title={fileName}>
          {fileName}
        </h3>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-zinc-100 px-1 py-0.5 dark:bg-zinc-700">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(1))))}
            className="cursor-pointer rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-9 text-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(1))))}
            className="cursor-pointer rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-[#0066cc] dark:hover:bg-zinc-700 dark:hover:text-blue-400 sm:flex"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-auto bg-zinc-200/40 p-3 dark:bg-zinc-950/40"
      >
        {loadingUrl ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#0066cc] dark:text-blue-400" />
            <span className="text-sm text-muted-foreground">Cargando documento...</span>
          </div>
        ) : url ? (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066cc] dark:text-blue-400" />
                <span className="text-sm text-muted-foreground">Procesando PDF...</span>
              </div>
            }
            error={
              <div className="flex min-h-[240px] items-center justify-center px-4 text-center text-sm font-medium text-red-600 dark:text-red-400">
                No se pudo cargar el PDF.
              </div>
            }
            className="flex justify-center"
            externalLinkTarget="_blank"
          >
            <div className="relative bg-white shadow-lg dark:shadow-black/40">
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                className="bg-white"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="h-[420px] w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
                }
              />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                {pageNumber}
              </span>
            </div>
          </Document>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
            Documento no disponible.
          </div>
        )}
      </div>

      {numPages > 0 ? (
        <div className="flex shrink-0 items-center justify-center gap-4 border-t border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="cursor-pointer rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            {pageNumber} de {numPages}
          </span>
          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="cursor-pointer rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
