import React from 'react';

export function PublicHero() {
  return (
    <section 
      className="relative w-full h-[65vh] min-h-[500px] flex flex-col justify-center items-center text-center overflow-hidden bg-blue-100 dark:bg-neutral-900"
    >
      {/* Background Image Placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1542224566-6e85f2e10624?q=80&w=1920&auto=format&fit=crop')",
        }}
      />
      
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 dark:from-black/50 to-transparent"></div>

      {/* Hero Content */}
      <div className="relative z-10 -mt-10 px-4 drop-shadow-lg text-gray-900 dark:text-white">
        <h1 
          className="text-4xl md:text-5xl lg:text-6xl mb-2" 
          style={{ fontFamily: "'Brush Script MT', cursive, serif" }}
        >
          ¡Hoy! Concepción Avanza
        </h1>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Gobierno Municipal
        </h2>
        <h3 className="text-xl md:text-2xl lg:text-3xl font-medium mt-1">
          2024-2028
        </h3>
      </div>
    </section>
  );
}
