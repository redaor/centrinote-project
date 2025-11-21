// 🔍 Utilitaire pour débugger les erreurs removeChild
// À utiliser temporairement en dev pour tracer l'origine exacte de l'erreur

export function setupRemoveChildDebug() {
  if (typeof window === 'undefined') return;
  
  // Sauvegarder la méthode originale
  const originalRemoveChild = Node.prototype.removeChild;
  
  // Remplacer par une version instrumentée
  Node.prototype.removeChild = function(this: Node, child: Node) {
    try {
      // Vérifier si l'enfant existe vraiment
      if (!this.contains(child)) {
        console.error('🚨 [REMOVECHILD DEBUG] Tentative de suppression d\'un nœud non-enfant:', {
          parent: this,
          parentTag: (this as any).tagName || this.nodeName,
          parentId: (this as any).id,
          parentClass: (this as any).className,
          child: child,
          childTag: (child as any).tagName || child.nodeName,
          childId: (child as any).id,
          childClass: (child as any).className,
          stack: new Error().stack
        });
        
        // Lancer l'erreur pour capturer la stack trace
        throw new Error(`Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`);
      }
      
      // Appeler la méthode originale
      return originalRemoveChild.call(this, child);
    } catch (error) {
      console.error('🚨 [REMOVECHILD DEBUG] Erreur capturée:', error);
      throw error;
    }
  };
  
  console.log('✅ [DEBUG] removeChild instrumentation activée');
}

export function teardownRemoveChildDebug() {
  // Restaurer la méthode originale si nécessaire
  console.log('🔄 [DEBUG] removeChild instrumentation désactivée');
}