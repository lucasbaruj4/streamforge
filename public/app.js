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

    // TODO(human): Implement drag and drop functionality
    // Add dragover, dragleave, and drop event listeners
    // Add visual feedback with the 'dragging' class
    // Prevent default browser behavior for file drops
}

// Handle file upload to server
async function handleFileUpload(file) {
    // TODO(human): Implement file upload logic
    // 1. Validate file size (max 500MB) and type
    // 2. Create FormData with the file
    // 3. POST to /api/upload
    // 4. On success, create a job card and start SSE connection
    // 5. Handle errors appropriately
    console.log('File to upload:', file);
}

// Create a job card in the UI
function createJobCard(jobId, filename, initialStatus = 'queued') {
    // TODO(human): Create the job card HTML structure
    // Include job ID, filename, status badge, progress bar
    // Add action buttons (hidden initially, shown when complete)
    // Return the card element

    const card = document.createElement('div');
    card.className = 'job-card';
    card.id = `job-${jobId}`;

    // Add your job card HTML here

    return card;
}

// Connect to Server-Sent Events for real-time progress
function connectToSSE(jobId) {
    // TODO(human): Implement SSE connection
    // 1. Create EventSource to /api/jobs/{id}/progress
    // 2. Handle message events to update progress
    // 3. Update job card UI on progress/completion/failure
    // 4. Clean up connection when job completes
    // 5. Store connection in activeConnections Map

    console.log(`Connecting to SSE for job ${jobId}`);
}

// Update job card with new status/progress
function updateJobCard(jobId, data) {
    // TODO(human): Update the job card UI
    // Find the card by ID
    // Update progress bar width and text
    // Update status badge
    // Show action buttons if complete

    const card = document.getElementById(`job-${jobId}`);
    if (!card) return;

    console.log(`Updating job ${jobId}:`, data);
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