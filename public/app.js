
// StreamForge Frontend Application
const API_BASE = 'http://localhost:3000/api';
const AUTH_BASE = 'http://localhost:3000/auth';

// Store active EventSource connections for cleanup
const activeConnections = new Map();

// Auth state management
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupUploadArea();
  loadExistingJobs();
  loadSystemHealth();

  // Refresh health metrics every 30 seconds
  setInterval(loadSystemHealth, 30000);
});

// Setup auth UI and handlers
function setupAuth() {
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const registerSubmitBtn = document.getElementById('registerSubmitBtn');
  const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');
  const switchToLoginBtn = document.getElementById('switchToLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  loginSubmitBtn.addEventListener('click', () => handleLogin());
  registerSubmitBtn.addEventListener('click', () => handleRegister());
  switchToRegisterBtn.addEventListener('click', () => showRegisterForm());
  switchToLoginBtn.addEventListener('click', () => showLoginForm());
  logoutBtn.addEventListener('click', () => handleLogout());

  // Check if user is already logged in
  if (authToken) {
    verifyToken();
  }
}

// Show login form
function showLoginForm() {
  document.getElementById('loginBox').classList.remove('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  clearAuthErrors();
}

// Show register form
function showRegisterForm() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.remove('hidden');
  clearAuthErrors();
}

// Show auth modal with custom message (defaults to login)
function showAuthModal(message = 'login to continue') {
  document.getElementById('loginMessage').textContent = message;
  document.getElementById('authOverlay').classList.remove('hidden');
  showLoginForm();
}

// Hide auth modal
function hideAuthModal() {
  document.getElementById('authOverlay').classList.add('hidden');
  clearAuthInputs();
  clearAuthErrors();
}

// Clear all auth form inputs
function clearAuthInputs() {
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('registerPasswordConfirm').value = '';
}

// Clear all auth errors
function clearAuthErrors() {
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('registerError').classList.add('hidden');
}

// Show login error
function showLoginError(message) {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

// Show register error
function showRegisterError(message) {
  const errorEl = document.getElementById('registerError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

// Handle login
async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showLoginError('email and password required');
    return;
  }

  try {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showLoginError(data.error || 'login failed');
      return;
    }

    // Store token and update UI
    authToken = data.session.access_token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);

    updateUserUI();
    hideAuthModal();
  } catch (error) {
    showLoginError('connection error');
    console.error('Login error:', error);
  }
}

// Handle registration
async function handleRegister() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

  if (!email || !password || !passwordConfirm) {
    showRegisterError('all fields required');
    return;
  }

  if (password.length < 6) {
    showRegisterError('password must be at least 6 characters');
    return;
  }

  if (password !== passwordConfirm) {
    showRegisterError('passwords do not match');
    return;
  }

  try {
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showRegisterError(data.details || data.error || 'registration failed');
      return;
    }

    // Check if session exists (Supabase might require email confirmation)
    if (!data.session) {
      showRegisterError('please check your email to verify your account');
      return;
    }

    // Store token and update UI
    authToken = data.session.access_token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);

    updateUserUI();
    hideAuthModal();
  } catch (error) {
    showRegisterError('connection error');
    console.error('Registration error:', error);
  }
}

// Handle logout
function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  updateUserUI();
}

// Verify existing token
async function verifyToken() {
  try {
    const response = await fetch(`${AUTH_BASE}/user`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      updateUserUI();
    } else {
      // Token invalid, clear it
      authToken = null;
      localStorage.removeItem('authToken');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
  }
}

// Update user UI based on auth state
function updateUserUI() {
  const userBar = document.getElementById('userBar');
  const userEmail = document.getElementById('userEmail');

  if (currentUser) {
    userEmail.textContent = currentUser.email;
    userBar.classList.remove('hidden');
  } else {
    userBar.classList.add('hidden');
  }
}

// Setup drag and drop upload area
function setupUploadArea() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ff0';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#0f0';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0f0';
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });
}

// Handle file upload
async function handleFileUpload(file) {
  if (!file.type.startsWith('video/')) {
    updateSystemStatus('error: not a video file', true);
    return;
  }

  const formData = new FormData();
  formData.append('video', file);

  try {
    updateSystemStatus('uploading...', false);

    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    const data = await response.json();

    // Check if auth is required (anonymous limit reached)
    if (response.status === 401 && data.requiresAuth) {
      showAuthModal(data.message || 'you\'ve reached the upload limit. login to continue');
      updateSystemStatus('authentication required', false);
      return;
    }

    if (!response.ok) {
      updateSystemStatus(`error: ${data.error}`, true);
      return;
    }

    addJobToList(data.jobId, file.name);
    connectToJobProgress(data.jobId);
    updateSystemStatus('upload successful', false);
  } catch (error) {
    console.error('Upload error:', error);
    updateSystemStatus('error: upload failed', true);
  }
}

// Add job to UI list
function addJobToList(jobId, filename) {
  const jobsList = document.getElementById('jobsList');

  const jobDiv = document.createElement('div');
  jobDiv.className = 'job';
  jobDiv.id = `job-${jobId}`;
  jobDiv.innerHTML = `
    <div class="job-header">
      <span class="job-name">${filename}</span>
      <span class="job-status" id="status-${jobId}">queued</span>
    </div>
    <div class="progress-bar" id="progress-${jobId}">
      <div class="progress-fill"></div>
    </div>
    <div class="job-actions" id="actions-${jobId}"></div>
  `;

  jobsList.prepend(jobDiv);
}

// Connect to job progress via SSE
function connectToJobProgress(jobId) {
  const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/progress`);

  activeConnections.set(jobId, eventSource);

  eventSource.addEventListener('progress', (event) => {
    const data = JSON.parse(event.data);
    updateJobProgress(jobId, data.progress);
  });

  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    markJobComplete(jobId, data);
    eventSource.close();
    activeConnections.delete(jobId);
  });

  eventSource.addEventListener('failed', (event) => {
    const data = JSON.parse(event.data);
    markJobFailed(jobId, data.error);
    eventSource.close();
    activeConnections.delete(jobId);
  });

  eventSource.onerror = () => {
    console.error(`SSE connection error for job ${jobId}`);
    eventSource.close();
    activeConnections.delete(jobId);
  };
}

// Update job progress bar
function updateJobProgress(jobId, progress) {
  const statusEl = document.getElementById(`status-${jobId}`);
  const progressBar = document.getElementById(`progress-${jobId}`);
  const progressFill = progressBar.querySelector('.progress-fill');

  if (statusEl) statusEl.textContent = `processing: ${progress}%`;
  if (progressFill) progressFill.style.width = `${progress}%`;
}

// Mark job as complete
function markJobComplete(jobId, data) {
  const statusEl = document.getElementById(`status-${jobId}`);
  const actionsEl = document.getElementById(`actions-${jobId}`);

  if (statusEl) statusEl.textContent = 'ready';

  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn" onclick="playVideo('${jobId}', '1080p')">play 1080p</button>
      <button class="btn" onclick="playVideo('${jobId}', '720p')">play 720p</button>
      <button class="btn" onclick="playVideo('${jobId}', '360p')">play 360p</button>
    `;
  }
}

// Mark job as failed
function markJobFailed(jobId, error) {
  const statusEl = document.getElementById(`status-${jobId}`);
  if (statusEl) {
    statusEl.textContent = `failed: ${error || 'unknown error'}`;
    statusEl.style.color = '#f00';
  }
}

// Play video
function playVideo(jobId, quality) {
  const jobDiv = document.getElementById(`job-${jobId}`);

  // Check if video player already exists
  let playerDiv = jobDiv.querySelector('.video-player-container');

  if (playerDiv) {
    // Remove existing player
    playerDiv.remove();
    return;
  }

  // Create new player
  playerDiv = document.createElement('div');
  playerDiv.className = 'video-player-container';
  playerDiv.innerHTML = `
    <video class="videoPlayer" controls autoplay>
      <source src="${API_BASE}/stream/${jobId}/${quality}" type="video/mp4">
      Your browser doesn't support video playback.
    </video>
    <button class="btn" onclick="this.parentElement.remove()">close</button>
  `;

  jobDiv.appendChild(playerDiv);
}

// Load existing jobs from localStorage
function loadExistingJobs() {
  // This is a placeholder - in Phase 4.5 we'll load from database
  // For now, jobs are lost on page refresh
}

// Load system health metrics
async function loadSystemHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    // Update status bar with health info if needed
    // For now we keep it simple
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Update system status message
function updateSystemStatus(message, isError = false) {
  const statusText = document.getElementById('statusText');
  statusText.textContent = `system: ${message}`;
  statusText.style.color = isError ? '#f00' : '#0f0';

  // Reset color after 3 seconds
  if (isError) {
    setTimeout(() => {
      statusText.style.color = '#0f0';
      statusText.textContent = 'system: ready';
    }, 3000);
  }
}
