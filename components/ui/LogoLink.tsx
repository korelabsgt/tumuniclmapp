"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const typeWriterVariant: Variants = {
  hidden: { width: 0, opacity: 0 },
  visible: (i: number) => {
    const duration = i === 1 ? 0.5 : 0.8;
    let delay = 0;

    if (i === 1) delay = 0.2;
    if (i === 2) delay = 0.8;

    return {
      width: "fit-content",
      opacity: 1,
      transition: {
        duration: duration,
        delay: delay,
        ease: "linear",
      },
    };
  },
};

const whooshVariant: Variants = {
  hidden: {
    x: -100,
    opacity: 0,
    filter: "blur(10px)",
    skewX: -20,
  },
  visible: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    skewX: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: 1.8,
    },
  },
};

export default function LogoLink({ iconOnly = false }: { iconOnly?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center gap-1"
        onClick={() => setIsModalOpen(true)}
      >
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.17, 0.67, 0.83, 0.67] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.2,
              type: "spring",
              damping: 12,
              stiffness: 100,
            }}
          >
            <Image
              src="/images/logo-muni.png"
              alt="Logo Municipalidad de Concepción Las Minas"
              height={100}
              width={100}
              priority
              className="block w-[200px] lg:w-60 drop-shadow-md"
            />
          </motion.div>

          {!iconOnly && (
            <>
              {/* Versión Móvil */}
              <div className="md:hidden flex flex-col items-center text-center mt-[-15px] mb-4">
                <motion.span
                  className="text-[10px] font-extrabold uppercase tracking-wider relative overflow-hidden inline-block whitespace-nowrap text-[#0066cc]  transition-colors"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                  variants={typeWriterVariant}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
                  SIGEM -CLM-
                  <motion.span
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "linear",
                      delay: 1,
                    }}
                    style={{ mixBlendMode: "soft-light" }}
                  />
                </motion.span>
              </div>

              {/* Versión Escritorio */}
              <div className="hidden md:inline-block leading-tight text-left">
                <motion.span
                  className="block text-3xl mb-0 font-extrabold uppercase tracking-wide relative overflow-hidden whitespace-nowrap text-[#0066cc]  transition-colors"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                  variants={typeWriterVariant}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
                  SIGEM -CLM-
                  <motion.span
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "linear",
                      delay: 1,
                    }}
                    style={{ mixBlendMode: "soft-light" }}
                  />
                </motion.span>

                <motion.span
                  className="block text-xl font-medium text-gray-600 dark:text-gray-300 mt-[-2px] whitespace-nowrap overflow-hidden transition-colors"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  variants={typeWriterVariant}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  Sistema Integral de Gestión Municipal
                </motion.span>

                <motion.span
                  className="block font-semibold text-lg mt-1 whitespace-nowrap overflow-hidden text-[#0066cc] transition-colors"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  variants={whooshVariant}
                  initial="hidden"
                  animate="visible"
                >
                  Municipalidad de Concepción Las Minas
                </motion.span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Fondo oscuro semitransparente en Dark Mode
            className="fixed inset-0 z-[9999] bg-white/60 dark:bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-6 transition-colors duration-300"
            onClick={() => setIsModalOpen(false)}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full transition-colors bg-white/50 dark:bg-neutral-800/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={32} />
            </button>

            <div
              className="flex flex-col items-center text-center gap-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Image
                  src="/images/logo-muni.png"
                  alt="Logo Grande"
                  width={500}
                  height={500}
                  className="w-full lg:w-[25rem] h-auto drop-shadow-2xl"
                />
              </motion.div>

              <div className="flex flex-col items-center mt-6">
                <motion.span
                  className="text-4xl font-extrabold uppercase tracking-widest whitespace-nowrap overflow-hidden block text-[#0066cc] transition-colors"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                  variants={typeWriterVariant}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
                  SIGEM -CLM-
                </motion.span>

                <motion.span
                  className="text-xl lg:text-2xl font-medium text-gray-600 dark:text-gray-300 mt-2 whitespace-nowrap overflow-hidden block transition-colors"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  variants={typeWriterVariant}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  Sistema Integral de Gestión Municipal
                </motion.span>

                <motion.span
                  className="text-lg lg:text-2xl font-bold mt-1 whitespace-nowrap block text-[#0066cc] transition-colors"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  variants={whooshVariant}
                  initial="hidden"
                  animate="visible"
                >
                  Municipalidad de Concepción Las Minas
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
