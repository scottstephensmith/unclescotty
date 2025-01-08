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

// Level definitions with longer blocks (verified solvable)
const levels = {
    1: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 0], orientation: 'horizontal' },
            { type: 'vertical', position: [0, 1], orientation: 'vertical' },
            { type: 'vertical', position: [3, 1], orientation: 'vertical' },
            { type: 'horizontal', position: [4, 0], orientation: 'horizontal' }
        ],
        exit: [2, 5]
    },
    2: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 1], orientation: 'horizontal' },
            { type: 'vertical', position: [0, 0], orientation: 'vertical' },
            { type: 'vertical', position: [0, 3], orientation: 'vertical' },
            { type: 'horizontal', position: [4, 2], orientation: 'horizontal' },
            { type: 'vertical', position: [3, 4], orientation: 'vertical' }
        ],
        exit: [2, 5]
    },
    3: {
        size: [6, 6],
        blocks: [
            { type: 'truck', position: [2, 1], orientation: 'horizontal' },
            { type: 'vertical', position: [0, 0], orientation: 'vertical' },
            { type: 'vertical', position: [0, 3], orientation: 'vertical' },
            { type: 'horizontal', position: [0, 4], orientation: 'horizontal' },
            { type: 'vertical', position: [3, 2], orientation: 'vertical' },
            { type: 'horizontal', position: [4, 3], orientation: 'horizontal' }
        ],
        exit: [2, 5]
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
    
    // Add exit zone
    const exitZone = document.createElement('div');
    exitZone.className = 'exit-zone';
    gameBoard.appendChild(exitZone);
    
    // Create grid cells
    for (let i = 0; i < level.size[0]; i++) {
        for (let j = 0; j < level.size[1]; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
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
    block.dataset.type = blockData.type;
    block.dataset.orientation = blockData.orientation || 'single';
    
    const cell = document.querySelector(
        `[data-row="${blockData.position[0]}"][data-col="${blockData.position[1]}"]`
    );
    
    cell.appendChild(block);
    blocks.push({
        element: block,
        position: blockData.position,
        type: blockData.type,
        orientation: blockData.orientation
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
    
    // Get block size based on type
    let blockLength;
    switch(block.dataset.type) {
        case 'truck':
            blockLength = 2;
            break;
        case 'horizontal':
        case 'vertical':
            blockLength = 3;
            break;
        default:
            blockLength = 1;
    }
    
    // Check boundaries
    if (orientation === 'horizontal') {
        // Check if the move would put any part of the block out of bounds
        if (toCol < 0 || toCol + blockLength > 6) return false;
    } else if (orientation === 'vertical') {
        // Check if the move would put any part of the block out of bounds
        if (toRow < 0 || toRow + blockLength > 6) return false;
    }
    
    // Check if path is clear, including the space the block will occupy
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    
    // Check each cell in the path AND in the final position
    let currentRow = fromRow;
    let currentCol = fromCol;
    
    // Remove the block temporarily from its current position
    const blockElement = fromCell.removeChild(block);
    
    // Check the path and final position
    try {
        // Check the path to the target
        while (currentRow !== toRow || currentCol !== toCol) {
            currentRow += rowStep;
            currentCol += colStep;
            
            const cell = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
            if (!cell || cell.children.length > 0) {
                return false;
            }
        }
        
        // Check all cells the block will occupy in its final position
        for (let i = 0; i < blockLength; i++) {
            let checkRow = toRow;
            let checkCol = toCol;
            
            if (orientation === 'horizontal') {
                checkCol += i;
            } else if (orientation === 'vertical') {
                checkRow += i;
            }
            
            const cell = document.querySelector(`[data-row="${checkRow}"][data-col="${checkCol}"]`);
            if (!cell || cell.children.length > 0) {
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
    
    if (parseInt(truckCell.dataset.col) === level.exit[1] - 1) {
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
    if (currentLevel < Object.keys(levels).length) {
        currentLevel++;
        document.getElementById('win-message').style.display = 'none';
        updateLevelButtons();
        setupLevel(currentLevel);
    } else {
        // Game completed
        window.location.href = 'index.html';
    }
}

// Initialize game when page loads
window.addEventListener('load', initGame); 