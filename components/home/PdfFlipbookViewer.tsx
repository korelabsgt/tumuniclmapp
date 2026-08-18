'use client'

import React, { useState, useRef, forwardRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import HTMLFlipBook from 'react-pageflip'
import { X, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { createPortal } from 'react-dom'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`

interface PageWrapperProps {
  pageNumber: number
  width?: number
}

const PageWrapper = forwardRef<HTMLDivElement, PageWrapperProps>(({ pageNumber }, ref) => {
  return (
    <div ref={ref} className="bg-white flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] overflow-hidden h-full w-full border-r border-gray-200">
      <Page 
        pageNumber={pageNumber} 
        renderTextLayer={false}
        renderAnnotationLayer={false}
        className="flex items-center justify-center w-full h-full [&>canvas]:!w-full [&>canvas]:!h-full [&>canvas]:!object-fill"
      />
    </div>
  )
})
PageWrapper.displayName = 'PageWrapper'

interface PdfFlipbookViewerProps {
  pdfUrl: string
  isOpen: boolean
  onClose: () => void
}

export default function PdfFlipbookViewer({ pdfUrl, isOpen, onClose }: PdfFlipbookViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [pdfDimensions, setPdfDimensions] = useState({ width: 500, height: 707 })
  const flipBookRef = useRef<any>(null)
  const flipbookContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
      setLoading(true)
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  async function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages)
    try {
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      let w = viewport.width
      let h = viewport.height
      if (w > 0 && h > 0) {
        const ratio = h / w
        setPdfDimensions({ width: 500, height: 500 * ratio })
      }
    } catch (e) {
      console.error('Error getting page dimensions:', e)
    }
    setLoading(false)
  }

  if (!isOpen || !mounted) return null

  const isZoomed = scale > 1
  const isHorizontalPdf = pdfDimensions.width > pdfDimensions.height;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-8 animate-in fade-in duration-200 overflow-hidden">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
      >
        <X className="w-6 h-6" />
      </button>

      <div className={`relative w-full h-full flex flex-col items-center justify-center ${isHorizontalPdf ? 'max-w-[100vw] md:max-w-[95vw]' : 'max-w-5xl'}`}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
            <p className="text-lg font-medium animate-pulse">Cargando libro interactivo...</p>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex justify-center w-full h-full items-center"
          loading={null}
        >
          {!loading && numPages > 0 && (
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
              onTransformed={(ref, state) => setScale(state.scale)}
              panning={{ disabled: !isMobile && scale <= 1 }}
            >
              {({ zoomIn, resetTransform }) => (
                <>
                  <div className="absolute top-4 right-16 md:right-20 z-[60] flex items-center gap-2">
                    <button 
                      onClick={() => scale > 1 ? resetTransform() : zoomIn(2)}
                      className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                    >
                      {scale > 1 ? <ZoomOut className="w-6 h-6" /> : <ZoomIn className="w-6 h-6" />}
                    </button>
                  </div>

                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                    <div className={`relative w-full flex justify-center items-center h-full ${isHorizontalPdf ? 'max-h-[90vh] md:max-h-[90vh]' : 'max-h-[85vh] md:max-h-[80vh]'}`}>
                      
                      <div ref={flipbookContainerRef} className="w-full h-full flex justify-center items-center">
                        {/* @ts-ignore */}
                        <HTMLFlipBook
                        width={isMobile && windowSize.width ? windowSize.width : pdfDimensions.width}
                        height={isMobile && windowSize.width ? windowSize.width * (pdfDimensions.height / pdfDimensions.width) : pdfDimensions.height}
                        size="stretch"
                        minWidth={300}
                        maxWidth={1200}
                        minHeight={300}
                        maxHeight={1200}
                        maxShadowOpacity={0.5}
                        showCover={!isMobile}
                        mobileScrollSupport={true}
                        usePortrait={true}
                        className="pdf-flipbook shadow-2xl mx-auto"
                        ref={flipBookRef}
                        style={{ margin: '0 auto' }}
                        useMouseEvents={!isMobile}
                      >
                        {Array.from(new Array(numPages), (el, index) => (
                          <PageWrapper 
                            key={`page_${index + 1}`} 
                            pageNumber={index + 1} 
                          />
                        ))}
                      </HTMLFlipBook>
                      </div>

                      {/* Botones de navegación externos */}
                      <div className="absolute top-1/2 left-2 md:-left-8 -translate-y-1/2 z-50 pointer-events-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); flipBookRef.current?.pageFlip()?.flipPrev(); }}
                          className={`p-3 bg-black/50 md:bg-white/10 hover:bg-black/70 md:hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm shadow-xl ${scale > 1 ? 'opacity-0' : 'opacity-100'}`}
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="absolute top-1/2 right-2 md:-right-8 -translate-y-1/2 z-50 pointer-events-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); flipBookRef.current?.pageFlip()?.flipNext(); }}
                          className={`p-3 bg-black/50 md:bg-white/10 hover:bg-black/70 md:hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm shadow-xl ${scale > 1 ? 'opacity-0' : 'opacity-100'}`}
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </Document>
      </div>
    </div>,
    document.body
  )
}
