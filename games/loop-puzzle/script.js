const gridContainer = document.getElementById('grid-container');
const winModal = document.getElementById('winModal');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const timerElement = document.getElementById('timer');
const modalTitle = winModal.querySelector('.modal-title');
const modalScore = winModal.querySelector('.modal-score');

// Config
let ROWS = 21; // Odd number for better maze generation
let COLS = 21;
let CELL_SIZE = 25; // px

let maze = [];
let playerPos = { r: 1, c: 1 };
let goalPos = { r: ROWS - 2, c: COLS - 2 };
let timerInterval;
let timeRemaining = 60;
let isGameOver = false;
let level = 1; // Current game level
let monsterActive = false;
let monsterPos = { r: -1, c: -1 }; // Monster position, -1,-1 means not spawned
let monsterInterval;

// Directions for Generator & Movement
// [dr, dc]
const DIRECTIONS = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1]   // Right
];

function initGame() {
    isGameOver = false;
    winModal.classList.remove('active');

    // Clear old intervals immediately
    clearInterval(timerInterval);
    clearInterval(monsterInterval);

    // Difficulty Settings
    if (level === 1) {
        ROWS = 21; COLS = 21;
        CELL_SIZE = 20;
        monsterActive = false;
        timeRemaining = 60;
    } else {
        // Level 2+: Big Maze + Active Monster
        ROWS = 31; COLS = 31;
        CELL_SIZE = 15;
        monsterActive = true;
        timeRemaining = 90;
    }

    timerElement.innerText = `LEVEL ${level} | ${timeRemaining}s`;
    timerElement.style.color = "var(--neon-cyan)";

    // Update Grid CSS
    gridContainer.style.gridTemplateColumns = `repeat(${COLS}, ${CELL_SIZE}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${ROWS}, ${CELL_SIZE}px)`;
    gridContainer.style.width = `${COLS * CELL_SIZE}px`;

    generateMaze();
    renderMaze();

    // Timer
    timerInterval = setInterval(() => {
        if (isGameOver) return;
        timeRemaining--;
        timerElement.innerText = `LEVEL ${level} | ${timeRemaining}s`;

        if (timeRemaining <= 10) {
            timerElement.style.color = "#FF4444";
        }

        if (timeRemaining <= 0) {
            handleGameOver("TIME OUT");
        }
    }, 1000);

    // Monster Spawn Logic
    if (monsterActive) {
        monsterPos = { r: -1, c: -1 };
        console.log("Monster Active: Waiting to spawn...");

        // Spawn after 1 second
        setTimeout(() => {
            if (isGameOver) return;
            monsterPos = { r: 1, c: 1 }; // Explicitly spawn at start
            console.log("Monster Spawned at", monsterPos);

            // Force Update Visuals
            updateMonsterVisuals();

            // Start Move Loop
            let speed = 300;
            if (level >= 3) speed = 250;

            monsterInterval = setInterval(moveMonster, speed);
        }, 1000); // 1 Second delay
    }
}

function generateMaze() {
    // 1. Initialize filled grid (all walls)
    maze = [];
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            row.push(1); // 1 = Wall, 0 = Path
        }
        maze.push(row);
    }

    // 2. Recursive Backtracker
    // Start at (1,1)
    const stack = [{ r: 1, c: 1 }];
    maze[1][1] = 0;

    while (stack.length > 0) {
        let current = stack[stack.length - 1];
        let neighbors = [];

        // Check neighbors (jump 2 steps to preserve walls)
        for (let i = 0; i < 4; i++) {
            let dr = DIRECTIONS[i][0];
            let dc = DIRECTIONS[i][1];
            let nr = current.r + (dr * 2);
            let nc = current.c + (dc * 2);

            if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && maze[nr][nc] === 1) {
                neighbors.push({ r: nr, c: nc, dr: dr, dc: dc });
            }
        }

        if (neighbors.length > 0) {
            // Choose random neighbor
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Remove wall between current and next
            maze[current.r + next.dr][current.c + next.dc] = 0;

            // Mark next as visited
            maze[next.r][next.c] = 0;

            stack.push({ r: next.r, c: next.c });
        } else {
            stack.pop();
        }
    }

    // Reset Player
    playerPos = { r: 1, c: 1 };

    // Set Goal at bottom right (ensure it's a path)
    goalPos = { r: ROWS - 2, c: COLS - 2 };
    // Force open if wall
    if (maze[goalPos.r][goalPos.c] === 1) {
        maze[goalPos.r][goalPos.c] = 0;
        // Ensure connectivity if we forced a hole (simple fix: open neighbor)
        if (maze[goalPos.r - 1][goalPos.c] === 1 && maze[goalPos.r][goalPos.c - 1] === 1) {
            maze[goalPos.r - 1][goalPos.c] = 0;
        }
    }
}

function renderMaze() {
    gridContainer.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            if (maze[r][c] === 1) {
                cell.classList.add('wall');
            } else {
                cell.classList.add('path');
            }

            // Markers
            if (r === playerPos.r && c === playerPos.c) {
                cell.classList.add('player');
            }
            if (r === goalPos.r && c === goalPos.c) {
                cell.classList.add('goal');
            }

            cell.id = `cell-${r}-${c}`;
            gridContainer.appendChild(cell);
        }
    }
}

function updatePlayerSelect() {
    const playerCells = document.querySelectorAll('.cell.player');
    playerCells.forEach(el => el.classList.remove('player'));

    const newCell = document.getElementById(`cell-${playerPos.r}-${playerPos.c}`);
    if (newCell) newCell.classList.add('player');
}

function handleInput(e) {
    if (isGameOver) return;

    // Start Monster Timer on first move
    if (!hasStartedMoving && monsterActive) {
        hasStartedMoving = true;
        console.log("Player moved. Entity wakup timer started (10s)...");
        setTimeout(() => {
            if (isGameOver) return;
            monsterPos = { r: 1, c: 1 };
            updateMonsterVisuals();
            console.log("Entity Spawned!");

            // Slower Speed: 1.5 Seconds per move (1500ms)
            let speed = 1500;
            if (level >= 3) speed = 1200; // Slightly faster but still slow on higher levels

            monsterInterval = setInterval(moveMonster, speed);
        }, 10000); // 10s Delay
    }

    let nextR = playerPos.r;
    let nextC = playerPos.c;

    switch (e.key) {
        case 'ArrowUp': nextR--; break;
        case 'ArrowDown': nextR++; break;
        case 'ArrowLeft': nextC--; break;
        case 'ArrowRight': nextC++; break;
        default: return;
    }
    e.preventDefault();

    if (nextR < 0 || nextR >= ROWS || nextC < 0 || nextC >= COLS) return;
    if (maze[nextR][nextC] === 1) return; // Wall

    playerPos.r = nextR;
    playerPos.c = nextC;
    updatePlayerSelect();

    if (playerPos.r === goalPos.r && playerPos.c === goalPos.c) {
        handleWin();
    }
    // Check Monster Collision
    if (monsterActive && playerPos.r === monsterPos.r && playerPos.c === monsterPos.c) {
        handleGameOver("CAUGHT BY ENTITY");
    }
}

function updateMonsterVisuals() {
    const monsterCells = document.querySelectorAll('.cell.monster');
    monsterCells.forEach(el => el.classList.remove('monster'));

    if (monsterPos.r !== -1) {
        const newCell = document.getElementById(`cell-${monsterPos.r}-${monsterPos.c}`);
        if (newCell) {
            newCell.classList.add('monster');
            // Ensure z-index is applied via class, but strictly re-force if needed
        }
    }
}

function moveMonster() {
    if (isGameOver || monsterPos.r === -1) return;

    // BFS to find shortest path to player
    let queue = [{ r: monsterPos.r, c: monsterPos.c, path: [] }];
    let visited = new Set([`${monsterPos.r},${monsterPos.c}`]);
    let bestMove = null;

    // Optimization: Limit depth if needed, but for 31x31 it's fine.
    // To make it more aggressive/scary, maybe it can move through walls? No, that's unfair.

    while (queue.length > 0) {
        let curr = queue.shift();

        if (curr.r === playerPos.r && curr.c === playerPos.c) {
            if (curr.path.length > 0) bestMove = curr.path[0];
            break;
        }

        for (let i = 0; i < 4; i++) {
            let nr = curr.r + DIRECTIONS[i][0];
            let nc = curr.c + DIRECTIONS[i][1];

            // Allow moving into player (who is on a path)
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && maze[nr][nc] === 0 && !visited.has(`${nr},${nc}`)) {
                let newPath = [...curr.path, { r: nr, c: nc }];
                queue.push({ r: nr, c: nc, path: newPath });
                visited.add(`${nr},${nc}`);
            }
        }
    }

    if (bestMove) {
        monsterPos = bestMove;
        updateMonsterVisuals();

        if (monsterPos.r === playerPos.r && monsterPos.c === playerPos.c) {
            handleGameOver("CAUGHT BY ENTITY");
        }
    }
}

function handleGameOver(reason) {
    clearInterval(timerInterval);
    clearInterval(monsterInterval);
    isGameOver = true;
    modalTitle.innerText = "DATA LOST";
    modalTitle.style.color = "#FF4444";
    modalScore.innerText = reason;

    // Update Layout for Buttons
    // Clear previous buttons to avoid duplicates if re-running
    const modalContent = winModal.querySelector('.modal-content');
    let buttonContainer = winModal.querySelector('.button-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        modalContent.appendChild(buttonContainer);
    }
    buttonContainer.innerHTML = ''; // Reset

    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.innerText = "RETRY LEVEL";
    retryBtn.onclick = initGame;

    const menuBtn = document.createElement('button');
    menuBtn.className = 'exit-btn-modal';
    menuBtn.innerText = "MAIN MENU";
    menuBtn.onclick = () => window.location.href = '../../index.html';

    buttonContainer.appendChild(retryBtn);
    buttonContainer.appendChild(menuBtn);

    // Remove default static button if it exists
    const oldBtn = document.getElementById('nextLevelBtn');
    if (oldBtn) oldBtn.remove();

    winModal.classList.add('active');
}

function handleWin() {
    clearInterval(timerInterval);
    clearInterval(monsterInterval);
    isGameOver = true;
    modalTitle.innerText = "LEVEL COMPLETE";
    modalTitle.style.color = "var(--neon-cyan)";
    modalScore.innerText = `ESCAPED IN ${60 - timeRemaining}s`;

    level++;

    // Buttons
    const modalContent = winModal.querySelector('.modal-content');
    let buttonContainer = winModal.querySelector('.button-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        modalContent.appendChild(buttonContainer);
    }
    buttonContainer.innerHTML = '';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'retry-btn';
    nextBtn.innerText = "NEXT LEVEL";
    nextBtn.onclick = initGame;

    const menuBtn = document.createElement('button');
    menuBtn.className = 'exit-btn-modal';
    menuBtn.innerText = "MAIN MENU";
    menuBtn.onclick = () => window.location.href = '../../index.html';

    buttonContainer.appendChild(nextBtn);
    buttonContainer.appendChild(menuBtn);

    // Remove default static button if it exists
    const oldBtn = document.getElementById('nextLevelBtn');
    if (oldBtn) oldBtn.remove();

    setTimeout(() => winModal.classList.add('active'), 200);
}

window.addEventListener('keydown', handleInput);
// Remove static listener for nextLevelBtn since we generate dynamic buttons
// nextLevelBtn.addEventListener('click', initGame); 

// Start
initGame();
