import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, Loader, ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../components/AuthProvider';
import { forumService } from '../services/forumService';
import { PostCard } from '../components/forum/PostCard';
import type { ForumPost } from '../types/forum';

export function ForumPage() {
  const { state } = useApp();
  const { darkMode } = state;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await forumService.getPosts(user?.id);
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPosts();
  }, [user?.id, loadPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!newPostTitle.trim() || !newPostBody.trim() || isCreating) return;

    setIsCreating(true);

    try {
      await forumService.createPost(user.id, newPostTitle.trim(), newPostBody.trim());
      setNewPostTitle('');
      setNewPostBody('');
      setShowCreateModal(false);
      await loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Erreur lors de la création du post');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinDiscussion = () => {
    navigate('/auth');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/help')}
          className={`flex items-center space-x-2 mb-6 ${
            darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          } transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à Aide & Support</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  💬 Forum Communautaire
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Questions & Réponses
                </p>
              </div>
            </div>

            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                <span>Poser une question</span>
              </button>
            ) : (
              <button
                onClick={handleJoinDiscussion}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Rejoindre la discussion</span>
              </button>
            )}
          </div>

          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Pose tes questions, partage tes astuces et aide les autres utilisateurs ! 🚀
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucune question pour l'instant</p>
            <p className="text-sm">Sois le premier à poser une question !</p>
          </div>
        )}

        {/* Posts list */}
        {!loading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={user?.id}
                userEmail={user?.email}
                onLikeToggle={loadPosts}
                onReport={loadPosts}
                onDelete={loadPosts}
              />
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className={`w-full max-w-2xl rounded-lg shadow-xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ❓ Poser une question
                </h2>
              </div>

              <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Titre de ta question
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Ex: Comment importer un PDF dans mes notes ?"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    disabled={isCreating}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="body"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Détails de ta question
                  </label>
                  <textarea
                    id="body"
                    value={newPostBody}
                    onChange={(e) => setNewPostBody(e.target.value)}
                    placeholder="Explique ta question en détail pour obtenir de meilleures réponses..."
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    disabled={isCreating}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewPostTitle('');
                      setNewPostBody('');
                    }}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={isCreating}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={!newPostTitle.trim() || !newPostBody.trim() || isCreating}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Création...' : 'Publier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
