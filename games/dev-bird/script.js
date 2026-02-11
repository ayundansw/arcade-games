const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const modal = document.getElementById('gameOverModal');
const retryBtn = document.getElementById('retryBtn');

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
let gameSpeed = 3;
let isGameStarted = false;

// Control State
let liftInput = 0; // 0 = Neutral, 1 = Up (Open), -1 = Down (Fist)

// Assets
const playerImg = new Image();
playerImg.src = '../../assets/images/pesawat_rit.png';
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
    gravity: 0.2,
    lift: -0.5, // Continuous lift force
    dive: 0.5,  // Continuous dive force
    velocity: 0,
    maxVelocity: 8,

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        // Tilt based on velocity
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
        // Physics
        if (liftInput === 1) { // Open Hand -> Fly Up
            this.velocity += this.lift;
        } else if (liftInput === -1) { // Fist -> Dive Down
            this.velocity += this.dive;
        } else { // Neutral -> Gentle Gravity
            this.velocity += this.gravity;
        }

        // Clamp velocity
        if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
        if (this.velocity < -this.maxVelocity) this.velocity = -this.maxVelocity;

        this.y += this.velocity;

        // Boundaries
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

// Obstacles (Extreme Pipes)
const obstacles = [];
const obstacleWidth = 80;
const gapHeight = 220;
const spawnRate = 90; // Faster spawn

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height - gapHeight - 100) + 50;
        this.bottomHeight = canvas.height - this.topHeight - gapHeight;
        this.passed = false;
        this.moving = Math.random() > 0.5; // 50% chance to be a moving pipe
        this.moveSpeed = (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1);
    }

    draw() {
        ctx.fillStyle = '#FF4444'; 
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF0000';
        
        // Top Bar
        ctx.fillRect(this.x, 0, obstacleWidth, this.topHeight);
        
        // Bottom Bar
        ctx.fillRect(this.x, canvas.height - this.bottomHeight, obstacleWidth, this.bottomHeight);
        
        ctx.shadowBlur = 0;
        
        // Tech DECO
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px monospace';
        ctx.fillText('WARNING', this.x + 10, this.topHeight - 20);
        ctx.fillText('FIREWALL', this.x + 10, canvas.height - this.bottomHeight + 20);
    }

    update() {
        this.x -= gameSpeed;

        // Moving Pipe Logic (Extreme Mode)
        if (this.moving) {
            this.topHeight += this.moveSpeed;
            this.bottomHeight -= this.moveSpeed;

            // Bounce limits
            if (this.topHeight < 50 || this.bottomHeight < 50) {
                this.moveSpeed *= -1;
            }
        }

        // Collision
        if (player.x < this.x + obstacleWidth &&
            player.x + player.width > this.x &&
            (player.y < this.topHeight || player.y + player.height > canvas.height - this.bottomHeight)) {
            gameOver();
        }

        // Score
        if (this.x + obstacleWidth < player.x && !this.passed) {
            score++;
            scoreElement.innerText = score;
            this.passed = true;
            if (score % 5 === 0) gameSpeed += 0.5;
        }
    }
}

function handleObstacles() {
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle());
    }

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();
        obstacles[i].draw();

        if (obstacles[i].x + obstacleWidth < 0) {
            obstacles.shift();
            i--;
        }
    }
}

// Background
function drawBackground() {
    ctx.strokeStyle = 'rgba(5, 217, 231, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offset = frames * (gameSpeed * 0.5) % gridSize;

    for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.2)';
    ctx.stroke();
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    finalScoreElement.innerText = score;
    modal.classList.add('active');
}

function resetGame() {
    isGameOver = false;
    score = 0;
    frames = 0;
    gameSpeed = 4;
    scoreElement.innerText = score;
    player.y = canvas.height / 2;
    player.velocity = 0;
    obstacles.length = 0;
    modal.classList.remove('active');
    animate();
}

function animate() {
    if (isGameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    handleObstacles();
    player.update();
    player.draw();

    frames++;
    animationId = requestAnimationFrame(animate);
}

// --- MEDIAPIPE HAND TRACKING ---
function onResults(results) {
    // Draw PIP
    pipCtx.save();
    pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);
    pipCtx.drawImage(results.image, 0, 0, pipCanvas.width, pipCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(pipCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
        drawLandmarks(pipCtx, landmarks, {color: '#FF0000', lineWidth: 1});

        // Gesture Logic
        const fingers = countFingers(landmarks);
        
        if (fingers >= 4) {
            liftInput = 1; // UP
            gestureIcon.innerText = "✈️ UP";
            gestureIcon.style.color = "#00FF00";
        } else if (fingers <= 1) {
            liftInput = -1; // DOWN
            gestureIcon.innerText = "⚓ DOWN";
            gestureIcon.style.color = "#FF4444";
        } else {
            liftInput = 0; // Glide
            gestureIcon.innerText = "Release";
            gestureIcon.style.color = "#FFFF00";
        }
    } else {
        liftInput = 0; // No hand
        gestureIcon.innerText = "No Hand";
        gestureIcon.style.color = "#ccc";
    }
    pipCtx.restore();
}

function countFingers(landmarks) {
    let count = 0;
    // Index to Pinky (tip < pip means extended up)
    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;
    // Thumb (x comparison for open palm)
    if (Math.abs(landmarks[4].x - landmarks[17].x) > Math.abs(landmarks[3].x - landmarks[17].x)) count++;
    return count;
}

// Initialize Camera if supported
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

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 320,
    height: 240
});
camera.start();

// Fallback Controls (Spacebar/Click)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') liftInput = 1;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') liftInput = 0;
});
window.addEventListener('mousedown', () => liftInput = 1);
window.addEventListener('mouseup', () => liftInput = 0);
window.addEventListener('touchstart', (e) => { liftInput = 1; e.preventDefault(); }, {passive: false});
window.addEventListener('touchend', (e) => { liftInput = 0; e.preventDefault(); });

retryBtn.addEventListener('click', resetGame);

// Initial Start
animate();
