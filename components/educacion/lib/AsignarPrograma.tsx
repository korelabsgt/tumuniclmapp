"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  Loader2,
  Search,
  UserCheck,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  obtenerUsuariosPorModulo,
  obtenerProgramasEducativos,
  actualizarAsignaciones,
} from "./serverActions";

interface UserProfile {
  user_id: string;
  nombre: string;
  email: string;
  programas_asignados: string[] | null;
}

interface ProgramaEducativo {
  id: number;
  nombre: string;
  anio: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 5;

export default function AsignarPrograma({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [filterAssigned, setFilterAssigned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["educacion", "asignar-programas"],
    queryFn: async () => {
      const usersData = await obtenerUsuariosPorModulo("EDUCACION");
      const sortedUsers = [...(usersData || [])].sort((a, b) => {
        const left = String(
          (a as UserProfile).nombre || (a as UserProfile).email || "",
        );
        const right = String(
          (b as UserProfile).nombre || (b as UserProfile).email || "",
        );
        return left.localeCompare(right);
      });
      const programsData = await obtenerProgramasEducativos();
      return {
        users: sortedUsers as UserProfile[],
        programs: (programsData || []) as ProgramaEducativo[],
      };
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  const allUsers = data?.users ?? [];
  const availablePrograms = data?.programs ?? [];

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(new Date().getFullYear().toString());
      setSelectedProgram("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProgram) {
      const usersWithProgram = allUsers.filter((user) =>
        (user.programas_asignados || []).includes(selectedProgram),
      );
      const ids = usersWithProgram.map((user) => user.user_id);
      setSelectedUserIds(ids);
    } else {
      setSelectedUserIds([]);
    }
  }, [selectedProgram, allUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, filterAssigned, selectedProgram]);

  const uniqueYears = useMemo(() => {
    const years = availablePrograms
      .map((p) => p.anio)
      .filter((y, i, self) => y && self.indexOf(y) === i)
      .sort((a, b) => b - a);
    return years;
  }, [availablePrograms]);

  const filteredPrograms = useMemo(() => {
    if (!selectedYear) return [];
    return availablePrograms.filter((p) => p.anio?.toString() === selectedYear);
  }, [availablePrograms, selectedYear]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setSelectedProgram("");
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProgram(e.target.value);
  };

  const handleSwitchChange = (userId: string, isChecked: boolean) => {
    setSelectedUserIds((prevIds) =>
      isChecked ? [...prevIds, userId] : prevIds.filter((id) => id !== userId),
    );
  };

  const handleUpdate = async () => {
    if (!selectedProgram) {
      toast.error("Seleccione un programa primero.");
      return;
    }
    setSaving(true);

    const usersOriginallyAssigned = allUsers
      .filter((user) =>
        (user.programas_asignados || []).includes(selectedProgram),
      )
      .map((user) => user.user_id);

    const toAssign = selectedUserIds.filter(
      (userId) => !usersOriginallyAssigned.includes(userId),
    );
    const toUnassign = usersOriginallyAssigned.filter(
      (userId) => !selectedUserIds.includes(userId),
    );

    const result = await actualizarAsignaciones(
      selectedProgram,
      toAssign,
      toUnassign,
    );

    if (result.success) {
      toast.success("Programas actualizados correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["educacion", "asignar-programas"],
      });
    } else {
      toast.error(`Error al actualizar: ${result.message}`);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const term = userSearchTerm.toLowerCase();
  let filteredUsers = allUsers.filter(
    (user) =>
      (user.nombre && user.nombre.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)),
  );

  if (filterAssigned) {
    filteredUsers = filteredUsers.filter((user) =>
      (user.programas_asignados || []).includes(selectedProgram),
    );
  }

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const usersCurrentlyAssignedToSelected = allUsers
    .filter((user) =>
      (user.programas_asignados || []).includes(selectedProgram),
    )
    .map((u) => u.user_id);

  const currentSelectionJSON = JSON.stringify(selectedUserIds.sort());
  const originalSelectionJSON = JSON.stringify(
    usersCurrentlyAssignedToSelected.sort(),
  );
  const hasChanges = currentSelectionJSON !== originalSelectionJSON;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm overflow-y-auto md:overflow-hidden">
      <motion.div
        className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-5xl md:h-[85vh] h-auto flex flex-col md:flex-row overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-full md:w-1/3 bg-slate-50 dark:bg-neutral-950 p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-neutral-800 flex flex-col gap-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
              Asignación
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure el acceso a los programas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" /> Ciclo Escolar
              </label>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-100"
              >
                <option value="">-- Seleccionar --</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <BookOpen className="w-4 h-4" /> Programa Educativo
              </label>
              <select
                value={selectedProgram}
                onChange={handleProgramChange}
                disabled={!selectedYear}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">-- Seleccionar --</option>
                {filteredPrograms.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-auto pt-6 flex flex-col gap-3">
            <Button
              onClick={handleUpdate}
              disabled={saving || !hasChanges || !selectedProgram}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full dark:bg-transparent dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Cerrar
            </Button>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-6 flex flex-col h-full bg-white dark:bg-neutral-900 relative">
          {!selectedProgram ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-0 md:h-full text-gray-400 dark:text-neutral-600">
              <BookOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-center">
                Seleccione un programa
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                    Usuarios en{" "}
                    <span className="text-blue-600">{selectedProgram}</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedUserIds.length} seleccionados
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
                  <button
                    onClick={() => setFilterAssigned(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!filterAssigned ? "bg-white dark:bg-neutral-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterAssigned(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterAssigned ? "bg-white dark:bg-neutral-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"}`}
                  >
                    Asignados
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filtrar por nombre o correo..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700"
                />
              </div>

              <div className="md:flex-grow md:overflow-y-auto space-y-2 custom-scrollbar min-h-[300px] md:min-h-0">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No se encontraron usuarios</p>
                  </div>
                ) : (
                  <>
                    {paginatedUsers.map((user) => (
                      <div
                        key={user.user_id}
                        onClick={() =>
                          handleSwitchChange(
                            user.user_id,
                            !selectedUserIds.includes(user.user_id),
                          )
                        }
                        className={`
                        group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                        ${
                          selectedUserIds.includes(user.user_id)
                            ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30"
                            : "bg-white border-gray-100 hover:border-gray-300 dark:bg-neutral-800/50 dark:border-neutral-800 dark:hover:border-neutral-700"
                        }
                      `}
                      >
                        <div className="flex flex-col overflow-hidden mr-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {user.nombre || "Sin Nombre"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </span>
                        </div>
                        <div
                          className={`
                          w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                          ${
                            selectedUserIds.includes(user.user_id)
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 group-hover:border-gray-400 dark:border-neutral-600"
                          }
                        `}
                        >
                          {selectedUserIds.includes(user.user_id) && (
                            <UserCheck className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {!loading && filteredUsers.length > 0 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-neutral-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Página {currentPage} de {totalPages} ({filteredUsers.length}{" "}
                    total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {saving && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-full shadow-lg">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
