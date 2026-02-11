const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const targetEl = document.getElementById('targetNumber');
const detectedEl = document.getElementById('detectedNumber');
const scoreEl = document.getElementById('score');
const loadingBar = document.getElementById('loadingBar');
const debugControls = document.getElementById('debugControls');

let targetNumber = 1;
let currentDetected = 0;
let score = 0;
let holdStartTime = 0;
let isHolding = false;
let isDebug = false;

// Check URL for debug flag or force if camera fails
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('debug')) {
    isDebug = true;
    enableDebugMode();
}

function enableDebugMode() {
    isDebug = true;
    debugControls.style.display = 'block';
    targetEl.innerText = targetNumber;
    
    // Fallback Loop for Debug
    function debugLoop() {
        if (isDebug) {
            checkGameLogic(currentDetected);
            requestAnimationFrame(debugLoop);
        }
    }
    debugLoop();
}

// Global function for debug buttons
window.setDebugFinger = (num) => {
    currentDetected = num;
    detectedEl.innerText = num;
};

function generateTarget() {
    let newTarget;
    do {
        newTarget = Math.floor(Math.random() * 5) + 1; // 1 to 5
    } while (newTarget === targetNumber);
    targetNumber = newTarget;
    targetEl.innerText = targetNumber;
    
    // Reset Hold
    isHolding = false;
    loadingBar.classList.remove('filling');
    loadingBar.style.width = '200px'; // Reset container size visual if needed, but we manipulate ::after via class or logic?
    // Actually, to animate width from 0 to 100, we need to manipulate the element style or class
    // In CSS I used a pseudo element. Let's change the logic to use inline style on the bar itself if easier, 
    // OR just toggle the class 'filling' which has the transition.
    
    // Reset visual
    const bar = document.querySelector('.loading-bar');
    // Force reflow
    bar.classList.remove('filling');
    void bar.offsetWidth; 
}

function checkGameLogic(detected) {
    detectedEl.innerText = detected;

    if (detected === targetNumber) {
        if (!isHolding) {
            isHolding = true;
            holdStartTime = Date.now();
            document.querySelector('.loading-bar').classList.add('filling');
        } else {
            // Check if held for 1 second
            if (Date.now() - holdStartTime >= 1000) {
                score++;
                scoreEl.innerText = score;
                // Success visual
                targetEl.style.color = '#00FF00';
                setTimeout(() => targetEl.style.color = '', 200);
                generateTarget();
            }
        }
    } else {
        if (isHolding) {
            isHolding = false;
            document.querySelector('.loading-bar').classList.remove('filling');
        }
    }
}

// MediaPipe Implementation
function onResults(results) {
    if (isDebug) return; // Ignore camera in debug mode

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
        drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
        
        const fingers = countFingers(landmarks);
        checkGameLogic(fingers);
    } else {
        checkGameLogic(0);
    }
    canvasCtx.restore();
}

function countFingers(landmarks) {
    // Thumb, Index, Middle, Ring, Pinky
    // Tips: 4, 8, 12, 16, 20
    // PIPs/Bases: 3, 6, 10, 14, 18 (Using PIP (6,10,14,18) for fingers)
    // Thumb is special.
    
    let count = 0;

    // Thumb: Check x distance relative to wrist/knuckles depending on hand.
    // Simplification: Check if Tip (4) is "extended" away from palm.
    // robust method: Compare 4.x with 3.x? Depends on hand (L/R).
    // Let's assume Tip.x < IP.x for Right hand if palm facing camera?
    // Too complex for simple script. 
    // Alternative: Distance between Tip(4) and PinkyBase(17). If far, open.
    // Let's try: Is Tip (4) x coord further from Pinky (17) x coord than IP (3) is?
    
    // For now, let's stick to vertical fingers (Index-Pinky)
    // Y coordinates: 0 is top. So Tip.y < PIP.y means finger is UP.
    
    if (landmarks[8].y < landmarks[6].y) count++; // Index
    if (landmarks[12].y < landmarks[10].y) count++; // Middle
    if (landmarks[16].y < landmarks[14].y) count++; // Ring
    if (landmarks[20].y < landmarks[18].y) count++; // Pinky
    
    // Thumb (4) vs (3)
    // Checking X diff roughly. 
    // If abs(Tip.x - Base.x) > Threshold? 
    // Let's rely on checking if it's far from index base.
    // Hack: Just check if 4.x is outside the palm bounding box?
    
    // Generic check: 
    // If tip is to the left/right of the knuckle.
    // Let's count thumb if tip.x is further out than IP.x
    // BUT, mirrored... 
    // Let's just try: if landmarks[4].x < landmarks[3].x (Right hand facing cam, thumb on left)
    // Since we don't know handedness easily without checking label, assume 4 fingers first.
    // To support 5, we need thumb.
    
    // Simple Thumb Logic:
    // If distance(4, 17) > distance(3, 17) ? 
    // No.
    
    // Let's use the X coordinate comparison which usually works for open palm.
    // Check if thumb tip is to the side of the knuckle
    if (Math.abs(landmarks[4].x - landmarks[17].x) > Math.abs(landmarks[3].x - landmarks[17].x)) {
        count++;
    }

    return count;
}

// Initialize Hands
if (!isDebug) {
    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    // Camera
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    camera.start().catch(err => {
        console.error("Camera failed", err);
        alert("Camera access denied or unavailable. Switching to DEBUG MODE.");
        enableDebugMode();
    });
}

// Resize Canvas
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

generateTarget();
