class GridManager {
    constructor(gridSize = 50) {
        this.gridSize = gridSize;
        this.init();
    }

    init() {
        console.log('[INIT] GridManager initialized with size:', this.gridSize);
    }

    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    getGridPosition(x, y) {
        return {
            gridX: Math.floor(x / this.gridSize),
            gridY: Math.floor(y / this.gridSize)
        };
    }

    isPositionOccupied(x, y, excludeElements = []) {
        const gridPos = this.snapToGrid(x, y);
        const elements = document.elementsFromPoint(
            gridPos.x + this.gridSize / 2,
            gridPos.y + this.gridSize / 2
        );

        return elements.some(el =>
            (el.classList.contains('link-tile') || el.classList.contains('group-area')) &&
            !excludeElements.includes(el)
        );
    }

    findNearestFreePosition(startX, startY, excludeElements = []) {
        const startGrid = this.getGridPosition(startX, startY);
        let radius = 0;
        const maxRadius = 10;

        while (radius <= maxRadius) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const testX = (startGrid.gridX + dx) * this.gridSize;
                        const testY = (startGrid.gridY + dy) * this.gridSize;

                        if (testX >= 0 && testY >= 0 &&
                            !this.isPositionOccupied(testX, testY, excludeElements)) {
                            return { x: testX, y: testY };
                        }
                    }
                }
            }
            radius++;
        }

        return this.snapToGrid(startX, startY);
    }
}
