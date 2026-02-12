const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const modal = document.getElementById('gameOverModal');
const retryBtn = document.getElementById('retryBtn');
const countdownEl = document.getElementById('countdown');

// Webcam & PIP
const videoElement = document.getElementById('input_video');
const pipCanvas = document.getElementById('pip_canvas');
const pipCtx = pipCanvas.getContext('2d');
const gestureIcon = document.getElementById('gestureIcon');

// Game State
let animationId;
let frames = 0;
let score = 0;
let isGameOver = false;
let isGameStarted = false; // Waiting for countdown
let gameSpeed = 2; // Reduced from 3 for easier start

// Control State
let liftInput = 0; // 0 = Neutral, 1 = Up (Open), -1 = Down (Fist)

// Assets
const playerImg = new Image();
// Fallback: Inline SVG for transparent plane (Optimized, No Filters)
const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Main Fuselage: Pointing Right -->
  <path d="M10,24 L45,24 L62,32 L45,40 L10,40 Z" fill="#00ffff" stroke="#0088ff" stroke-width="2"/>
  <!-- Wings: Swept Back -->
  <path d="M25,24 L10,10 L40,24 Z" fill="#0088ff" opacity="0.8"/>
  <path d="M25,40 L10,54 L40,40 Z" fill="#0088ff" opacity="0.8"/>
  <!-- Cockpit -->
  <ellipse cx="45" cy="28" rx="8" ry="4" fill="#ffffff"/>
  <!-- Tail -->
  <path d="M5,24 L5,14 L15,24 Z" fill="#0088ff"/>
  <!-- Engine -->
  <circle cx="10" cy="32" r="4" fill="#ff0000"/>
</svg>`;
playerImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
let playerImgLoaded = false;
playerImg.onload = () => { playerImgLoaded = true; };

// Resize Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Player Object (Plane)
const player = {
    x: 100,
    y: canvas.height / 2,
    width: 60,
    height: 40,
    gravity: 0.15,
    lift: -0.3,
    dive: 0.3,
    velocity: 0,
    maxVelocity: 5,

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(angle);

        if (playerImgLoaded) {
            ctx.drawImage(playerImg, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#05d9e7';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();
    },

    update() {
        if (!isGameStarted) return; // Freeze player during countdown

        if (liftInput === 1) {
            this.velocity += this.lift;
        } else if (liftInput === -1) {
            this.velocity += this.dive;
        } else {
            this.velocity += this.gravity;
        }

        if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
        if (this.velocity < -this.maxVelocity) this.velocity = -this.maxVelocity;

        this.y += this.velocity;

        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            gameOver();
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }
};

// Coins
const coins = [];
const coinImg = new Image();
const coinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="monospace" font-size="20" fill="#B8860B">$</text>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#FFFF00" stroke-width="1" stroke-dasharray="4 2">
    <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>`;
coinImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coinSvg);

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.markedForDeletion = false;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= gameSpeed;
        this.wobble += 0.1;
        this.y += Math.sin(this.wobble) * 0.5; // Floating effect

        if (this.x + this.size < 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.drawImage(coinImg, this.x, this.y, this.size, this.size);
    }
}

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.obstacleWidth = 80;

        // Dynamic Difficulty
        // As score increases, gap gets smaller (down to a limit)
        let gapReduction = Math.min(score * 2, 60);
        this.gapHeight = 220 - gapReduction;

        // Random Position
        // Ensure gap is always within playable area
        const minTop = 50;
        const maxTop = canvas.height - this.gapHeight - 50;
        this.topHeight = Math.random() * (maxTop - minTop) + minTop;
        this.bottomHeight = canvas.height - this.gapHeight - this.topHeight;

        this.passed = false;
        this.markedForDeletion = false;

        // Movement Logic (Moving Pipes)
        // Starts appearing after score 5, becomes more frequent
        this.moving = (score >= 5) && (Math.random() < 0.5 + (score * 0.01));
        this.moveSpeed = 0;
        if (this.moving) {
            this.moveSpeed = (Math.random() * 1.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
        }

        // Spawn Coin (50% chance if score > 2)
        if (score > 2 && Math.random() > 0.5) {
            // Position coin in the center of the gap
            let coinX = this.x + (this.obstacleWidth / 2) - 15;
            let coinY = this.topHeight + (this.gapHeight / 2) - 15;
            coins.push(new Coin(coinX, coinY));
        }
    }

    draw() {
        ctx.fillStyle = '#FF4444';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF0000';
        ctx.fillRect(this.x, 0, this.obstacleWidth, this.topHeight);
        ctx.fillRect(this.x, canvas.height - this.bottomHeight, this.obstacleWidth, this.bottomHeight);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#00FF00';
        ctx.font = '12px monospace';
        ctx.fillText('WARNING', this.x + 10, this.topHeight - 20);
        ctx.fillText('FIREWALL', this.x + 10, canvas.height - this.bottomHeight + 20);
    }

    update() {
        this.x -= gameSpeed;

        if (this.moving) {
            this.topHeight += this.moveSpeed;
            this.bottomHeight -= this.moveSpeed;
            // Bounce bounds
            if (this.topHeight < 50 || this.bottomHeight < 50) this.moveSpeed *= -1;
        }

        // Collision Detection (Pipe)
        if (player.x < this.x + this.obstacleWidth &&
            player.x + player.width > this.x &&
            (player.y < this.topHeight || player.y + player.height > canvas.height - this.bottomHeight)) {
            gameOver();
        }

        // Score Pass
        if (this.x + this.obstacleWidth < player.x && !this.passed) {
            score++;
            scoreElement.innerText = score;
            this.passed = true;
            if (score % 5 === 0) gameSpeed += 0.2; // Gentler speed increase
        }

        if (this.x + this.obstacleWidth < 0) this.markedForDeletion = true;
    }
}

function handleGameObjects() {
    if (!isGameStarted) return;

    // Spawning
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle());
    }

    // Update & Draw Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();
        obstacles[i].draw();
        if (obstacles[i].markedForDeletion) {
            obstacles.splice(i, 1);
            i--;
        }
    }

    // Update & Draw Coins
    for (let i = 0; i < coins.length; i++) {
        coins[i].update();
        coins[i].draw();

        // Collision Coin
        if (checkCollision(player, coins[i])) {
            score += 5; // Bonus Score
            scoreElement.innerText = score;

            // Text Feedback
            showFloatingText("+5", coins[i].x, coins[i].y);

            coins.splice(i, 1);
            i--;
            continue;
        }

        if (coins[i].markedForDeletion) {
            coins.splice(i, 1);
            i--;
        }
    }
}

// System Boot Countdown
function startCountdown() {
    isGameStarted = false;
    modal.classList.remove('active');

    // Reset player position for preview
    player.y = canvas.height / 2;
    player.velocity = 0;
    obstacles.length = 0;
    coins.length = 0;
    score = 0;
    scoreElement.innerText = score;
    frames = 0;

    // Visuals for System Boot
    countdownEl.style.display = 'flex';
    countdownEl.style.visibility = 'visible'; // Ensure visibility
    countdownEl.style.opacity = '1';
    // Verify CSS handles this or add inline styles for safety
    countdownEl.style.position = 'absolute';
    countdownEl.style.top = '0';
    countdownEl.style.left = '0';
    countdownEl.style.width = '100%';
    countdownEl.style.height = '100%';
    countdownEl.style.background = '#000';
    countdownEl.style.flexDirection = 'column';
    countdownEl.style.justifyContent = 'center';
    countdownEl.style.alignItems = 'center';
    countdownEl.style.zIndex = '300';

    let count = 5;
    countdownEl.innerHTML = `<div style="font-size: 2rem; color: var(--neon-cyan); margin-bottom: 20px;">SYSTEM INITIALIZING...</div>
                             <div style="font-size: 8rem; color: #fff; text-shadow: 0 0 20px var(--neon-cyan);">${count}</div>`;

    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerHTML = `<div style="font-size: 2rem; color: var(--neon-cyan); margin-bottom: 20px;">SYSTEM INITIALIZING...</div>
                                     <div style="font-size: 8rem; color: #fff; text-shadow: 0 0 20px var(--neon-cyan);">${count}</div>`;
        } else if (count === 0) {
            countdownEl.innerHTML = `<div style="font-size: 8rem; color: #00FF00; text-shadow: 0 0 30px #00FF00;">GO!</div>`;
        } else {
            clearInterval(countInterval);
            countdownEl.style.display = 'none';
            isGameStarted = true;
        }
    }, 1000);
}

// Simple AABB Collision
function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.size &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.size &&
        rect1.y + rect1.height > rect2.y);
}

// Floating Text for Coins
const floatingTexts = [];
function showFloatingText(text, x, y) {
    floatingTexts.push({ text, x, y, life: 30 });
}
function drawFloatingTexts() {
    ctx.font = "bold 20px 'Orbitron'";
    ctx.fillStyle = "#FFFF00";
    for (let i = 0; i < floatingTexts.length; i++) {
        let t = floatingTexts[i];
        ctx.fillText(t.text, t.x, t.y);
        t.y -= 1;
        t.life--;
        if (t.life <= 0) {
            floatingTexts.splice(i, 1);
            i--;
        }
    }
}

function drawBackground() {
    ctx.strokeStyle = 'rgba(5, 217, 231, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offset = isGameStarted ? (frames * (gameSpeed * 0.5) % gridSize) : 0;

    for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.2)';
    ctx.stroke();
}

function animate() {
    if (isGameOver && !modal.classList.contains('active')) return;

    // Safety check for context
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    if (isGameStarted) {
        player.update();
        handleGameObjects(); // Handles pipes and coins
        drawFloatingTexts();
        frames++;
    } else if (!isGameOver) {
        // Preview Mode
        player.y = canvas.height / 2 + Math.sin(Date.now() / 300) * 10;

        // Ensure obstacles cleared for clean start
        obstacles.length = 0;
        coins.length = 0;
    }

    player.draw();
    requestAnimationFrame(animate);
}

// --- MEDIAPIPE HAND TRACKING ---
function onResults(results) {
    if (isGameOver) return;

    // Draw to PIP Canvas
    pipCtx.save();
    pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);

    // Draw Video Feed
    if (results.image) {
        pipCtx.drawImage(results.image, 0, 0, pipCanvas.width, pipCanvas.height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(pipCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(pipCtx, landmarks, { color: '#FF0000', lineWidth: 1 });

        const fingers = countFingers(landmarks);

        if (fingers >= 4) {
            liftInput = 1;
            gestureIcon.innerText = "UP";
            gestureIcon.style.color = "#00FF00";
        } else if (fingers <= 1) {
            liftInput = -1;
            gestureIcon.innerText = "DOWN";
            gestureIcon.style.color = "#FF4444";
        } else {
            liftInput = 0;
            gestureIcon.innerText = "Release";
            gestureIcon.style.color = "#FFFF00";
        }
    }
    pipCtx.restore();
}

function countFingers(landmarks) {
    let count = 0;
    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;
    if (Math.abs(landmarks[4].x - landmarks[17].x) > Math.abs(landmarks[3].x - landmarks[17].x)) count++;
    return count;
}

// --- MEDIAPIPE HAND TRACKING ---
// Robust Setup with Try-Catch
try {
    if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
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
            width: 640,
            height: 480
        });
        camera.start().then(() => {
            console.log("Camera started successfully");
        }).catch(err => {
            console.error("Camera failed start", err);
            gestureIcon.innerText = "CAM ERROR";
            gestureIcon.style.color = "red";
        });
    } else {
        throw new Error("MediaPipe libraries missing");
    }
} catch (e) {
    console.warn("MediaPipe Init Failed:", e);
    // Fallback UI or non-intrusive error
    gestureIcon.innerText = "NO CAM";
}

// Inputs - Always Active
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') liftInput = 1;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') liftInput = 0;
});
window.addEventListener('mousedown', () => liftInput = 1);
window.addEventListener('mouseup', () => liftInput = 0);
window.addEventListener('touchstart', (e) => { liftInput = 1; e.preventDefault(); }, { passive: false });
window.addEventListener('touchend', (e) => { liftInput = 0; e.preventDefault(); });

retryBtn.addEventListener('click', startCountdown);

// Start Game Loop Immediately
startCountdown();
requestAnimationFrame(animate); // Start loop safely
