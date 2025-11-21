/**
 * 🔬 SETTINGS + IA DIAGNOSTIC PAGE
 *
 * Page autonome pour reproduire et isoler les bugs :
 * - Onglets Settings non cliquables
 * - Overlays bloquant les interactions
 * - Messages console qui s'incrémentent en boucle
 * - Inputs sans id/name/label/autocomplete
 *
 * ROUTE: /debug/settings-ia
 *
 * URL PARAMS SUPPORTÉS:
 * - ?killOverlays=1       → Désactive tous les overlays au chargement
 * - ?raiseSettingsZ=1     → Met Settings en z-index 99999
 * - ?silenceLogs=1        → Active le console guard (dé-duplication)
 * - ?muteFormDiag=1       → Coupe les logs "Form offenders"
 * - ?hitTest=1            → Active le hit-test automatique
 *
 * TOGGLES DISPONIBLES:
 * - Kill Overlays         → force pointer-events: none sur overlays
 * - Raise Settings Z      → z-index 99999 + isolation
 * - Silence Logs          → dé-duplication console
 * - Mute Form Diag        → coupe diagnostic formulaires
 *
 * OUTILS:
 * - Hit-test              → document.elementsFromPoint(x, y)
 * - Mutation Observer     → compte nœuds ajoutés/retirés
 * - Form Scanner          → détecte inputs problématiques
 * - Auto-fix (temp)       → applique fix DOM temporaire
 *
 * AUTHOR: Claude Code
 * DATE: 2025-01-20
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings,
  User,
  CreditCard,
  Palette,
  Shield,
  Download,
  AlertCircle,
  Zap,
  Eye,
  Target,
  Scan,
  Wrench,
  BarChart,
  Activity,
  Trash2
} from 'lucide-react';

import {
  installConsoleGuard,
  uninstallConsoleGuard,
  getConsoleStats,
  resetConsoleStats,
  showTopBlockedMessages
} from './consoleGuard';

import {
  scanFormIssues,
  applyTempFix,
  removeTempFixes,
  generateHTMLReport,
  type FormIssue
} from './formAudit';

export default function SettingsIADiagnostic() {
  const [searchParams] = useSearchParams();

  // États des toggles
  const [killOverlays, setKillOverlays] = useState(searchParams.get('killOverlays') === '1');
  const [raiseSettingsZ, setRaiseSettingsZ] = useState(searchParams.get('raiseSettingsZ') === '1');
  const [silenceLogs, setSilenceLogs] = useState(searchParams.get('silenceLogs') === '1');
  const [muteFormDiag, setMuteFormDiag] = useState(searchParams.get('muteFormDiag') === '1');

  // État UI
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [hitTestResult, setHitTestResult] = useState<any>(null);
  const [mutationStats, setMutationStats] = useState({ added: 0, removed: 0 });
  const [formIssues, setFormIssues] = useState<FormIssue[]>([]);
  const [consoleStats, setConsoleStats] = useState({ total: 0, blocked: 0, uniqueMessages: 0 });
  const [fixApplied, setFixApplied] = useState(false);

  const observerRef = useRef<MutationObserver | null>(null);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  // Installer console guard au mount
  useEffect(() => {
    if (silenceLogs) {
      installConsoleGuard({ throttleMs: 1000, maxDuplicates: 1 });
    }

    return () => {
      if (silenceLogs) {
        uninstallConsoleGuard();
      }
    };
  }, [silenceLogs]);

  // Appliquer les toggles
  useEffect(() => {
    applyToggles();
  }, [killOverlays, raiseSettingsZ]);

  // Mutation Observer
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new MutationObserver((mutations) => {
        let added = 0;
        let removed = 0;

        mutations.forEach((mutation) => {
          added += mutation.addedNodes.length;
          removed += mutation.removedNodes.length;
        });

        // Throttle les updates (1 log / 2s max)
        if (throttleRef.current) {
          clearTimeout(throttleRef.current);
        }

        throttleRef.current = setTimeout(() => {
          setMutationStats(prev => ({
            added: prev.added + added,
            removed: prev.removed + removed
          }));
        }, 2000);
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  // Appliquer les toggles aux éléments DOM
  function applyToggles() {
    const settingsRoot = document.querySelector('[data-diagnostic-settings]');
    const overlays = document.querySelectorAll('[data-diagnostic-overlay]');

    // Kill Overlays
    if (killOverlays) {
      overlays.forEach((overlay) => {
        (overlay as HTMLElement).style.pointerEvents = 'none';
        (overlay as HTMLElement).style.display = 'none';
      });
    } else {
      overlays.forEach((overlay) => {
        (overlay as HTMLElement).style.pointerEvents = '';
        (overlay as HTMLElement).style.display = '';
      });
    }

    // Raise Settings Z
    if (raiseSettingsZ && settingsRoot) {
      (settingsRoot as HTMLElement).style.zIndex = '99999';
      (settingsRoot as HTMLElement).style.isolation = 'isolate';
    } else if (settingsRoot) {
      (settingsRoot as HTMLElement).style.zIndex = '';
      (settingsRoot as HTMLElement).style.isolation = '';
    }
  }

  // Hit-test à une position
  function runHitTest(x: number = 200, y: number = 300) {
    const elements = document.elementsFromPoint(x, y);
    const topElement = elements[0];

    if (topElement) {
      const computed = window.getComputedStyle(topElement);
      setHitTestResult({
        tag: topElement.tagName,
        className: topElement.className,
        id: topElement.id || 'none',
        zIndex: computed.zIndex,
        pointerEvents: computed.pointerEvents,
        position: computed.position,
        totalElements: elements.length
      });
    }
  }

  // Scanner les formulaires
  function runFormScan() {
    const issues = scanFormIssues();
    setFormIssues(issues);
    console.table(issues.map(i => ({
      selector: i.selector,
      type: i.type,
      issues: i.issues.join(', '),
      suggestions: i.suggestions.join(', ')
    })));
  }

  // Appliquer fix temporaire
  function handleApplyFix() {
    const result = applyTempFix(formIssues);
    console.log('[AutoFix]', result);
    setFixApplied(true);

    // Re-scanner après fix
    setTimeout(() => {
      runFormScan();
    }, 500);
  }

  // Retirer fix temporaire
  function handleRemoveFix() {
    const removed = removeTempFixes();
    console.log(`[AutoFix] Removed ${removed} temp fixes`);
    setFixApplied(false);
    runFormScan();
  }

  // Mettre à jour stats console
  function updateConsoleStats() {
    if (silenceLogs) {
      const stats = getConsoleStats();
      setConsoleStats({
        total: stats.total,
        blocked: stats.blocked,
        uniqueMessages: stats.uniqueMessages
      });
    }
  }

  // Tabs Settings mock
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'preferences', label: 'Préférences', icon: Palette },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'data', label: 'Données & Confidentialité', icon: Download },
    { id: 'debug', label: 'Debug & API', icon: AlertCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8" />
            Settings + IA Diagnostic
          </h1>
          <p className="text-purple-100">
            Isoler les bugs d'overlays, onglets non cliquables, et messages console en boucle
          </p>
          <div className="mt-4 text-sm font-mono bg-purple-800/30 rounded px-3 py-2">
            Route: /debug/settings-ia | URL params: ?killOverlays=1&raiseSettingsZ=1&silenceLogs=1
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Control Panel
          </h2>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ToggleButton
              label="Kill Overlays"
              enabled={killOverlays}
              onChange={setKillOverlays}
              description="pointer-events: none sur overlays"
            />
            <ToggleButton
              label="Raise Settings Z"
              enabled={raiseSettingsZ}
              onChange={setRaiseSettingsZ}
              description="z-index: 99999 + isolation"
            />
            <ToggleButton
              label="Silence Logs"
              enabled={silenceLogs}
              onChange={setSilenceLogs}
              description="Dé-duplication console"
            />
            <ToggleButton
              label="Mute Form Diag"
              enabled={muteFormDiag}
              onChange={setMuteFormDiag}
              description="Coupe logs formulaires"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <ActionButton
              label="Hit-test (200, 300)"
              icon={<Target className="w-4 h-4" />}
              onClick={() => runHitTest(200, 300)}
            />
            <ActionButton
              label="Scan Forms"
              icon={<Scan className="w-4 h-4" />}
              onClick={runFormScan}
            />
            <ActionButton
              label={fixApplied ? "Remove Fix" : "Auto-fix (temp)"}
              icon={<Wrench className="w-4 h-4" />}
              onClick={fixApplied ? handleRemoveFix : handleApplyFix}
              variant={fixApplied ? "danger" : "success"}
            />
            <ActionButton
              label="Console Stats"
              icon={<BarChart className="w-4 h-4" />}
              onClick={updateConsoleStats}
            />
            <ActionButton
              label="Reset Stats"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                resetConsoleStats();
                setMutationStats({ added: 0, removed: 0 });
                setConsoleStats({ total: 0, blocked: 0, uniqueMessages: 0 });
              }}
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Hit-test Result"
          icon={<Eye className="w-5 h-5" />}
          color="blue"
        >
          {hitTestResult ? (
            <div className="text-xs font-mono space-y-1">
              <div><strong>Tag:</strong> {hitTestResult.tag}</div>
              <div><strong>Class:</strong> {hitTestResult.className || 'none'}</div>
              <div><strong>ID:</strong> {hitTestResult.id}</div>
              <div><strong>z-index:</strong> {hitTestResult.zIndex}</div>
              <div><strong>pointer-events:</strong> {hitTestResult.pointerEvents}</div>
              <div><strong>position:</strong> {hitTestResult.position}</div>
              <div><strong>Total elements:</strong> {hitTestResult.totalElements}</div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Cliquez "Hit-test" pour scanner</div>
          )}
        </StatCard>

        <StatCard
          title="Mutation Observer"
          icon={<Activity className="w-5 h-5" />}
          color="green"
        >
          <div className="text-2xl font-bold">
            +{mutationStats.added} / -{mutationStats.removed}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Nœuds ajoutés / retirés (throttle 2s)
          </div>
        </StatCard>

        <StatCard
          title="Console Stats"
          icon={<BarChart className="w-5 h-5" />}
          color="purple"
        >
          {silenceLogs ? (
            <div className="space-y-1 text-sm">
              <div><strong>Total:</strong> {consoleStats.total}</div>
              <div><strong>Blocked:</strong> {consoleStats.blocked}</div>
              <div><strong>Unique:</strong> {consoleStats.uniqueMessages}</div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Activez "Silence Logs"</div>
          )}
        </StatCard>
      </div>

      {/* Form Issues Panel */}
      {formIssues.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">
              ⚠️ Form Issues ({formIssues.length})
            </h2>
            <div
              className="overflow-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: generateHTMLReport(formIssues) }}
            />
          </div>
        </div>
      )}

      {/* Settings Mock + Overlays */}
      <div className="max-w-7xl mx-auto relative">
        {/* Overlay IA (reproduit le bug) */}
        <div
          data-diagnostic-overlay="ai-overlay"
          className="fixed top-2 right-2 z-50 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 shadow-lg text-white"
          style={{ width: '300px' }}
        >
          <h3 className="font-bold mb-2">🤖 Overlay IA</h3>
          <p className="text-sm opacity-90">
            Overlay fixed top-2 right-2 z-50 (peut bloquer clics)
          </p>
        </div>

        {/* FAB Admin (z-9999) */}
        <div
          data-diagnostic-overlay="fab-admin"
          className="fixed bottom-6 right-6 z-[9999]"
        >
          <button className="w-14 h-14 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-white">
            <Zap className="w-6 h-6" />
          </button>
        </div>

        {/* Gradient decoratif (absolute inset-0) */}
        <div
          data-diagnostic-overlay="gradient-bg"
          className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none"
        />

        {/* Backdrop pulse */}
        <div
          data-diagnostic-overlay="backdrop-pulse"
          className="fixed inset-0 bg-black/5 animate-pulse pointer-events-none"
        />

        {/* Settings Mock */}
        <div
          data-diagnostic-settings="root"
          className="flex gap-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 relative"
        >
          {/* Sidebar */}
          <aside className="w-64 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    console.log(`[Settings] Tab clicked: ${tab.id}`);
                    setActiveTab(tab.id);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <main className="flex-1">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Mock de contenu pour onglet: {activeTab}
              </p>

              {/* Formulaire de test */}
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="test-email" className="block text-sm font-medium mb-2">
                    Email (avec label)
                  </label>
                  <input
                    id="test-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    placeholder="test@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mot de passe (SANS htmlFor - BUG)
                  </label>
                  <input
                    id="test-password"
                    name="password"
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    placeholder="Input SANS id ni name ni label (BUG)"
                  />
                </div>

                <div>
                  <label htmlFor="test-search" className="block text-sm font-medium mb-2">
                    Recherche (sans autocomplete)
                  </label>
                  <input
                    id="test-search"
                    name="search"
                    type="search"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    placeholder="Rechercher..."
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Composants utilitaires
function ToggleButton({
  label,
  enabled,
  onChange,
  description
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  variant = 'default'
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
}) {
  const colors = {
    default: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    danger: 'bg-red-600 hover:bg-red-700'
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${colors[variant]} text-white px-4 py-2 rounded-lg font-medium
        flex items-center gap-2 justify-center transition-colors text-sm
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  title,
  icon,
  color,
  children
}: {
  title: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple';
  children: React.ReactNode;
}) {
  const colors = {
    blue: 'border-blue-200 dark:border-blue-800',
    green: 'border-green-200 dark:border-green-800',
    purple: 'border-purple-200 dark:border-purple-800'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${colors[color]} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
