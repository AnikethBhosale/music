// MusicVault Player JavaScript
// Handles audio playback, queue management, shuffle, and repeat

// ===== GLOBAL STATE =====
let currentQueue = [];
let currentIndex = 0;
let originalQueue = [];
let isShuffled = false;
let repeatMode = 'off'; // 'off', 'all', 'one'

// DOM Elements
const audio = document.getElementById('audio-element');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const repeatIcon = document.getElementById('repeat-icon');
const progressBar = document.getElementById('progress');
const currentTimeSpan = document.getElementById('current-time');
const totalDurationSpan = document.getElementById('total-duration');
const volumeSlider = document.getElementById('volume-slider');
const songTitle = document.getElementById('song-title');
const coverImage = document.getElementById('cover-image');
const queueList = document.getElementById('queue-list');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Load queue data from Django
    if (window.queueData) {
        currentQueue = window.queueData;
        originalQueue = [...currentQueue];
        currentIndex = window.currentIndex || 0;
    }

    // Load saved state from localStorage
    loadPlayerState();

    // Set up event listeners
    setupEventListeners();

    // Auto-play on load
    audio.play().catch(err => console.log('Auto-play prevented:', err));
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);

    // Previous/Next
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);

    // Shuffle
    shuffleBtn.addEventListener('click', toggleShuffle);

    // Repeat
    repeatBtn.addEventListener('click', toggleRepeat);

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);

    // Progress bar click
    document.querySelector('.progress-bar').addEventListener('click', seek);

    // Volume control
    volumeSlider.addEventListener('input', changeVolume);

    // Queue item clicks
    document.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            jumpToSong(index);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ===== PLAYBACK CONTROLS =====
function togglePlayPause() {
    if (audio.paused) {
        audio.play();
        playIcon.textContent = '⏸️';
    } else {
        audio.pause();
        playIcon.textContent = '▶️';
    }
}

function playNext() {
    if (repeatMode === 'one') {
        // Replay current song
        audio.currentTime = 0;
        audio.play();
        return;
    }

    currentIndex++;

    if (currentIndex >= currentQueue.length) {
        if (repeatMode === 'all') {
            currentIndex = 0; // Loop back to start
        } else {
            currentIndex = currentQueue.length - 1;
            audio.pause();
            playIcon.textContent = '▶️';
            return;
        }
    }

    loadSong(currentIndex);
}

function playPrevious() {
    // If more than 3 seconds played, restart current song
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    currentIndex--;

    if (currentIndex < 0) {
        if (repeatMode === 'all') {
            currentIndex = currentQueue.length - 1; // Loop to end
        } else {
            currentIndex = 0;
            audio.currentTime = 0;
            return;
        }
    }

    loadSong(currentIndex);
}

function jumpToSong(index) {
    if (index >= 0 && index < currentQueue.length) {
        currentIndex = index;
        loadSong(currentIndex);
    }
}

function loadSong(index) {
    const song = currentQueue[index];
    
    // Update audio source
    audio.src = song.audio_url;
    audio.load();
    audio.play().catch(err => console.log('Playback error:', err));
    playIcon.textContent = '⏸️';

    // Update UI
    songTitle.textContent = song.title;
    
    // Update cover image
    if (song.cover_url) {
        if (coverImage.tagName === 'IMG') {
            coverImage.src = song.cover_url;
        } else {
            const img = document.createElement('img');
            img.src = song.cover_url;
            img.alt = song.title;
            img.id = 'cover-image';
            coverImage.parentNode.replaceChild(img, coverImage);
        }
    }

    // Update queue UI
    updateQueueUI();

    // Save state
    savePlayerState();
}

// ===== SHUFFLE FUNCTIONALITY =====
function toggleShuffle() {
    isShuffled = !isShuffled;

    if (isShuffled) {
        shuffleBtn.classList.add('active');
        shuffleBtn.style.color = '#4CAF50';
        
        // Save current song
        const currentSong = currentQueue[currentIndex];
        
        // Shuffle using Fisher-Yates algorithm
        currentQueue = [...originalQueue];
        for (let i = currentQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
        }

        // Find current song in shuffled queue
        currentIndex = currentQueue.findIndex(song => song.id === currentSong.id);
        
    } else {
        shuffleBtn.classList.remove('active');
        shuffleBtn.style.color = '';
        
        // Restore original order
        const currentSong = currentQueue[currentIndex];
        currentQueue = [...originalQueue];
        currentIndex = currentQueue.findIndex(song => song.id === currentSong.id);
    }

    updateQueueUI();
    savePlayerState();
}

// ===== REPEAT FUNCTIONALITY =====
function toggleRepeat() {
    if (repeatMode === 'off') {
        repeatMode = 'all';
        repeatIcon.textContent = '🔁';
        repeatBtn.style.color = '#4CAF50';
        repeatBtn.title = 'Repeat: All';
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        repeatIcon.textContent = '🔂';
        repeatBtn.style.color = '#2196F3';
        repeatBtn.title = 'Repeat: One';
    } else {
        repeatMode = 'off';
        repeatIcon.textContent = '🔁';
        repeatBtn.style.color = '';
        repeatBtn.title = 'Repeat: Off';
    }

    savePlayerState();
}

// ===== PROGRESS BAR =====
function updateProgress() {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
    currentTimeSpan.textContent = formatTime(audio.currentTime);
}

function updateDuration() {
    totalDurationSpan.textContent = formatTime(audio.duration);
}

function seek(e) {
    const progressBarElement = e.currentTarget;
    const clickX = e.offsetX;
    const width = progressBarElement.offsetWidth;
    const duration = audio.duration;
    
    audio.currentTime = (clickX / width) * duration;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== VOLUME CONTROL =====
function changeVolume(e) {
    audio.volume = e.target.value / 100;
    savePlayerState();
}

// ===== SONG END HANDLER =====
function handleSongEnd() {
    if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
    } else {
        playNext();
    }
}

// ===== QUEUE UI =====
function updateQueueUI() {
    const queueItems = document.querySelectorAll('.queue-item');
    
    queueItems.forEach((item, idx) => {
        const songId = parseInt(item.dataset.songId);
        const currentSongId = currentQueue[currentIndex].id;
        
        // Remove all active classes
        item.classList.remove('active');
        const indicator = item.querySelector('.now-playing-indicator');
        if (indicator) indicator.remove();

        // Add active class to current song
        if (songId === currentSongId) {
            item.classList.add('active');
            const newIndicator = document.createElement('span');
            newIndicator.className = 'now-playing-indicator';
            newIndicator.textContent = '▶';
            item.appendChild(newIndicator);
        }
    });
}

// ===== KEYBOARD SHORTCUTS =====
function handleKeyboard(e) {
    // Spacebar: Play/Pause
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
    }
    // Arrow Right: Next
    if (e.code === 'ArrowRight') {
        e.preventDefault();
        playNext();
    }
    // Arrow Left: Previous
    if (e.code === 'ArrowLeft') {
        e.preventDefault();
        playPrevious();
    }
}

// ===== STATE PERSISTENCE =====
function savePlayerState() {
    const state = {
        currentSongId: currentQueue[currentIndex]?.id,
        currentTime: audio.currentTime,
        volume: audio.volume,
        repeatMode: repeatMode,
        isShuffled: isShuffled
    };
    localStorage.setItem('musicVaultPlayerState', JSON.stringify(state));
}

function loadPlayerState() {
    const savedState = localStorage.getItem('musicVaultPlayerState');
    if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore volume
        if (state.volume !== undefined) {
            audio.volume = state.volume;
            volumeSlider.value = state.volume * 100;
        }

        // Restore repeat mode
        if (state.repeatMode) {
            repeatMode = state.repeatMode;
            if (repeatMode === 'all') {
                repeatIcon.textContent = '🔁';
                repeatBtn.style.color = '#4CAF50';
                repeatBtn.title = 'Repeat: All';
            } else if (repeatMode === 'one') {
                repeatIcon.textContent = '🔂';
                repeatBtn.style.color = '#2196F3';
                repeatBtn.title = 'Repeat: One';
            }
        }

        // Restore shuffle state
        if (state.isShuffled) {
            // Note: We don't restore the exact shuffle order, just the state
            shuffleBtn.classList.add('active');
            shuffleBtn.style.color = '#4CAF50';
            isShuffled = true;
        }
    }
}

console.log('MusicVault Player loaded successfully!');