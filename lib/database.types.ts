export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accesos_programas: {
        Row: {
          id: number
          programa: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          programa?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          programa?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accesos_programas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      afiliados: {
        Row: {
          created_at: string
          direccion: string | null
          dpi: string
          id: string
          lider_id: string | null
          nacimiento: string | null
          nombre: string
          rol: string
          sexo: string | null
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          dpi: string
          id?: string
          lider_id?: string | null
          nacimiento?: string | null
          nombre: string
          rol?: string
          sexo?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          dpi?: string
          id?: string
          lider_id?: string | null
          nacimiento?: string | null
          nombre?: string
          rol?: string
          sexo?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afiliados_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliados_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "lideres_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_concejo: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string
          fecha_reunion: string
          id: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_reunion: string
          id?: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_reunion?: string
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      alumnos: {
        Row: {
          created_at: string
          cui_alumno: string | null
          cui_encargado: string | null
          fecha_nacimiento: string
          id: string
          nombre_completo: string
          nombre_encargado: string
          sexo: string | null
          telefono_alumno: string | null
          telefono_encargado: string
          ubicacion: string | null
        }
        Insert: {
          created_at?: string
          cui_alumno?: string | null
          cui_encargado?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_completo: string
          nombre_encargado: string
          sexo?: string | null
          telefono_alumno?: string | null
          telefono_encargado: string
          ubicacion?: string | null
        }
        Update: {
          created_at?: string
          cui_alumno?: string | null
          cui_encargado?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_completo?: string
          nombre_encargado?: string
          sexo?: string | null
          telefono_alumno?: string | null
          telefono_encargado?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      alumnos_inscripciones: {
        Row: {
          alumno_id: string
          programa_id: number
        }
        Insert: {
          alumno_id: string
          programa_id: number
        }
        Update: {
          alumno_id?: string
          programa_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_inscripciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumnos_inscripciones_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas_educativos"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiarios_fertilizante: {
        Row: {
          anio: number | null
          cantidad: number | null
          codigo: string
          created_at: string | null
          dpi: string | null
          estado: string
          fecha: string
          fecha_nacimiento: string | null
          id: string
          img: string | null
          lugar: string | null
          nombre_completo: string | null
          sexo: string | null
          telefono: string | null
        }
        Insert: {
          anio?: number | null
          cantidad?: number | null
          codigo: string
          created_at?: string | null
          dpi?: string | null
          estado?: string
          fecha: string
          fecha_nacimiento?: string | null
          id?: string
          img?: string | null
          lugar?: string | null
          nombre_completo?: string | null
          sexo?: string | null
          telefono?: string | null
        }
        Update: {
          anio?: number | null
          cantidad?: number | null
          codigo?: string
          created_at?: string | null
          dpi?: string | null
          estado?: string
          fecha?: string
          fecha_nacimiento?: string | null
          id?: string
          img?: string | null
          lugar?: string | null
          nombre_completo?: string | null
          sexo?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      bienes: {
        Row: {
          correlativo: number
          created_at: string
          descripcion: string | null
          id: number
          id_categoria: number
          updated_at: string
          url_imagen: string | null
          user_id: string
        }
        Insert: {
          correlativo: number
          created_at?: string
          descripcion?: string | null
          id?: never
          id_categoria: number
          updated_at?: string
          url_imagen?: string | null
          user_id: string
        }
        Update: {
          correlativo?: number
          created_at?: string
          descripcion?: string | null
          id?: never
          id_categoria?: number
          updated_at?: string
          url_imagen?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bienes_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bienes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          codigo_propio: string
          created_at: string
          id: number
          id_padre: number | null
          nombre: string
        }
        Insert: {
          codigo_propio: string
          created_at?: string
          id?: never
          id_padre?: number | null
          nombre: string
        }
        Update: {
          codigo_propio?: string
          created_at?: string
          id?: never
          id_padre?: number | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_id_padre_fkey"
            columns: ["id_padre"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_tareas_concejo: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      comision_asistentes: {
        Row: {
          asistente_id: string
          comision_id: string
          encargado: boolean
        }
        Insert: {
          asistente_id: string
          comision_id: string
          encargado?: boolean
        }
        Update: {
          asistente_id?: string
          comision_id?: string
          encargado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "comision_asistentes_asistente_id_fkey"
            columns: ["asistente_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_asistentes_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones: {
        Row: {
          comentarios: string[] | null
          created_at: string
          fecha_hora: string | null
          id: string
          titulo: string | null
        }
        Insert: {
          comentarios?: string[] | null
          created_at?: string
          fecha_hora?: string | null
          id?: string
          titulo?: string | null
        }
        Update: {
          comentarios?: string[] | null
          created_at?: string
          fecha_hora?: string | null
          id?: string
          titulo?: string | null
        }
        Relationships: []
      }
      dependencias: {
        Row: {
          descripcion: string | null
          es_puesto: boolean | null
          id: string
          no: number | null
          nombre: string
          parent_id: string | null
        }
        Insert: {
          descripcion?: string | null
          es_puesto?: boolean | null
          id?: string
          no?: number | null
          nombre: string
          parent_id?: string | null
        }
        Update: {
          descripcion?: string | null
          es_puesto?: boolean | null
          id?: string
          no?: number | null
          nombre?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependencias_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dependencias"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_evaluaciones: {
        Row: {
          aspecto_id: string
          evaluacion_id: string
          fecha_creacion: string
          id: string
          opcion_id: string
          puntuacion_obtenida: number
        }
        Insert: {
          aspecto_id: string
          evaluacion_id: string
          fecha_creacion?: string
          id?: string
          opcion_id: string
          puntuacion_obtenida: number
        }
        Update: {
          aspecto_id?: string
          evaluacion_id?: string
          fecha_creacion?: string
          id?: string
          opcion_id?: string
          puntuacion_obtenida?: number
        }
        Relationships: [
          {
            foreignKeyName: "detalle_evaluaciones_aspecto_id_fkey"
            columns: ["aspecto_id"]
            isOneToOne: false
            referencedRelation: "aspectos_evaluacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_evaluaciones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_evaluaciones_opcion_id_fkey"
            columns: ["opcion_id"]
            isOneToOne: false
            referencedRelation: "opciones_aspecto"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios_evaluacion: {
        Row: {
          activo: boolean
          fecha_creacion: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          fecha_creacion?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          fecha_creacion?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      evaluaciones: {
        Row: {
          esta_completada: boolean
          evaluado_id: string
          evaluador_id: string
          fecha_creacion: string
          formulario_id: string | null
          id: string
          tipo_evaluacion: string
        }
        Insert: {
          esta_completada?: boolean
          evaluado_id: string
          evaluador_id: string
          fecha_creacion?: string
          formulario_id?: string | null
          id?: string
          tipo_evaluacion: string
        }
        Update: {
          esta_completada?: boolean
          evaluado_id?: string
          evaluador_id?: string
          fecha_creacion?: string
          formulario_id?: string | null
          id?: string
          tipo_evaluacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios_evaluacion"
            referencedColumns: ["id"]
          },
        ]
      }
      aspectos_evaluacion: {
        Row: {
          descripcion: string
          dirigido_a: string
          fecha_creacion: string
          formulario_id: string | null
          id: string
          titulo: string
        }
        Insert: {
          descripcion?: string
          dirigido_a?: string
          fecha_creacion?: string
          formulario_id?: string | null
          id?: string
          titulo: string
        }
        Update: {
          descripcion?: string
          dirigido_a?: string
          fecha_creacion?: string
          formulario_id?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "aspectos_evaluacion_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios_evaluacion"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          dias: number[] | null
          entrada: string
          id: string
          nombre: string
          salida: string
        }
        Insert: {
          dias?: number[] | null
          entrada: string
          id?: string
          nombre: string
          salida: string
        }
        Update: {
          dias?: number[] | null
          entrada?: string
          id?: string
          nombre?: string
          salida?: string
        }
        Relationships: []
      }
      info_contrato: {
        Row: {
          bonificacion: number | null
          cargo: string | null
          contrato: string | null
          contrato_no: string | null
          created_at: string | null
          dependencia_id: string | null
          fecha_fin: string | null
          fecha_ini: string | null
          id: string
          renglon: string | null
          salario: number | null
          user_id: string
        }
        Insert: {
          bonificacion?: number | null
          cargo?: string | null
          contrato?: string | null
          contrato_no?: string | null
          created_at?: string | null
          dependencia_id?: string | null
          fecha_fin?: string | null
          fecha_ini?: string | null
          id: string
          renglon?: string | null
          salario?: number | null
          user_id: string
        }
        Update: {
          bonificacion?: number | null
          cargo?: string | null
          contrato?: string | null
          contrato_no?: string | null
          created_at?: string | null
          dependencia_id?: string | null
          fecha_fin?: string | null
          fecha_ini?: string | null
          id?: string
          renglon?: string | null
          salario?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dependencia"
            columns: ["dependencia_id"]
            isOneToOne: false
            referencedRelation: "dependencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_contrato_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      info_usuario: {
        Row: {
          activo: boolean
          cuenta_no: string | null
          direccion: string | null
          dpi: string | null
          igss: string | null
          nit: string | null
          nombre: string | null
          telefono: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean
          cuenta_no?: string | null
          direccion?: string | null
          dpi?: string | null
          igss?: string | null
          nit?: string | null
          nombre?: string | null
          telefono?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean
          cuenta_no?: string | null
          direccion?: string | null
          dpi?: string | null
          igss?: string | null
          nit?: string | null
          nombre?: string | null
          telefono?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_perfil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          accion: string
          descripcion: string | null
          fecha: string | null
          id: string
          modulo_id: string | null
          user_id: string | null
        }
        Insert: {
          accion: string
          descripcion?: string | null
          fecha?: string | null
          id?: string
          modulo_id?: string | null
          user_id?: string | null
        }
        Update: {
          accion?: string
          descripcion?: string | null
          fecha?: string | null
          id?: string
          modulo_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      lugares_clm: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      maestros_municipales: {
        Row: {
          created_at: string | null
          ctd_alumnos: number | null
          id: number
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          ctd_alumnos?: number | null
          id?: number
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          ctd_alumnos?: number | null
          id?: number
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      modulos: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      modulos_roles: {
        Row: {
          id: string
          modulo_id: string
          rol_id: string
        }
        Insert: {
          id?: string
          modulo_id: string
          rol_id: string
        }
        Update: {
          id?: string
          modulo_id?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_roles_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          created_at: string
          fecha: string
          id: number
          id_bien: number
          id_usuario_destino: string | null
          id_usuario_origen: string | null
          id_usuario_registro: string | null
          notas: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: never
          id_bien: number
          id_usuario_destino?: string | null
          id_usuario_origen?: string | null
          id_usuario_registro?: string | null
          notas?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: never
          id_bien?: number
          id_usuario_destino?: string | null
          id_usuario_origen?: string | null
          id_usuario_registro?: string | null
          notas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_id_bien_fkey"
            columns: ["id_bien"]
            isOneToOne: false
            referencedRelation: "bienes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_usuario_destino_fkey"
            columns: ["id_usuario_destino"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_usuario_origen_fkey"
            columns: ["id_usuario_origen"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_usuario_responsable_fkey"
            columns: ["id_usuario_registro"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      opciones_aspecto: {
        Row: {
          aspecto_id: string
          descripcion: string
          fecha_creacion: string
          id: string
          letra_calificacion: string
          valor_puntuacion: number
        }
        Insert: {
          aspecto_id: string
          descripcion?: string
          fecha_creacion?: string
          id?: string
          letra_calificacion: string
          valor_puntuacion: number
        }
        Update: {
          aspecto_id?: string
          descripcion?: string
          fecha_creacion?: string
          id?: string
          letra_calificacion?: string
          valor_puntuacion?: number
        }
        Relationships: [
          {
            foreignKeyName: "opciones_aspecto_aspecto_id_fkey"
            columns: ["aspecto_id"]
            isOneToOne: false
            referencedRelation: "aspectos_evaluacion"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      programas_educativos: {
        Row: {
          anio: number
          descripcion: string | null
          id: number
          lugar: string | null
          maestro_id: number | null
          nombre: string
          parent_id: number | null
        }
        Insert: {
          anio: number
          descripcion?: string | null
          id?: number
          lugar?: string | null
          maestro_id?: number | null
          nombre: string
          parent_id?: number | null
        }
        Update: {
          anio?: number
          descripcion?: string | null
          id?: number
          lugar?: string | null
          maestro_id?: number | null
          nombre?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maestro"
            columns: ["maestro_id"]
            isOneToOne: false
            referencedRelation: "maestros_municipales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programas_educativos_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "programas_educativos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_asistencia: {
        Row: {
          created_at: string
          id: number
          notas: string | null
          tipo_registro: string | null
          ubicacion: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          notas?: string | null
          tipo_registro?: string | null
          ubicacion?: Json | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          notas?: string | null
          tipo_registro?: string | null
          ubicacion?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_asistencia_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_comision: {
        Row: {
          comision_id: string
          created_at: string
          id: string
          notas: string | null
          tipo_registro: string | null
          ubicacion: Json | null
          user_id: string
        }
        Insert: {
          comision_id: string
          created_at?: string
          id?: string
          notas?: string | null
          tipo_registro?: string | null
          ubicacion?: Json | null
          user_id: string
        }
        Update: {
          comision_id?: string
          created_at?: string
          id?: string
          notas?: string | null
          tipo_registro?: string | null
          ubicacion?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_comision_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_comision_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      roles_permisos: {
        Row: {
          permiso_id: string
          rol_id: string
        }
        Insert: {
          permiso_id: string
          rol_id: string
        }
        Update: {
          permiso_id?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_permisos_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_permisos_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_concejo: {
        Row: {
          agenda_concejo_id: string
          categoria_id: string | null
          created_at: string | null
          estado: string | null
          fecha_vencimiento: string | null
          id: string
          notas: string[] | null
          seguimiento: string[] | null
          titulo_item: string
          votacion: string | null
        }
        Insert: {
          agenda_concejo_id: string
          categoria_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          notas?: string[] | null
          seguimiento?: string[] | null
          titulo_item: string
          votacion?: string | null
        }
        Update: {
          agenda_concejo_id?: string
          categoria_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          notas?: string[] | null
          seguimiento?: string[] | null
          titulo_item?: string
          votacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesion_concejo_agenda_concejo_id_fkey"
            columns: ["agenda_concejo_id"]
            isOneToOne: false
            referencedRelation: "agenda_concejo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_concejo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_tareas_concejo"
            referencedColumns: ["id"]
          },
        ]
      }
      transacciones: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha_transaccion: string
          id: number
          id_bien: number
          id_usuario_registro: string
          monto: number
          tipo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha_transaccion?: string
          id?: never
          id_bien: number
          id_usuario_registro: string
          monto: number
          tipo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha_transaccion?: string
          id?: never
          id_bien?: number
          id_usuario_registro?: string
          monto?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_id_bien_fkey"
            columns: ["id_bien"]
            isOneToOne: false
            referencedRelation: "bienes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_id_usuario_responsable_fkey"
            columns: ["id_usuario_registro"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_roles: {
        Row: {
          rol_id: string
          user_id: string
        }
        Insert: {
          rol_id: string
          user_id: string
        }
        Update: {
          rol_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      votos: {
        Row: {
          agenda_item_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
          voto: boolean | null
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          voto?: boolean | null
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          voto?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "votos_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "tareas_concejo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lideres_afiliados: {
        Row: {
          conteoAfiliados: number | null
          direccion: string | null
          dpi: string | null
          id: string | null
          lider_id: string | null
          nacimiento: string | null
          nombre: string | null
          rol: string | null
          sexo: string | null
          telefono: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afiliados_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliados_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "lideres_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_logs: {
        Row: {
          accion: string | null
          descripcion: string | null
          fecha: string | null
          id: string | null
          modulo_id: string | null
          user_id: string | null
          usuario_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vista_usuarios_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_usuarios_detalle: {
        Row: {
          email: string | null
          id: string | null
          nombre: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      correo_ya_registrado: {
        Args: { email_input: string }
        Returns: boolean
      }
      crear_politicas_crud: {
        Args: { nombre_tabla: string }
        Returns: undefined
      }
      obtener_anios_programas: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      obtener_asistencias: {
        Args: { user_id_filtro?: string }
        Returns: {
          created_at: string
          email: string
          id: number
          nombre: string
          notas: string
          programas: string[]
          rol: string
          tipo_registro: string
          ubicacion: Json
          user_id: string
        }[]
      }
      obtener_comisiones: {
        Args: {
          fecha_fin: string
          fecha_inicio: string
          user_id_filtro: string
        }
        Returns: {
          asistentes: Json
          comentarios: Json
          created_at: string
          fecha_hora: string
          id: string
          titulo: string
        }[]
      }
      obtener_horario: {
        Args: { _nombre?: string }
        Returns: {
          dias: number[] | null
          entrada: string
          id: string
          nombre: string
          salida: string
        }[]
      }
      obtener_usuarios: {
        Args: { rol_filtro?: string }
        Returns: {
          activo: boolean
          email: string
          id: string
          nombre: string
          permisos: string[]
          programas_asignados: string[]
          rol: string
        }[]
      }
      obtener_usuarios_por_modulo: {
        Args: { nombre_modulo: string }
        Returns: {
          email: string
          programas_asignados: string[]
          user_id: string
        }[]
      }
      usuario_sesion: {
        Args: { p_user_id: string }
        Returns: {
          activo: boolean
          email: string
          id: string
          modulos: string[]
          nombre: string
          permisos: string[]
          programas: string[]
          rol: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
