// Interface JavaScript pour tester l integration Zoom OAuth
class ZoomTestApp {
    constructor() {
        this.baseUrl = 'http://localhost:5174';
        this.user = null;
        this.meetings = [];
        
        this.initializeApp();
        this.bindEvents();
    }
    
    async initializeApp() {
        console.log('🚀 Initialisation de l application de test Zoom');
        
        // Vérifier le statut de santé du serveur
        await this.checkServerHealth();
        
        // Vérifier si l utilisateur est déjà authentifié
        await this.checkAuthentication();
        
        // Traiter les paramètres URL (callback OAuth)
        this.handleURLParams();
    }
    
    bindEvents() {
        // Boutons d authentification
        document.getElementById('login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        
        // Boutons de réunions
        document.getElementById('refresh-meetings-btn')?.addEventListener('click', () => this.loadMeetings());
        document.getElementById('create-meeting-btn')?.addEventListener('click', () => this.showCreateMeetingModal());
        
        // Modal de création de réunion
        document.getElementById('close-modal-btn')?.addEventListener('click', () => this.hideCreateMeetingModal());
        document.getElementById('cancel-create-btn')?.addEventListener('click', () => this.hideCreateMeetingModal());
        document.getElementById('create-meeting-form')?.addEventListener('submit', (e) => this.createMeeting(e));
        
        // Fermer la modal en cliquant à l extérieur
        document.getElementById('create-meeting-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'create-meeting-modal') {
                this.hideCreateMeetingModal();
            }
        });
    }
    
    async checkServerHealth() {
        try {
            console.log('🏥 Vérification santé serveur sur:', `${this.baseUrl}/health`);
            
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'OK') {
                this.updateStatus('Serveur connecté ✅', 'success');
                document.getElementById('server-status').textContent = this.baseUrl;
                console.log('✅ Serveur accessible:', data);
            } else {
                this.updateStatus('Problème serveur ⚠️', 'warning');
                console.log('⚠️ Problème serveur:', data);
            }
            
        } catch (error) {
            console.error('❌ Erreur vérification serveur:', error);
            this.updateStatus(`Serveur inaccessible ❌ (${error.message})`, 'error');
        }
    }
    
    async checkAuthentication() {
        try {
            console.log('🔐 Vérification authentification...');
            
            const response = await fetch(`${this.baseUrl}/auth/me`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📝 Réponse auth/me:', data);
                
                if (data.success && data.user) {
                    console.log('✅ Utilisateur authentifié:', data.user.email);
                    this.user = data.user;
                    this.showUserInfo();
                    await this.loadMeetings();
                    return;
                } else {
                    console.log('ℹ️ Utilisateur non authentifié');
                }
            } else {
                console.log('❌ Réponse auth/me non-OK:', response.status, response.statusText);
            }
            
            this.showLoginSection();
            
        } catch (error) {
            console.error('❌ Erreur vérification authentification:', error);
            this.showLoginSection();
        }
    }
    
    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (error) {
            this.updateStatus(`Erreur OAuth: ${error}`, 'error');
            this.showNotification('Erreur lors de l authentification Zoom', 'error');
            return;
        }
        
        if (code) {
            console.log('🔄 Code OAuth reçu, échange en cours...');
            this.exchangeCodeForToken(code, state);
        }
    }
    
    async login() {
        try {
            console.log('🔐 Début du processus de connexion Zoom');
            
            const loginBtn = document.getElementById('login-btn');
            const spinner = document.getElementById('login-spinner');
            
            loginBtn.disabled = true;
            spinner.classList.remove('hidden');
            
            // Obtenir l URL d autorisation OAuth
            const response = await fetch(`${this.baseUrl}/auth/zoom`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success && data.authUrl) {
                console.log('📝 Redirection vers Zoom OAuth...');
                window.location.href = data.authUrl;
            } else {
                throw new Error(data.error || 'Erreur génération URL OAuth');
            }
            
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            this.showNotification('Erreur lors de la connexion', 'error');
            
            const loginBtn = document.getElementById('login-btn');
            const spinner = document.getElementById('login-spinner');
            loginBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    }
    
    async exchangeCodeForToken(code, state) {
        try {
            this.updateStatus('Échange du code d autorisation...', 'loading');
            
            const response = await fetch(`${this.baseUrl}/auth/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ code, state })
            });
            
            const data = await response.json();
            
            if (data.success && data.user) {
                console.log('✅ Authentification réussie');
                this.user = data.user;
                this.showUserInfo();
                await this.loadMeetings();
                this.showNotification('Connexion réussie !', 'success');
                
                // Nettoyer l URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                throw new Error(data.error || 'Erreur lors de l authentification');
            }
            
        } catch (error) {
            console.error('❌ Erreur échange token:', error);
            this.updateStatus('Erreur authentification ❌', 'error');
            this.showNotification('Erreur lors de l authentification', 'error');
            this.showLoginSection();
        }
    }
    
    async logout() {
        try {
            console.log('🔌 Déconnexion...');
            
            const response = await fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Déconnexion réussie');
                this.user = null;
                this.meetings = [];
                this.showLoginSection();
                this.showNotification('Déconnexion réussie', 'success');
            }
            
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            this.showNotification('Erreur lors de la déconnexion', 'error');
        }
    }
    
    async loadMeetings() {
        try {
            console.log('📋 Chargement des réunions...');
            
            const meetingsLoading = document.getElementById('meetings-loading');
            meetingsLoading.style.display = 'block';
            
            const response = await fetch(`${this.baseUrl}/api/meetings`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.meetings = data.meetings || [];
                this.displayMeetings();
                console.log(`✅ ${this.meetings.length} réunions chargées`);
            } else if (data.needsRefresh) {
                console.log('🔄 Token expiré, rafraîchissement...');
                await this.refreshToken();
                // Réessayer après le refresh
                setTimeout(() => this.loadMeetings(), 1000);
            } else {
                throw new Error(data.error || 'Erreur chargement réunions');
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement réunions:', error);
            this.showNotification('Erreur lors du chargement des réunions', 'error');
        } finally {
            const meetingsLoading = document.getElementById('meetings-loading');
            meetingsLoading.style.display = 'none';
        }
    }
    
    async refreshToken() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Token rafraîchi');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erreur rafraîchissement token:', error);
            return false;
        }
    }
    
    displayMeetings() {
        const meetingsList = document.getElementById('meetings-list');
        
        if (this.meetings.length === 0) {
            meetingsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar-times text-4xl mb-4"></i>
                    <p>Aucune réunion programmée</p>
                    <p class="text-sm">Créez votre première réunion Zoom</p>
                </div>
            `;
            return;
        }
        
        const meetingsHtml = this.meetings.map(meeting => `
            <div class="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800">${meeting.topic}</h3>
                        <div class="flex items-center text-sm text-gray-600 mt-2 space-x-4">
                            <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(meeting.start_time)}</span>
                            <span><i class="fas fa-clock mr-1"></i>${meeting.duration} min</span>
                            <span class="px-2 py-1 rounded text-xs ${this.getStatusColor(meeting.status)}">${this.getStatusText(meeting.status)}</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="app.joinMeeting('${meeting.join_url}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-video mr-1"></i>Rejoindre
                        </button>
                        <button onclick="app.deleteMeeting('${meeting.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-trash mr-1"></i>
                        </button>
                    </div>
                </div>
                ${meeting.agenda ? `<p class="text-gray-600 text-sm mt-2">${meeting.agenda}</p>` : ''}
            </div>
        `).join('');
        
        meetingsList.innerHTML = meetingsHtml;
    }
    
    showCreateMeetingModal() {
        // Définir la date par défaut à dans 1 heure
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const defaultDateTime = now.toISOString().slice(0, 16);
        
        document.getElementById('meeting-datetime').value = defaultDateTime;
        document.getElementById('create-meeting-modal').classList.remove('hidden');
        document.getElementById('create-meeting-modal').classList.add('flex');
    }
    
    hideCreateMeetingModal() {
        document.getElementById('create-meeting-modal').classList.add('hidden');
        document.getElementById('create-meeting-modal').classList.remove('flex');
        document.getElementById('create-meeting-form').reset();
    }
    
    async createMeeting(e) {
        e.preventDefault();
        
        try {
            const submitBtn = document.getElementById('submit-create-btn');
            const spinner = document.getElementById('create-spinner');
            
            submitBtn.disabled = true;
            spinner.classList.remove('hidden');
            
            const formData = new FormData(e.target);
            const meetingData = {
                topic: document.getElementById('meeting-title').value,
                start_time: document.getElementById('meeting-datetime').value + ':00.000Z',
                duration: parseInt(document.getElementById('meeting-duration').value),
                agenda: document.getElementById('meeting-description').value,
                settings: {
                    host_video: true,
                    participant_video: true,
                    waiting_room: true,
                    mute_upon_entry: true
                }
            };
            
            console.log('➕ Création de réunion:', meetingData);
            
            const response = await fetch(`${this.baseUrl}/api/meetings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(meetingData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Réunion créée:', data.meeting);
                this.hideCreateMeetingModal();
                this.showNotification('Réunion créée avec succès !', 'success');
                await this.loadMeetings();
            } else {
                throw new Error(data.error || 'Erreur création réunion');
            }
            
        } catch (error) {
            console.error('❌ Erreur création réunion:', error);
            this.showNotification('Erreur lors de la création de la réunion', 'error');
        } finally {
            const submitBtn = document.getElementById('submit-create-btn');
            const spinner = document.getElementById('create-spinner');
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    }
    
    async deleteMeeting(meetingId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette réunion ?')) {
            return;
        }
        
        try {
            console.log('🗑️ Suppression réunion:', meetingId);
            
            const response = await fetch(`${this.baseUrl}/api/meetings/${meetingId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Réunion supprimée');
                this.showNotification('Réunion supprimée', 'success');
                await this.loadMeetings();
            } else {
                throw new Error(data.error || 'Erreur suppression réunion');
            }
            
        } catch (error) {
            console.error('❌ Erreur suppression réunion:', error);
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }
    
    joinMeeting(joinUrl) {
        console.log('🔗 Ouverture réunion:', joinUrl);
        window.open(joinUrl, '_blank');
    }
    
    showLoginSection() {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('meetings-section').classList.add('hidden');
        this.updateStatus('Non connecté - Connexion requise', 'warning');
    }
    
    showUserInfo() {
        if (!this.user) return;
        
        document.getElementById('user-name').textContent = this.user.displayName || this.user.email;
        document.getElementById('user-email').textContent = this.user.email;
        
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('meetings-section').classList.remove('hidden');
        
        this.updateStatus(`Connecté en tant que ${this.user.email}`, 'success');
    }
    
    updateStatus(message, type = 'info') {
        const statusPanel = document.getElementById('status-panel');
        const statusText = document.getElementById('status-text');
        const statusSpinner = document.getElementById('status-spinner');
        
        statusText.textContent = message;
        
        // Réinitialiser les classes
        statusPanel.className = 'mb-8 p-4 rounded-lg border-l-4';
        statusSpinner.classList.add('hidden');
        
        switch (type) {
            case 'success':
                statusPanel.classList.add('border-green-400', 'bg-green-50');
                statusText.className = 'text-green-800';
                break;
            case 'error':
                statusPanel.classList.add('border-red-400', 'bg-red-50');
                statusText.className = 'text-red-800';
                break;
            case 'warning':
                statusPanel.classList.add('border-yellow-400', 'bg-yellow-50');
                statusText.className = 'text-yellow-800';
                break;
            case 'loading':
                statusPanel.classList.add('border-blue-400', 'bg-blue-50');
                statusText.className = 'text-blue-800';
                statusSpinner.classList.remove('hidden');
                break;
            default:
                statusPanel.classList.add('border-gray-400', 'bg-gray-50');
                statusText.className = 'text-gray-800';
        }
    }
    
    showNotification(message, type = 'info') {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
        
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'text-white');
                break;
            default:
                notification.classList.add('bg-blue-500', 'text-white');
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    getStatusColor(status) {
        switch (status) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800';
            case 'started': return 'bg-green-100 text-green-800';
            case 'ended': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'waiting': return 'En attente';
            case 'started': return 'En cours';
            case 'ended': return 'Terminée';
            default: return 'Programmée';
        }
    }
}

// Initialiser l application
const app = new ZoomTestApp();