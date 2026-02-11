const gridContainer = document.getElementById('grid-container');
const winModal = document.getElementById('winModal');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const timerElement = document.getElementById('timer');
const modalTitle = winModal.querySelector('.modal-title');
const modalScore = winModal.querySelector('.modal-score');

const ROWS = 4;
const COLS = 4;
let grid = [];
let timerInterval;
let timeRemaining = 60;
let isGameOver = false;

// Directions: 0: Up, 1: Right, 2: Down, 3: Left
const DIRS = [
    { r: -1, c: 0 }, // Up
    { r: 0, c: 1 },  // Right
    { r: 1, c: 0 },  // Down
    { r: 0, c: -1 }  // Left
];

const TILE_TYPES = {
    'straight': [true, false, true, false],
    'corner': [true, true, false, false],
    't': [true, true, true, false],
    'cross': [true, true, true, true],
    'empty': [false, false, false, false]
};

class Tile {
    constructor(r, c) {
        this.r = r;
        this.c = c;
        this.type = 'empty';
        this.rotation = 0;
        this.isPowered = false;
        this.element = null;
    }

    getConnections() {
        const base = TILE_TYPES[this.type];
        const rotated = [false, false, false, false];
        for (let i = 0; i < 4; i++) {
            let oldIdx = (i - this.rotation + 4) % 4;
            rotated[i] = base[oldIdx];
        }
        return rotated;
    }

    rotate() {
        if (isGameOver) return;
        this.rotation = (this.rotation + 1) % 4;
        this.updateVisuals();
    }

    updateVisuals() {
        this.element.style.transform = `rotate(${this.rotation * 90}deg)`;
        if (this.isPowered) {
            this.element.classList.add('powered');
        } else {
            this.element.classList.remove('powered');
        }

        // Remove borders on connected sides to make it look seamless (Visual Trick)
        // Actually, just keep lines thick enough.
    }
}

function initGame() {
    isGameOver = false;
    winModal.classList.remove('active');

    // Reset Timer
    clearInterval(timerInterval);
    timeRemaining = 60;
    timerElement.innerText = `TIME: ${timeRemaining}s`;

    createGrid();
    generateLevel();
    renderGrid();
    checkConnections();

    // Start Timer
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerElement.innerText = `TIME: ${timeRemaining}s`;
        if (timeRemaining <= 0) {
            handleGameOver();
        }
    }, 1000);
}

function handleGameOver() {
    clearInterval(timerInterval);
    isGameOver = true;
    modalTitle.innerText = "SYSTEM FAILURE";
    modalTitle.style.color = "#FF4444";
    modalScore.innerText = "CONNECTION TIMED OUT";
    nextLevelBtn.innerText = "RETRY SECTOR";
    winModal.classList.add('active');
}

function handleWin() {
    clearInterval(timerInterval);
    isGameOver = true;
    modalTitle.innerText = "SYSTEM ONLINE";
    modalTitle.style.color = "var(--neon-cyan)";
    modalScore.innerText = `RESTORED IN ${60 - timeRemaining}s`;
    nextLevelBtn.innerText = "NEXT SECTOR";
    setTimeout(() => winModal.classList.add('active'), 500);
}

function createGrid() {
    grid = [];
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            let tile = new Tile(r, c);
            row.push(tile);
        }
        grid.push(row);
    }
}

function generateLevel() {
    // 1. Generate a valid path
    let current = { r: 0, c: 0 };
    let path = [current];
    let visited = new Set(['0,0']);

    // Force path to be a bit longer than Manhattan distance to make it interesting
    // but not too long for 1 minute on 4x4

    while (current.r !== ROWS - 1 || current.c !== COLS - 1) {
        let candidates = [];
        for (let i = 0; i < 4; i++) {
            let nr = current.r + DIRS[i].r;
            let nc = current.c + DIRS[i].c;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited.has(`${nr},${nc}`)) {
                candidates.push({ r: nr, c: nc });
            }
        }

        candidates.sort((a, b) => {
            let distA = (ROWS - 1 - a.r) + (COLS - 1 - a.c);
            let distB = (ROWS - 1 - b.r) + (COLS - 1 - b.c);
            // More randomness
            return distA - distB + (Math.random() * 4 - 2);
        });

        if (candidates.length === 0) {
            return generateLevel(); // Retry
        }

        let next = candidates[0];
        path.push(next);
        visited.add(`${next.r},${next.c}`);
        current = next;
    }

    // 2. Set Types
    for (let i = 0; i < path.length; i++) {
        let r = path[i].r;
        let c = path[i].c;
        let connections = [false, false, false, false];

        if (i > 0) {
            let pr = path[i - 1].r;
            let pc = path[i - 1].c;
            if (pr < r) connections[0] = true;
            if (pc > c) connections[1] = true;
            if (pr > r) connections[2] = true;
            if (pc < c) connections[3] = true;
        } else {
            // START: Ensure it connects to next
            // We'll treat Start (0,0) specifically.
        }

        if (i < path.length - 1) {
            let nr = path[i + 1].r;
            let nc = path[i + 1].c;
            if (nr < r) connections[0] = true;
            if (nc > c) connections[1] = true;
            if (nr > r) connections[2] = true;
            if (nc < c) connections[3] = true;
        }

        grid[r][c].type = getTypeFromConnections(connections);
    }

    // 3. Fill noise
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].type === 'empty') {
                const types = ['straight', 'corner', 'corner', 't']; // Fewer crosses, more corners
                grid[r][c].type = types[Math.floor(Math.random() * types.length)];
            }
        }
    }

    // 4. Scramble
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c].rotation = Math.floor(Math.random() * 4);
        }
    }
}

function getTypeFromConnections(conns) {
    const count = conns.filter(x => x).length;
    if (count <= 2) {
        if ((conns[0] && conns[2]) || (conns[1] && conns[3])) return 'straight';
        return 'corner';
    }
    if (count === 3) return 't';
    return 'cross';
}

function renderGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = grid[r][c];
            const el = document.createElement('div');
            el.classList.add('tile');
            el.dataset.type = tile.type;

            if (r === 0 && c === 0) el.classList.add('start');
            if (r === ROWS - 1 && c === COLS - 1) el.classList.add('end');

            el.addEventListener('click', () => {
                tile.rotate();
                checkConnections();
            });

            gridContainer.appendChild(el);
            tile.element = el;
            tile.updateVisuals();
        }
    }
}

function checkConnections() {
    if (isGameOver) return;

    // Reset Power
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c].isPowered = false;
        }
    }

    // BFS
    let queue = [{ r: 0, c: 0 }];
    grid[0][0].isPowered = true;
    let reachedEnd = false;

    // Start Node special logic: It needs to be rotated such that it connects to its powered neighbor?
    // Actually, let's just say 0,0 is ALWAYS powered.
    // AND we need to check if it connects to neighbors visually.

    // Re-implementation of BFS to respect rotation
    // Clear queue, start fresh
    // 0,0 is source.

    // We need to trace flow.
    // If Tile A connects to B, AND Tile B connects to A, then flow passes.

    // Let's assume input comes into (0,0) from the LEFT (imaginary).
    // So (0,0) must have a LEFT connection? No, just treat (0,0) as a source.

    queue = [{ r: 0, c: 0 }];
    let visited = new Set(['0,0']);

    while (queue.length > 0) {
        let curr = queue.shift();
        let tile = grid[curr.r][curr.c];

        if (curr.r === ROWS - 1 && curr.c === COLS - 1) {
            reachedEnd = true;
        }

        let conns = tile.getConnections(); // [U, R, D, L]

        for (let i = 0; i < 4; i++) {
            if (conns[i]) {
                let nr = curr.r + DIRS[i].r;
                let nc = curr.c + DIRS[i].c;

                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    let neighbor = grid[nr][nc];
                    let nConns = neighbor.getConnections();
                    let opposite = (i + 2) % 4;

                    if (nConns[opposite] && !visited.has(`${nr},${nc}`)) {
                        queue.push({ r: nr, c: nc });
                        visited.add(`${nr},${nc}`);
                        neighbor.isPowered = true;
                    }
                }
            }
        }
    }

    // Update Visuals
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c].updateVisuals();
        }
    }

    if (reachedEnd && !isGameOver) {
        handleWin();
    }
}

nextLevelBtn.addEventListener('click', initGame);

// Start
initGame();
