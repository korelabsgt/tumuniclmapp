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
      <button
        type="button"
        className="flex h-[4rem] cursor-pointer items-center gap-2 text-left min-w-0 sm:h-16 sm:gap-3"
        onClick={() => setIsModalOpen(true)}
      >
        <Image
          src="/images/logo-muni.png"
          alt="Logo Municipalidad de Concepción Las Minas"
          height={120}
          width={240}
          priority
          className="block h-[3.75rem] w-auto max-w-[7rem] object-contain object-left shrink-0 sm:h-full sm:max-w-[11rem]"
        />
        <div className="min-w-0 flex flex-col justify-center leading-tight overflow-hidden">
          <span
            className="block text-sm sm:text-2xl font-extrabold uppercase tracking-wide text-[#0066cc] dark:text-blue-400 whitespace-nowrap"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            SIGEM -CLM-
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-[#0066cc] leading-snug sm:block sm:max-w-[14rem]">
            Sistema Integral de Gestión Municipal
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/60 dark:bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-6 transition-colors duration-300"
            onClick={() => setIsModalOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full transition-colors cursor-pointer bg-white/50 dark:bg-neutral-800/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white"
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
