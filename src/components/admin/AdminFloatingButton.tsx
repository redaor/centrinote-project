import React, { useState } from 'react';
import { Settings, Smartphone } from 'lucide-react';
import { AdminMobileInterface } from './AdminMobileInterface';
import { useAdminMode } from './AdminMobileInterface';

interface AdminFloatingButtonProps {
  user: any;
}

export function AdminFloatingButton({ user }: AdminFloatingButtonProps) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { isAdmin } = useAdminMode();

  // Seulement visible pour l'administrateur
  if (!isAdmin(user)) return null;

  return (
    <>
      {/* Bouton flottant discret */}
      <button
        onClick={() => setShowAdminPanel(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
        title="Mode Administrateur Mobile"
      >
        <div className="relative">
          <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          <Smartphone className="w-3 h-3 absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-0.5" />
        </div>
      </button>

      {/* Interface Admin */}
      <AdminMobileInterface
        user={user}
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </>
  );
}