const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreEl = document.getElementById('score');
const systemStatusEl = document.getElementById('systemStatus');
const modal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const retryBtn = document.getElementById('retryBtn');

const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');

// Game State
let isGameActive = false;
let score = 0;
let enemies = [];
let particles = [];
let lastShotTime = 0;
let handLandmarks = null;
let isPinching = false;
const PINCH_THRESHOLD = 0.05; // Distance between thumb and index

// Debug Mode (Mouse)
let mousePos = { x: 0, y: 0 };
let isMouseDown = false;
let isDebug = false;

// Check URL for debug
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('debug')) {
    isDebug = true;
    systemStatusEl.innerText = "DEBUG MODE";
    systemStatusEl.style.color = "#FFFF00";
}

class Enemy {
    constructor() {
        this.radius = 30;
        this.x = Math.random() * (canvasElement.width - 100) + 50;
        this.y = Math.random() * (canvasElement.height - 100) + 50;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 100;
        this.color = `hsl(${Math.random() * 60 + 300}, 100%, 50%)`; // Pink/Purple/Red
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce
        if (this.x < this.radius || this.x > canvasElement.width - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > canvasElement.height - this.radius) this.vy *= -1;
    }

    draw() {
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        canvasCtx.fillStyle = this.color;
        canvasCtx.shadowBlur = 20;
        canvasCtx.shadowColor = this.color;
        canvasCtx.fill();
        canvasCtx.shadowBlur = 0;
        canvasCtx.closePath();

        // Inner core
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        canvasCtx.fillStyle = '#fff';
        canvasCtx.fill();
        canvasCtx.closePath();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = color;
        this.life = 1.0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.05;
    }
    draw() {
        canvasCtx.globalAlpha = this.life;
        canvasCtx.fillStyle = this.color;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1.0;
    }
}

function startSystemBoot() {
    let count = 5;
    countdownOverlay.style.display = 'flex';
    countdownNumber.innerText = count;

    // Clear old game state
    enemies = [];
    particles = [];
    score = 0;
    timeRemaining = 60;
    scoreEl.innerText = score;
    timeEl.innerText = timeRemaining;
    timeEl.style.color = "var(--neon-cyan)";

    isGameActive = false;
    modal.classList.remove('active');

    clearInterval(timerInterval);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.innerText = count;
        } else if (count === 0) {
            countdownNumber.innerHTML = `<span style="color:#00FF00; text-shadow: 0 0 30px #00FF00;">GO!</span>`;
        } else {
            clearInterval(interval);
            countdownOverlay.style.display = 'none';
            isGameActive = true;
            startGame();
        }
    }, 1000);
}

function startGame() {
    spawnEnemy();
    // Start Match Timer
    timerInterval = setInterval(() => {
        if (!isGameActive) return;
        timeRemaining--;
        timeEl.innerText = timeRemaining;

        if (timeRemaining <= 10) {
            timeEl.style.color = "#FF0000";
        }

        if (timeRemaining <= 0) {
            gameOver();
        }
    }, 1000);
}

function gameOver() {
    isGameActive = false;
    clearInterval(timerInterval);
    finalScoreEl.innerText = score;
    modal.classList.add('active');
}

function spawnEnemy() {
    if (!isGameActive) return;
    if (enemies.length < 5) {
        enemies.push(new Enemy());
    }
    setTimeout(spawnEnemy, 2000);
}

function handleGameplay() {
    if (!isGameActive) return;

    // 1. Get Aim Point
    let aimX = 0, aimY = 0;
    let shooting = false;

    if (handLandmarks) {
        // Use Index Finger Tip (8)
        aimX = handLandmarks[8].x * canvasElement.width;
        aimY = handLandmarks[8].y * canvasElement.height;

        // Check Pinch (Thumb 4, Index 8)
        // Note: Landmarks are normalized (0-1). Distance needs to be scale-independent or roughly calc
        // We can just use Euclidean distance of normalized coords.
        let dx = handLandmarks[8].x - handLandmarks[4].x;
        let dy = handLandmarks[8].y - handLandmarks[4].y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PINCH_THRESHOLD) {
            if (!isPinching) {
                shooting = true; // Trigger once
                isPinching = true;
            }
        } else {
            isPinching = false;
        }
    } else if (isDebug) {
        // Mouse Fallback
        aimX = mousePos.x;
        aimY = mousePos.y;
        if (isMouseDown) {
            if (!isPinching) {
                shooting = true;
                isPinching = true;
            }
        } else {
            isPinching = false;
        }
    }

    // 2. Draw Crosshair
    if (aimX > 0) {
        canvasCtx.strokeStyle = isPinching ? '#FF0000' : '#00FFFF';
        canvasCtx.lineWidth = 3;
        canvasCtx.beginPath();
        canvasCtx.arc(aimX, aimY, 20, 0, Math.PI * 2);
        canvasCtx.moveTo(aimX - 30, aimY);
        canvasCtx.lineTo(aimX + 30, aimY);
        canvasCtx.moveTo(aimX, aimY - 30);
        canvasCtx.lineTo(aimX, aimY + 30);
        canvasCtx.stroke();
    }

    // 3. Handle Shooting
    if (shooting) {
        // Visual Beam
        canvasCtx.strokeStyle = '#FF0000';
        canvasCtx.lineWidth = 5;
        canvasCtx.shadowBlur = 20;
        canvasCtx.shadowColor = '#FF0000';
        canvasCtx.beginPath();
        // Beam source: Hand Palm/Wrist? Or just logic beam?
        // Let's just create an explosion at Aim

        // Check Collisions
        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            let dist = Math.sqrt((aimX - e.x) ** 2 + (aimY - e.y) ** 2);
            if (dist < e.radius + 20) { // +20 margin for aim
                // Hit!
                createExplosion(e.x, e.y, e.color);
                enemies.splice(i, 1);
                score++;
                scoreEl.innerText = score;
                i--;
            }
        }
    }

    // 4. Update Enemies
    for (let e of enemies) {
        e.update();
        e.draw();
    }

    // 5. Update Particles
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Mirror for self-view feel? Input is already mirrored usually?
    // MediaPipe Hands usually returns normalized coordinates. 
    // We draw image first.
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handLandmarks = results.multiHandLandmarks[0];
        // Draw Skeleton for cool HUD effect
        drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FFFF', lineWidth: 2 });
        drawLandmarks(canvasCtx, handLandmarks, { color: '#00FFFF', lineWidth: 1, radius: 2 });
    } else {
        handLandmarks = null;
    }

    handleGameplay();
    canvasCtx.restore();
}

// Setup MediaPipe
if (!isDebug) {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 720
    });
    camera.start().catch(() => {
        alert("Camera failed. Switching to Mouse Debug Mode.");
        isDebug = true;
        loopDebug();
    });
} else {
    loopDebug();
}

// Mouse Debug Handling
window.addEventListener('mousemove', e => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
});
window.addEventListener('mousedown', () => isMouseDown = true);
window.addEventListener('mouseup', () => isMouseDown = false);

function loopDebug() {
    // Manually clear and draw for debug without camera
    canvasCtx.fillStyle = '#000';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    handleGameplay();
    requestAnimationFrame(loopDebug);
}

// Resize
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

retryBtn.addEventListener('click', startSystemBoot);

// Initial Boot
startSystemBoot();
