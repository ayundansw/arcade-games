const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const modal = document.getElementById('gameOverModal');
const retryBtn = document.getElementById('retryBtn');

// Game State
let animationId;
let frames = 0;
let score = 0;
let isGameOver = false;
let gameSpeed = 3;

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

// Player Object
const player = {
    x: 50,
    y: 150,
    width: 40,
    height: 30, // Adjusted for typical plane aspect ratio
    gravity: 0.25,
    lift: -6,
    velocity: 0,

    draw() {
        if (playerImgLoaded) {
            ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
        } else {
            // Fallback Box
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--neon-cyan');
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Floor collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            gameOver();
        }
        
        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },

    flap() {
        this.velocity = this.lift;
    }
};

// Obstacles (Firewall Bars)
const obstacles = [];
const obstacleWidth = 60;
const gapHeight = 200; // Easy mode gap
const spawnRate = 120; // Frames between spawns

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height / 2);
        this.bottomHeight = canvas.height - this.topHeight - gapHeight;
        this.passed = false;
    }

    draw() {
        ctx.fillStyle = '#FF4444'; // Red Firewall
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF0000';
        
        // Top Bar
        ctx.fillRect(this.x, 0, obstacleWidth, this.topHeight);
        
        // Bottom Bar
        ctx.fillRect(this.x, canvas.height - this.bottomHeight, obstacleWidth, this.bottomHeight);
        
        ctx.shadowBlur = 0;
        
        // Decorative Logic Lines (Matrix style)
        ctx.fillStyle = '#00FF00';
        ctx.font = '10px monospace';
        ctx.fillText('10101', this.x + 10, this.topHeight - 20);
        ctx.fillText('FIREWALL', this.x + 5, canvas.height - this.bottomHeight + 20);
    }

    update() {
        this.x -= gameSpeed;

        // Collision Detection
        // Top Pipe
        if (player.x < this.x + obstacleWidth &&
            player.x + player.width > this.x &&
            player.y < this.topHeight) {
            gameOver();
        }
        // Bottom Pipe
        if (player.x < this.x + obstacleWidth &&
            player.x + player.width > this.x &&
            player.y + player.height > canvas.height - this.bottomHeight) {
            gameOver();
        }

        // Score Update
        if (this.x + obstacleWidth < player.x && !this.passed) {
            score++;
            scoreElement.innerText = score;
            this.passed = true;
            // Slightly increase speed every 5 points
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

// Background Grid Effect
function drawBackground() {
    ctx.strokeStyle = 'rgba(5, 217, 231, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offset = frames % gridSize;

    // Vertical Lines moving left
    for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal Lines (Static)
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
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
    gameSpeed = 3;
    scoreElement.innerText = score;
    player.y = 150;
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

// Inputs
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) {
            // Prevent accidental restarts immediately after death if space is spammed
             if(modal.classList.contains('active')) return;
        }
        player.flap();
    }
});

window.addEventListener('touchstart', (e) => {
    player.flap();
}, {passive: false}); // passive: false allows preventDefault if needed

window.addEventListener('click', () => {
   if (!isGameOver) player.flap();
});

retryBtn.addEventListener('click', resetGame);

// Start
animate();
