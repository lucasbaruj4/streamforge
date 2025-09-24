
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
    const file = e.target.files[0];
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

  const { jobID } = await response.json();

  const card = createJobCard(jobID, file.name);
  document.getElementById('jobsList').appendChild(card);

  connectToSSE(jobID);
  console.log('File to upload:', file);
}

// Create a job card in the UI
function createJobCard(jobID, filename, initialStatus = 'queued') {
  const card = document.createElement('div');
  card.className = 'job-item';
  card.id = `job-${jobID}`;

  const header = document.createElement('div');
  header.className = `job-header`;
  header.id = `header-job-${jobID}`;

  const jobtitle = document.createElement('span');
  jobtitle.textContent = `Job: ${jobID}`;

  const filenameSpan = document.createElement('span');
  filenameSpan.textContent = `${filename}`;

  const statusSpan = document.createElement('span');
  statusSpan.textContent = initialStatus;
  statusSpan.id = `status-${jobID}`;

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  progressBar.id = `progress-${jobID}`;
  progressBar.textContent = `[░░░░░░░░░░] 0%`;

  const welcomeText = document.getElementById('welcomeText');

  const viewButton = document.createElement('button');
  viewButton.className = 'greenbtn';
  viewButton.hidden = true;
  viewButton.textContent = 'View';
  viewButton.id = `viewButton-${jobID}`;
  viewButton.addEventListener('click', () => {
    header.appendChild(videoPlayer);
    header.appendChild(closeVideoButton);
    videoPlayer.src = `${API_BASE}/stream/${jobID}/720p`;
    jobtitle.hidden = true;
    filenameSpan.hidden = true;
    statusSpan.hidden = true;
    progressBar.hidden = true;
    welcomeText.hidden = true;
    viewButton.hidden = true;
  });

  const closeVideoButton = document.createElement('button');
  closeVideoButton.textContent = 'Close';
  closeVideoButton.className = 'redbtn';
  closeVideoButton.addEventListener('click', () => {
    header.removeChild(videoPlayer);
    header.removeChild(closeVideoButton);
    jobtitle.hidden = false;
    filenameSpan.hidden = false;
    statusSpan.hidden = false;
    progressBar.hidden = false;
    welcomeText.hidden = false;
    viewButton.hidden = false;
  });



  const videoPlayer = document.createElement('video');
  videoPlayer.controls = true;
  videoPlayer.className = 'videoPlayer';

  // Debug video loading
  videoPlayer.addEventListener('loadeddata', () => {
    console.log('Video loaded successfully');
  });

  videoPlayer.addEventListener('error', (e) => {
    console.error('Video failed to load:', e);
    console.log('Video URL was:', videoPlayer.src);
  });

  // We have to create the download API first
  // const downloadButton = document.createElement('button');
  // downloadButton.className = 'downloadButton';
  // downloadButton.hidden = true;
  // downloadButton.id = `downloadButton-${jobID}`;

  header.appendChild(jobtitle);
  header.appendChild(filenameSpan);
  header.appendChild(statusSpan);
  header.appendChild(progressBar);
  header.appendChild(viewButton);


  card.appendChild(header);

  return card;
}

// Connect to Server-Sent Eve-nts for real-time progress
function connectToSSE(jobID) {
  let jobCompleted = false;
  if (activeConnections.has(jobID)) {
    console.log('Already connected to job:', jobID);
    return;
  }
  const eventSource = new EventSource(`/api/jobs/${jobID}/progress`);
  activeConnections.set(jobID, eventSource);
  const progressBar = document.getElementById(`progress-${jobID}`);
  let blockyProgressBar = '';
  const viewButton = document.getElementById(`viewButton-${jobID}`);

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

        blockyProgressBar = `[${filledBlocky}${emptyBlocky}]${currentProgress} % `;
      } else if (data.failedReason !== undefined) {
        const failedBlocky = '?'.repeat(10);
        const failedMessage = data.message;
        blockyProgressBar = `[${failedBlocky}]${failedMessage}`;
        eventSource.close();
        activeConnections.delete(jobID);
      } else if (data.returnvalue !== undefined) {
        jobCompleted = true;
        const completedMessage = data.message || 'Completed';
        const filledBlocky = 'X'.repeat(10);
        blockyProgressBar = `[${filledBlocky}]${completedMessage}`;
        viewButton.hidden = false;
      }
      progressBar.textContent = blockyProgressBar;
    } catch (e) {
      console.log('Non-JSON message:', event.data);
    }
  };

  // Handling eventSource connection error
  eventSource.onerror = (error) => {
    if (!jobCompleted) {
      console.error('SSE connection error: ', error);
      progressBar.textContent = `[ERROR] Connection Lost`;
    };
    eventSource.close();
    activeConnections.delete(jobID);
  }

  console.log(`Connecting to SSE for job ${jobID}`);
}

// Update job card with new status/progress
function updateJobCard(jobID, data) {
  // TODO(human): Update the job card UI
  // Find the card by ID
  // Update progress bar width and text
  // Update status badge
  // Show action buttons if complete

  const card = document.getElementById(`job - ${jobID} `);
  if (!card) return;

  console.log(`Updating job ${jobID}: `, data);
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
    console.log('System health:', health);

    const healthInfo = document.getElementById('healthInfo');

  } catch (error) {
    console.error('Failed to load health metrics:', error);
  }
}

// Play completed video
function playVideo(jobID, quality) {
  // TODO(human): Implement video playback
  // Create or show modal with video player
  // Set video source to /api/stream/{jobID}/{quality}
  // Add quality selector for 1080p/720p/360p

  console.log(`Playing video ${jobID} at ${quality}`);
}

// Download completed video
function downloadVideo(jobID, quality = '720p') {
  // Create a download link
  const link = document.createElement('a');
  link.href = `${API_BASE}/stream/${jobID}/${quality}`;
  link.download = `video-${jobID}-${quality}.mp4`;
  link.click();
}

// Cleanup function for when page unloads
window.addEventListener('beforeunload', () => {
  // Close all SSE connections
  activeConnections.forEach(connection => connection.close());
});
