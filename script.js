// State management
const state = {
    currentVideo: 'introduction',
    currentChoicePoint: 0, // 0 = intro, 1 = after intro, 2 = after choice point 1, 3 = after choice point 2
    isPlaying: false,
    controlsVisible: false,
    controlsTimeout: null,
    userInitiatedPlay: false,
    explicitVideoClick: false // Track if user explicitly clicked on video to play/pause
};

// Video configuration
const videoConfig = {
    introduction: {
        path: 'assets/videos/SCENE1_INTRODUCTION.mp4',
        nextChoicePoint: 1
    },
    choice1Elevator: {
        path: 'assets/videos/CHOICE_POINT1_ELEVATOR.mp4',
        nextChoicePoint: 2
    },
    choice1StairsDown: {
        path: 'assets/videos/CHOICE_POINT1_STAIRS_DOWN.mp4',
        nextChoicePoint: 2
    },
    choice2Lounge: {
        path: 'assets/videos/CHOICE_POINT2_LOUNGE.mp4',
        nextChoicePoint: 3
    },
    choice2StairsUp: {
        path: 'assets/videos/CHOICE_POINT2_STAIRS_UP.mp4',
        nextChoicePoint: 3
    },
    choice3OtherStairsDown: {
        path: 'assets/videos/CHOICE_POINT3_OTHER_STAIRS_DOWN.mp4',
        nextChoicePoint: null // End
    },
    choice3Lounge: {
        path: 'assets/videos/CHOICE_POINT3_LOUNGE.mp4',
        nextChoicePoint: null // End
    }
};

// Choice configurations for each choice point
const choicePoints = {
    1: [
        { id: 'choice1Elevator', label: 'Try the elevator again', videoId: 'choice1Elevator', thumbnailId: 'choice1ElevatorThumb', imagePath: 'assets/images/elevator.png' },
        { id: 'choice1StairsDown', label: 'Take the stairs down', videoId: 'choice1StairsDown', thumbnailId: 'choice1StairsDownThumb', imagePath: 'assets/images/stairs.png' }
    ],
    2: [
        { id: 'choice2Lounge', label: 'Try re-entering the lounge', videoId: 'choice2Lounge', thumbnailId: 'choice2LoungeThumb', imagePath: 'assets/images/lounge.png' },
        { id: 'choice2StairsUp', label: 'Take the stairs up', videoId: 'choice2StairsUp', thumbnailId: 'choice2StairsUpThumb', imagePath: 'assets/images/stairs.png' }
    ],
    3: [
        { id: 'choice3OtherStairsDown', label: 'Take the other stairs down', videoId: 'choice3OtherStairsDown', thumbnailId: 'choice3OtherStairsDownThumb', imagePath: 'assets/images/stairs2.png' },
        { id: 'choice3Lounge', label: 'Try re-entering the lounge', videoId: 'choice3Lounge', thumbnailId: 'choice3LoungeThumb', imagePath: 'assets/images/lounge.png' }
    ]
};

// DOM elements
const loadingScreen = document.getElementById('loadingScreen');
const landingPage = document.getElementById('landingPage');
const startButton = document.getElementById('startButton');
const videoContainer = document.getElementById('videoContainer');
const mainVideo = document.getElementById('mainVideo');
const videoControls = document.getElementById('videoControls');
const playPauseOverlay = document.getElementById('playPauseOverlay');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const volumeSlider = document.getElementById('volumeSlider');
const choiceContainer = document.getElementById('choiceContainer');
const choiceBoxesWrapper = document.getElementById('choiceBoxesWrapper');
const finalScreen = document.getElementById('finalScreen');
const restartButton = document.getElementById('restartButton');
const choicesAudio = document.getElementById('choicesAudio');

// Get all preload video elements
const preloadVideos = {
    choice1Elevator: document.getElementById('choice1Elevator'),
    choice1StairsDown: document.getElementById('choice1StairsDown'),
    choice2Lounge: document.getElementById('choice2Lounge'),
    choice2StairsUp: document.getElementById('choice2StairsUp'),
    choice3OtherStairsDown: document.getElementById('choice3OtherStairsDown'),
    choice3Lounge: document.getElementById('choice3Lounge')
};

// Videos to preload
const videosToLoad = [
    { element: mainVideo, name: 'introduction' },
    ...Object.entries(preloadVideos).map(([name, element]) => ({ element, name }))
];

const loadedVideos = new Set();
const videoLoadProgress = new Map();

// Initialize progress tracking for all videos
videosToLoad.forEach(({ name }) => {
    videoLoadProgress.set(name, { canPlayThrough: false, buffered: false });
});

function checkVideoLoaded(videoName, checkType) {
    const progress = videoLoadProgress.get(videoName);
    if (!progress) return;
    
    // Update progress based on check type
    if (checkType === 'canplaythrough') {
        progress.canPlayThrough = true;
    } else if (checkType === 'buffered') {
        progress.buffered = true;
    }
    
    // Video is ready when it can play through AND has buffered data
    const isReady = progress.canPlayThrough && progress.buffered;
    
    if (isReady && !loadedVideos.has(videoName)) {
        loadedVideos.add(videoName);
        
        // Update loading text
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            const percent = Math.round((loadedVideos.size / videosToLoad.length) * 100);
            loadingText.textContent = `Loading... (${percent}%)`;
        }
        
        if (loadedVideos.size === videosToLoad.length) {
            // All videos loaded - wait a bit more to ensure full buffering
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                landingPage.classList.add('visible');
                setupChoiceThumbnails();
            }, 800);
        }
    }
}

function setupChoiceThumbnails() {
    // Set thumbnails for all choice videos
    Object.values(preloadVideos).forEach(video => {
        if (video) {
            video.pause();
            video.autoplay = false;
            
            video.addEventListener('play', (e) => {
                e.preventDefault();
                video.pause();
            });
            
            if (video.readyState >= 2 && video.duration) {
                video.currentTime = Math.min(2, video.duration / 2);
            } else {
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = Math.min(2, video.duration / 2);
                    video.pause();
                }, { once: true });
            }
        }
    });
}

// Enhanced preload function for each video
function preloadVideo({ element, name }) {
    if (!element) return;
    
    let canPlayThroughFired = false;
    let bufferedCheckDone = false;
    let progressCheckInterval = null;
    
    const checkBuffering = () => {
        if (!element.duration || bufferedCheckDone) return;
        
        const buffered = element.buffered;
        if (buffered.length > 0) {
            // Check if we have substantial buffered data
            const bufferedEnd = buffered.end(buffered.length - 1);
            const bufferedPercent = (bufferedEnd / element.duration) * 100;
            
            // Require at least 80% buffered or readyState 4 (HAVE_ENOUGH_DATA) with significant buffer
            // This ensures smooth playback and seeking
            const hasEnoughBuffer = bufferedPercent >= 80 || 
                                   (element.readyState >= 4 && bufferedPercent >= 30) ||
                                   (element.readyState === 4 && buffered.length > 0 && 
                                    buffered.end(buffered.length - 1) >= element.duration * 0.5);
            
            if (hasEnoughBuffer) {
                bufferedCheckDone = true;
                checkVideoLoaded(name, 'buffered');
                
                if (progressCheckInterval) {
                    clearInterval(progressCheckInterval);
                    progressCheckInterval = null;
                }
            }
        }
    };
    
    const handleCanPlayThrough = () => {
        if (!canPlayThroughFired) {
            canPlayThroughFired = true;
            checkVideoLoaded(name, 'canplaythrough');
            
            // Start checking buffer progress regularly
            checkBuffering(); // Check immediately
            if (!bufferedCheckDone && !progressCheckInterval) {
                progressCheckInterval = setInterval(checkBuffering, 200);
            }
        }
    };
    
    // Set preload attribute to ensure aggressive loading
    element.preload = 'auto';
    
    // Wait for canplaythrough event (indicates browser thinks it can play through)
    element.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    element.addEventListener('progress', checkBuffering);
    element.addEventListener('loadeddata', checkBuffering);
    
    // Check immediately if already loaded
    if (element.readyState >= 4) {
        handleCanPlayThrough();
    }
    
    // Fallback: if canplaythrough doesn't fire, still check after some progress
    setTimeout(() => {
        if (!canPlayThroughFired && element.readyState >= 3) {
            handleCanPlayThrough();
        }
        // Also check buffering even if canplaythrough hasn't fired
        checkBuffering();
    }, 2000);
    
    // Continue checking even after initial checks
    const extendedCheckInterval = setInterval(() => {
        if (!bufferedCheckDone) {
            checkBuffering();
        }
        if (canPlayThroughFired && bufferedCheckDone) {
            clearInterval(extendedCheckInterval);
        }
    }, 500);
    
    // Maximum wait time before forcing check (20 seconds per video)
    setTimeout(() => {
        if (!bufferedCheckDone) {
            bufferedCheckDone = true;
            checkVideoLoaded(name, 'buffered');
        }
        if (!canPlayThroughFired) {
            canPlayThroughFired = true;
            checkVideoLoaded(name, 'canplaythrough');
        }
        clearInterval(extendedCheckInterval);
        if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
        }
    }, 20000);
    
    // Load the video
    element.load();
}

// Initialize loading text
const loadingText = document.querySelector('.loading-text');
if (loadingText) {
    loadingText.textContent = `Loading... 0/${videosToLoad.length} (0%)`;
}

// Preload all videos
videosToLoad.forEach(video => preloadVideo(video));

// Controls visibility
function showControls() {
    if (state.currentVideo === 'choice' || state.currentVideo === 'end') {
        return;
    }
    if (videoControls.classList.contains('hidden')) {
        return;
    }
    
    videoControls.classList.add('visible');
    state.controlsVisible = true;
    
    if (state.controlsTimeout) {
        clearTimeout(state.controlsTimeout);
    }
    
    state.controlsTimeout = setTimeout(() => {
        videoControls.classList.remove('visible');
        state.controlsVisible = false;
    }, 3000);
}

function hideControls() {
    if (state.controlsTimeout) {
        clearTimeout(state.controlsTimeout);
        state.controlsTimeout = null;
    }
    videoControls.classList.remove('visible');
    state.controlsVisible = false;
    setTimeout(() => {
        if (!state.controlsVisible) {
            videoControls.style.opacity = '0';
            videoControls.style.pointerEvents = 'none';
        }
    }, 300);
}

// Mouse cursor hiding on inactivity
let cursorTimeout = null;
const CURSOR_HIDE_DELAY = 3000; // Hide cursor after 3 seconds of inactivity

function showCursor() {
    document.body.classList.remove('cursor-hidden');
    
    // Clear existing timeout
    if (cursorTimeout) {
        clearTimeout(cursorTimeout);
    }
    
    // Hide cursor after inactivity
    cursorTimeout = setTimeout(() => {
        document.body.classList.add('cursor-hidden');
    }, CURSOR_HIDE_DELAY);
}

// Mouse movement detection
document.addEventListener('mousemove', () => {
    // Show cursor on mouse movement
    showCursor();
    
    if (state.currentVideo !== 'choice' && state.currentVideo !== 'end') {
        showControls();
    }
});

// Also track mouse clicks, keyboard, and other interactions
document.addEventListener('click', showCursor);
document.addEventListener('keydown', showCursor);
document.addEventListener('mousedown', showCursor);

// Click to play/pause
mainVideo.addEventListener('click', (e) => {
    if (e.target === progressContainer || e.target === progressBar || e.target === volumeSlider || e.target.closest('#videoControls')) {
        return;
    }
    
    // Mark as explicit video click for overlay display
    state.explicitVideoClick = true;
    
    if (state.isPlaying) {
        mainVideo.pause();
        state.isPlaying = false;
        state.userInitiatedPlay = false;
    } else {
        state.userInitiatedPlay = true;
        mainVideo.play();
        state.isPlaying = true;
    }
});

// Update play/pause icon
function updatePlayPauseIcon() {
    // Only show overlay if user explicitly clicked on video
    if (!state.explicitVideoClick) {
        playPauseOverlay.classList.remove('visible');
        playPauseOverlay.classList.remove('persistent');
        return;
    }
    
    if (state.isPlaying) {
        playPath.style.display = 'none';
        pausePath1.style.display = 'block';
        pausePath2.style.display = 'block';
        playPauseOverlay.classList.remove('persistent');
        playPauseOverlay.classList.add('visible');
        setTimeout(() => {
            if (state.isPlaying) {
                playPauseOverlay.classList.remove('visible');
            }
        }, 500);
    } else {
        playPath.style.display = 'block';
        pausePath1.style.display = 'none';
        pausePath2.style.display = 'none';
        playPauseOverlay.classList.add('visible');
        playPauseOverlay.classList.add('persistent');
    }
}

mainVideo.addEventListener('play', () => {
    state.isPlaying = true;
    // Ensure overlay display is not blocked
    playPauseOverlay.style.display = '';
    updatePlayPauseIcon();
});

mainVideo.addEventListener('pause', () => {
    state.isPlaying = false;
    // Ensure overlay display is not blocked when paused
    playPauseOverlay.style.display = '';
    updatePlayPauseIcon();
});

// Progress bar
function updateProgress() {
    if (mainVideo.duration) {
        const progress = (mainVideo.currentTime / mainVideo.duration) * 100;
        progressBar.style.width = progress + '%';
    }
}

mainVideo.addEventListener('timeupdate', updateProgress);

// Progress bar click
progressContainer.addEventListener('click', (e) => {
    if (mainVideo.duration) {
        const rect = progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        mainVideo.currentTime = percent * mainVideo.duration;
    }
});

// Update volume slider fill
function updateVolumeFill() {
    const volume = parseFloat(volumeSlider.value);
    const percent = (volume * 100) + '%';
    const gradient = `linear-gradient(to right, #fff 0%, #fff ${percent}, rgba(255, 255, 255, 0.2) ${percent}, rgba(255, 255, 255, 0.2) 100%)`;
    
    const style = document.createElement('style');
    style.id = 'volume-slider-style';
    const existingStyle = document.getElementById('volume-slider-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    style.textContent = `
        .volume-slider::-webkit-slider-runnable-track {
            background: ${gradient} !important;
        }
        .volume-slider::-moz-range-track {
            background: ${gradient} !important;
        }
    `;
    document.head.appendChild(style);
}

// Volume control
volumeSlider.addEventListener('input', (e) => {
    const volume = parseFloat(e.target.value);
    mainVideo.volume = volume;
    mainVideo.muted = volume === 0;
    updateVolumeFill();
});

// Generate choice boxes dynamically
function generateChoiceBoxes(choicePoint) {
    choiceBoxesWrapper.innerHTML = '';
    
    const choices = choicePoints[choicePoint];
    if (!choices) return;
    
    choices.forEach(choice => {
        const box = document.createElement('div');
        box.className = 'choice-box';
        box.dataset.video = choice.videoId;
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'choice-thumbnail';
        thumbnail.id = choice.thumbnailId;
        thumbnail.src = choice.imagePath;
        thumbnail.alt = choice.label;
        
        const label = document.createElement('div');
        label.className = 'choice-label';
        label.textContent = choice.label;
        
        box.appendChild(thumbnail);
        box.appendChild(label);
        
        box.addEventListener('click', () => {
            if (state.currentVideo !== 'choice') return;
            
            playChoiceVideo(choice.videoId);
        });
        
        choiceBoxesWrapper.appendChild(box);
    });
}

// Play choice video
function playChoiceVideo(videoId) {
    state.currentVideo = videoId;
    const config = videoConfig[videoId];
    
    // Force a reflow
    void choiceContainer.offsetHeight;
    
    // Start fade out transition
    choiceContainer.classList.add('fading-out');
    
    // Fade out choices audio
    fadeOutAudio(choicesAudio, 800);
    
    // Switch video source
    const preloadedVideo = preloadVideos[videoId];
    mainVideo.src = config.path;
    mainVideo.muted = false; // Ensure audio is enabled
    mainVideo.load();
    
    // After fade out completes, hide choice container and show video
    setTimeout(() => {
        choiceContainer.classList.remove('visible');
        choiceContainer.classList.remove('fading-out');
        
        // Show video container
        videoContainer.style.display = 'flex';
        videoContainer.classList.remove('zoomed-out');
        videoContainer.classList.add('zoomed-in');
        videoContainer.classList.add('fading-in');
        
        // Reset controls
        videoControls.classList.remove('hidden');
        videoControls.style.opacity = '';
        videoControls.style.pointerEvents = '';
        state.controlsVisible = false;
        
        // Hide play/pause overlay during autoplay (not explicit video click)
        state.explicitVideoClick = false;
        playPauseOverlay.style.display = '';
        playPauseOverlay.classList.remove('visible');
        playPauseOverlay.classList.remove('persistent');
        
        // Play video when ready
        function playWhenReady() {
            state.userInitiatedPlay = false;
            if (mainVideo.readyState >= 3) {
                mainVideo.play().then(() => {
                    state.isPlaying = true;
                    // Don't show overlay during autoplay
                    playPauseOverlay.classList.remove('visible');
                    playPauseOverlay.classList.remove('persistent');
                }).catch((error) => {
                    // If play fails, enable overlay so user can click
                    console.log('Play blocked:', error);
                    state.isPlaying = false;
                    state.userInitiatedPlay = false;
                    state.explicitVideoClick = true; // Allow overlay to show on error
                    updatePlayPauseIcon();
                });
            } else {
                mainVideo.addEventListener('canplaythrough', () => {
                    mainVideo.play().then(() => {
                        state.isPlaying = true;
                        // Don't show overlay during autoplay
                        playPauseOverlay.classList.remove('visible');
                        playPauseOverlay.classList.remove('persistent');
                    }).catch((error) => {
                        // If play fails, enable overlay so user can click
                        console.log('Play blocked:', error);
                        state.isPlaying = false;
                        state.userInitiatedPlay = false;
                        state.explicitVideoClick = true; // Allow overlay to show on error
                        updatePlayPauseIcon();
                    });
                }, { once: true });
            }
        }
        
        setTimeout(playWhenReady, 100);
        
        // Remove fading-in class after transition
        setTimeout(() => {
            videoContainer.classList.remove('fading-in');
        }, 1000);
    }, 800);
}

// Audio fade functions
function fadeInAudio(audio, targetVolume = 0.03, duration = 800) {
    audio.volume = 0;
    audio.play().catch(err => console.log('Audio play failed:', err));
    
    const startVolume = 0;
    const change = targetVolume - startVolume;
    const startTime = performance.now();
    
    function updateVolume() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = startVolume + (change * progress);
        
        if (progress < 1) {
            requestAnimationFrame(updateVolume);
        }
    }
    
    updateVolume();
}

function fadeOutAudio(audio, duration = 800) {
    const startVolume = audio.volume;
    const change = -startVolume;
    const startTime = performance.now();
    
    function updateVolume() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = startVolume + (change * progress);
        
        if (progress >= 1) {
            audio.pause();
            audio.currentTime = 0;
        } else {
            requestAnimationFrame(updateVolume);
        }
    }
    
    updateVolume();
}

// Show choices for current choice point
function showChoices(choicePoint) {
    state.currentChoicePoint = choicePoint;
    state.currentVideo = 'choice';
    
    // Generate and show choice boxes
    generateChoiceBoxes(choicePoint);
    
    // Hide video and show choices immediately
    playPauseOverlay.style.display = 'none';
    videoContainer.style.display = 'none';
    
    // Fade in choices audio
    fadeInAudio(choicesAudio);
    
    // Show choices
    setTimeout(() => {
        choiceContainer.classList.add('visible');
    }, 100);
}

// Video end handler
mainVideo.addEventListener('ended', () => {
    // Hide controls
    if (state.controlsTimeout) {
        clearTimeout(state.controlsTimeout);
        state.controlsTimeout = null;
    }
    videoControls.classList.remove('visible');
    videoControls.classList.add('hidden');
    state.controlsVisible = false;
    
    // Fade out play/pause overlay
    playPauseOverlay.classList.remove('visible');
    playPauseOverlay.classList.remove('persistent');
    
    const config = videoConfig[state.currentVideo];
    
    if (!config) {
        // Unknown video state, don't proceed
        return;
    }
    
    if (config.nextChoicePoint === null) {
        // End of journey
        // Fade out choices audio if playing
        if (choicesAudio && !choicesAudio.paused) {
            fadeOutAudio(choicesAudio, 800);
        }
        playPauseOverlay.style.display = 'none';
        videoContainer.style.display = 'none';
        choiceContainer.classList.remove('visible');
        finalScreen.classList.add('visible');
        state.currentVideo = 'end';
    } else {
        // Show next choice point
        showChoices(config.nextChoicePoint);
    }
});

// Initialize
mainVideo.volume = 1;
mainVideo.muted = false;
volumeSlider.value = 1;
updateVolumeFill();

// Initialize choices audio
if (choicesAudio) {
    choicesAudio.volume = 0;
}

// Initialize play/pause icon
playPath.style.display = 'block';
pausePath1.style.display = 'none';
pausePath2.style.display = 'none';
playPauseOverlay.classList.add('visible');
playPauseOverlay.classList.add('persistent');

// Initialize cursor hiding (will hide after delay if no interaction)
setTimeout(() => {
    document.body.classList.add('cursor-hidden');
}, CURSOR_HIDE_DELAY);

// Spacebar to play/pause
document.addEventListener('keydown', (e) => {
    // Only handle spacebar if not typing in an input field and not on landing page
    if (e.code === 'Space' || e.key === ' ') {
        // Don't trigger if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Prevent default scroll behavior
        e.preventDefault();
        
        // Only toggle play/pause if video container is visible (not on landing page)
        if (videoContainer.style.display === 'flex' || 
            window.getComputedStyle(videoContainer).display === 'flex') {
            // Mark as explicit user action
            state.explicitVideoClick = true;
            
            if (state.isPlaying) {
                mainVideo.pause();
                state.isPlaying = false;
                state.userInitiatedPlay = false;
            } else {
                state.userInitiatedPlay = true;
                mainVideo.play().then(() => {
                    state.isPlaying = true;
                    updatePlayPauseIcon();
                }).catch(() => {});
            }
        }
    }
});

// Start button click handler
startButton.addEventListener('click', () => {
    // Show video container immediately (before fade)
    videoContainer.style.display = 'flex';
    videoContainer.classList.add('fading-in');
    
    // Hide play/pause overlay during autoplay (not explicit video click)
    state.explicitVideoClick = false;
    playPauseOverlay.style.display = '';
    playPauseOverlay.classList.remove('visible');
    playPauseOverlay.classList.remove('persistent');
    
    // Ensure video is ready, then start playing immediately (user-initiated, so should work)
    state.userInitiatedPlay = true; // Mark as user-initiated since user clicked button
    
    // Function to start playing
    const startPlayback = () => {
        mainVideo.play().then(() => {
            state.isPlaying = true;
            // Don't show overlay during autoplay
            playPauseOverlay.classList.remove('visible');
            playPauseOverlay.classList.remove('persistent');
        }).catch((error) => {
            // If play fails, enable overlay so user can click
            console.log('Play blocked:', error);
            state.isPlaying = false;
            state.userInitiatedPlay = false;
            state.explicitVideoClick = true; // Allow overlay to show on error
            updatePlayPauseIcon();
        });
    };
    
    // If video is ready, play immediately, otherwise wait for it to be ready
    if (mainVideo.readyState >= 3) {
        startPlayback();
    } else {
        mainVideo.addEventListener('canplaythrough', startPlayback, { once: true });
        // Also try immediately in case it's already ready but event hasn't fired
        setTimeout(() => {
            if (!state.isPlaying && mainVideo.readyState >= 3) {
                startPlayback();
            }
        }, 50);
    }
    
    // Fade out landing page
    landingPage.classList.add('fading-out');
    
    // After fade completes, hide landing page
    setTimeout(() => {
        landingPage.classList.remove('visible');
        landingPage.classList.remove('fading-out');
        
        // Remove fading-in class after transition
        setTimeout(() => {
            videoContainer.classList.remove('fading-in');
        }, 1000);
    }, 1500); // Match CSS transition duration
});

// Restart button click handler
restartButton.addEventListener('click', () => {
    // Refresh the page
    window.location.reload();
});
