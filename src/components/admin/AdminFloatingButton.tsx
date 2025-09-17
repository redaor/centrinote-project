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
  if (!isAdmin(user)) {
    return null;
  }

  return (
    <>
      {/* Bouton flottant DEBUG - TRÈS VISIBLE */}
      <button
        onClick={() => {
          console.log("🔧 ADMIN BUTTON CLICKED!");
          setShowAdminPanel(true);
        }}
        className="fixed bottom-6 right-6 z-[9999] bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-2xl border-4 border-yellow-400 animate-pulse"
        title="MODE ADMIN MOBILE - DEBUG"
        style={{
          width: '80px',
          height: '80px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        <div className="flex flex-col items-center justify-center">
          <Settings className="w-8 h-8 mb-1" />
          <span className="text-xs font-bold">ADMIN</span>
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