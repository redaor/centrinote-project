import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ReplyFormProps {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
}

export function ReplyForm({ onSubmit, placeholder = 'Écris ta réponse...' }: ReplyFormProps) {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onSubmit(body.trim());
      setBody('');
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        disabled={isSubmitting}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!body.trim() || isSubmitting}
          className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Envoi...' : 'Répondre'}</span>
        </button>
      </div>
    </form>
  );
}
