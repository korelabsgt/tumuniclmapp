'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Swal from 'sweetalert2';
import { registrarLog } from '@/utils/registrarLog';
import { buscarHistorialDPI } from './actions';
import { obtenerLugares } from '@/lib/obtenerLugares';
import useUserData from '@/hooks/sesion/useUserData';
import { BuscadorLugar } from '@/components/fertilizante/BuscadorLugar';
import { btnSubmitClass, formFieldsClass, formPageClass, formSectionsGridClass, inputClass, inputErrorClass, inputMonoClass, labelClass, sectionClass } from '@/components/fertilizante/formStyles';

const completarFolioConCeros = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  if (!digitos) return digitos;
  return digitos.padStart(4, '0');
};

const ULTIMO_LUGAR_KEY = 'fertilizante.beneficiarios.ultimo_lugar';
const ULTIMA_FECHA_KEY = 'fertilizante.beneficiarios.ultima_fecha';

const leerUltimoLugar = (): string => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ULTIMO_LUGAR_KEY) ?? '';
};

const leerUltimaFecha = (): string => {
  if (typeof window === 'undefined') return new Date().toISOString().slice(0, 10);
  return sessionStorage.getItem(ULTIMA_FECHA_KEY) ?? new Date().toISOString().slice(0, 10);
};

const guardarPreferenciasEntrega = (lugar: string, fecha: string) => {
  if (typeof window === 'undefined') return;
  if (lugar) sessionStorage.setItem(ULTIMO_LUGAR_KEY, lugar);
  if (fecha) sessionStorage.setItem(ULTIMA_FECHA_KEY, fecha);
};

export function CrearBeneficiario() {
  const { nombre } = useUserData();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([]);

useEffect(() => {
  const obtenerAnios = async () => {
    const { data, error } = await supabase
      .from('beneficiarios_fertilizante')
      .select('anio')
      .order('anio', { ascending: true });

    if (error) {
      console.error('Error al obtener años:', error.message);
      return;
    }

    const actuales = data
      .map((b: any) => (typeof b.anio === 'number' ? b.anio.toString() : null))
      .filter((a): a is string => a !== null);

    const anioActual = new Date().getFullYear().toString();

    const todos = Array.from(
      new Set([...actuales, anioActual])
    ).sort();

    setAniosDisponibles(todos);

    // Establecer el año seleccionado solo si no está ya fijo
    if (!todos.includes(anio)) setAnio(anioActual);
  };

  obtenerAnios();
}, []);




  const [dpi, setDpi] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [anioHistorial, setAnioHistorial] = useState<string | null>(null);
  const [lugares, setLugares] = useState<string[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    const cargarLugares = async () => {
      const lista = await obtenerLugares();
      setLugares(lista);
    };
    cargarLugares();
  }, []);

const [formulario, setFormulario] = useState({
  nombre_completo: '',
  dpi: '',
  lugar: '',
  fecha: '',
  fecha_nacimiento: '',
  codigo: '',
  telefono: '',
  sexo: 'M',
  cantidad: '1',
  estado: 'Entregado',
});


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let { name, value } = e.target;

    if (name === 'dpi') {
      value = value.replace(/\D/g, '').slice(0, 13);
    } else if (name === 'telefono') {
      value = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'codigo') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormulario((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const verificarDPI = async () => {
    if (!dpi.trim()) {
      Swal.fire('Error', 'Ingrese un DPI válido.', 'error');
      return;
    }

    const respuesta = await buscarHistorialDPI(dpi, anio);

    if (!respuesta.success) {
      Swal.fire('Error', respuesta.error || 'Error al verificar el DPI.', 'error');
      return;
    }

    if (respuesta.existeActual) {
      const { data } = respuesta;
      Swal.fire({
        title: 'No Entregar',
        html: `
          <h2>El DPI<br/><span style="color:red">${data.dpi}</span><br/>ya recibió el beneficio este año</h2><br/>
          <strong>Datos del beneficiario:</strong><br/><br/>
          <strong>Nombre:</strong> ${data.nombre_completo}<br/><br/>
          <strong>DPI:</strong> ${data.dpi}<br/><br/>
          <strong>Folio:</strong> ${data.codigo}<br/><br/>
          <strong>Lugar:</strong> ${data.lugar}<br/><br/>
          <strong>Fecha:</strong> ${data.fecha}
        `,
        icon: 'error',
      });
    } else {
      if (respuesta.data) {
        const historial = respuesta.data;
        const ultimoLugar = leerUltimoLugar();
        const ultimaFecha = leerUltimaFecha();
        setAnioHistorial(historial.anio.toString());
        setFormulario((prev) => ({
          ...prev,
          dpi,
          nombre_completo: historial.nombre_completo || '',
          lugar: ultimoLugar || historial.lugar || '',
          fecha: ultimaFecha,
          fecha_nacimiento: historial.fecha_nacimiento || '',
          codigo: '',
          telefono: historial.telefono === 'N/A' ? '' : (historial.telefono || ''),
          sexo: historial.sexo || 'M',
        }));
      } else {
        setAnioHistorial(null);
        setFormulario((prev) => ({
          ...prev,
          dpi,
          lugar: leerUltimoLugar(),
          fecha: leerUltimaFecha(),
        }));
      }
      
      setMostrarFormulario(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const camposRequeridos = [
      'nombre_completo',
      'dpi',
      'lugar',
      'fecha',
      'codigo',
      'sexo',
      'cantidad',
    ];
    
    const nuevosErrores: Record<string, string> = {};
    camposRequeridos.forEach((campo) => {
      if (!formulario[campo as keyof typeof formulario]?.trim()) {
        nuevosErrores[campo] = 'Campo necesario';
      }
    });

    const cantidad = parseInt(formulario.cantidad || '1', 10);

    if (isNaN(cantidad) || cantidad < 1) {
      nuevosErrores['cantidad'] = 'Debe ser >= 1';
    }

    const dpi = formulario.dpi.trim();
    const codigo = formulario.codigo.trim();
    const telefono = formulario.telefono.trim();
  
    if (dpi && !/^\d{13}$/.test(dpi)) {
      nuevosErrores['dpi'] = 'Debe tener 13 números';
    }
  
    if (codigo && !/^\d{4}$/.test(codigo)) {
      nuevosErrores['codigo'] = 'Debe tener 4 números';
    }
  
    if (telefono !== '' && !/^\d{8}$/.test(telefono)) {
      nuevosErrores['telefono'] = 'Debe tener 8 números';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
  
    const { data: duplicados, error: errorCheck } = await supabase
      .from('beneficiarios_fertilizante')
      .select('*')
      .eq('anio', anio)
      .or(`dpi.eq.${dpi},codigo.eq.${codigo}`);
  
    if (errorCheck) {
      Swal.fire('Error', 'Error al verificar duplicados.', 'error');
      return;
    }
  
    if (duplicados && duplicados.length > 0) {
      const duplicadoCodigo = duplicados.find((b) => b.codigo === codigo);
      const duplicadoDPI = duplicados.find((b) => b.dpi === dpi);
  
      let campo = '';
      let valor = '';
      let b: any = null;
  
      if (duplicadoCodigo) {
        campo = 'Folio';
        valor = codigo;
        b = duplicadoCodigo;
      } else if (duplicadoDPI) {
        campo = 'DPI';
        valor = dpi;
        b = duplicadoDPI;
      }
  
      Swal.fire({
        title: `Ya existe un beneficiario con ${campo}: ${valor}`,
        html: `
          <strong>Nombre:</strong> ${b.nombre_completo}<br/><br/>
          <strong>DPI:</strong> ${b.dpi}<br/><br/>
          <strong>Teléfono:</strong> ${b.telefono}<br/><br/>
          <strong>Folio:</strong> ${b.codigo}<br/><br/>
          <strong>Lugar:</strong> ${b.lugar}<br/><br/>
          <strong>Fecha:</strong> ${b.fecha}
        `,
        icon: 'info',
      });
  
      return;
    }
  
    const { error } = await supabase
      .from('beneficiarios_fertilizante')
     
      .insert([{ 
        ...formulario,
        cantidad,
        dpi,
        codigo,
        telefono: telefono === '' ? 'N/A' : telefono,
        fecha_nacimiento: formulario.fecha_nacimiento?.trim() || null,
        anio: Number(anio),
        creado_por: nombre || 'Desconocido'
      }]);
        
if (error) {
  console.error('Error de Supabase:', error);
      await registrarLog({
        accion: 'ERROR_CREAR',
        nombreModulo: 'FERTILIZANTE',
        descripcion: `No se pudo registrar el beneficiario.<br><br><small>${error.message}</small>`,
      });
  Swal.fire('Error', `No se pudo registrar el beneficiario.<br><br><small>${error.message}</small>`, 'error');
} else {
        await registrarLog({
        accion: 'CREAR',
        nombreModulo: 'FERTILIZANTE',
        descripcion: `Se ingresó:<br><br><strong>Folio:</strong> ${formulario.codigo}<br><br><strong>Nombre:</strong> ${formulario.nombre_completo}<br><br><strong>DPI:</strong> ${formulario.dpi}`,
      });
      Swal.fire('Éxito', 'Beneficiario registrado correctamente.', 'success').then(() => {
        guardarPreferenciasEntrega(formulario.lugar, formulario.fecha);
        const lugarRecordado = formulario.lugar;
        const fechaRecordada = formulario.fecha;
        setFormulario({
          nombre_completo: '',
          dpi: '',
          lugar: lugarRecordado,
          fecha: fechaRecordada,
          fecha_nacimiento: '',
          codigo: '',
          telefono: '',
          sexo: 'M',
          cantidad: '1',
          estado: 'Entregado',
        });
        setDpi('');
        setAnioHistorial(null);
        setMostrarFormulario(false);
      });

    }
  };
  
return (
  <div className={formPageClass}>
    <button
      type="button"
      onClick={() => router.push('/sigem/fertilizante/beneficiarios')}
      className="text-emerald-600 dark:text-emerald-400 text-sm underline p-0 m-0 h-auto min-h-0 bg-transparent border-0 shadow-none cursor-pointer font-medium"
    >
      Volver
    </button>

    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 mt-2">
      Registrar Beneficiario de Fertilizante
    </h1>

    {mostrarFormulario && anioHistorial && (
      <div className="mb-4 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Datos recuperados del año <strong>{anioHistorial}</strong>. Complete la fecha y el folio actual.
        </p>
      </div>
    )}

    {!mostrarFormulario && (
      <section className={sectionClass}>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Verificar DPI</p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 lg:grid-cols-5 gap-3 items-end">
            <div className="col-span-1 min-w-0">
              <label className={labelClass}>Año</label>
              <select value={anio} onChange={(e) => setAnio(e.target.value)} className={inputClass}>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3 min-w-0">
              <label className={labelClass}>DPI</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="13 dígitos"
                value={dpi}
                onChange={(e) => {
                  const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 13);
                  setDpi(soloNumeros);
                }}
                className={inputClass}
              />
            </div>
            <div className="col-span-4 lg:col-span-1 min-w-0">
              <button type="button" onClick={verificarDPI} className={`${btnSubmitClass} w-full lg:text-xs lg:px-2`}>
                Ingresar DPI
              </button>
            </div>
          </div>
        </div>
      </section>
    )}

    {mostrarFormulario && (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={formSectionsGridClass}>
        <section className={sectionClass}>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Datos personales</p>
          <div className={formFieldsClass}>
            <div>
              <label className={labelClass}>
                Nombre completo
                {errores.nombre_completo && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.nombre_completo}</span>
                )}
              </label>
              <input
                type="text"
                name="nombre_completo"
                value={formulario.nombre_completo}
                onChange={handleChange}
                className={`${inputClass} ${errores.nombre_completo ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <label className={labelClass}>
                DPI
                {errores.dpi && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.dpi}</span>
                )}
              </label>
              <input
                type="text"
                name="dpi"
                inputMode="numeric"
                value={formulario.dpi}
                onChange={handleChange}
                className={`${inputClass} ${errores.dpi ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Teléfono
                {errores.telefono && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.telefono}</span>
                )}
              </label>
              <input
                type="tel"
                name="telefono"
                value={formulario.telefono}
                onChange={handleChange}
                placeholder="8 dígitos"
                className={`${inputClass} ${errores.telefono ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <label className={labelClass}>Fecha de nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formulario.fecha_nacimiento}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <span className={labelClass}>
                Sexo
                {errores.sexo && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.sexo}</span>
                )}
              </span>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="sexo"
                    value="M"
                    checked={formulario.sexo === 'M'}
                    onChange={handleChange}
                    className="accent-emerald-600"
                  />
                  Masculino
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="sexo"
                    value="F"
                    checked={formulario.sexo === 'F'}
                    onChange={handleChange}
                    className="accent-pink-500"
                  />
                  Femenino
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Datos de entrega</p>
          <div className={formFieldsClass}>
            <BuscadorLugar
              value={formulario.lugar}
              onChange={(lugar) => {
                setFormulario((prev) => ({ ...prev, lugar }));
                if (errores.lugar) setErrores((prev) => ({ ...prev, lugar: '' }));
              }}
              lugares={lugares}
              error={errores.lugar}
            />

            <div>
              <label className={labelClass}>
                Fecha de entrega
                {errores.fecha && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.fecha}</span>
                )}
              </label>
              <input
                type="date"
                name="fecha"
                value={formulario.fecha}
                onChange={handleChange}
                className={`${inputClass} ${errores.fecha ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Folio
                {errores.codigo && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.codigo}</span>
                )}
              </label>
              <input
                type="text"
                name="codigo"
                inputMode="numeric"
                value={formulario.codigo}
                onChange={handleChange}
                onBlur={() =>
                  setFormulario((prev) => ({ ...prev, codigo: completarFolioConCeros(prev.codigo) }))
                }
                maxLength={4}
                placeholder="0001"
                className={`${inputMonoClass} ${errores.codigo ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Cantidad de sacos
                {errores.cantidad && (
                  <span className="text-red-500 normal-case tracking-normal ml-1">{errores.cantidad}</span>
                )}
              </label>
              <input
                type="number"
                name="cantidad"
                min="1"
                step="1"
                value={formulario.cantidad}
                onChange={handleChange}
                className={`${inputClass} ${errores.cantidad ? inputErrorClass : ''}`}
              />
            </div>

            <div>
              <span className={labelClass}>Estado</span>
              <div className="flex gap-4 flex-wrap mt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <input
                    type="radio"
                    name="estado"
                    value="Entregado"
                    checked={formulario.estado === 'Entregado'}
                    onChange={handleChange}
                    className="accent-green-600"
                  />
                  Entregado
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <input
                    type="radio"
                    name="estado"
                    value="Extraviado"
                    checked={formulario.estado === 'Extraviado'}
                    onChange={handleChange}
                    className="accent-yellow-500"
                  />
                  Extraviado
                </label>
              </div>
            </div>
          </div>
        </section>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" className={btnSubmitClass}>
            Crear Beneficiario
          </button>
        </div>
      </form>
    )}
  </div>
);

}
