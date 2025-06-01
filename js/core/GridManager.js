class GridManager {
    constructor(initialSize = 50) {
        this.gridSize = initialSize;
        this.showGrid = false;
        this.gridOverlay = null;
        this.magneticStrength = 10; // スナップの磁力範囲

        this.init();
    }

    init() {
        console.log('[INIT] GridManager initialized with size:', this.gridSize);
        this.createGridOverlay();
    }

    // この部分を削除または単純化
    setGridSize(newSize) {
        // 単純に値だけ更新、既存タイルは触らない
        this.gridSize = Math.max(25, Math.min(200, newSize));
        this.updateGridOverlay();
        return true;
    }

    snapToGrid(x, y, magnetic = true) {
        if (!magnetic) {
            // 強制スナップ
            return {
                x: Math.round(x / this.gridSize) * this.gridSize,
                y: Math.round(y / this.gridSize) * this.gridSize
            };
        }

        // 磁力スナップ - 近い場合のみスナップ
        const snappedX = Math.round(x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(y / this.gridSize) * this.gridSize;

        const deltaX = Math.abs(x - snappedX);
        const deltaY = Math.abs(y - snappedY);

        return {
            x: deltaX <= this.magneticStrength ? snappedX : x,
            y: deltaY <= this.magneticStrength ? snappedY : y
        };
    }

    snapElementToGrid(element, magnetic = true) {
        const rect = element.getBoundingClientRect();
        const snapped = this.snapToGrid(rect.left, rect.top, magnetic);

        element.style.left = snapped.x + 'px';
        element.style.top = snapped.y + 'px';

        return snapped;
    }

    getGridPosition(x, y) {
        return {
            gridX: Math.floor(x / this.gridSize),
            gridY: Math.floor(y / this.gridSize),
            absoluteX: Math.floor(x / this.gridSize) * this.gridSize,
            absoluteY: Math.floor(y / this.gridSize) * this.gridSize
        };
    }

    getGridArea(startX, startY, endX, endY) {
        const start = this.getGridPosition(Math.min(startX, endX), Math.min(startY, endY));
        const end = this.getGridPosition(Math.max(startX, endX), Math.max(startY, endY));

        return {
            startGrid: { x: start.gridX, y: start.gridY },
            endGrid: { x: end.gridX, y: end.gridY },
            width: (end.gridX - start.gridX + 1) * this.gridSize,
            height: (end.gridY - start.gridY + 1) * this.gridSize,
            absolutePosition: { x: start.absoluteX, y: start.absoluteY }
        };
    }

    createGridOverlay() {
        this.gridOverlay = document.createElement('div');
        this.gridOverlay.className = 'grid-overlay';
        this.gridOverlay.style.position = 'absolute';
        this.gridOverlay.style.top = '0';
        this.gridOverlay.style.left = '0';
        this.gridOverlay.style.width = '100%';
        this.gridOverlay.style.height = '100%';
        this.gridOverlay.style.pointerEvents = 'none';
        this.gridOverlay.style.zIndex = '-1';
        this.gridOverlay.style.opacity = '0';
        this.gridOverlay.style.transition = 'opacity 0.3s ease';

        this.updateGridOverlay();
    }

    updateGridOverlay() {
        if (!this.gridOverlay) return;

        this.gridOverlay.style.backgroundImage = `
        linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
      `;
        this.gridOverlay.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
    }

    showGridLines() {
        if (this.gridOverlay && !this.showGrid) {
            this.showGrid = true;
            this.gridOverlay.style.opacity = '0.3';
            console.log('[INFO] Grid lines shown');
        }
    }

    hideGridLines() {
        if (this.gridOverlay && this.showGrid) {
            this.showGrid = false;
            this.gridOverlay.style.opacity = '0';
            console.log('[INFO] Grid lines hidden');
        }
    }

    toggleGridLines() {
        if (this.showGrid) {
            this.hideGridLines();
        } else {
            this.showGridLines();
        }
    }

    attachToCanvas(canvas) {
        if (canvas && this.gridOverlay) {
            canvas.appendChild(this.gridOverlay);
            console.log('[INFO] Grid overlay attached to canvas');
        }
    }

    // 占有チェック機能
    isPositionOccupied(x, y, excludeElements = []) {
        const gridPos = this.getGridPosition(x, y);
        const elements = document.elementsFromPoint(gridPos.absoluteX + this.gridSize / 2, gridPos.absoluteY + this.gridSize / 2);

        return elements.some(el =>
            (el.classList.contains('link-tile') || el.classList.contains('group-area')) &&
            !excludeElements.includes(el)
        );
    }

    findNearestFreePosition(x, y, excludeElements = []) {
        const startGrid = this.getGridPosition(x, y);
        let radius = 0;
        const maxRadius = 10;

        while (radius <= maxRadius) {
            // 中心から螺旋状に空き位置を探索
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const testX = (startGrid.gridX + dx) * this.gridSize;
                        const testY = (startGrid.gridY + dy) * this.gridSize;

                        if (testX >= 0 && testY >= 0 && !this.isPositionOccupied(testX, testY, excludeElements)) {
                            return { x: testX, y: testY };
                        }
                    }
                }
            }
            radius++;
        }

        // 見つからない場合は元の位置
        return this.snapToGrid(x, y, false);
    }

    // 複数要素の整列機能
    alignElements(elements, alignment) {
        if (!elements || elements.length < 2) return;

        console.log('[INFO] Aligning elements:', alignment);

        const positions = elements.map(el => ({
            element: el,
            x: parseInt(el.style.left) || 0,
            y: parseInt(el.style.top) || 0
        }));

        switch (alignment) {
            case 'left':
                const leftX = Math.min(...positions.map(p => p.x));
                positions.forEach(p => {
                    p.element.style.left = leftX + 'px';
                });
                break;

            case 'right':
                const rightX = Math.max(...positions.map(p => p.x));
                positions.forEach(p => {
                    p.element.style.left = rightX + 'px';
                });
                break;

            case 'top':
                const topY = Math.min(...positions.map(p => p.y));
                positions.forEach(p => {
                    p.element.style.top = topY + 'px';
                });
                break;

            case 'bottom':
                const bottomY = Math.max(...positions.map(p => p.y));
                positions.forEach(p => {
                    p.element.style.top = bottomY + 'px';
                });
                break;

            case 'center-horizontal':
                const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
                const centerX = this.snapToGrid(avgX, 0, false).x;
                positions.forEach(p => {
                    p.element.style.left = centerX + 'px';
                });
                break;

            case 'center-vertical':
                const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
                const centerY = this.snapToGrid(0, avgY, false).y;
                positions.forEach(p => {
                    p.element.style.top = centerY + 'px';
                });
                break;

            case 'distribute-horizontal':
                positions.sort((a, b) => a.x - b.x);
                const totalWidth = positions[positions.length - 1].x - positions[0].x;
                const spacing = totalWidth / (positions.length - 1);
                positions.forEach((p, i) => {
                    if (i > 0 && i < positions.length - 1) {
                        const newX = positions[0].x + (spacing * i);
                        p.element.style.left = this.snapToGrid(newX, 0, false).x + 'px';
                    }
                });
                break;

            case 'distribute-vertical':
                positions.sort((a, b) => a.y - b.y);
                const totalHeight = positions[positions.length - 1].y - positions[0].y;
                const vSpacing = totalHeight / (positions.length - 1);
                positions.forEach((p, i) => {
                    if (i > 0 && i < positions.length - 1) {
                        const newY = positions[0].y + (vSpacing * i);
                        p.element.style.top = this.snapToGrid(0, newY, false).y + 'px';
                    }
                });
                break;
        }
    }

    // グリッド統計情報
    getGridStats() {
        const canvas = document.getElementById('link-canvas');
        if (!canvas) return null;

        const tiles = canvas.querySelectorAll('.link-tile');
        const groups = canvas.querySelectorAll('.group-area');

        const occupiedPositions = new Set();
        tiles.forEach(tile => {
            const pos = this.getGridPosition(
                parseInt(tile.style.left) || 0,
                parseInt(tile.style.top) || 0
            );
            occupiedPositions.add(`${pos.gridX},${pos.gridY}`);
        });

        return {
            gridSize: this.gridSize,
            totalTiles: tiles.length,
            totalGroups: groups.length,
            occupiedGrids: occupiedPositions.size,
            canvasSize: {
                width: canvas.offsetWidth,
                height: canvas.offsetHeight
            },
            maxGrids: {
                x: Math.floor(canvas.offsetWidth / this.gridSize),
                y: Math.floor(canvas.offsetHeight / this.gridSize)
            }
        };
    }

    // LinkCanvas.js に追加するメソッド

    setDependencies(gridManager, storageManager, autoGrouping, colorManager, nameGenerator) {
        this.gridManager = gridManager;
        this.storageManager = storageManager;
        this.autoGrouping = autoGrouping;
        this.colorManager = colorManager;
        this.nameGenerator = nameGenerator;
        this.hasUnsavedChanges = false;
    }

    async loadFromData(data) {
        this.clearAll();

        // タイル復元
        for (const tileData of data.tiles) {
            const tile = {
                id: tileData.id,
                url: tileData.url,
                title: tileData.title,
                position: tileData.position,
                groupId: tileData.groupId,
                relativePosition: tileData.relativePosition,
                element: null
            };

            tile.element = this.createTileElement(tile);
            this.tiles.set(tile.id, tile);
        }

        // グループ復元
        for (const groupData of data.groups) {
            const groupArea = new GroupArea(
                groupData.id,
                groupData.color,
                groupData.name,
                groupData.position,
                groupData.size
            );

            groupArea.isExpanded = groupData.isExpanded;
            groupArea.showName = groupData.showName;

            // グループ内タイルを関連付け
            for (const tileId of groupData.tileIds) {
                const tile = this.tiles.get(tileId);
                if (tile) {
                    groupArea.addTile(tile);
                    tile.groupId = groupData.id;
                    groupArea.element.appendChild(tile.element);

                    if (tile.relativePosition) {
                        tile.element.style.left = tile.relativePosition.x + 'px';
                        tile.element.style.top = tile.relativePosition.y + 'px';
                    }
                }
            }

            this.groups.set(groupData.id, groupArea);
            this.canvas.appendChild(groupArea.element);
        }

        // グループに属さないタイルをキャンバスに追加
        for (const tile of this.tiles.values()) {
            if (!tile.groupId) {
                this.canvas.appendChild(tile.element);
            }
        }
    }

    clearAll() {
        // 全タイル削除
        for (const tile of this.tiles.values()) {
            if (tile.element && tile.element.parentNode) {
                tile.element.parentNode.removeChild(tile.element);
            }
        }
        this.tiles.clear();

        // 全グループ削除
        for (const group of this.groups.values()) {
            if (group.element && group.element.parentNode) {
                group.element.parentNode.removeChild(group.element);
            }
        }
        this.groups.clear();

        this.selectedTiles = [];
        this.hasUnsavedChanges = false;
    }

    snapAllElementsToGrid() {
        // 全タイルをグリッドにスナップ
        for (const tile of this.tiles.values()) {
            if (!tile.groupId) {
                const snapped = this.gridManager.snapToGrid(tile.position.x, tile.position.y, false);
                tile.position = snapped;
                tile.element.style.left = snapped.x + 'px';
                tile.element.style.top = snapped.y + 'px';
            }
        }

        // 全グループをグリッドにスナップ
        for (const group of this.groups.values()) {
            const snapped = this.gridManager.snapToGrid(group.position.x, group.position.y, false);
            group.position = snapped;
            group.updateElement();
        }
    }

    async saveData() {
        if (this.storageManager) {
            const success = await this.storageManager.saveData(this.tiles, this.groups, {
                gridSize: this.gridManager.gridSize
            });

            if (success) {
                this.hasUnsavedChanges = false;
            }
            return success;
        }
        return false;
    }
  
}
  