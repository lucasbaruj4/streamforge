
// StreamForge Frontend Application
const API_BASE = 'http://localhost:3000/api';

// Store active EventSource connections for cleanup
const activeConnections = new Map();

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  setupUploadArea();
  loadExistingJobs();
  loadSystemHealth();

  // Refresh health metrics every 30 seconds
  setInterval(loadSystemHealth, 30000);
});

// Setup drag and drop upload area
function setupUploadArea() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());

  // File selection
  fileInput.addEventListener('change', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  uploadArea.addEventListener('dragenter', () => {
    uploadArea.classList.add('dragging');
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    uploadArea.classList.remove('dragging');
    handleFileUpload(file);
  });
};

// Handle file upload to server
async function handleFileUpload(file) {
  if (file.size > 500 * 1024 * 1024) {
    alert('File too large! Max 500MB');
    return;
  }

  const formData = new FormData();
  formData.append('video', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });

  const { jobId } = await response.json();

  const card = createJobCard(jobId, file.name);
  document.getElementById('jobsList').appendChild(card);

  connectToSSE(jobId);
  console.log('File to upload:', file);
}

// Create a job card in the UI
function createJobCard(jobId, filename, initialStatus = 'queued') {
  const card = document.createElement('div');
  card.className = 'job-item';
  card.id = `job-${jobId}`;

  const header = document.createElement('div');
  header.className = `job-header`;

  const jobtitle = document.createElement('span');
  jobtitle.textContent = `Job: ${jobId}`;

  const filenameSpan = document.createElement('span');
  filenameSpan.textContent = `${filename}`;

  const statusSpan = document.createElement('span');
  statusSpan.textContent = initialStatus;
  statusSpan.id = `status-${jobId}`;

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  progressBar.id = `progress-${jobId}`;
  progressBar.textContent = `[░░░░░░░░░░] 0%`;

  const viewButton = document.createElement('button');
  viewButton.className = 'viewButton';
  viewButton.hidden = true;
  viewButton.id = `viewButton-${jobId}`;

  header.appendChild(jobtitle);
  header.appendChild(filenameSpan);
  header.appendChild(statusSpan);
  header.appendChild(progressBar);
  header.appendChild(viewButton);


  card.appendChild(header);

  return card;
}

// Connect to Server-Sent Eve-nts for real-time progress
function connectToSSE(jobId) {
  // TODO(human): Implement SSE connection
  // 1. Create EventSource to /api/jobs/{id}/progress
  // 2. Handle message events to update progress
  // 3. Update job card UI on progress/completion/failure
  // 4. Clean up connection when job completes
  // 5. Store connection in activeConnections Map
  if (activeConnections.has(jobId)) {
    console.log('Already connected to job:', jobId);
    return;
  }
  const eventSource = new EventSource(`/api/jobs/${jobId}/progress`);
  activeConnections.set(jobId, eventSource);
  const progressBar = document.getElementById(`progress-${jobId}`);
  let blockyProgressBar = '';

  // Handling eventSource connection error
  eventSource.onerror = (error) => {
    eventSource.close();
    activeConnections.delete(jobId);
    console.error('SSE connection error: ', error);
    progressBar.textContent = `[ERROR] Connection Lost`;
  }

  // Handling progress, failure and success
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.progress !== undefined) {
        const currentProgress = data.progress;
        const filledBlocks = Math.floor(currentProgress / 10);

        // Creating the progressBar
        const filledBlocky = 'X'.repeat(filledBlocks);
        const emptyBlocky = '░'.repeat(10 - filledBlocks);

        blockyProgressBar = `[${filledBlocky}${emptyBlocky}] ${currentProgress}%`;
      } else if (data.failedReason !== undefined) {
        const failedBlocky = '?'.repeat(10);
        const failedMessage = data.message;
        blockyProgressBar = `[${failedBlocky}] ${failedMessage}`;
        eventSource.close();
        activeConnections.delete(jobId);
      } else if (data.returnValue !== undefined) {
        const completedMessage = data.message;
        const filledBlocky = 'X'.repeat(10);
        blockyProgressBar = `[${filledBlocky}] ${completedMessage}`;
        eventSource.close();
        activeConnections.delete(jobId);
      }
      progressBar.textContent = blockyProgressBar;
    } catch (e) {
      console.log('Non-JSON message:', event.data);
    }
  };
  console.log(`Connecting to SSE for job ${jobId}`);
}

// Update job card with new status/progress
function updateJobCard(jobId, data) {
  // TODO(human): Update the job card UI
  // Find the card by ID
  // Update progress bar width and text
  // Update status badge
  // Show action buttons if complete

  const card = document.getElementById(`job - ${jobId} `);
  if (!card) return;

  console.log(`Updating job ${jobId}: `, data);
}

// Load existing jobs on page load
async function loadExistingJobs() {
  // TODO(human): Fetch recent jobs (optional feature)
  // Could query completed jobs from last 24h if API supports it
  // For now, just start fresh
  console.log('Loading existing jobs...');
}

// Load and display system health metrics
async function loadSystemHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const health = await response.json();

    // TODO(human): Display health metrics
    // Show worker count, queue stats, Redis status
    // Update the health-info div with metric cards

    console.log('System health:', health);

    const healthInfo = document.getElementById('healthInfo');
    // Add your health display logic here

  } catch (error) {
    console.error('Failed to load health metrics:', error);
  }
}

// Play completed video
function playVideo(jobId, quality = '720p') {
  // TODO(human): Implement video playback
  // Create or show modal with video player
  // Set video source to /api/stream/{jobId}/{quality}
  // Add quality selector for 1080p/720p/360p

  console.log(`Playing video ${jobId} at ${quality}`);
}

// Download completed video
function downloadVideo(jobId, quality = '720p') {
  // Create a download link
  const link = document.createElement('a');
  link.href = `${API_BASE}/stream/${jobId}/${quality}`;
  link.download = `video-${jobId}-${quality}.mp4`;
  link.click();
}

// Cleanup function for when page unloads
window.addEventListener('beforeunload', () => {
  // Close all SSE connections
  activeConnections.forEach(connection => connection.close());
});
