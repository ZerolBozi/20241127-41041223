// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC_JplWOvc89LIGeQN8Wk5idhd1eQRsBE0",
    authDomain: "test-95b4f.firebaseapp.com",
    databaseURL: "https://test-95b4f-default-rtdb.firebaseio.com",
    projectId: "test-95b4f",
    storageBucket: "test-95b4f.firebasestorage.app",
    messagingSenderId: "681860875624",
    appId: "1:681860875624:web:1575964ab615dab45282dd"
};

class NoteApp {
    constructor() {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        this.auth = firebase.auth();
        this.db = firebase.database();

        // Initialize modals
        this.initializeModals();

        // DOM Elements
        this.authButtons = document.getElementById('authButtons');
        this.userMenu = document.getElementById('userMenu');
        this.registerForm = document.getElementById('registerForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.notesContainer = document.getElementById('notesContainer');
        this.noteInputArea = document.getElementById('noteInputArea');

        // Bind methods
        this.handleAuth = this.handleAuth.bind(this);
        this.handleRegister = this.handleRegister.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.addNote = this.addNote.bind(this);
        this.renderNotes = this.renderNotes.bind(this);
        this.showUserProfile = this.showUserProfile.bind(this);
        this.handleNoteEdit = this.handleNoteEdit.bind(this);
        this.saveNoteEdit = this.saveNoteEdit.bind(this);
        this.handleAccountDeletion = this.handleAccountDeletion.bind(this);

        // Initialize
        this.initializeApp();
        this.setupEventListeners();
    }

    initializeModals() {
        // Only initialize modals if elements exist
        const userProfileModalElement = document.getElementById('userProfileModal');
        const editNoteModalElement = document.getElementById('editNoteModal');

        if (userProfileModalElement) {
            this.userProfileModal = new bootstrap.Modal(userProfileModalElement);
        }
        if (editNoteModalElement) {
            this.editNoteModal = new bootstrap.Modal(editNoteModalElement);
        }
    }

    setupEventListeners() {
        // Login button
        const loginButton = document.querySelector('#authButtons button');
        if (loginButton) {
            loginButton.addEventListener('click', this.handleAuth);
        }

        // Register buttons
        const registerButton = document.querySelector('#registerForm .btn-primary');
        if (registerButton) {
            registerButton.addEventListener('click', this.handleRegister);
        }

        const cancelRegisterButton = document.getElementById('cancelRegister');
        if (cancelRegisterButton) {
            cancelRegisterButton.addEventListener('click', () => this.handleLogout());
        }

        // Profile and logout buttons
        const showProfileButton = document.getElementById('showProfile');
        if (showProfileButton) {
            showProfileButton.addEventListener('click', this.showUserProfile);
        }

        const logoutButton = document.getElementById('logoutBtn');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout);
        }

        // Note buttons
        const addNoteButton = document.getElementById('addNoteBtn');
        if (addNoteButton) {
            addNoteButton.addEventListener('click', this.addNote);
        }

        const saveNoteEditButton = document.getElementById('saveNoteEdit');
        if (saveNoteEditButton) {
            saveNoteEditButton.addEventListener('click', this.saveNoteEdit);
        }

        const deleteAccountButton = document.getElementById('deleteAccountBtn');
        if (deleteAccountButton) {
            deleteAccountButton.addEventListener('click', this.handleAccountDeletion);
        }
    }

    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    initializeApp() {
        const userCookie = this.getCookie('noteAppUser');
        if (userCookie) {
            try {
                const credential = firebase.auth.GoogleAuthProvider.credential(null, userCookie);
                this.auth.signInWithCredential(credential).catch(error => {
                    console.error('Auto login failed:', error);
                    this.deleteCookie('noteAppUser');
                });
            } catch (error) {
                console.error('Cookie parsing error:', error);
                this.deleteCookie('noteAppUser');
            }
        }

        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userRef = this.db.ref(`users/${user.uid}`);
                const snapshot = await userRef.once('value');

                if (snapshot.exists()) {
                    this.showUserMenu();
                    this.initializeNotes(user.uid);
                    if (this.registerForm) this.registerForm.classList.add('hidden');
                    if (this.authButtons) this.authButtons.classList.add('hidden');
                    if (this.noteInputArea) this.noteInputArea.classList.remove('hidden');
                    if (this.notesContainer) this.notesContainer.classList.remove('hidden');

                    user.getIdToken().then(token => {
                        this.setCookie('noteAppUser', token, 7);
                    });
                } else {
                    if (this.registerForm) this.registerForm.classList.remove('hidden');
                    if (this.userMenu) this.userMenu.classList.add('hidden');
                    if (this.authButtons) this.authButtons.classList.add('hidden');
                    if (this.noteInputArea) this.noteInputArea.classList.add('hidden');
                    if (this.notesContainer) this.notesContainer.classList.add('hidden');
                }
            } else {
                if (this.authButtons) this.authButtons.classList.remove('hidden');
                if (this.userMenu) this.userMenu.classList.add('hidden');
                if (this.registerForm) this.registerForm.classList.add('hidden');
                if (this.noteInputArea) this.noteInputArea.classList.add('hidden');
                if (this.notesContainer) this.notesContainer.classList.add('hidden');
                this.deleteCookie('noteAppUser');
            }
        });
    }

    showUserMenu() {
        if (this.userMenu) {
            this.userMenu.classList.remove('hidden');
        }
    }

    async handleAuth() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            const token = await result.user.getIdToken();

            const userRef = this.db.ref(`users/${result.user.uid}`);
            const userSnapshot = await userRef.once('value');

            if (userSnapshot.exists()) {
                await userRef.update({
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                });
            }

            this.setCookie('noteAppUser', token, 7);
        } catch (error) {
            if (this.errorMessage) {
                this.errorMessage.textContent = `登入錯誤: ${error.message}`;
            }
        }
    }

    async handleRegister() {
        const user = this.auth.currentUser;
        if (user) {
            try {
                await this.db.ref(`users/${user.uid}`).set({
                    name: user.displayName,
                    email: user.email,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    lastLogin: null
                });

                this.showUserMenu();
                if (this.registerForm) this.registerForm.classList.add('hidden');
                if (this.noteInputArea) this.noteInputArea.classList.remove('hidden');
                if (this.notesContainer) this.notesContainer.classList.remove('hidden');

                await this.db.ref(`users/${user.uid}`).update({
                    lastLogin: now
                });

                const token = await user.getIdToken();
                this.setCookie('noteAppUser', token, 7);
            } catch (error) {
                if (this.errorMessage) {
                    this.errorMessage.textContent = `註冊錯誤: ${error.message}`;
                }
            }
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.deleteCookie('noteAppUser');
        } catch (error) {
            if (this.errorMessage) {
                this.errorMessage.textContent = `登出錯誤: ${error.message}`;
            }
        }
    }

    async handleAccountDeletion() {
        const user = this.auth.currentUser;
        if (!user) return;
        if (!confirm('確定要註銷帳號嗎？這個動作無法復原，您的所有資料都將被永久刪除。')) return;

        try {
            await Promise.all([
                this.db.ref(`notes/${user.uid}`).remove(),
                this.db.ref(`users/${user.uid}`).remove()
            ]);

            // 撤銷 Google 連結
            await user.unlink('google.com');

            // 刪除驗證帳號
            await user.delete();

            // 登出並清理
            await this.auth.signOut();
            this.deleteCookie('noteAppUser');

            // Reset UI state
            if (this.authButtons) this.authButtons.classList.remove('hidden');
            if (this.userMenu) this.userMenu.classList.add('hidden');
            if (this.registerForm) this.registerForm.classList.add('hidden');
            if (this.noteInputArea) this.noteInputArea.classList.add('hidden');
            if (this.notesContainer) {
                this.notesContainer.classList.add('hidden');
                this.notesContainer.innerHTML = '';
            }
            if (this.errorMessage) {
                this.errorMessage.textContent = '帳號已成功註銷';
            }

        } catch (error) {
            console.error('Account deletion error:', error);
            if (this.errorMessage) {
                this.errorMessage.textContent = `註銷帳號錯誤: ${error.message}`;
            }
        }
    }

    showUserProfile() {
        const user = this.auth.currentUser;
        if (user && this.userProfileModal) {
            const userModalPhoto = document.getElementById('userModalPhoto');
            const userModalName = document.getElementById('userModalName');
            const userModalEmail = document.getElementById('userModalEmail');
            const userCreateTime = document.getElementById('userCreateTime');
            const userModalLastLogin = document.getElementById('userModalLastLogin');

            if (userModalPhoto) userModalPhoto.src = user.photoURL || '';
            if (userModalName) userModalName.textContent = user.displayName;
            if (userModalEmail) userModalEmail.textContent = user.email;
            if (userCreateTime) userCreateTime.textContent = new Date(user.metadata.creationTime).toLocaleString();

            this.db.ref(`users/${user.uid}`).once('value').then(snapshot => {
                const userData = snapshot.val();
                if (userData && userModalLastLogin) {
                    userModalLastLogin.textContent = new Date(userData.lastLogin).toLocaleString();
                }
            });

            this.userProfileModal.show();
        }
    }

    initializeNotes(userId) {
        const notesRef = this.db.ref(`notes/${userId}`);
        notesRef.on('value', this.renderNotes);
    }

    async addNote() {
        const titleInput = document.querySelector('#noteInputArea input');
        const contentInput = document.querySelector('#noteInputArea textarea');
        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            if (this.errorMessage) {
                this.errorMessage.textContent = '請填寫標題和內容';
            }
            return;
        }

        try {
            const user = this.auth.currentUser;
            const newNoteRef = this.db.ref(`notes/${user.uid}`).push();
            await newNoteRef.set({
                title,
                content,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            titleInput.value = '';
            contentInput.value = '';
            if (this.errorMessage) {
                this.errorMessage.textContent = '';
            }
        } catch (error) {
            if (this.errorMessage) {
                this.errorMessage.textContent = `新增筆記錯誤: ${error.message}`;
            }
        }
    }

    handleNoteEdit(noteId, note) {
        const editNoteId = document.getElementById('editNoteId');
        const editNoteTitle = document.getElementById('editNoteTitle');
        const editNoteContent = document.getElementById('editNoteContent');

        if (editNoteId) editNoteId.value = noteId;
        if (editNoteTitle) editNoteTitle.value = note.title;
        if (editNoteContent) editNoteContent.value = note.content;
        if (this.editNoteModal) this.editNoteModal.show();
    }

    async saveNoteEdit() {
        const editNoteId = document.getElementById('editNoteId');
        const editNoteTitle = document.getElementById('editNoteTitle');
        const editNoteContent = document.getElementById('editNoteContent');

        if (!editNoteId || !editNoteTitle || !editNoteContent) return;

        const noteId = editNoteId.value;
        const newTitle = editNoteTitle.value.trim();
        const newContent = editNoteContent.value.trim();

        if (!newTitle || !newContent) {
            if (this.errorMessage) {
                this.errorMessage.textContent = '請填寫標題和內容';
            }
            return;
        }

        try {
            const user = this.auth.currentUser;
            await this.db.ref(`notes/${user.uid}/${noteId}`).update({
                title: newTitle,
                content: newContent,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            if (this.editNoteModal) this.editNoteModal.hide();
            if (this.errorMessage) {
                this.errorMessage.textContent = '';
            }
        } catch (error) {
            if (this.errorMessage) {
                this.errorMessage.textContent = `更新筆記錯誤: ${error.message}`;
            }
        }
    }

    renderNotes(snapshot) {
        if (!this.notesContainer) return;

        const notes = snapshot.val();
        this.notesContainer.innerHTML = '<h4 class="mb-3">筆記列表</h4>';

        if (!notes) return;

        const sortedNotes = Object.entries(notes)
            .sort(([, a], [, b]) => b.updatedAt - a.updatedAt);

        sortedNotes.forEach(([noteId, note]) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item mb-3 p-3 border rounded';
            noteElement.innerHTML = `
              <h5>${note.title}</h5>
              <p>${note.content}</p>
              <small>最後編輯時間: ${new Date(note.updatedAt).toLocaleString()}</small>
              <div class="mt-2">
                  <button class="edit-note btn btn-sm btn-primary">編輯</button>
                  <button class="delete-note btn btn-sm btn-danger">刪除</button>
              </div>
          `;

            noteElement.querySelector('.edit-note').onclick = () => {
                this.handleNoteEdit(noteId, note);
            };

            noteElement.querySelector('.delete-note').onclick = () => {
                if (confirm('確定要刪除這個筆記嗎？')) {
                    const user = this.auth.currentUser;
                    this.db.ref(`notes/${user.uid}/${noteId}`).remove();
                }
            };

            this.notesContainer.appendChild(noteElement);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NoteApp();
});