"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toBlob } from "html-to-image";
import { motion } from "framer-motion";
import DependenciaForm, { type FormData } from "./forms/Dependencia";
import EmpleadoForm from "./forms/Empleado";
import InfoPersonalForm, { InfoPersonalFormData } from "./forms/InfoPersonal";
import ContratoForm, { ContratoFormData } from "./forms/Contrato";
import InfoFinancieraForm, {
  InfoFinancieraFormData,
} from "./forms/InfoFinanciera";
import TarjetaEmpleado from "./TarjetaEmpleado";
import DescriptionModal from "./DescriptionModal";
import DependenciaList from "./DependenciaList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Download, ChevronsUpDown } from "lucide-react";
import Swal from "sweetalert2";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/lib/database.types";
import { useDependencias } from "@/hooks/dependencias/useDependencias";
import { useListaUsuarios } from "@/hooks/usuarios/useListarUsuarios";
import {
  useInfoUsuario,
  useInfoUsuarios,
  InfoUsuario,
} from "@/hooks/usuarios/useInfoUsuario";
import useUserData from "@/hooks/sesion/useUserData";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DependenciaNode } from "./DependenciaItem";
import { Usuario } from "@/lib/usuarios/esquemas";

type BaseDependencia = Database["public"]["Tables"]["dependencias"]["Row"];
export type Dependencia = BaseDependencia & {
  renglon?: string | null;
  salario?: number | null;
  bonificacion?: number | null;
  unidades_tiempo?: number | null;
  antiguedad?: number | null;
};
type UserWithDependency = Usuario & { dependencia_id: string | null };

function buildDependencyTree(
  dependencias: Dependencia[],
  infoUsuarios: InfoUsuario[],
  usuarios: Usuario[],
): DependenciaNode[] {
  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const nodeMap = new Map<string, DependenciaNode>();
  const roots: DependenciaNode[] = [];

  dependencias.forEach((dep) => {
    nodeMap.set(dep.id, {
      ...dep,
      no: dep.no ?? 0,
      children: [],
      renglon: dep.renglon,
      salario: dep.salario,
      bonificacion: dep.bonificacion,
      unidades_tiempo: dep.unidades_tiempo,
      antiguedad: (dep as any).antiguedad,
    });
  });

  dependencias.forEach((dep) => {
    if (dep.parent_id && nodeMap.has(dep.parent_id)) {
      const parent = nodeMap.get(dep.parent_id);
      if (parent) {
        parent.children.push(nodeMap.get(dep.id)!);
      }
    } else {
      roots.push(nodeMap.get(dep.id)!);
    }
  });

  infoUsuarios.forEach((info: InfoUsuario) => {
    const parentNode = nodeMap.get(info.dependencia_id as string);
    const usuario = userMap.get(info.user_id);
    if (parentNode && usuario) {
      parentNode.children.push({ isEmployee: true, usuario: usuario as any });
    }
  });

  nodeMap.forEach((node) => {
    node.children.sort((a, b) => {
      const aIsDep = !("isEmployee" in a);
      const bIsDep = !("isEmployee" in b);
      if (aIsDep && bIsDep) {
        return a.no - b.no;
      }
      if (aIsDep && !bIsDep) return -1;
      if (!aIsDep && bIsDep) return 1;
      return 0;
    });
  });

  roots.sort((a, b) => a.no - b.no);

  return roots;
}

function calculateBudgetTotals(node: DependenciaNode): number {
  let total = 0;

  if (node.es_puesto) {
    const multiplicador =
      node.unidades_tiempo && node.unidades_tiempo > 0
        ? node.unidades_tiempo
        : 1;

    total += ((node.salario || 0) + (node.bonificacion || 0)) * multiplicador;
  }

  if (node.children) {
    node.children.forEach((child) => {
      if (!("isEmployee" in child)) {
        total += calculateBudgetTotals(child);
      }
    });
  }

  (node as any).totalPresupuesto = total;
  return total;
}

const getAllIds = (nodes: DependenciaNode[]): string[] => {
  let ids: string[] = [];
  nodes.forEach((node) => {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      const childrenNodes = node.children.filter(
        (c) => !("isEmployee" in c),
      ) as DependenciaNode[];
      ids = ids.concat(getAllIds(childrenNodes));
    }
  });
  return ids;
};

const findNodeById = (
  nodes: DependenciaNode[],
  id: string,
): DependenciaNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const childrenNodes = node.children.filter(
      (c) => !("isEmployee" in c),
    ) as DependenciaNode[];
    const found = findNodeById(childrenNodes, id);
    if (found) return found;
  }
  return null;
};

const getDescendantIds = (node: DependenciaNode, ids: Set<string>) => {
  node.children.forEach((child) => {
    if (!("isEmployee" in child)) {
      ids.add(child.id);
      getDescendantIds(child, ids);
    }
  });
};

const getSelectableDependencies = (
  allDependenciasRaw: Dependencia[],
  allInfoUsuarios: InfoUsuario[],
  allUsuarios: Usuario[],
  editingDependencia: DependenciaNode | null,
) => {
  const fullTree = buildDependencyTree(
    allDependenciasRaw,
    allInfoUsuarios,
    allUsuarios,
  );
  const nodesToExclude = new Set<string>();
  if (editingDependencia) {
    nodesToExclude.add(editingDependencia.id);
    const nodeInTree = findNodeById(fullTree, editingDependencia.id);
    if (nodeInTree) {
      getDescendantIds(nodeInTree, nodesToExclude);
    }
  }
  const result: any[] = [];
  const buildFlattenedList = (
    nodes: DependenciaNode[],
    level: number,
    parentPrefix: string = "",
  ) => {
    nodes.forEach((node) => {
      const isEmployeeNode = "isEmployee" in node;
      const isPuesto = !isEmployeeNode && node.es_puesto;
      const currentPrefix = parentPrefix
        ? `${parentPrefix}.${node.no}`
        : `${node.no}`;
      if (!nodesToExclude.has(node.id) && !isEmployeeNode && !isPuesto) {
        result.push({
          id: node.id,
          nombre: node.nombre,
          level: level,
          prefix: currentPrefix,
        });
      }
      const childrenNodes = (node.children ?? []).filter(
        (c) => !("isEmployee" in c),
      ) as DependenciaNode[];
      if (childrenNodes.length > 0) {
        buildFlattenedList(childrenNodes, level + 1, currentPrefix);
      }
    });
  };
  buildFlattenedList(fullTree, 0);
  return result;
};

export default function Ver() {
  const { rol } = useUserData();
  const {
    usuarios,
    loading: loadingUsuarios,
    fetchUsuarios,
  } = useListaUsuarios() as unknown as {
    usuarios: UserWithDependency[];
    loading: boolean;
    fetchUsuarios: () => void;
  };
  const {
    dependencias: dependenciasRaw,
    loading: loadingDependencias,
    mutate: mutateDependencias,
  } = useDependencias();
  const {
    infoUsuarios,
    loading: loadingInfo,
    mutate: mutateInfoUsuarios,
  } = useInfoUsuarios();
  const dependencias = dependenciasRaw as unknown as Dependencia[];
  const supabase = createClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDependencia, setEditingDependencia] =
    useState<DependenciaNode | null>(null);
  const [preselectedParentId, setPreselectedParentId] = useState<string | null>(
    null,
  );

  const [isInfoFinancieraOpen, setIsInfoFinancieraOpen] = useState(false);
  const [dependenciaFinanciera, setDependenciaFinanciera] =
    useState<DependenciaNode | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [dependenciaParaEmpleado, setDependenciaParaEmpleado] =
    useState<DependenciaNode | null>(null);
  const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [areAllOpen, setAreAllOpen] = useState(false);
  const [isInfoPersonalOpen, setIsInfoPersonalOpen] = useState(false);
  const [isContratoOpen, setIsContratoOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [usuarioIdParaTarjeta, setUsuarioIdParaTarjeta] = useState<
    string | null
  >(null);
  const { cargando: cargandoDatosTarjeta } =
    useInfoUsuario(usuarioIdParaTarjeta);
  const [isTarjetaOpen, setIsTarjetaOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    id: "",
    title: "",
    description: "",
  });
  const hasPermission = rol === "SUPER" || rol === "SECRETARIO";
  const [canShowActions, setCanShowActions] = useState(false);

  useEffect(() => {
    setCanShowActions(true);
  }, []);

  const { usuario: datosCompletosParaForm } = useInfoUsuario(
    selectedUsuario ? selectedUsuario.id : null,
  );

  useEffect(() => {
    const isAnyModalOpen =
      isFormOpen ||
      isInfoPersonalOpen ||
      isContratoOpen ||
      isTarjetaOpen ||
      !!dependenciaParaEmpleado ||
      descriptionModalOpen ||
      isInfoFinancieraOpen;
    if (isAnyModalOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [
    isFormOpen,
    isInfoPersonalOpen,
    isContratoOpen,
    isTarjetaOpen,
    dependenciaParaEmpleado,
    descriptionModalOpen,
    isInfoFinancieraOpen,
  ]);

  const handleExportar = async () => {
    if (exportRef.current === null) {
      return;
    }
    setIsExporting(true);
    try {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "visible";
      const originalHeight = exportRef.current.style.height;
      exportRef.current.style.height = "auto";
      const logoElement = document.getElementById("export-logo");
      if (logoElement) logoElement.classList.remove("hidden");

      const allIds = getAllIds(finalTree);
      const originalOpenNodeIds = [...openNodeIds];
      setOpenNodeIds(allIds);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const blob = await toBlob(exportRef.current, {
        quality: 0.95,
        backgroundColor: "white",
        style: { overflow: "visible" },
      });

      setOpenNodeIds(originalOpenNodeIds);
      if (logoElement) logoElement.classList.add("hidden");
      exportRef.current.style.height = originalHeight;
      document.body.style.overflow = originalOverflow;

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "organigrama-municipal.png";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Organigrama exportado correctamente.");
      } else {
        toast.error("No se pudo generar la imagen.");
      }
    } catch (err) {
      console.error("Error al exportar:", err);
      toast.error("Error al exportar el organigrama.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleAll = () => {
    if (areAllOpen) {
      setOpenNodeIds([]);
    } else {
      const allIds = getAllIds(finalTree);
      setOpenNodeIds(allIds);
    }
    setAreAllOpen(!areAllOpen);
  };
  const handleOpenForm = (dependencia: DependenciaNode | null = null) => {
    setEditingDependencia(dependencia);
    setPreselectedParentId(null);
    setIsFormOpen(true);
  };
  const handleOpenSubForm = (parent: DependenciaNode) => {
    setEditingDependencia(null);
    setPreselectedParentId(parent.id);
    setIsFormOpen(true);
  };
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDependencia(null);
    setPreselectedParentId(null);
  };

  const handleOpenInfoFinanciera = (node: DependenciaNode) => {
    setDependenciaFinanciera(node);
    setIsInfoFinancieraOpen(true);
  };
  const handleCloseInfoFinanciera = () => {
    setIsInfoFinancieraOpen(false);
    setDependenciaFinanciera(null);
  };

  const handleSubmitInfoFinanciera = async (data: InfoFinancieraFormData) => {
    if (!dependenciaFinanciera) return;
    const { error: depError } = await supabase
      .from("dependencias")
      .update({
        renglon: data.renglon,
        salario: data.salario,
        bonificacion: data.bonificacion,
        prima: data.prima,
        unidades_tiempo: data.unidades_tiempo,
        antiguedad: data.antiguedad,
        isr: data.isr,
        plan_prestaciones: data.plan_prestaciones,
      })
      .eq("id", dependenciaFinanciera.id);

    if (depError) {
      toast.error("Error al guardar información financiera.");
      return;
    }

    // Lógica para guardar las fechas en la tabla 'contrato'
    if (data.fecha_inicio) {
      // 1. Encontrar quién es el empleado asignado actualmente a este puesto
      // infoUsuarios ya está disponible en este componente
      const empleadoAsignado = infoUsuarios?.find(
        (info: InfoUsuario) => info.dependencia_id === dependenciaFinanciera.id
      );

      if (empleadoAsignado) {
        // 2. Verificar si ya existe un contrato activo (para no duplicar si solo editaron el salario)
        const { data: contratosExistentes } = await supabase
          .from("contrato")
          .select("id")
          .eq("user_id", empleadoAsignado.user_id)
          .eq("dependencia_id", dependenciaFinanciera.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (contratosExistentes && contratosExistentes.length > 0) {
          // Existe, lo actualizamos
          await supabase
            .from("contrato")
            .update({
              fecha_inicio: data.fecha_inicio,
              fecha_fin: data.fecha_fin || null,
            })
            .eq("id", contratosExistentes[0].id);
        } else {
          // No existe, creamos uno nuevo
          await supabase
            .from("contrato")
            .insert({
              user_id: empleadoAsignado.user_id,
              dependencia_id: dependenciaFinanciera.id,
              fecha_inicio: data.fecha_inicio,
              fecha_fin: data.fecha_fin || null,
            });
        }
      } else {
         // Podrías mostrar una alerta si intentan asignar contrato pero el puesto está vacío
         toast.warn("Fechas de contrato ignoradas: no hay un empleado asignado a este puesto aún.", { autoClose: 6000 });
      }
    }

    toast.success("Información financiera y contrato guardados.");
    handleCloseInfoFinanciera();
    mutateDependencias();
  };

  const handleSubmit = async (formData: FormData) => {
    const isEditing = !!editingDependencia;
    const dataToSubmit = {
      nombre: formData.nombre,
      parent_id: formData.parent_id ?? null,
      descripcion: formData.descripcion || null,
      es_puesto: formData.es_puesto || false,
    };
    let error: any = null;
    if (isEditing && editingDependencia) {
      const oldParentId = editingDependencia.parent_id ?? null;
      const newParentId = formData.parent_id ?? null;
      if (oldParentId !== newParentId) {
        const { error: updateError } = await supabase
          .from("dependencias")
          .update(dataToSubmit)
          .eq("id", editingDependencia.id);
        if (updateError) {
          error = updateError;
        } else {
          const { error: rpcError } = await supabase.rpc(
            "cambiar_padre_y_reordenar_dependencia",
            { id_a_mover: editingDependencia.id, nuevo_parent_id: newParentId },
          );
          error = rpcError;
        }
      } else {
        const { error: updateError } = await supabase
          .from("dependencias")
          .update(dataToSubmit)
          .eq("id", editingDependencia.id);
        error = updateError;
      }
    } else {
      let query = supabase
        .from("dependencias")
        .select("no", { count: "exact" });
      const parentId = formData.parent_id ?? null;
      if (parentId) {
        query = query.eq("parent_id", parentId);
      } else {
        query = query.is("parent_id", null);
      }
      const { count } = await query;
      const { error: insertError } = await supabase
        .from("dependencias")
        .insert({ ...dataToSubmit, no: (count || 0) + 1 });
      error = insertError;
    }
    if (error) {
      toast.error("Ocurrió un error al guardar.");
    } else {
      handleCloseForm();
      mutateDependencias();
      toast.success("Guardado correctamente");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "No podrá revertir esto.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const { error } = await supabase.rpc("eliminar_dependencia_y_reordenar", {
        id_a_eliminar: id,
      });
      if (error) {
        toast.error("Ocurrió un error al eliminar la dependencia.");
      } else {
        await mutateDependencias();
      }
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const { error } = await supabase.rpc("mover_dependencia", {
      id_a_mover: id,
      direccion: direction,
    });
    if (error) {
      toast.error("Ocurrió un error al reordenar.");
    } else {
      await mutateDependencias();
    }
  };

  const handleMoveExtreme = async (
    id: string,
    direction: "inicio" | "final",
  ) => {
    const { error } = await supabase.rpc("mover_dependencia_extremo", {
      id_a_mover: id,
      direccion: direction,
    });
    if (error) {
      toast.error("Ocurrió un error al reordenar.");
    } else {
      await mutateDependencias();
    }
  };

  const handleOpenEmpleadoModal = (dependencia: DependenciaNode) => {
    setDependenciaParaEmpleado(dependencia);
  };
  const handleCloseEmpleadoModal = () => {
    setDependenciaParaEmpleado(null);
  };
  const handleSaveEmpleado = async (
    newUserId: string,
    dependenciaId: string,
  ) => {
    const oldAssignment = infoUsuarios.find(
      (info: InfoUsuario) => info.dependencia_id === dependenciaId,
    );
    if (oldAssignment && oldAssignment.user_id !== newUserId) {
      const { error: unassignError } = await supabase
        .from("info_usuario")
        .update({ dependencia_id: null })
        .eq("user_id", oldAssignment.user_id);
      if (unassignError) {
        toast.error("Error al desasignar al empleado anterior.");
        handleCloseEmpleadoModal();
        return;
      }
    }
    const { error: assignError } = await supabase
      .from("info_usuario")
      .update({ dependencia_id: dependenciaId })
      .eq("user_id", newUserId);
    if (assignError) {
      toast.error("Error al asignar el empleado.");
    } else {
      const usuario = usuarios.find((u) => u.id === newUserId);
      const dependencia = findNodeById(finalTree, dependenciaId);
      toast.success(
        `"${usuario?.nombre}" fue añadido a "${dependencia?.nombre}"`,
      );
      mutateInfoUsuarios();
    }
    handleCloseEmpleadoModal();
  };
  const handleDeleteEmpleado = async (userId: string) => {
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "El empleado será desasignado de este puesto.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, desasignar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
    });
    if (result.isConfirmed) {
      const { error } = await supabase
        .from("info_usuario")
        .update({ dependencia_id: null })
        .eq("user_id", userId);
      if (error) {
        toast.error("Error al desasignar al empleado.");
      } else {
        toast.success("Empleado desvinculado de la dependencia.");
        mutateInfoUsuarios();
      }
    }
  };
  const handleOpenInfoPersonal = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsInfoPersonalOpen(true);
  };
  const handleOpenContrato = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsContratoOpen(true);
  };
  const handleCloseModals = () => {
    setIsInfoPersonalOpen(false);
    setIsContratoOpen(false);
    setSelectedUsuario(null);
  };
  const handleOpenTarjeta = (usuario: Usuario) => {
    setUsuarioIdParaTarjeta(usuario.id);
    setIsTarjetaOpen(true);
  };
  const handleCloseTarjeta = () => {
    setIsTarjetaOpen(false);
    setUsuarioIdParaTarjeta(null);
  };
  const handleOpenDescriptionModal = (
    id: string,
    title: string,
    description: string,
  ) => {
    setModalContent({ id, title, description });
    setDescriptionModalOpen(true);
  };
  const handleCloseDescriptionModal = () => {
    setDescriptionModalOpen(false);
    setModalContent({ id: "", title: "", description: "" });
  };
  const handleSaveDescription = async (content: string) => {
    if (!modalContent.id) return;
    const { error } = await supabase
      .from("dependencias")
      .update({ descripcion: content })
      .eq("id", modalContent.id);
    if (error) {
      toast.error("Error al guardar la descripción.");
    } else {
      toast.success("Descripción actualizada.");
      mutateDependencias();
    }
  };

  const handleSubmitInfoPersonal = async (data: InfoPersonalFormData) => {
    if (!selectedUsuario) return;
    const { error } = await supabase
      .from("info_usuario")
      .update({
        direccion: data.direccion,
        telefono: data.telefono,
        dpi: data.dpi,
        nit: data.nit,
        igss: data.igss,
        cuenta_no: data.cuenta_no,
      })
      .eq("user_id", selectedUsuario.id);
    if (error) {
      toast.error("Error al guardar la información personal.");
    } else {
      toast.success("Información guardada.");
      handleCloseModals();
      mutateInfoUsuarios();
      fetchUsuarios();
    }
  };
  const handleSubmitContrato = async (data: ContratoFormData) => {
    if (!selectedUsuario) return;
    const { error } = await supabase
      .from("info_contrato")
      .insert({ ...data, user_id: selectedUsuario.id });
    if (error) {
      toast.error("Error al guardar el contrato.");
    } else {
      toast.success("Contrato guardado.");
      handleCloseModals();
    }
  };

  const finalTree = useMemo(() => {
    if (!dependencias || !infoUsuarios || !usuarios) return [];
    const filteredDependencias = !searchTerm
      ? dependencias
      : (() => {
          const lowercasedTerm = searchTerm.toLowerCase();
          const dependencyMap = new Map(dependencias.map((d) => [d.id, d]));
          const visibleIds = new Set<string>();
          dependencias.forEach((dep) => {
            if (
              dep.nombre.toLowerCase().includes(lowercasedTerm) ||
              (dep.descripcion || "").toLowerCase().includes(lowercasedTerm)
            ) {
              visibleIds.add(dep.id);
              let current = dep;
              while (
                current.parent_id &&
                dependencyMap.has(current.parent_id)
              ) {
                current = dependencyMap.get(current.parent_id)!;
                visibleIds.add(current.id);
              }
            }
          });
          return dependencias.filter((d) => visibleIds.has(d.id));
        })();
    const tree = buildDependencyTree(
      filteredDependencias,
      infoUsuarios,
      usuarios as Usuario[],
    );
    tree.forEach((rootNode) => {
      calculateBudgetTotals(rootNode);
    });
    return tree;
  }, [dependencias, searchTerm, infoUsuarios, usuarios]);

  const selectableDependencias = useMemo(() => {
    if (!dependencias || !infoUsuarios || !usuarios) return [];
    return getSelectableDependencies(
      dependencias,
      infoUsuarios,
      usuarios as Usuario[],
      editingDependencia,
    );
  }, [dependencias, infoUsuarios, usuarios, editingDependencia]);
  const empleadosAsignadosParaForm = useMemo(() => {
    if (!infoUsuarios || !dependencias) return [];
    const puestoMap = new Map(dependencias.map((dep) => [dep.id, dep.nombre]));
    return infoUsuarios
      .filter(
        (info) => info.dependencia_id && puestoMap.has(info.dependencia_id),
      )
      .map((info) => ({
        userId: info.user_id,
        puestoNombre: puestoMap.get(info.dependencia_id!)!,
        puestoId: info.dependencia_id!,
      }));
  }, [infoUsuarios, dependencias]);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="flex flex-col md:flex-row items-center mb-6 gap-2 md:gap-4">
        <h1 className="text-lg lg:text-2xl font-bold text-blue-600 dark:text-blue-400 text-center md:text-left whitespace-nowrap">
          Organización Municipal 🏛️
        </h1>
        <div className="relative w-full flex-grow exclude-from-capture">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full text-xs"
          />
        </div>
        <div className="w-full md:w-auto flex items-center gap-2 exclude-from-capture">
          {canShowActions && hasPermission && (
            <Button
              onClick={() => handleOpenForm()}
              className="w-full text-xs md:w-auto bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Nueva Dependencia
            </Button>
          )}
          <Button
            onClick={handleExportar}
            disabled={isExporting}
            className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-200"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleToggleAll}
            className="text-xs bg-green-100 text-green-800 hover:bg-green-200"
          >
            <motion.div
              animate={{ rotate: areAllOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronsUpDown className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      </div>
      <div ref={exportRef} className="pb-10">
        <div id="export-logo" className="hidden text-center mb-4">
          <img
            src="/images/logo-muni.png"
            alt="Logo Municipalidad"
            className="h-40 w-auto inline-block"
          />
          <h2 className="text-2xl font-bold mt-2 text-blue-600">
            Organización Municipal
          </h2>
        </div>

        {isFormOpen && (
          <DependenciaForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={handleSubmit}
            initialData={editingDependencia}
            todasLasDependencias={dependencias}
            preselectedParentId={preselectedParentId}
            selectableDependencies={selectableDependencias}
          />
        )}

        <InfoFinancieraForm
          isOpen={isInfoFinancieraOpen}
          onClose={handleCloseInfoFinanciera}
          onSubmit={handleSubmitInfoFinanciera}
          dependencia={dependenciaFinanciera}
        />

        <DependenciaList
          dependencias={finalTree}
          rol={rol}
          onEdit={handleOpenForm}
          onDelete={handleDelete}
          onAddSub={handleOpenSubForm}
          onMove={handleMove}
          onMoveExtreme={handleMoveExtreme}
          onAddEmpleado={handleOpenEmpleadoModal}
          onDeleteEmpleado={handleDeleteEmpleado}
          onOpenInfoPersonal={handleOpenInfoPersonal}
          onOpenContrato={handleOpenContrato}
          onViewCard={handleOpenTarjeta}
          onOpenDescription={handleOpenDescriptionModal}
          onOpenInfoFinanciera={handleOpenInfoFinanciera}
          openNodeIds={openNodeIds}
          setOpenNodeIds={setOpenNodeIds}
        />

        <EmpleadoForm
          isOpen={!!dependenciaParaEmpleado}
          onClose={handleCloseEmpleadoModal}
          dependencia={dependenciaParaEmpleado}
          usuarios={usuarios}
          empleadosAsignados={empleadosAsignadosParaForm}
          todasLasDependencias={dependencias}
          onSave={handleSaveEmpleado}
        />
        <InfoPersonalForm
          isOpen={isInfoPersonalOpen}
          onClose={handleCloseModals}
          onSubmit={handleSubmitInfoPersonal}
          usuario={selectedUsuario}
          initialData={datosCompletosParaForm || undefined}
        />
        <ContratoForm
          isOpen={isContratoOpen}
          onClose={handleCloseModals}
          onSubmit={handleSubmitContrato}
          usuario={selectedUsuario}
          initialData={null}
        />
        <TarjetaEmpleado
          isOpen={isTarjetaOpen}
          onClose={handleCloseTarjeta}
          userId={usuarioIdParaTarjeta}
        />
        <DescriptionModal
          isOpen={descriptionModalOpen}
          onClose={handleCloseDescriptionModal}
          onSave={handleSaveDescription}
          title={modalContent.title}
          description={modalContent.description}
        />
      </div>
    </div>
  );
}
