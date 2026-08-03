"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signInAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import Image from "next/image";
import { MagicCard } from "@/components/ui/magic-card";
import { AuroraText } from "@/components/ui/aurora-text";
import LogoLink from "@/components/ui/LogoLink";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { DotPattern } from "@/components/ui/dot-pattern";

const initialState = {
  type: null,
  message: "",
};

export function LoginForm() {
  const { theme } = useTheme();
  const [state, formAction] = useActionState(signInAction, initialState);
  const [verPassword, setVerPassword] = useState(false);
  const [emailValue, setEmailValue] = useState(state?.email || "");
  const [passwordValue, setPasswordValue] = useState("");

  const handleEmailBlur = () => {
    if (emailValue && !emailValue.includes("@")) {
      setEmailValue(emailValue.trim() + "@tumuniclm.com");
    }
  };

  return (
    <div className="relative w-full flex flex-col justify-center items-center bg-white dark:bg-neutral-950 px-4 pt-5 gap-6 min-h-screen transition-colors duration-300 overflow-hidden">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        )}
      />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg rounded-2xl shadow-xl dark:shadow-black/50 dark:border dark:border-neutral-800"
      >
        <MagicCard gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"} className="relative w-full flex flex-col overflow-hidden [&>div.bg-background]:bg-white [&>div.bg-background]:dark:bg-black">
          <div className="w-full px-6 py-8 flex flex-col items-center justify-center text-center border-b border-gray-200 dark:border-neutral-800 transition-colors bg-transparent z-10">
            <div className="mb-6 flex justify-center w-full">
              <LogoLink iconOnly={true} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <AuroraText>Bienvenido de nuevo</AuroraText>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          <div className="w-full p-6 flex flex-col justify-center bg-transparent transition-colors z-10">
            <form action={formAction} className="flex flex-col gap-5">
              {state?.type === "error" && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border dark:border-red-800/50 text-center text-sm border border-red-200 min-h-[50px] flex items-center justify-center">
                  <Typewriter
                    words={[state.message || ""]}
                    loop={1}
                    cursor
                    cursorStyle="_"
                    typeSpeed={40}
                    key={state.message}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Escriba aquí su usuario"
                  required
                  className="py-4 text-sm bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 focus:dark:border-blue-500 focus:dark:ring-blue-500/20"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onBlur={handleEmailBlur}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={verPassword ? "text" : "password"}
                    placeholder="Escriba aquí su contraseña"
                    required
                    className="py-4 pr-10 text-sm bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 focus:dark:border-blue-500 focus:dark:ring-blue-500/20"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(!verPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    aria-label="Mostrar/Ocultar contraseña"
                  >
                    {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="-mx-6 px-6 pt-5 mt-1 border-t border-gray-200 dark:border-neutral-800">
                <SubmitButton
                  pendingText="Verificando..."
                  className="w-full py-2.5 rounded-md font-medium text-sm bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black transition-colors"
                >
                  Entrar
                </SubmitButton>
              </div>
            </form>
          </div>
        </MagicCard>
      </motion.div>
    </div>
  );
}
