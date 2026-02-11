const gridContainer = document.getElementById('grid-container');
const winModal = document.getElementById('winModal');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const timerElement = document.getElementById('timer');
const modalTitle = winModal.querySelector('.modal-title');
const modalScore = winModal.querySelector('.modal-score');

// Config
const ROWS = 21; // Odd number for better maze generation
const COLS = 21;
const CELL_SIZE = 25; // px

let maze = [];
let playerPos = { r: 1, c: 1 };
let goalPos = { r: ROWS - 2, c: COLS - 2 };
let timerInterval;
let timeRemaining = 60;
let isGameOver = false;

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

    // Reset Timer
    clearInterval(timerInterval);
    timeRemaining = 60;
    timerElement.innerText = `TIME: ${timeRemaining}s`;
    timerElement.style.color = "var(--neon-cyan)";

    // Update Grid CSS dynamically
    gridContainer.style.gridTemplateColumns = `repeat(${COLS}, ${CELL_SIZE}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${ROWS}, ${CELL_SIZE}px)`;
    gridContainer.style.width = `${COLS * CELL_SIZE}px`;

    generateMaze();
    renderMaze();

    // Start Timer
    timerInterval = setInterval(() => {
        if (isGameOver) return;
        timeRemaining--;
        timerElement.innerText = `TIME: ${timeRemaining}s`;

        if (timeRemaining <= 10) {
            timerElement.style.color = "#FF4444";
        }

        if (timeRemaining <= 0) {
            handleGameOver();
        }
    }, 1000);
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
}

function handleGameOver() {
    clearInterval(timerInterval);
    isGameOver = true;
    modalTitle.innerText = "DATA LOST";
    modalTitle.style.color = "#FF4444";
    modalScore.innerText = "TIME OUT";
    nextLevelBtn.innerText = "RETRY EXTRACTION";
    winModal.classList.add('active');
}

function handleWin() {
    clearInterval(timerInterval);
    isGameOver = true;
    modalTitle.innerText = "EXTRACTION COMPLETE";
    modalTitle.style.color = "var(--neon-cyan)";
    modalScore.innerText = `REMAINING TIME: ${timeRemaining}s`;
    nextLevelBtn.innerText = "NEXT SECTOR";
    setTimeout(() => winModal.classList.add('active'), 200);
}

window.addEventListener('keydown', handleInput);
nextLevelBtn.addEventListener('click', initGame);

// Start
initGame();
