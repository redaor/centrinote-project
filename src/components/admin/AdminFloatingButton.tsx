import React, { useState } from 'react';
import { Settings, Smartphone } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AdminMobileInterface } from './AdminMobileInterface';
import { useAdminMode } from './AdminMobileInterface';

interface AdminFloatingButtonProps {
  user: any;
}

export function AdminFloatingButton({ user }: AdminFloatingButtonProps) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { isAdmin } = useAdminMode();
  const location = useLocation();

  // Seulement visible pour l'administrateur
  if (!isAdmin(user)) {
    return null;
  }

  // Masquer le FAB sur certaines pages pour éviter les conflits de clics
  const pagesToHide = ['/settings', '/vocabulary'];
  const shouldHide = pagesToHide.some(page => location.pathname === page || location.pathname.startsWith(page + '/'));
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Wrapper avec pointer-events-none pour ne pas bloquer les clics */}
      <div className="fab-admin-wrapper fixed bottom-6 right-6 z-50 pointer-events-none">
        {/* Bouton flottant DEBUG - TRÈS VISIBLE */}
        <button
          onClick={() => {
            console.log("🔧 ADMIN BUTTON CLICKED!");
            setShowAdminPanel(true);
          }}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-2xl border-4 border-yellow-400 animate-pulse pointer-events-auto"
          title="MODE ADMIN MOBILE - DEBUG"
          style={{
            width: '80px',
            height: '80px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          aria-label="ADMIN"
        >
          <div className="flex flex-col items-center justify-center">
            <Settings className="w-8 h-8 mb-1" />
            <span className="text-xs font-bold">ADMIN</span>
          </div>
        </button>
      </div>

      {/* Interface Admin */}
      <AdminMobileInterface
        user={user}
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </>
  );
}