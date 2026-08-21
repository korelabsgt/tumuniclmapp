'use client';

import React, { useState, useEffect } from 'react';
import { Folder, File, Eye, Download, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image, { StaticImageData } from 'next/image';
import { VisorImagen } from '@/components/home/ui/VisorImagen';
import comentario10Img from './images/comentario10.webp';
import COMUDEImg from './images/COMUDE.webp';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const ROOT_FOLDER_OFICIO = process.env.NEXT_PUBLIC_GD_OFICIO;
const ROOT_FOLDER_COMUDE = process.env.NEXT_PUBLIC_GD_COMUDE;

export function InformacionPublicaView() {
  const [activeTab, setActiveTab] = useState<'oficio' | 'comude'>('oficio');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 pb-12 pt-[70px]">
      {/* Barra Info */}
      <div className="w-full bg-[#0066cc] text-white py-6 sm:py-8 px-4 relative mt-2 border-t-[8px] border-blue-900">
        <button
          onClick={() => router.push('/')}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-[#0066cc]" />
        </button>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between pl-12 md:pl-16">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold">Municipalidad de Concepción Las Minas</h1>
            <h2 className="text-lg sm:text-xl font-normal opacity-90 mt-1">Departamento de Chiquimula</h2>
          </div>
          <div className="text-center md:text-right">
            <p className="text-2xl sm:text-4xl font-light">Gobierno Abierto</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex justify-center border-b border-gray-200 dark:border-neutral-700">
          <button
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'oficio'
                ? 'border-[#0066cc] text-[#0066cc] dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('oficio')}
          >
            Información de Oficio
          </button>
          <button
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'comude'
                ? 'border-[#0066cc] text-[#0066cc] dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('comude')}
          >
            Información del COMUDE
          </button>
        </div>

        <div className="mt-8">
          {activeTab === 'oficio' ? (
            <ExploradorArchivos
              key="oficio"
              rootId={ROOT_FOLDER_OFICIO!}
              titulo="DECRETO NO. 57-2008"
              subtitulo="LEY DE ACCESO A LA INFORMACIÓN PÚBLICA"
              descripcion={
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-justify leading-relaxed text-sm sm:text-base">
                  <strong>Artículo 10. Información pública de oficio.</strong> Los Sujetos Obligados deberán mantener, actualizada y disponible, en todo momento, de acuerdo con sus funciones y a disposición de cualquier interesado, como mínimo, la siguiente información, que podrá ser consultada de manera directa o a través de los portales electrónicos de cada sujeto obligado.
                </p>
              }
              imgSrc={comentario10Img}
            />
          ) : (
            <ExploradorArchivos
              key="comude"
              rootId={ROOT_FOLDER_COMUDE!}
              titulo="INFORMACIÓN"
              subtitulo="COMUDE"
              descripcion={
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-justify leading-relaxed text-sm sm:text-base">
                  El <strong>Consejo Municipal de Desarrollo -COMUDE-</strong> constituye el ente coordinador de participación a nivel municipal y se integra por el Alcalde Municipal, quien lo coordina; los Síndicos y Concejales que determine la Corporación Municipal; los representantes de los COCODE, hasta un máximo de 20, designados por los coordinadores de los COCODE; los representantes de las entidades públicas con presencia en el municipio; y los representantes de entidades civiles locales que sean convocados.
                </p>
              }
              imgSrc={COMUDEImg}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ExploradorArchivos({ rootId, titulo, subtitulo, descripcion, imgSrc }: { rootId: string, titulo: string, subtitulo: string, descripcion: React.ReactNode, imgSrc: StaticImageData }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(rootId);
  const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const url = `https://www.googleapis.com/drive/v3/files?q='${currentFolder}'+in+parents&key=${API_KEY}&fields=files(id, name, mimeType, webViewLink)`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.files) {
          const sortedFiles = data.files.sort((a: any, b: any) => a.name.localeCompare(b.name));
          setFiles(sortedFiles);
        } else {
          setFiles([]);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
      }
      setLoading(false);
    };

    if (currentFolder && API_KEY) {
      fetchFiles();
    } else {
      setLoading(false);
    }
  }, [currentFolder]);

  const goToFolder = (index: number) => {
    const newStack = folderStack.slice(0, index + 1);
    setFolderStack(newStack);
    setCurrentFolder(newStack[index].id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Columna Izquierda: Información */}
      <div className="w-full lg:w-1/2 flex flex-col items-center bg-blue-50/50 dark:bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-blue-100 dark:border-neutral-700 h-fit">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">
          {titulo} <br />
          <span className="font-medium text-lg">{subtitulo}</span>
        </h1>
        {descripcion}
        <VisorImagen src={imgSrc.src} alt="Imagen descriptiva" className="w-full h-auto mt-4" />
      </div>

      {/* Columna Derecha: Explorador */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-t-2xl border-x border-t border-gray-200 dark:border-neutral-700 flex flex-wrap items-center gap-2 text-sm text-[#0066cc] dark:text-blue-400 font-semibold shadow-sm">
          <button 
            onClick={() => {
              setFolderStack([]);
              setCurrentFolder(rootId);
            }}
            className="hover:underline"
          >
            {titulo === 'INFORMACIÓN' ? 'Información COMUDE' : titulo}
          </button>
          {folderStack.map((folder, idx) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              <button 
                onClick={() => goToFolder(idx)}
                className={idx === folderStack.length - 1 ? 'text-gray-900 dark:text-white' : 'hover:underline'}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Archivos */}
        <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-b-2xl border border-gray-200 dark:border-neutral-700 min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-gray-500">
              No hay elementos en esta carpeta.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {files.map((file) => {
                const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                return (
                  <div key={file.id} className="relative">
                    {isFolder ? (
                      <button
                        onClick={() => {
                          setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
                          setCurrentFolder(file.id);
                        }}
                        className="w-full flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-[#0066cc]/20 dark:border-blue-900 hover:border-[#0066cc] dark:hover:border-blue-500 hover:shadow-md transition-all group text-left"
                      >
                        <Folder className="w-6 h-6 text-[#0066cc] dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2 text-sm">{file.name}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === file.id ? null : file.id)}
                          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 hover:shadow-sm transition-all group text-left"
                        >
                          <File className="w-6 h-6 text-gray-500 group-hover:text-[#0066cc] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                          <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2 text-sm">{file.name}</span>
                        </button>
                        
                        {openDropdownId === file.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenDropdownId(null)} />
                            <div className="absolute top-full mt-1 left-0 w-full z-40 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 transition-colors text-sm font-medium border-b border-gray-100 dark:border-neutral-700"
                              >
                                <Eye className="w-4 h-4 text-blue-500" />
                                Ver documento
                              </a>
                              <a
                                href={`https://drive.google.com/uc?id=${file.id}&export=download`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 transition-colors text-sm font-medium"
                              >
                                <Download className="w-4 h-4 text-emerald-500" />
                                Descargar
                              </a>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
