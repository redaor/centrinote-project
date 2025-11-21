/**
 * Page de recherche et chat IA
 * Point d'entrée principal pour l'IA générative dans Centrinote
 */

import React from 'react';
import { AIChat } from '../components/ai/AIChat';

export function AISearchPage() {
  return (
    <div className="h-full w-full" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AIChat />
    </div>
  );
}

export default AISearchPage;

