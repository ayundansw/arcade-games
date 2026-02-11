const gridContainer = document.getElementById('grid-container');
const winModal = document.getElementById('winModal');
const nextLevelBtn = document.getElementById('nextLevelBtn');

const ROWS = 5;
const COLS = 5;
let grid = [];

// Directions: 0: Up, 1: Right, 2: Down, 3: Left
const DIRS = [
    { r: -1, c: 0 }, // Up
    { r: 0, c: 1 },  // Right
    { r: 1, c: 0 },  // Down
    { r: 0, c: -1 }  // Left
];

// Tile Types and their connections (at rotation 0)
// Connections are boolean array [Up, Right, Down, Left]
const TILE_TYPES = {
    'straight': [true, false, true, false], // Vertical
    'corner':   [true, true, false, false], // Top-Right
    't':        [true, true, true, false],  // Top-Right-Bottom
    'cross':    [true, true, true, true],   // All
    'empty':    [false, false, false, false]
};

class Tile {
    constructor(r, c) {
        this.r = r;
        this.c = c;
        this.type = 'empty';
        this.rotation = 0; // 0, 1, 2, 3 (x90deg)
        this.isPowered = false;
        this.element = null;
    }

    // Get connections based on current rotation
    getConnections() {
        const base = TILE_TYPES[this.type];
        // Rotate the boolean array 'this.rotation' times
        // [U, R, D, L] -> Rotate 1 -> [L, U, R, D] (Shift Right)
        // Wait, clockwise rotation:
        // Original: Up(0), Right(1), Down(2), Left(3)
        // Rot 1 (90deg): Up becomes Right. So new Right connects if old Up connected?
        // No, visually: 
        // Straight (Vert): [1,0,1,0]. Rot 1 (Horiz): [0,1,0,1].
        // Logic: specific index i corresponds to direction i.
        // After rot 1, the connection at index i comes from index (i - 1).
        
        const rotated = [false, false, false, false];
        for (let i = 0; i < 4; i++) {
            // The connection at direction i (New) comes from (i - rotation) (Old)
            // Example: Rot 1. New Right (1) comes from Old Up (0).
            let oldIdx = (i - this.rotation + 4) % 4;
            rotated[i] = base[oldIdx];
        }
        return rotated;
    }

    rotate() {
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
    }
}

function initGame() {
    winModal.classList.remove('active');
    createGrid();
    generateLevel();
    renderGrid();
    checkConnections(); // Initial check
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
    // 1. Generate a valid path from (0,0) to (4,4)
    let current = { r: 0, c: 0 };
    let path = [current];
    let visited = new Set(['0,0']);
    
    // Simple random walk towards target
    while (current.r !== ROWS - 1 || current.c !== COLS - 1) {
        let candidates = [];
        
        // Try all neighbors
        for (let i = 0; i < 4; i++) {
            let nr = current.r + DIRS[i].r;
            let nc = current.c + DIRS[i].c;
            
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited.has(`${nr},${nc}`)) {
                candidates.push({ r: nr, c: nc });
            }
        }
        
        // Bias towards Bottom-Right to ensure progress
        candidates.sort((a, b) => {
            let distA = (ROWS - 1 - a.r) + (COLS - 1 - a.c);
            let distB = (ROWS - 1 - b.r) + (COLS - 1 - b.c);
            return distA - distB + (Math.random() * 2 - 1); // Slight randomness
        });

        if (candidates.length === 0) {
            // Stuck? Restart generation (Primitive backtracking)
            return generateLevel();
        }

        // Pick top candidate
        let next = candidates[0];
        path.push(next);
        visited.add(`${next.r},${next.c}`);
        current = next;
    }

    // 2. Set Tile Types based on path connections
    for (let i = 0; i < path.length; i++) {
        let r = path[i].r;
        let c = path[i].c;
        let connections = [false, false, false, false];

        // Check Previous
        if (i > 0) {
            let pr = path[i-1].r;
            let pc = path[i-1].c;
            if (pr < r) connections[0] = true; // Up
            if (pc > c) connections[1] = true; // Right
            if (pr > r) connections[2] = true; // Down
            if (pc < c) connections[3] = true; // Left
        } else {
             // Start Node: Force connect to next
        }

        // Check Next
        if (i < path.length - 1) {
            let nr = path[i+1].r;
            let nc = path[i+1].c;
            if (nr < r) connections[0] = true;
            if (nc > c) connections[1] = true;
            if (nr > r) connections[2] = true;
            if (nc < c) connections[3] = true;
        }

        // Determine Type from connections
        grid[r][c].type = getTypeFromConnections(connections);
    }

    // 3. Fill random noise for non-path tiles
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].type === 'empty') {
                const types = ['straight', 'corner', 't', 'cross'];
                grid[r][c].type = types[Math.floor(Math.random() * types.length)];
            }
        }
    }

    // 4. Scramble Rotations
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c].rotation = Math.floor(Math.random() * 4);
        }
    }
}

function getTypeFromConnections(conns) {
    // conns: [U, R, D, L]
    const count = conns.filter(x => x).length;
    
    // Start/End might have 1 connection in logic, but visuals need 2? 
    // Actually, let's just default Start/End to having an "Open" end or make them Corner/Straight
    // The path logic sets connections. If only 1 connection (Start/End), we can pick a Straight or Corner that satisfies it.
    
    if (count <= 2) {
        // Check Straight
        if ((conns[0] && conns[2]) || (conns[1] && conns[3])) return 'straight';
        // Otherwise Corner
        return 'corner'; 
        // (Visual logic handles rotation, we just need a shape that CAN support these connections)
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
    // Reset Power
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c].isPowered = false;
        }
    }

    // BFS from Start (0,0)
    // Assume Start is powered coming from "Top" or just always powered
    let queue = [{r: 0, c: 0}];
    grid[0][0].isPowered = true;
    
    let reachedEnd = false;

    while(queue.length > 0) {
        let curr = queue.shift();
        let tile = grid[curr.r][curr.c];
        let conns = tile.getConnections(); // [U, R, D, L]

        if (curr.r === ROWS - 1 && curr.c === COLS - 1) {
            reachedEnd = true;
        }

        // Check Neighbors
        for (let i = 0; i < 4; i++) {
            if (conns[i]) {
                let nr = curr.r + DIRS[i].r;
                let nc = curr.c + DIRS[i].c;
                
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    let neighbor = grid[nr][nc];
                    if (!neighbor.isPowered) {
                        // Check if neighbor connects back
                        let nConns = neighbor.getConnections();
                        // Neighbor's opposite direction must be true
                        // 0(U) <-> 2(D), 1(R) <-> 3(L)
                        let opposite = (i + 2) % 4;
                        
                        if (nConns[opposite]) {
                            neighbor.isPowered = true;
                            queue.push({r: nr, c: nc});
                        }
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

    if (reachedEnd) {
        setTimeout(() => winModal.classList.add('active'), 500);
    }
}

nextLevelBtn.addEventListener('click', initGame);

// Start
initGame();
