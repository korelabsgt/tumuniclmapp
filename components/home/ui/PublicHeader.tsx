import React from 'react';
import { Facebook, Instagram, Youtube, Menu } from 'lucide-react';
import { FaTiktok } from 'react-icons/fa';
import { ThemeSwitcher } from '@/components/themes/theme-switcher';

export function PublicHeader() {
  return (
    <header className="absolute top-0 left-0 w-full z-20 px-6 py-4 flex justify-between items-center bg-transparent">
      {/* Left Side: Socials and Text */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <a href="#" className="hover:scale-110 transition-transform"><Facebook className="w-7 h-7 text-[#1877F2]" fill="#1877F2" /></a>
          <a href="#" className="hover:scale-110 transition-transform"><FaTiktok className="w-7 h-7 text-black dark:text-white" /></a>
          <a href="#" className="hover:scale-110 transition-transform"><Instagram className="w-7 h-7 text-[#E4405F]" /></a>
          <a href="#" className="hover:scale-110 transition-transform"><Youtube className="w-7 h-7 text-[#FF0000]" fill="#FF0000" /></a>
        </div>
        <div className="flex flex-col hidden sm:flex">
          <span className="text-[#0070F3] dark:text-blue-400 font-bold text-sm leading-tight cursor-pointer hover:underline">Información pública</span>
          <span className="text-[10px] text-gray-800 dark:text-gray-200 font-medium">Haz click para ver nuestras redes sociales</span>
        </div>
      </div>

      {/* Right Side: Hamburger Menu & Theme Switcher */}
      <div className="flex items-center gap-4">
        <div className="scale-75 origin-right">
          <ThemeSwitcher />
        </div>
        <button className="text-black dark:text-white p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors">
          <Menu className="w-8 h-8" />
        </button>
      </div>
    </header>
  );
}
