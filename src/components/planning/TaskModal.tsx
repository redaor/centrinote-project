import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Flag, Bell, Repeat, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { Task, CreateTaskInput } from '../../services/planningService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskInput) => void;
  initialDate?: Date;
  darkMode?: boolean;
  editingTask?: Task | null;
}

const categoryColors = {
  study: 'from-blue-500 to-indigo-500',
  meeting: 'from-purple-500 to-pink-500',
  review: 'from-green-500 to-emerald-500',
  break: 'from-yellow-500 to-amber-500',
  personal: 'from-gray-500 to-slate-500'
};

const categoryLabels: Record<CreateTaskInput['category'], string> = {
  study: 'Étude',
  meeting: 'Réunion',
  review: 'Révision',
  break: 'Pause',
  personal: 'Personnel'
};

export function TaskModal({ isOpen, onClose, onSave, initialDate, darkMode = false, editingTask }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(1); // en heures
  const [category, setCategory] = useState<CreateTaskInput['category']>('study');
  const [priority, setPriority] = useState<CreateTaskInput['priority']>('medium');
  const [reminder, setReminder] = useState(false);
  const [recurring, setRecurring] = useState<CreateTaskInput['recurring']>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ref pour le focus sur le champ titre
  const titleInputRef = useRef<HTMLInputElement>(null);

  // États de validation
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [durationError, setDurationError] = useState('');

  // Initialiser avec la date sélectionnée ou aujourd'hui
  useEffect(() => {
    if (isOpen) {
      const date = initialDate || new Date();
      setStartDate(date.toISOString().split('T')[0]);

      // Si on édite une tâche, charger ses données
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        const start = new Date(editingTask.start_time);
        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        const durationHours = (new Date(editingTask.end_time).getTime() - start.getTime()) / (1000 * 60 * 60);
        setDuration(durationHours);
        setCategory(editingTask.category);
        setPriority(editingTask.priority);
        setReminder(editingTask.reminder || false);
        setRecurring(editingTask.recurring || null);
      }

      // Focus sur le champ titre
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);

      // Réinitialiser les erreurs
      setTitleError('');
      setDateError('');
      setDurationError('');
      setErrorMessage('');
    }
  }, [isOpen, initialDate, editingTask]);

  // Fonction de validation
  const validateForm = (): boolean => {
    let isValid = true;

    // Réinitialiser les erreurs
    setTitleError('');
    setDateError('');
    setDurationError('');
    setErrorMessage('');

    // Validation titre (min 3 caractères)
    if (title.trim().length < 3) {
      setTitleError('Le titre doit contenir au moins 3 caractères');
      isValid = false;
    }

    // Validation date (>= aujourd'hui)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(startDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setDateError('La date doit être aujourd\'hui ou plus tard');
      isValid = false;
    }

    // Validation durée (> 0)
    if (duration <= 0) {
      setDurationError('La durée doit être supérieure à 0');
      isValid = false;
    }

    return isValid;
  };

  // Vérifier si le formulaire est valide en temps réel
  const isFormValid = (): boolean => {
    if (title.trim().length < 3) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(startDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) return false;
    if (duration <= 0) return false;
    if (!startTime) return false;

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Empêcher double-envoi
    if (isSubmitting) return;

    // Valider le formulaire
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Construire les dates
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(hours + duration, minutes, 0, 0);

      const task: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        category,
        priority,
        completed: false,
        reminder,
        recurring: recurring || undefined,
        color: categoryColors[category]
      };

      await onSave(task);

      // Afficher le message de succès
      setShowSuccessMessage(true);

      // Fermer automatiquement après 1.5 secondes
      setTimeout(() => {
        setShowSuccessMessage(false);
        resetForm();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error saving task:', error);
      setErrorMessage(error?.message || 'Une erreur est survenue lors de la création de la tâche. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setDuration(1);
    setCategory('study');
    setPriority('medium');
    setReminder(false);
    setRecurring(null);
    setTitleError('');
    setDateError('');
    setDurationError('');
    setErrorMessage('');

    // Remettre le focus sur le champ titre
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingTask ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche'}
                </h2>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-lg ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  } transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Titre */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Titre *
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (titleError) setTitleError('');
                    }}
                    placeholder="Ex: Révision vocabulaire"
                    required
                    minLength={3}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      titleError
                        ? 'border-red-500 focus:ring-red-500'
                        : darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 ${!titleError && 'focus:ring-blue-500'}`}
                  />
                  {titleError && (
                    <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{titleError}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                    <span className={`text-xs ml-2 ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      (Ajoute des détails pour mieux te rappeler de la tâche)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Chapitres 3 à 5, focus sur les formules..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border resize-none ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Date et heure */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (dateError) setDateError('');
                      }}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        dateError
                          ? 'border-red-500 focus:ring-red-500'
                          : darkMode
                            ? 'bg-gray-900 border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 ${!dateError && 'focus:ring-blue-500'}`}
                    />
                    {dateError && (
                      <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{dateError}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <Clock className="w-4 h-4 inline mr-1" />
                      Heure *
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                {/* Durée */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Durée *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => {
                      setDuration(Number(e.target.value));
                      if (durationError) setDurationError('');
                    }}
                    required
                    className={`w-full px-4 py-3 rounded-lg border ${
                      durationError
                        ? 'border-red-500 focus:ring-red-500'
                        : darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 ${!durationError && 'focus:ring-blue-500'}`}
                  >
                    <option value={0.25}>15 min</option>
                    <option value={0.5}>30 min</option>
                    <option value={0.75}>45 min</option>
                    <option value={1}>1h</option>
                    <option value={1.5}>1h 30</option>
                    <option value={2}>2h</option>
                    <option value={2.5}>2h 30</option>
                    <option value={3}>3h</option>
                    <option value={4}>4h</option>
                    <option value={5}>5h</option>
                    <option value={6}>6h</option>
                    <option value={8}>8h</option>
                  </select>
                  {durationError && (
                    <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{durationError}</span>
                    </div>
                  )}
                </div>

                {/* Catégorie */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Catégorie
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(Object.keys(categoryColors) as Array<keyof typeof categoryColors>).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          category === cat
                            ? `bg-gradient-to-r ${categoryColors[cat]} text-white`
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priorité */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Flag className="w-4 h-4 inline mr-1" />
                    Priorité
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as const).map((prio) => (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setPriority(prio)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          priority === prio
                            ? prio === 'high'
                              ? 'bg-red-500 text-white'
                              : prio === 'medium'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-green-500 text-white'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {prio === 'high' ? 'Haute' : prio === 'medium' ? 'Moyenne' : 'Basse'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options - Rappel et Récurrence */}
                <div className={`border rounded-lg p-4 ${
                  darkMode
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    ⏰ Options de notification
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminder}
                        onChange={(e) => setReminder(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <Bell className="w-4 h-4 inline mr-1" />
                          Activer le rappel
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          Recevoir une notification 15 min avant le début
                        </p>
                      </div>
                    </label>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <Repeat className="w-4 h-4 inline mr-1" />
                        Récurrence
                      </label>
                      <select
                        value={recurring || ''}
                        onChange={(e) => setRecurring(e.target.value as any || null)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="">Pas de récurrence</option>
                        <option value="daily">📅 Quotidien</option>
                        <option value="weekly">📆 Hebdomadaire</option>
                        <option value="monthly">🗓️ Mensuel</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Message d'erreur API */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-800 mb-1">Erreur</h4>
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid() || isSubmitting}
                    className="px-8 py-3 rounded-lg font-semibold text-base bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{editingTask ? 'Sauvegarde...' : 'Création...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>{editingTask ? 'Sauvegarder la tâche' : 'Créer la tâche'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Message de succès */}
              <AnimatePresence>
                {showSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl"
                  >
                    <div className={`px-8 py-6 rounded-xl shadow-2xl ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    } text-center`}>
                      <div className="text-5xl mb-3">✅</div>
                      <h3 className={`text-xl font-bold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {editingTask ? 'Tâche modifiée !' : 'Tâche créée !'}
                      </h3>
                      <p className={`text-sm mt-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {editingTask ? 'Les modifications ont été enregistrées' : 'Ta tâche a bien été ajoutée au planning'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
