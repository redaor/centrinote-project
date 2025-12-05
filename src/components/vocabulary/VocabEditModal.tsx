import { FC } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  darkMode?: boolean;
};

export const VocabEditModal: FC<Props> = ({ isOpen, onClose, title, children, darkMode = false }) => {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className={`
          relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg shadow-xl
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`
          sticky top-0 z-10 flex items-center justify-between p-4 border-b
          ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
            aria-label="Fermer"
          >
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="p-6 modal-scrollable">{children}</div>
      </div>
    </div>,
    document.body
  );
};
