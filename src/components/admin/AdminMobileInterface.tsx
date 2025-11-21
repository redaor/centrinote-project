import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Smartphone, 
  Monitor, 
  Tablet,
  Maximize2,
  Minimize2,
  Zap,
  Eye,
  Code,
  Terminal,
  Activity,
  Users,
  Database,
  Wifi,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AdminMobileInterfaceProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileInterface({ user, isOpen, onClose }: AdminMobileInterfaceProps) {
  const [mobileView, setMobileView] = useState(false);
  const [currentViewport, setCurrentViewport] = useState('desktop');
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [touchEventsLog, setTouchEventsLog] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    viewport: '',
    userAgent: '',
    screenSize: '',
    networkType: 'unknown'
  });

  const ADMIN_EMAIL = "reda_sahraoui@outlook.fr";
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Viewports de test
  const viewports = {
    mobile: { width: '375px', height: '667px', name: 'iPhone SE' },
    mobileLarge: { width: '414px', height: '896px', name: 'iPhone 11' },
    tablet: { width: '768px', height: '1024px', name: 'iPad' },
    desktop: { width: '100%', height: '100vh', name: 'Desktop' }
  };

  // Collecte des métriques
  useEffect(() => {
    if (!isAdmin || !isOpen) return;

    const updateMetrics = () => {
      setPerformanceMetrics({
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        screenSize: `${screen.width}x${screen.height}`,
        networkType: (navigator as any).connection?.effectiveType || 'unknown'
      });
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [isAdmin, isOpen]);

  // Logger des événements touch (pour debug)
  useEffect(() => {
    if (!isAdmin || !mobileView) return;

    const logTouchEvent = (e: TouchEvent) => {
      const timestamp = new Date().toLocaleTimeString();
      const eventType = e.type;
      const touches = e.touches.length;
      setTouchEventsLog(prev => 
        [`${timestamp} - ${eventType} (${touches} touches)`, ...prev].slice(0, 10)
      );
    };

    document.addEventListener('touchstart', logTouchEvent);
    document.addEventListener('touchmove', logTouchEvent);
    document.addEventListener('touchend', logTouchEvent);

    return () => {
      document.removeEventListener('touchstart', logTouchEvent);
      document.removeEventListener('touchmove', logTouchEvent);
      document.removeEventListener('touchend', logTouchEvent);
    };
  }, [isAdmin, mobileView]);

  if (!isAdmin || !isOpen) return null;

  const handleViewportChange = (viewport: string) => {
    setCurrentViewport(viewport);
    setMobileView(viewport !== 'desktop');
    
    const rootElement = document.getElementById('root');
    if (rootElement) {
      if (viewport === 'desktop') {
        rootElement.style.width = '100%';
        rootElement.style.height = '100vh';
        rootElement.style.margin = '0';
        rootElement.style.border = 'none';
        rootElement.style.overflow = 'auto';
      } else {
        const vp = viewports[viewport as keyof typeof viewports];
        rootElement.style.width = vp.width;
        rootElement.style.height = vp.height;
        rootElement.style.margin = '20px auto';
        rootElement.style.border = '1px solid #333';
        rootElement.style.borderRadius = '20px';
        rootElement.style.overflow = 'hidden';
        rootElement.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm pointer-events-auto" aria-hidden="true">
      <div className="fixed top-4 right-4 w-96 max-h-[90vh] overflow-y-auto pointer-events-auto">
        <Card className="bg-gray-900 text-white border-purple-500/50">
          {/* Header Admin */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-purple-400">Mode Admin Mobile</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Info Admin */}
          <div className="p-4 bg-purple-900/20 border-b border-gray-700">
            <div className="text-xs text-purple-300 mb-2">👨‍💻 Administrateur authentifié</div>
            <div className="text-sm font-mono text-green-400">{user.email}</div>
            <div className="text-xs text-gray-400 mt-1">Production: centrinote.fr</div>
          </div>

          {/* Simulateur Viewport */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <Smartphone className="w-4 h-4 mr-2 text-blue-400" />
              Simulateur Mobile
            </h3>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(viewports).map(([key, viewport]) => (
                <Button
                  key={key}
                  variant={currentViewport === key ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => handleViewportChange(key)}
                  className="text-xs p-2"
                >
                  {key === 'mobile' && <Smartphone className="w-3 h-3 mr-1" />}
                  {key === 'tablet' && <Tablet className="w-3 h-3 mr-1" />}
                  {key === 'desktop' && <Monitor className="w-3 h-3 mr-1" />}
                  {viewport.name}
                </Button>
              ))}
            </div>

            {mobileView && (
              <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                📱 Mode mobile actif: {viewports[currentViewport as keyof typeof viewports]?.width}
              </div>
            )}
          </div>

          {/* Debug Tools */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => setDebugPanelOpen(!debugPanelOpen)}
              className="w-full flex items-center justify-between text-sm font-semibold mb-3 hover:text-purple-400"
            >
              <div className="flex items-center">
                <Terminal className="w-4 h-4 mr-2 text-green-400" />
                Outils Debug Mobile
              </div>
              {debugPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {debugPanelOpen && (
              <div className="space-y-4">
                {/* Métriques Performance */}
                <div className="bg-gray-800 p-3 rounded text-xs space-y-1">
                  <div className="text-blue-400 font-semibold mb-2">📊 Métriques Temps Réel</div>
                  <div>Viewport: <span className="text-green-400">{performanceMetrics.viewport}</span></div>
                  <div>Network: <span className="text-green-400">{performanceMetrics.networkType}</span></div>
                  <div>Screen: <span className="text-green-400">{performanceMetrics.screenSize}</span></div>
                </div>

                {/* Touch Events Log */}
                {mobileView && touchEventsLog.length > 0 && (
                  <div className="bg-gray-800 p-3 rounded text-xs">
                    <div className="text-yellow-400 font-semibold mb-2">👆 Events Touch</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {touchEventsLog.map((event, i) => (
                        <div key={i} className="text-gray-300 font-mono text-[10px]">
                          {event}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Fixes */}
                <div className="space-y-2">
                  <div className="text-cyan-400 font-semibold text-xs mb-2">⚡ Quick Fixes</div>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        document.documentElement.style.fontSize = mobileView ? '14px' : '16px';
                      }}
                      className="text-xs p-1"
                    >
                      📝 Font Size
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const buttons = document.querySelectorAll('button');
                        buttons.forEach(btn => {
                          if (mobileView) {
                            btn.style.minHeight = '44px';
                            btn.style.minWidth = '44px';
                          }
                        });
                      }}
                      className="text-xs p-1"
                    >
                      👆 Touch Targets
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const containers = document.querySelectorAll('.container, .max-w-7xl, .max-w-6xl');
                        containers.forEach(el => {
                          if (mobileView) {
                            (el as HTMLElement).style.padding = '8px';
                          }
                        });
                      }}
                      className="text-xs p-1"
                    >
                      📐 Spacing
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-xs p-1"
                    >
                      🔄 Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Rapides */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-400" />
              Actions Rapides
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const logs = document.querySelectorAll('[data-debug]');
                  logs.forEach(el => el.remove());
                }}
                className="text-xs"
              >
                🧹 Clear Logs
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.vibrate?.(100); // Test vibration mobile
                }}
                className="text-xs"
              >
                📳 Test Vibration
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const isDark = document.documentElement.classList.contains('dark');
                  document.documentElement.classList.toggle('dark', !isDark);
                }}
                className="text-xs"
              >
                🌓 Toggle Theme
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const info = {
                    url: window.location.href,
                    viewport: performanceMetrics.viewport,
                    timestamp: new Date().toISOString()
                  };
                  navigator.clipboard?.writeText(JSON.stringify(info, null, 2));
                }}
                className="text-xs"
              >
                📋 Copy Debug
              </Button>
            </div>
          </div>

          {/* Mobile Interface Preview */}
          {mobileView && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <Eye className="w-4 h-4 mr-2 text-pink-400" />
                Preview Mobile
              </h3>
              
              <div className="bg-gray-800 p-3 rounded space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Device:</span>
                  <span className="text-green-400">{viewports[currentViewport as keyof typeof viewports]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dimensions:</span>
                  <span className="text-green-400">{viewports[currentViewport as keyof typeof viewports]?.width}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="text-yellow-400">Mobile Simulation</span>
                </div>
              </div>
            </div>
          )}

          {/* Testing Tools */}
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-red-400" />
              Tests Interface
            </h3>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Test responsive breakpoints
                  const breakpoints = ['320px', '375px', '414px', '768px', '1024px'];
                  breakpoints.forEach((width, i) => {
                    setTimeout(() => {
                      const root = document.getElementById('root');
                      if (root && mobileView) {
                        root.style.width = width;
                      }
                    }, i * 1000);
                  });
                }}
                className="w-full text-xs justify-start"
              >
                📏 Test Responsive Breakpoints
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Highlight touch targets < 44px
                  const elements = document.querySelectorAll('button, a, [onclick], [role="button"]');
                  elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 44 || rect.height < 44) {
                      (el as HTMLElement).style.outline = '2px solid red';
                      (el as HTMLElement).style.outlineOffset = '2px';
                    }
                  });
                  setTimeout(() => {
                    elements.forEach(el => {
                      (el as HTMLElement).style.outline = '';
                      (el as HTMLElement).style.outlineOffset = '';
                    });
                  }, 3000);
                }}
                className="w-full text-xs justify-start"
              >
                👆 Highlight Touch Targets
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Test scroll performance
                  const scrollableElements = document.querySelectorAll('[class*="overflow"], [class*="scroll"]');
                  scrollableElements.forEach(el => {
                    (el as HTMLElement).style.scrollBehavior = 'smooth';
                    (el as HTMLElement).style.overflowY = 'auto';
                  });
                }}
                className="w-full text-xs justify-start"
              >
                📜 Optimize Scroll Performance
              </Button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-gray-800 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>🔧 Mode Admin Actif</span>
              <span className="text-purple-400">centrinote.fr</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Hook pour détection admin
export function useAdminMode() {
  const ADMIN_EMAIL = "reda_sahraoui@outlook.fr";
  
  return {
    isAdmin: (user: any) => user?.email === ADMIN_EMAIL,
    ADMIN_EMAIL
  };
}