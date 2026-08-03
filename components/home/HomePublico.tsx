import React from 'react';
import { PublicHeader } from './ui/PublicHeader';
import { PublicHero } from './ui/PublicHero';
import { PublicContent } from './ui/PublicContent';

export default function HomePublico() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <PublicHero />
      <PublicContent />
    </div>
  );
}
