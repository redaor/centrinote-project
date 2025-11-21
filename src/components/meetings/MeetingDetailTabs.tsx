// 📑 Barre d'onglets pour la page de détail d'une réunion
import React from 'react';
import { Info, Users, FileText } from 'lucide-react';

interface MeetingDetailTabsProps {
  meetingId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function MeetingDetailTabs({ meetingId, activeTab, setActiveTab }: MeetingDetailTabsProps) {
  const tabs = [
    { id: 'info', label: 'Informations', icon: Info },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'summary', label: 'Résumé & Transcription', icon: FileText },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
