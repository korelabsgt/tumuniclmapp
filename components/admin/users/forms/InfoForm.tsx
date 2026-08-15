"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  Calendar,
  CircleDollarSign,
  Fingerprint,
  Hash,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";
import { MODAL_FIELD_CLASS, ModalInput } from "@/components/ui/general-modal";
import {
  CAMPO_MONO_CLASS,
  CAMPO_SUBMIT_BTN_CLASS,
  CampoFormulario,
} from "./CampoFormulario";
import { useInfoForm } from "./hooks";

type InfoFormData = {
  telefono: string;
  dpi: string;
  nit: string;
  igss: string;
  cuenta_no: string;
  direccion: string;
  nacimiento: string;
};

type InfoFormUser = {
  id?: string;
  user_id?: string;
  telefono?: string | null;
  dpi?: string | null;
  nit?: string | null;
  igss?: string | null;
  cuenta_no?: string | null;
  direccion?: string | null;
  nacimiento?: string | null;
};

export default function InfoForm({ userData }: { userData: InfoFormUser }) {
  const userId = userData?.id || userData?.user_id || "";

  const { usuarioData, isLoadingData, handleSave, isSaving } =
    useInfoForm(userId);

  const [formData, setFormData] = useState<InfoFormData>({
    telefono: "",
    dpi: "",
    nit: "",
    igss: "",
    cuenta_no: "",
    direccion: "",
    nacimiento: "",
  });
  const [original, setOriginal] = useState<InfoFormData>({
    telefono: "",
    dpi: "",
    nit: "",
    igss: "",
    cuenta_no: "",
    direccion: "",
    nacimiento: "",
  });

  const cleanNumbers = (val: string) => val.toString().replace(/\D/g, "");

  const snapshotDesdeDatos = (datos: InfoFormUser): InfoFormData => ({
    telefono: cleanNumbers(datos.telefono || ""),
    dpi: cleanNumbers(datos.dpi || ""),
    nit: cleanNumbers(datos.nit || ""),
    igss: cleanNumbers(datos.igss || ""),
    cuenta_no: cleanNumbers(datos.cuenta_no || ""),
    direccion: datos.direccion || "",
    nacimiento: datos.nacimiento
      ? String(datos.nacimiento).split("T")[0]
      : "",
  });

  const formatPhoneDisplay = (val: string) => {
    const clean = cleanNumbers(val).slice(0, 8);
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  };

  const formatDPIDisplay = (val: string) => {
    const clean = cleanNumbers(val).slice(0, 13);
    if (clean.length <= 4) return clean;
    if (clean.length <= 9) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    return `${clean.slice(0, 4)} ${clean.slice(4, 9)} ${clean.slice(9)}`;
  };

  const formatEveryFour = (val: string) => {
    return cleanNumbers(val)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  useLayoutEffect(() => {
    const datos = usuarioData || userData;

    if (datos) {
      const snapshot = snapshotDesdeDatos(datos);
      setFormData(snapshot);
      setOriginal(snapshot);
    }
  }, [usuarioData, userData]);

  const hayCambios = useMemo(
    () =>
      formData.telefono !== original.telefono ||
      formData.dpi !== original.dpi ||
      formData.nit !== original.nit ||
      formData.igss !== original.igss ||
      formData.cuenta_no !== original.cuenta_no ||
      formData.direccion !== original.direccion ||
      formData.nacimiento !== original.nacimiento,
    [formData, original],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (["telefono", "dpi", "igss", "nit", "cuenta_no"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: cleanNumbers(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hayCambios || isSaving) return;
    handleSave(formData);
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col gap-3 py-1" aria-busy>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 pt-1">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
        <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  const igssComoDpi =
    formData.igss === formData.dpi && formData.igss !== "";

  return (
    <form
      onSubmit={onSubmit}
      className="flex animate-in flex-col gap-3 py-1 duration-500 fade-in"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CampoFormulario icon={Calendar} label="Fecha de nacimiento">
          <ModalInput
            type="date"
            name="nacimiento"
            value={formData.nacimiento}
            onChange={handleChange}
          />
        </CampoFormulario>

        <CampoFormulario icon={Phone} label="Teléfono">
          <ModalInput
            type="tel"
            name="telefono"
            value={formatPhoneDisplay(formData.telefono)}
            onChange={handleChange}
            inputMode="numeric"
            autoComplete="tel"
            className={CAMPO_MONO_CLASS}
          />
        </CampoFormulario>

        <CampoFormulario icon={Fingerprint} label="DPI">
          <ModalInput
            type="text"
            name="dpi"
            value={formatDPIDisplay(formData.dpi)}
            onChange={handleChange}
            inputMode="numeric"
            className={CAMPO_MONO_CLASS}
          />
        </CampoFormulario>

        <CampoFormulario icon={Hash} label="NIT">
          <ModalInput
            type="text"
            name="nit"
            value={formatEveryFour(formData.nit)}
            onChange={handleChange}
            inputMode="numeric"
            className={CAMPO_MONO_CLASS}
          />
        </CampoFormulario>

        <CampoFormulario icon={Shield} label="Afiliación IGSS">
          <ModalInput
            type="text"
            name="igss"
            value={
              igssComoDpi
                ? formatDPIDisplay(formData.igss)
                : formData.igss
            }
            onChange={handleChange}
            inputMode="numeric"
            className={igssComoDpi ? CAMPO_MONO_CLASS : MODAL_FIELD_CLASS}
          />
        </CampoFormulario>

        <CampoFormulario icon={CircleDollarSign} label="No. cuenta (Banrural)">
          <ModalInput
            type="text"
            name="cuenta_no"
            value={formatEveryFour(formData.cuenta_no)}
            onChange={handleChange}
            inputMode="numeric"
            className={CAMPO_MONO_CLASS}
          />
        </CampoFormulario>

        <CampoFormulario
          icon={MapPin}
          label="Dirección de residencia"
          className="md:col-span-2"
        >
          <ModalInput
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
          />
        </CampoFormulario>
      </div>

      <button
        type="submit"
        disabled={!hayCambios || isSaving}
        className={CAMPO_SUBMIT_BTN_CLASS}
      >
        {isSaving ? "Guardando..." : "Guardar información personal"}
      </button>
    </form>
  );
}
