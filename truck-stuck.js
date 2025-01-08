// Game state
let currentLevel = 1;
let moves = 0;
let gameBoard = null;
let blocks = [];
let isDragging = false;
let currentDragBlock = null;
let startX, startY;
let blockStartX, blockStartY;
let cellSize = 0;

// Level definitions with mandatory block movement puzzles
const levels = {
    1: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 1], orientation: 'horizontal' },
            // Block directly in truck's path
            { type: 'vertical', position: [1, 3], orientation: 'vertical', length: 2 },
            // Additional blocks for complexity
            { type: 'horizontal', position: [0, 0], orientation: 'horizontal', length: 2 },
            { type: 'vertical', position: [3, 2], orientation: 'vertical', length: 2 }
        ],
        exit: [2, 5]
    },
    2: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 1], orientation: 'horizontal' },
            // Multiple blocks blocking the path
            { type: 'vertical', position: [1, 3], orientation: 'vertical', length: 2 },
            { type: 'horizontal', position: [3, 3], orientation: 'horizontal', length: 2 },
            { type: 'vertical', position: [0, 2], orientation: 'vertical', length: 2 },
            { type: 'horizontal', position: [4, 1], orientation: 'horizontal', length: 2 }
        ],
        exit: [2, 5]
    },
    3: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 1], orientation: 'horizontal' },
            // Complex blocking pattern
            { type: 'vertical', position: [1, 3], orientation: 'vertical', length: 3 },
            { type: 'horizontal', position: [4, 3], orientation: 'horizontal', length: 2 },
            { type: 'vertical', position: [0, 2], orientation: 'vertical', length: 2 },
            { type: 'horizontal', position: [0, 4], orientation: 'horizontal', length: 2 },
            { type: 'vertical', position: [3, 0], orientation: 'vertical', length: 2 }
        ],
        exit: [2, 5]
    },
    'secret': {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 0], orientation: 'horizontal', isSpooky: true },
            // Complex blocking pattern requiring many moves
            { type: 'vertical', position: [0, 2], orientation: 'vertical', length: 3, isSpooky: true },
            { type: 'horizontal', position: [3, 2], orientation: 'horizontal', length: 3, isSpooky: true },
            { type: 'vertical', position: [1, 3], orientation: 'vertical', length: 2, isSpooky: true },
            { type: 'vertical', position: [0, 4], orientation: 'vertical', length: 2, isSpooky: true },
            { type: 'horizontal', position: [3, 0], orientation: 'horizontal', length: 2, isSpooky: true },
            { type: 'vertical', position: [4, 4], orientation: 'vertical', length: 2, isSpooky: true }
        ],
        exit: [2, 5],
        isSpooky: true
    }
};

// Initialize the game
function initGame() {
    gameBoard = document.getElementById('gameBoard');
    setupLevel(currentLevel);
    setupEventListeners();
    
    // Calculate cell size
    const boardRect = gameBoard.getBoundingClientRect();
    cellSize = (boardRect.width - 20) / 6; // 20px for padding
}

function setupEventListeners() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = parseInt(btn.dataset.level);
            if (level !== currentLevel) {
                currentLevel = level;
                updateLevelButtons();
                setupLevel(currentLevel);
            }
        });
    });

    document.getElementById('reset-level').addEventListener('click', () => {
        setupLevel(currentLevel);
    });
}

function updateLevelButtons() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level) === currentLevel);
    });
}

function setupLevel(levelNum) {
    const level = levels[levelNum];
    moves = 0;
    updateMoves();
    blocks = [];
    gameBoard.innerHTML = '';
    
    // Add exit zone with spooky variant
    const exitZone = document.createElement('div');
    exitZone.className = `exit-zone${level.isSpooky ? ' spooky' : ''}`;
    gameBoard.appendChild(exitZone);
    
    // Update game board appearance for spooky level
    if (level.isSpooky) {
        gameBoard.classList.add('spooky');
        document.body.classList.add('spooky-mode');
    } else {
        gameBoard.classList.remove('spooky');
        document.body.classList.remove('spooky-mode');
    }
    
    // Create grid cells
    for (let i = 0; i < level.size[0]; i++) {
        for (let j = 0; j < level.size[1]; j++) {
            const cell = document.createElement('div');
            cell.className = `cell${level.isSpooky ? ' spooky' : ''}`;
            cell.dataset.row = i;
            cell.dataset.col = j;
            gameBoard.appendChild(cell);
        }
    }

    // Add blocks
    level.blocks.forEach(blockData => {
        createBlock(blockData);
    });
}

function createBlock(blockData) {
    const block = document.createElement('div');
    block.className = `block ${blockData.type}`;
    if (blockData.isSpooky) {
        block.classList.add('spooky');
    }
    block.dataset.type = blockData.type;
    block.dataset.orientation = blockData.orientation || 'single';
    block.dataset.length = blockData.length || (blockData.type === 'truck' ? 2 : 1);
    
    // Set block size based on length
    if (blockData.orientation === 'horizontal') {
        block.style.width = `${100 * blockData.length}%`;
    } else if (blockData.orientation === 'vertical') {
        block.style.height = `${100 * blockData.length}%`;
    }
    
    const cell = document.querySelector(
        `[data-row="${blockData.position[0]}"][data-col="${blockData.position[1]}"]`
    );
    
    cell.appendChild(block);
    blocks.push({
        element: block,
        position: blockData.position,
        type: blockData.type,
        orientation: blockData.orientation,
        length: blockData.length
    });

    // Add drag event listeners
    block.addEventListener('mousedown', startDragging);
    block.addEventListener('touchstart', startDragging, { passive: false });
}

function startDragging(e) {
    e.preventDefault();
    const block = e.target;
    
    // Don't start a new drag if already dragging
    if (isDragging) return;
    
    isDragging = true;
    currentDragBlock = block;
    block.classList.add('dragging');
    
    // Get initial positions
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    
    const rect = block.getBoundingClientRect();
    blockStartX = rect.left;
    blockStartY = rect.top;

    // Add move and end listeners
    if (e.type === 'mousedown') {
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDragging);
    } else {
        document.addEventListener('touchmove', handleDrag, { passive: false });
        document.addEventListener('touchend', stopDragging);
    }
}

function handleDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    const orientation = currentDragBlock.dataset.orientation;
    const currentCell = currentDragBlock.parentElement;
    const gridRect = gameBoard.getBoundingClientRect();
    
    // Calculate potential new position
    let newX = blockStartX + deltaX;
    let newY = blockStartY + deltaY;
    
    // Constrain movement based on orientation
    if (orientation === 'horizontal') {
        newY = blockStartY;
    } else if (orientation === 'vertical') {
        newX = blockStartX;
    }
    
    // Find target cell based on position
    const targetCell = findTargetCell(
        newX - gridRect.left + cellSize/2,
        newY - gridRect.top + cellSize/2
    );
    
    if (targetCell && canMoveTo(currentDragBlock, currentCell, targetCell)) {
        currentDragBlock.style.transform = orientation === 'horizontal' 
            ? `translateX(${deltaX}px)` 
            : `translateY(${deltaY}px)`;
    }
}

function stopDragging(e) {
    if (!isDragging) return;
    
    const currentCell = currentDragBlock.parentElement;
    const gridRect = gameBoard.getBoundingClientRect();
    const blockRect = currentDragBlock.getBoundingClientRect();
    
    // Find final target cell
    const targetCell = findTargetCell(
        blockRect.left - gridRect.left + cellSize/2,
        blockRect.top - gridRect.top + cellSize/2
    );
    
    if (targetCell && canMoveTo(currentDragBlock, currentCell, targetCell)) {
        moveBlock(currentDragBlock, targetCell);
        moves++;
        updateMoves();
        checkWin();
    } else {
        // Reset position if invalid move
        currentDragBlock.style.transform = '';
    }
    
    // Clean up
    currentDragBlock.classList.remove('dragging');
    isDragging = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDragging);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', stopDragging);
    
    currentDragBlock = null;
}

function findTargetCell(x, y) {
    const row = Math.floor(y / cellSize);
    const col = Math.floor(x / cellSize);
    
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// Check if a block can move to target cell
function canMoveTo(block, fromCell, toCell) {
    if (!fromCell || !toCell) return false;
    
    const fromRow = parseInt(fromCell.dataset.row);
    const fromCol = parseInt(fromCell.dataset.col);
    const toRow = parseInt(toCell.dataset.row);
    const toCol = parseInt(toCell.dataset.col);
    
    // Check if movement is along correct axis
    const orientation = block.dataset.orientation;
    if (orientation === 'horizontal' && fromRow !== toRow) return false;
    if (orientation === 'vertical' && fromCol !== toCol) return false;
    
    // Get block length
    const blockLength = parseInt(block.dataset.length);
    
    // Check boundaries
    if (orientation === 'horizontal') {
        if (toCol < 0 || toCol + blockLength > 6) return false;
    } else if (orientation === 'vertical') {
        if (toRow < 0 || toRow + blockLength > 6) return false;
    }
    
    // Remove the block temporarily from its current position
    const blockElement = fromCell.removeChild(block);
    
    try {
        // Check the path and final position
        const positions = new Set(); // Use Set to avoid duplicate positions
        
        // Add all positions the block will pass through
        let currentRow = Math.min(fromRow, toRow);
        let currentCol = Math.min(fromCol, toCol);
        const endRow = Math.max(fromRow, toRow);
        const endCol = Math.max(fromCol, toCol);
        
        // Add all cells the block will pass through
        while (currentRow <= endRow) {
            while (currentCol <= endCol) {
                // For each position, check the full length of the block
                for (let i = 0; i < blockLength; i++) {
                    const pos = {
                        row: orientation === 'vertical' ? currentRow + i : currentRow,
                        col: orientation === 'horizontal' ? currentCol + i : currentCol
                    };
                    positions.add(`${pos.row},${pos.col}`);
                }
                currentCol++;
            }
            currentRow++;
            currentCol = Math.min(fromCol, toCol);
        }
        
        // Check all positions for collisions
        for (const posKey of positions) {
            const [row, col] = posKey.split(',').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            
            if (!cell) return false;
            
            // Check if cell is occupied by another block
            if (cell.children.length > 0 && cell.children[0] !== blockElement) {
                return false;
            }
        }
        
        return true;
    } finally {
        // Always put the block back in its original position
        fromCell.appendChild(blockElement);
    }
}

// Move block to target cell
function moveBlock(block, targetCell) {
    block.style.transform = '';
    targetCell.appendChild(block);
}

// Update moves counter
function updateMoves() {
    document.getElementById('moves').textContent = moves;
}

// Check win condition
function checkWin() {
    const level = levels[currentLevel];
    const truckBlock = document.querySelector('.block.truck');
    const truckCell = truckBlock.parentElement;
    const truckCol = parseInt(truckCell.dataset.col);
    
    // Check if there are any blocks in the path to exit
    for (let col = truckCol + 2; col <= level.exit[1]; col++) {
        const cell = document.querySelector(`[data-row="${level.exit[0]}"][data-col="${col}"]`);
        if (cell && cell.children.length > 0) {
            return; // Path is blocked
        }
    }
    
    if (truckCol === level.exit[1] - 1) {
        // Animate truck sliding out
        truckBlock.style.transition = 'transform 1s ease-in-out';
        truckBlock.style.transform = 'translateX(100%)';
        
        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        // Show win message after animation
        setTimeout(() => {
            showWinMessage();
        }, 1000);
    }
}

// Show win message
function showWinMessage() {
    const winMessage = document.getElementById('win-message');
    winMessage.style.display = 'block';
}

// Go to next level
function nextLevel() {
    if (currentLevel === 3) {
        // Reveal secret level
        currentLevel = 'secret';
        document.getElementById('win-message').style.display = 'none';
        
        // Add spooky reveal animation
        const flash = document.createElement('div');
        flash.className = 'flash';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            document.body.removeChild(flash);
            setupLevel(currentLevel);
            // Show spooky level message
            const message = document.createElement('div');
            message.className = 'spooky-message';
            message.textContent = "You've unlocked the SPOOKY LEVEL!";
            document.body.appendChild(message);
            setTimeout(() => {
                message.style.opacity = '0';
                setTimeout(() => document.body.removeChild(message), 1000);
            }, 2000);
        }, 1000);
    } else if (currentLevel === 'secret') {
        // Game completed
        window.location.href = 'index.html';
    } else if (currentLevel < 3) {
        currentLevel++;
        document.getElementById('win-message').style.display = 'none';
        updateLevelButtons();
        setupLevel(currentLevel);
    }
}

// Initialize game when page loads
window.addEventListener('load', initGame); 