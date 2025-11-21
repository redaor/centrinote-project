import { useState } from 'react';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker pdfjs (fichier local pour éviter CSP externe)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type AIResult = {
  reply: string;
  timestamp: string;
  cached?: boolean;
  searched?: boolean;
  fileProcessed?: boolean;
  error?: string;
  fallback?: boolean;
  responseTime?: number;
};

/**
 * Hook pour utiliser l'IA GPT-4 connectée à Internet
 * Version production avec gestion d'erreur robuste et fallback
 * Supporte maintenant l'upload de fichiers (txt, md, pdf, docx)
 */
export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extraire le texte d'un fichier PDF
   */
  const extractPDFText = async (file: File): Promise<string> => {
    try {
      console.log('📄 Extraction PDF côté frontend:', file.name);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      console.log(`📄 PDF chargé: ${pdf.numPages} page(s)`);

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;

        console.log(`✅ Page ${pageNum}/${pdf.numPages} extraite (${pageText.length} caractères)`);
      }

      console.log(`✅ PDF extrait: ${fullText.length} caractères au total`);
      return fullText.trim();
    } catch (err: any) {
      console.error('❌ Erreur extraction PDF:', err);
      throw new Error(`Impossible d'extraire le texte du PDF: ${err.message}`);
    }
  };

  /**
   * Extraire le texte d'un fichier texte
   */
  const extractTextFile = async (file: File): Promise<string> => {
    try {
      console.log('📄 Extraction fichier texte:', file.name);
      const text = await file.text();
      console.log(`✅ Texte extrait: ${text.length} caractères`);
      return text;
    } catch (err: any) {
      console.error('❌ Erreur extraction texte:', err);
      throw new Error(`Impossible d'extraire le texte: ${err.message}`);
    }
  };

  /**
   * Poser une question à l'IA
   * @param question - La question à poser
   * @param contextOrFile - Contexte additionnel optionnel OU fichier à analyser
   * @param messages - Historique de conversation optionnel pour maintenir le contexte
   * @returns Un objet contenant la réponse de l'IA et le texte extrait du fichier (si applicable)
   */
  const ask = async (question: string, contextOrFile?: string | File, messages?: Array<{role: string; content: string}>): Promise<{ reply: string; extractedText?: string }> => {
    if (!question?.trim()) {
      console.warn('⚠️ Question vide envoyée à l\'IA');
      return { reply: 'Veuillez poser une question.' };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Envoi de la question à l\'IA:', question.slice(0, 100));

      // Détecter si c'est un fichier ou du texte
      const isFile = contextOrFile instanceof File;

      if (isFile) {
        // Mode avec fichier : extraire le texte côté frontend puis envoyer
        console.log('📄 Upload avec fichier:', contextOrFile.name);

        // Extraire le texte selon le type de fichier
        const fileName = contextOrFile.name.toLowerCase();
        let fileText = '';

        if (fileName.endsWith('.pdf')) {
          fileText = await extractPDFText(contextOrFile);
        } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
          fileText = await extractTextFile(contextOrFile);
        } else {
          throw new Error('Format de fichier non supporté. Utilisez .pdf, .txt ou .md');
        }

        const formData = new FormData();
        formData.append('question', question);
        formData.append('fileText', fileText);

        // Ajouter l'historique de conversation si disponible
        if (messages && messages.length > 0) {
          formData.append('messages', JSON.stringify(messages));
          console.log('📚 Historique envoyé avec le fichier:', messages.length, 'messages');
        }

        // Appel direct avec fetch car supabase.functions.invoke ne supporte pas FormData
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data: AIResult = await response.json();

        if (data?.error || data?.fallback) {
          console.warn('⚠️ Réponse avec erreur/fallback:', data.error);
          setError(data.error || 'Erreur inconnue');
          return { reply: data.reply || "Désolé, le service IA est momentanément indisponible." };
        }

        if (data?.fileProcessed) {
          console.log('✅ Fichier analysé avec succès');
        }

        // Retourner à la fois la réponse ET le texte extrait pour l'historique
        return { reply: data.reply, extractedText: fileText };
      } else {
        // Mode classique : JSON avec ou sans contexte
        const { data, error: invokeError } = await supabase.functions.invoke<AIResult>('ai-chat', {
          body: { question, context: contextOrFile || '' }
        });

        if (invokeError) {
          console.error('❌ Erreur d\'invocation de la fonction:', invokeError);
          setError(invokeError.message);
          return { reply: "Désolé, le service IA est momentanément indisponible. Veuillez réessayer dans quelques instants." };
        }

        if (data?.error || data?.fallback) {
          console.warn('⚠️ Réponse avec erreur/fallback:', data.error);
          setError(data.error || 'Erreur inconnue');
          return { reply: data.reply || "Désolé, le service IA est momentanément indisponible." };
        }

        if (data?.cached) {
          console.log('✅ Réponse depuis le cache');
        } else if (data?.searched) {
          console.log('✅ Réponse avec recherche web Brave');
        } else if (data?.responseTime) {
          console.log(`✅ Réponse GPT-4 en ${data.responseTime}ms`);
        }

        return { reply: data!.reply };
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de l\'appel à l\'IA:', err);
      setError(err.message || 'Erreur inconnue');
      return { reply: "Désolé, une erreur s'est produite. Veuillez réessayer." };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Réinitialiser l'état d'erreur
   */
  const clearError = () => setError(null);

  return {
    ask,
    loading,
    error,
    clearError
  };
};
