/**
 * 🧠 Module IA Intelligent pour Centrinote
 * Analyse contextuelle avancée pour notes et vocabulaire
 * Compatible avec l'architecture React/TypeScript existante
 */

import { aiService } from './aiService';

class CentrinoteAI {
  constructor() {
    console.log('🚀 CentrinoteAI - Module chargé');
    
    this.motsClesNotes = [
      'note', 'résume', 'révision', 'rappel', 'cours', 'leçon', 
      'chapitre', 'explication', 'comprendre', 'revoir', 'étude',
      'résumé', 'synthèse', 'fiche', 'document'
    ];
    
    this.motsClesVocab = [
      'vocabulaire', 'mot', 'définition', 'terme', 'expression',
      'signification', 'sens', 'lexique', 'dictionnaire', 'traduis',
      'traduction', 'expliquer', 'signifie'
    ];

    // Configuration des URLs depuis .env
    this.webhookUrl = import.meta.env.VITE_N8N_DISCUSSION_URL;
    
    if (!this.webhookUrl) {
      console.warn('⚠️ VITE_N8N_DISCUSSION_URL non configuré dans .env');
    }
  }

  /**
   * 🎯 Fonction principale d'analyse contextuelle
   * Adapte la structure des données Centrinote existantes
   */
  analyserDemande(userMessage, notes = [], vocabulaire = []) {
    console.log('🔍 Analyse de la demande:', {
      message: userMessage.substring(0, 50) + '...',
      notesCount: notes.length,
      vocabulaireCount: vocabulaire.length
    });

    const msg = userMessage.toLowerCase().trim();
    
    // Calculs de pertinence
    const scoreNotes = this.calculerScore(msg, this.motsClesNotes);
    const scoreVocab = this.calculerScore(msg, this.motsClesVocab);
    
    // Recherche de mentions explicites (adapté aux types Centrinote)
    const noteMentionnee = this.chercherNoteMentionnee(msg, notes);
    const motMentionne = this.chercherMotMentionne(msg, vocabulaire);

    console.log('📊 Scores calculés:', { scoreNotes, scoreVocab });

    // Mention explicite de note trouvée
    if (noteMentionnee) {
      return {
        type: "note",
        confidence: 0.9,
        confirmation: `Tu veux que je te résume ta note "${noteMentionnee.title}" ?`,
        contenu: noteMentionnee.content || 'Note sans contenu',
        source: this.adaptNoteFormat(noteMentionnee)
      };
    }

    // Mention explicite de mot trouvée
    if (motMentionne) {
      return {
        type: "vocabulaire", 
        confidence: 0.9,
        confirmation: `Tu veux que je t'explique le mot "${motMentionne.word}" ?`,
        contenu: motMentionne.definition,
        source: this.adaptVocabFormat(motMentionne)
      };
    }

    // Analyse par score de pertinence - Notes
    if (scoreNotes > scoreVocab && scoreNotes > 0.3 && notes.length > 0) {
      const noteOptimale = this.selectionnerNoteOptimale(notes, msg);
      return {
        type: "note",
        confidence: Math.min(scoreNotes, 0.8),
        confirmation: `Tu veux que je te résume ta note "${noteOptimale.title}" ?`,
        contenu: noteOptimale.content || 'Note sans contenu',
        source: this.adaptNoteFormat(noteOptimale),
        alternatives: this.proposerAlternativesNotes(notes, noteOptimale, 2)
      };
    }

    // Analyse par score de pertinence - Vocabulaire
    if (scoreVocab > 0.3 && vocabulaire.length > 0) {
      const motOptimal = this.selectionnerMotOptimal(vocabulaire, msg);
      return {
        type: "vocabulaire",
        confidence: Math.min(scoreVocab, 0.8),
        confirmation: `Tu veux que je t'explique le mot "${motOptimal.word}" ?`,
        contenu: motOptimal.definition,
        source: this.adaptVocabFormat(motOptimal),
        alternatives: this.proposerAlternativesVocab(vocabulaire, motOptimal, 2)
      };
    }

    // Système de mémoire intelligent pour révisions
    const suggestionMemoire = this.analyserMemoire(notes, vocabulaire);
    if (suggestionMemoire) {
      return {
        type: "memoire",
        confidence: 0.6,
        confirmation: suggestionMemoire.message,
        contenu: suggestionMemoire.contenu,
        source: suggestionMemoire.source
      };
    }

    // Cas général avec suggestions contextuelles
    return {
      type: "general",
      confidence: 0.5,
      confirmation: this.genererConfirmationGenerale(msg, notes, vocabulaire),
      contenu: userMessage,
      suggestions: this.genererSuggestions(notes, vocabulaire)
    };
  }

  /**
   * 📊 Calcul de score de pertinence amélioré
   */
  calculerScore(message, motsCles) {
    let score = 0;
    const mots = message.split(/\s+/);
    
    motsCles.forEach(motCle => {
      // Correspondance exacte (bonus élevé)
      if (message.includes(motCle)) {
        score += 0.4;
      }
      
      // Correspondance partielle avec similarité
      mots.forEach(mot => {
        if (mot.length > 3 && this.similarite(mot, motCle) > 0.7) {
          score += 0.2;
        }
      });
    });
    
    return Math.min(score, 1);
  }

  /**
   * 🔍 Recherche de mention explicite - Notes (compatible structure Centrinote)
   */
  chercherNoteMentionnee(message, notes) {
    if (!Array.isArray(notes)) return null;
    
    return notes.find(note => {
      if (!note.title) return false;
      
      const titre = note.title.toLowerCase();
      
      // Correspondance exacte ou très similaire
      return message.includes(titre) || 
             this.similarite(message, titre) > 0.6;
    });
  }

  /**
   * 🔍 Recherche de mention explicite - Vocabulaire (compatible structure Centrinote)
   */
  chercherMotMentionne(message, vocabulaire) {
    if (!Array.isArray(vocabulaire)) return null;
    
    return vocabulaire.find(vocab => {
      if (!vocab.word) return false;
      
      const mot = vocab.word.toLowerCase();
      
      // Correspondance exacte ou très similaire
      return message.includes(mot) ||
             this.similarite(message, mot) > 0.8;
    });
  }

  /**
   * 🎯 Sélection intelligente de note optimale (adapté structure Centrinote)
   */
  selectionnerNoteOptimale(notes, message) {
    if (!Array.isArray(notes) || notes.length === 0) return null;
    
    return notes
      .map(note => ({
        ...note,
        score: this.calculerScoreNote(note, message)
      }))
      .sort((a, b) => b.score - a.score)[0];
  }

  /**
   * 🎯 Sélection intelligente de mot optimal (adapté structure Centrinote)
   */
  selectionnerMotOptimal(vocabulaire, message) {
    if (!Array.isArray(vocabulaire) || vocabulaire.length === 0) return null;
    
    return vocabulaire
      .map(vocab => ({
        ...vocab,
        score: this.calculerScoreVocab(vocab, message)
      }))
      .sort((a, b) => b.score - a.score)[0];
  }

  /**
   * 📊 Score de note avec priorité apprentissage (adapté dates Centrinote)
   */
  calculerScoreNote(note, message) {
    let score = 0;
    
    // Bonus pour notes récentes (format Centrinote created_at)
    if (note.created_at) {
      const joursDepuis = (Date.now() - new Date(note.created_at)) / (1000 * 60 * 60 * 24);
      if (joursDepuis <= 7) score += 0.4;
      else if (joursDepuis <= 30) score += 0.2;
    }
    
    // Pertinence du titre
    if (note.title) {
      score += this.similarite(message, note.title.toLowerCase()) * 0.4;
    }
    
    // Bonus pour notes épinglées
    if (note.is_pinned) {
      score += 0.2;
    }
    
    return score;
  }

  /**
   * 📊 Score de vocabulaire avec priorité révision (adapté structure Centrinote)
   */
  calculerScoreVocab(vocab, message) {
    let score = 0;
    
    // Bonus pour faible maîtrise (priorité révision)
    if (typeof vocab.mastery === 'number') {
      score += (100 - vocab.mastery) / 100 * 0.5;
    }
    
    // Bonus pour révision récente needed
    if (vocab.lastReviewed) {
      const joursDepuis = (Date.now() - new Date(vocab.lastReviewed)) / (1000 * 60 * 60 * 24);
      if (joursDepuis > 7) score += 0.3; // Plus urgent si pas révisé récemment
    }
    
    // Pertinence du mot
    if (vocab.word) {
      score += this.similarite(message, vocab.word.toLowerCase()) * 0.4;
    }
    
    return score;
  }

  /**
   * 🧠 Système de mémoire intelligent pour suggérer révisions
   */
  analyserMemoire(notes, vocabulaire) {
    // Notes récentes non épinglées
    const notesRecentes = notes
      .filter(n => !n.is_pinned && n.created_at)
      .filter(n => {
        const joursDepuis = (Date.now() - new Date(n.created_at)) / (1000 * 60 * 60 * 24);
        return joursDepuis <= 3;
      });

    // Vocabulaire à faible maîtrise
    const vocabFaible = vocabulaire.filter(v => v.mastery < 60);
    
    // Suggérer note récente (30% chance)
    if (notesRecentes.length > 0 && Math.random() > 0.7) {
      const noteAleatoire = notesRecentes[Math.floor(Math.random() * notesRecentes.length)];
      return {
        message: `💡 Tu as créé "${noteAleatoire.title}" récemment. Je peux t'aider à la réviser ?`,
        contenu: noteAleatoire.content || 'Note sans contenu',
        source: this.adaptNoteFormat(noteAleatoire)
      };
    }
    
    // Suggérer vocabulaire faible (20% chance)
    if (vocabFaible.length > 0 && Math.random() > 0.8) {
      const motAleatoire = vocabFaible[Math.floor(Math.random() * vocabFaible.length)];
      return {
        message: `🎯 Le mot "${motAleatoire.word}" (maîtrise: ${motAleatoire.mastery}%) pourrait être révisé ?`,
        contenu: motAleatoire.definition,
        source: this.adaptVocabFormat(motAleatoire)
      };
    }
    
    return null;
  }

  /**
   * 💬 Génération de confirmations contextuelles adaptées
   */
  genererConfirmationGenerale(message, notes, vocabulaire) {
    const hasNotes = notes.length > 0;
    const hasVocab = vocabulaire.length > 0;
    
    if (hasNotes && hasVocab) {
      return `Je vais traiter ta question. Tu as ${notes.length} notes et ${vocabulaire.length} mots dans ton vocabulaire que je peux utiliser pour t'aider !`;
    } else if (hasNotes) {
      return `Je vais répondre à ta question. J'ai accès à tes ${notes.length} notes pour enrichir ma réponse.`;
    } else if (hasVocab) {
      return `Je traite ta question. Ton vocabulaire de ${vocabulaire.length} mots peut m'aider à personnaliser la réponse.`;
    }
    
    return "Je vais traiter ta question de manière générale.";
  }

  /**
   * 🔄 Proposer alternatives pour notes
   */
  proposerAlternativesNotes(notes, noteSelectionnee, limite = 2) {
    return notes
      .filter(note => note.id !== noteSelectionnee.id)
      .slice(0, limite)
      .map(note => ({
        title: note.title || 'Note sans titre',
        id: note.id,
        type: 'note'
      }));
  }

  /**
   * 🔄 Proposer alternatives pour vocabulaire
   */
  proposerAlternativesVocab(vocabulaire, motSelectionne, limite = 2) {
    return vocabulaire
      .filter(vocab => vocab.id !== motSelectionne.id)
      .slice(0, limite)
      .map(vocab => ({
        title: vocab.word,
        id: vocab.id,
        type: 'vocabulaire'
      }));
  }

  /**
   * 💡 Génération de suggestions intelligentes
   */
  genererSuggestions(notes, vocabulaire) {
    const suggestions = [];
    
    if (notes.length > 0) {
      const notesRecentes = notes.filter(n => {
        if (!n.created_at) return false;
        const joursDepuis = (Date.now() - new Date(n.created_at)) / (1000 * 60 * 60 * 24);
        return joursDepuis <= 7;
      }).length;
      
      suggestions.push(`📝 ${notes.length} notes disponibles (${notesRecentes} récentes)`);
    }
    
    if (vocabulaire.length > 0) {
      const vocabFaible = vocabulaire.filter(v => v.mastery < 70).length;
      suggestions.push(`📚 ${vocabulaire.length} mots dans ton vocabulaire (${vocabFaible} à réviser)`);
    }
    
    return suggestions;
  }

  /**
   * 🔄 Adaptateurs de format pour compatibilité
   */
  adaptNoteFormat(note) {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      is_pinned: note.is_pinned,
      mastery: 2 // Valeur par défaut pour compatibilité
    };
  }

  adaptVocabFormat(vocab) {
    return {
      id: vocab.id,
      word: vocab.word,
      definition: vocab.definition,
      mastery: vocab.mastery || 0,
      category: vocab.category || 'General',
      lastReviewed: vocab.lastReviewed,
      created_at: vocab.created_at || new Date().toISOString()
    };
  }

  /**
   * 🔧 Fonction de similarité optimisée (Levenshtein simplifié)
   */
  similarite(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Optimisation pour chaînes très différentes
    if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) return 0;
    
    let distance = 0;
    const maxLen = Math.max(len1, len2);
    
    for (let i = 0; i < maxLen; i++) {
      if (str1[i] !== str2[i]) distance++;
    }
    
    return 1 - distance / maxLen;
  }

  /**
   * 📝 Construction du message enrichi pour l'IA
   */
  construireMessagePourIA(userMessage, resultatAnalyse) {
    let message = `DEMANDE UTILISATEUR: "${userMessage}"\n\n`;
    
    switch (resultatAnalyse.type) {
      case 'note':
        message += `🗂️ CONTEXTE: Note Centrinote\n`;
        message += `TITRE: ${resultatAnalyse.source.title}\n`;
        message += `DATE: ${new Date(resultatAnalyse.source.created_at).toLocaleDateString('fr-FR')}\n`;
        message += `ÉPINGLÉE: ${resultatAnalyse.source.is_pinned ? 'Oui' : 'Non'}\n`;
        message += `CONTENU À ANALYSER:\n${resultatAnalyse.contenu}`;
        break;
        
      case 'vocabulaire':
        message += `📚 CONTEXTE: Vocabulaire Centrinote\n`;
        message += `MOT: ${resultatAnalyse.source.word}\n`;
        message += `MAÎTRISE: ${resultatAnalyse.source.mastery}%\n`;
        message += `CATÉGORIE: ${resultatAnalyse.source.category}\n`;
        message += `DÉFINITION À EXPLIQUER:\n${resultatAnalyse.contenu}`;
        break;
        
      case 'memoire':
        message += `🧠 CONTEXTE: Suggestion de révision\n`;
        message += `TYPE: ${resultatAnalyse.source.word ? 'Vocabulaire' : 'Note'}\n`;
        message += `CONTENU SUGGÉRÉ:\n${resultatAnalyse.contenu}`;
        break;
        
      default:
        message += `💭 CONTEXTE: Question générale\n`;
        message += `MESSAGE:\n${resultatAnalyse.contenu}`;
        if (resultatAnalyse.suggestions?.length > 0) {
          message += `\n\n📊 RESSOURCES DISPONIBLES:\n${resultatAnalyse.suggestions.join('\n')}`;
        }
    }
    
    return message;
  }

  /**
   * 🚀 Méthode principale - Interface avec le système IA existant
   */
  async traiterDemande(userMessage, notes = [], vocabulaire = []) {
    try {
      console.log('🎯 CentrinoteAI - Début traitement demande');
      
      // Validation des paramètres
      if (!userMessage?.trim()) {
        throw new Error('Message utilisateur vide');
      }

      // Analyse contextuelle intelligente
      const resultatAnalyse = this.analyserDemande(userMessage, notes, vocabulaire);
      console.log('📊 Analyse terminée:', {
        type: resultatAnalyse.type,
        confidence: resultatAnalyse.confidence
      });

      // Construction du message enrichi pour l'IA
      const messagePourIA = this.construireMessagePourIA(userMessage, resultatAnalyse);
      
      // Envoi vers l'IA via le service existant (compatible avec aiService.ts)
      console.log('📤 Envoi vers IA via aiService...');
      const reponseIA = await aiService.sendMessage(messagePourIA);
      
      // Retour formaté avec analyse + réponse
      return {
        success: true,
        analyse: resultatAnalyse,
        reponse: reponseIA.response,
        raw: reponseIA
      };
      
    } catch (error) {
      console.error('❌ Erreur CentrinoteAI:', error);
      
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
        analyse: null,
        reponse: null
      };
    }
  }

  /**
   * 🧪 Test de connectivité
   */
  async testConnectivite() {
    try {
      console.log('🧪 Test connectivité CentrinoteAI');
      const test = await aiService.testConnection();
      return test;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur de connectivité'
      };
    }
  }
}

// Instance singleton pour utilisation globale
export const centrinoteAI = new CentrinoteAI();

// Export par défaut pour compatibilité
export default CentrinoteAI;