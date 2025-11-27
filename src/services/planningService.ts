import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  category: 'study' | 'meeting' | 'review' | 'break' | 'personal';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  reminder?: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly' | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export type CreateTaskInput = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export const planningService = {
  /**
   * Récupérer toutes les tâches d'un utilisateur
   */
  async getTasks(userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    completed?: boolean;
  }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    // Appliquer les filtres
    if (filters?.startDate) {
      query = query.gte('start_time', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('start_time', filters.endDate.toISOString());
    }
    if (filters?.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Récupérer une tâche par son ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      return null;
    }

    return data;
  },

  /**
   * Créer une nouvelle tâche
   */
  async createTask(userId: string, task: CreateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        ...task
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data;
  },

  /**
   * Mettre à jour une tâche
   */
  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    return data;
  },

  /**
   * Marquer une tâche comme complétée/non-complétée
   */
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<Task> {
    return this.updateTask(taskId, { completed });
  },

  /**
   * Supprimer une tâche
   */
  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  /**
   * Récupérer les tâches d'une date spécifique
   */
  async getTasksForDate(userId: string, date: Date): Promise<Task[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getTasks(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });
  },

  /**
   * Récupérer les tâches de la semaine
   */
  async getTasksForWeek(userId: string, date: Date): Promise<Task[]> {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getTasks(userId, {
      startDate: startOfWeek,
      endDate: endOfWeek
    });
  },

  /**
   * Récupérer les tâches avec rappel pour aujourd'hui
   */
  async getTasksWithReminders(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('reminder', true)
      .eq('completed', false)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching tasks with reminders:', error);
      throw error;
    }

    return data || [];
  }
};
