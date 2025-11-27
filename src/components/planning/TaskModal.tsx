import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Flag, Bell, Repeat } from 'lucide-react';
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
    }
  }, [isOpen, initialDate, editingTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    onSave(task);
    resetForm();
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
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Révision vocabulaire"
                    required
                    className={`w-full px-4 py-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ajouter des détails..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-lg border resize-none ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Date et heure */}
                <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
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
                    Durée (heures)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                </div>

                {/* Catégorie */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Catégorie
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(categoryColors) as Array<keyof typeof categoryColors>).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          category === cat
                            ? `bg-gradient-to-r ${categoryColors[cat]} text-white`
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
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

                {/* Options */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminder}
                      onChange={(e) => setReminder(e.target.checked)}
                      className="w-5 h-5 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Bell className="w-4 h-4 inline mr-1" />
                      Rappel
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    <select
                      value={recurring || ''}
                      onChange={(e) => setRecurring(e.target.value as any || null)}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Pas de récurrence</option>
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleClose}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingTask ? 'Sauvegarder' : 'Créer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
