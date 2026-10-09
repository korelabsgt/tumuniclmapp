"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Trash2,
  GitBranchPlus,
  ArrowUp,
  ArrowDown,
  UserPlus,
  ChevronsUp,
  ChevronsDown,
  Info,
  Banknote,
  FileText,
} from "lucide-react";
import { EmpleadoItem } from "./EmpleadoItem";
import { Usuario } from "@/lib/usuarios/esquemas";

export interface EmpleadoNode {
  isEmployee: true;
  usuario: Usuario;
}

export interface DependenciaNode {
  id: string;
  no: number;
  nombre: string;
  descripcion: string | null;
  parent_id: string | null;
  anio?: number | null;
  es_puesto: boolean | null;
  renglon?: string | null;
  salario?: number | null;
  bonificacion?: number | null;
  unidades_tiempo?: number | null;
  antiguedad?: number | null;
  isr?: number | null;
  plan_prestaciones?: boolean | null;
  totalPresupuesto?: number;
  children: (DependenciaNode | EmpleadoNode)[];
  prima?: boolean | null;
}

interface DependenciaItemProps {
  node: DependenciaNode;
  rol: string | null;
  onEdit: (d: DependenciaNode) => void;
  onDelete: (id: string) => void;
  onAddSub: (parent: DependenciaNode) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onMoveExtreme: (id: string, direction: "inicio" | "final") => void;
  onAddEmpleado: (parent: DependenciaNode) => void;
  onDeleteEmpleado: (userId: string, dependenciaId: string) => void;
  onOpenInfoPersonal: (usuario: Usuario) => void;
  onOpenContrato: (usuario: Usuario) => void;
  onViewCard: (usuario: Usuario) => void;
  onOpenDescription: (id: string, title: string, description: string) => void;
  onOpenInfoFinanciera: (node: DependenciaNode) => void;
  level: number;
  index: number;
  prefix: string;
  isLast: boolean;
  openNodeIds: string[];
  setOpenNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  siblingCount: number;
}

const DependenciaItem = ({
  node,
  rol,
  onEdit,
  onDelete,
  onAddSub,
  onMove,
  onMoveExtreme,
  onAddEmpleado,
  onDeleteEmpleado,
  onOpenInfoPersonal,
  onOpenContrato,
  onViewCard,
  onOpenDescription,
  onOpenInfoFinanciera,
  level,
  index,
  prefix,
  isLast,
  openNodeIds,
  setOpenNodeIds,
  siblingCount,
}: DependenciaItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isOpen = openNodeIds.includes(node.id);
  const empleadoAsignado = node.children?.find(
    (child) => "isEmployee" in child,
  ) as EmpleadoNode | undefined;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = rol === "SUPER" || rol === "SECRETARIO";
  const isRRHH = rol === "RRHH";
  const isConcejal = rol === "CONCEJAL";

  const canShowMenu = isAdmin || (isRRHH && node.es_puesto);
  const isPuestoDisponible = node.es_puesto && !empleadoAsignado;

  const hasDescription =
    node.descripcion &&
    node.descripcion.replace(/<[^>]*>?/gm, "").trim().length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      setOpenNodeIds((prevIds) =>
        prevIds.includes(node.id)
          ? prevIds.filter((id) => id !== node.id)
          : [...prevIds, node.id],
      );
    }
  };

  const getColorClasses = (level: number) => {
    switch (level % 4) {
      case 0:
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          accent: "bg-blue-500",
          icon: "text-blue-600",
          border: "hover:border-t-blue-500",
        };
      case 1:
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          accent: "bg-red-500",
          icon: "text-red-600",
          border: "hover:border-t-orange-500",
        };
      case 2:
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          accent: "bg-purple-500",
          icon: "text-purple-600",
          border: "hover:border-t-purple-500",
        };
      case 3:
        return {
          bg: "bg-orange-100",
          text: "text-orange-800",
          accent: "bg-orange-500",
          icon: "text-orange-600",
          border: "hover:border-t-orange-500",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          accent: "bg-gray-500",
          icon: "text-gray-600",
          border: "hover:border-t-gray-500",
        };
    }
  };

  let colorConfig;
  if (node.es_puesto) {
    if (empleadoAsignado) {
      colorConfig = {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        accent: "bg-yellow-500",
        icon: "text-yellow-600",
        border: "hover:border-t-yellow-500",
      };
    } else {
      colorConfig = {
        bg: "bg-green-100",
        text: "text-green-800",
        accent: "bg-green-500",
        icon: "text-green-600",
        border: "hover:border-t-green-500",
      };
    }
  } else {
    colorConfig = getColorClasses(level);
  }
  const { bg, text, accent, icon, border } = colorConfig;

  const canMoveUp = index > 0;
  const canMoveDown = index < siblingCount - 1;

  const minWidthStyle = { minWidth: `${1.5 + level * 0.25}rem` };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
    }).format(amount);
  };

  // --- LÓGICA DE CÁLCULO FINANCIERO CORREGIDA ---
  const tienePresupuesto =
    node.renglon ||
    (node.salario && node.salario > 0) ||
    (node.bonificacion && node.bonificacion > 0);

  // Definimos valores base
  const multiplicador =
    node.unidades_tiempo && node.unidades_tiempo > 0 ? node.unidades_tiempo : 1;
  const salarioBase = node.salario || 0;
  const bonificacionBase = node.bonificacion || 0;
  const renglonLower = node.renglon ? node.renglon.toLowerCase() : "";

  let totalFinancieroPuesto = 0;

  // Si es renglon 031 (jornales), el salario se multiplica por unidades (días/horas)
  // pero la bonificación es fija mensual (no se multiplica).
  if (renglonLower.includes("031-dia") || renglonLower.includes("031-hora")) {
    totalFinancieroPuesto = salarioBase * multiplicador + bonificacionBase;
  } else {
    // Para renglones estándar (011, 022, etc), asumimos que el multiplicador (si existe) aplica a todo
    // o generalmente es 1, por lo que (S + B) * 1 funciona igual.
    totalFinancieroPuesto = (salarioBase + bonificacionBase) * multiplicador;
  }
  // ---------------------------------------------

  const totalPresupuestoGeneral = node.totalPresupuesto || 0;

  return (
    <motion.div layout className="w-full relative text-xs py-1">
      {level > 0 && (
        <>
          <span
            className="absolute top-0 w-0.5 bg-slate-300 dark:bg-slate-600"
            style={{
              left: `calc(${level - 1} * 1.5rem + 0.5rem + 0.875rem)`,
              height: isLast ? "1.375rem" : "100%",
            }}
            aria-hidden="true"
          />
          <span
            className="absolute h-0.5 bg-slate-300 dark:bg-slate-600"
            style={{
              top: "1.375rem",
              left: `calc(${level - 1} * 1.5rem + 0.5rem + 0.875rem)`,
              width: "1.5rem",
            }}
            aria-hidden="true"
          />
        </>
      )}
      <div
        className={`flex items-center justify-between p-2 rounded-md transition-colors`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex-grow flex items-center min-w-0">
          <div
            onClick={handleToggle}
            className={`${hasChildren ? "cursor-pointer" : ""}`}
          >
            <DropdownMenu onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild disabled={!canShowMenu}>
                <motion.div
                  whileHover={canShowMenu ? { y: -4 } : {}}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className={`
                      relative flex-shrink-0 h-7 px-2 ${bg} ${text} rounded-md font-bold text-[10px] shadow-sm z-10 p-0
                      flex items-center justify-center 
                      transition-colors
                      border-t-2 border-x-0 border-b-0 border-transparent 
                      ${canShowMenu ? `cursor-pointer ${border}` : "cursor-default"}
                    `}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={minWidthStyle}
                  >
                    {prefix}
                    {hasChildren && (
                      <motion.div
                        className={`absolute bottom-0 -translate-x-1/2 w-4 h-1 ${accent} rounded-full`}
                        animate={{ y: isOpen ? 4 : 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      ></motion.div>
                    )}
                  </div>
                </motion.div>
              </DropdownMenuTrigger>

              {canShowMenu && (
                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={10}
                  className="cursor-pointer"
                >
                  {isAdmin && !node.es_puesto && (
                    <DropdownMenuItem
                      onSelect={() => onAddSub(node)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <GitBranchPlus className={`mr-2 h-4 w-4 ${icon}`} />
                      <span>Añadir Sub-dependencia</span>
                    </DropdownMenuItem>
                  )}

                  {isPuestoDisponible && (isAdmin || isRRHH) && (
                    <DropdownMenuItem
                      onSelect={() => onAddEmpleado(node)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <UserPlus className={`mr-2 h-4 w-4 ${icon}`} />
                      <span>Asignar Empleado</span>
                    </DropdownMenuItem>
                  )}

                  {node.es_puesto && (isAdmin || isRRHH) && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInfoFinanciera(node);
                      }}
                      className="cursor-pointer"
                    >
                      <Banknote className={`mr-2 h-4 w-4 ${icon}`} />
                      <span>Info. Financiera</span>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem
                      onSelect={() => onEdit(node)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Nombre</span>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDescription(
                          node.id,
                          node.nombre,
                          node.descripcion || "",
                        );
                      }}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Descripción</span>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem
                      onSelect={() => onDelete(node.id)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (canMoveUp || canMoveDown) && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="cursor-pointer"
                      >
                        <span>Mover</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {canMoveUp && (
                          <DropdownMenuItem
                            onSelect={() => onMove(node.id, "up")}
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                            className="cursor-pointer"
                          >
                            {" "}
                            <ArrowUp className="mr-2 h-4 w-4" />{" "}
                            <span>Mover Arriba</span>{" "}
                          </DropdownMenuItem>
                        )}
                        {canMoveDown && (
                          <DropdownMenuItem
                            onSelect={() => onMove(node.id, "down")}
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                            className="cursor-pointer"
                          >
                            {" "}
                            <ArrowDown className="mr-2 h-4 w-4" />{" "}
                            <span>Mover Abajo</span>{" "}
                          </DropdownMenuItem>
                        )}
                        {canMoveUp && (
                          <DropdownMenuItem
                            onSelect={() => onMoveExtreme(node.id, "inicio")}
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                            className="cursor-pointer"
                          >
                            {" "}
                            <ChevronsUp className="mr-2 h-4 w-4" />{" "}
                            <span>Mover al inicio</span>{" "}
                          </DropdownMenuItem>
                        )}
                        {canMoveDown && (
                          <DropdownMenuItem
                            onSelect={() => onMoveExtreme(node.id, "final")}
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                            className="cursor-pointer"
                          >
                            {" "}
                            <ChevronsDown className="mr-2 h-4 w-4" />{" "}
                            <span>Mover al final</span>{" "}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>

          <div className="flex flex-col justify-center min-w-0 pl-2">
            <div className="flex items-center gap-2">
              <span
                onClick={handleToggle}
                className={`font-medium text-gray-800 dark:text-white truncate ${hasChildren ? "cursor-pointer" : ""}`}
              >
                {node.nombre}
              </span>

              {hasDescription && (
                <div
                  role="button"
                  tabIndex={0}
                  className="flex-shrink-0 h-6 w-6 text-gray-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onOpenDescription(node.id, node.nombre, node.descripcion!);
                  }}
                >
                  <Info className={`h-4 w-4`} />
                </div>
              )}
            </div>

            {!node.es_puesto && totalPresupuestoGeneral > 0 && (
              <div className="text-[11px] leading-tight mt-1.5">
                <div className="pt-1 border-t border-gray-200/70 dark:border-gray-700/50 font-bold text-green-600 dark:text-green-500">
                  {formatMoney(totalPresupuestoGeneral)}
                </div>
              </div>
            )}

            {node.es_puesto && (
              <div className="text-[11px] leading-tight mt-1.5">
                {tienePresupuesto ? (
                  <div className="flex flex-wrap items-center gap-x-1.5 pt-1 border-t border-gray-200/70 dark:border-gray-700/50 text-gray-600 dark:text-gray-400">
                    {node.renglon && (
                      <span
                        className="font-bold text-gray-700 dark:text-gray-300"
                        title="Renglón"
                      >
                        {node.renglon}
                      </span>
                    )}

                    {node.renglon && (node.salario || node.bonificacion) && (
                      <span className="text-gray-300 dark:text-gray-600">
                        |
                      </span>
                    )}

                    {(node.salario || node.bonificacion) && (
                      <>
                        <span
                          className="font-bold text-green-600 dark:text-green-500"
                          title="Total Mensual Estimado"
                        >
                          {formatMoney(totalFinancieroPuesto)}
                        </span>

                        {node.renglon?.includes("031-dia") && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 ml-1 font-medium">
                            ({formatMoney(node.salario || 0)} / Día)
                          </span>
                        )}

                        {node.renglon?.includes("031-hora") && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 ml-1 font-medium">
                            ({formatMoney(node.salario || 0)} / Hora)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-amber-600/70 dark:text-amber-500 font-medium italic text-[10px]">
                    Sin información financiera
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((child, childIndex) => {
              if ("isEmployee" in child) {
                if (isConcejal) return null;
                return (
                  <EmpleadoItem
                    key={child.usuario.id}
                    empleado={child.usuario}
                    level={level + 1}
                    onDelete={() =>
                      onDeleteEmpleado(child.usuario.id, node.id)
                    }
                    onOpenInfoPersonal={onOpenInfoPersonal}
                    onViewCard={onViewCard}
                    rol={rol}
                  />
                );
              } else {
                return (
                  <DependenciaItem
                    key={child.id}
                    node={child}
                    rol={rol}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddSub={onAddSub}
                    onMove={onMove}
                    onMoveExtreme={onMoveExtreme}
                    onAddEmpleado={onAddEmpleado}
                    onDeleteEmpleado={onDeleteEmpleado}
                    onOpenInfoPersonal={onOpenInfoPersonal}
                    onOpenContrato={onOpenContrato}
                    onViewCard={onViewCard}
                    onOpenDescription={onOpenDescription}
                    onOpenInfoFinanciera={onOpenInfoFinanciera}
                    level={level + 1}
                    index={childIndex}
                    prefix={`${prefix}.${child.no}`}
                    isLast={
                      childIndex ===
                      node.children.filter((c) => !("isEmployee" in c)).length -
                        1
                    }
                    openNodeIds={openNodeIds}
                    setOpenNodeIds={setOpenNodeIds}
                    siblingCount={
                      node.children.filter((c) => !("isEmployee" in c)).length
                    }
                  />
                );
              }
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DependenciaItem;
