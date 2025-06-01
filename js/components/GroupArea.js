class GroupArea {
    constructor(id, color, name, gridPosition, tileCount = 2) {
        this.id = id;
        this.color = color;
        this.name = name;

        // 古いデータ形式への対応
        if (gridPosition && typeof gridPosition.x === 'number') {
            this.gridPosition = gridPosition;
        } else if (gridPosition && typeof gridPosition === 'object') {
            // 古い形式の場合はピクセル座標をグリッド座標に変換
            this.gridPosition = {
                x: Math.floor((gridPosition.x || 0) / 50),
                y: Math.floor((gridPosition.y || 0) / 50)
            };
        } else {
            // デフォルト値
            this.gridPosition = { x: 0, y: 0 };
        }

        this.gridSize = window.gridManager ? window.gridManager.gridSize : 50;
        this.tiles = [];
        this.isExpanded = true;
        this.showName = true;
        this.isCollapsed = false;

        // グリッドベースサイズ計算
        this.calculateGridSize(tileCount);
        this.element = this.createElement();
        this.header = this.createHeader();
        this.setupEventListeners();
    }

    calculateGridSize(tileCount) {
        // タイル数に応じて最適なグリッドサイズを計算
        const tilesPerRow = Math.ceil(Math.sqrt(tileCount));
        this.gridWidth = Math.max(tilesPerRow, 2); // 最小2マス幅
        this.gridHeight = Math.ceil(tileCount / tilesPerRow) + 1; // +1はヘッダー分

        this.pixelWidth = this.gridWidth * this.gridSize;
        this.pixelHeight = this.gridHeight * this.gridSize;
    }

    createElement() {
        const element = document.createElement('div');
        element.className = 'group-area';
        element.id = this.id;
        element.style.position = 'absolute';
        element.style.left = (this.gridPosition.x * this.gridSize) + 'px';
        element.style.top = (this.gridPosition.y * this.gridSize) + 'px';
        element.style.width = this.pixelWidth + 'px';
        element.style.height = this.pixelHeight + 'px';
        element.style.border = `3px solid ${this.color}`;
        element.style.borderRadius = '12px';
        element.style.background = 'rgba(255,255,255,0.9)';
        element.style.zIndex = '10';

        return element;
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'group-header';
        header.style.position = 'absolute';
        header.style.top = '5px';
        header.style.left = '5px';
        header.style.right = '5px';
        header.style.height = '24px';
        header.style.backgroundColor = this.color;
        header.style.borderRadius = '8px';
        header.style.color = 'white';
        header.style.fontSize = '12px';
        header.style.fontWeight = 'bold';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'center';
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.textContent = this.name;

        this.element.appendChild(header);
        return header;
    }

    setupEventListeners() {
        // ヘッダークリック：展開/縮小
        this.header.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCollapse();
        });

        // グループ全体移動（空の領域クリック）
        this.element.addEventListener('mousedown', (e) => {
            if (e.target === this.element && !this.isCollapsed) {
                this.startGridDrag(e);
            }
        });

        // ヘッダードラッグで移動
        this.header.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startGridDrag(e);
        });

        // タイル追加（ドロップ）
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.element.style.backgroundColor = 'rgba(0,122,204,0.2)';
        });

        this.element.addEventListener('dragleave', (e) => {
            if (!this.element.contains(e.relatedTarget)) {
                this.element.style.backgroundColor = 'rgba(255,255,255,0.9)';
            }
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.element.style.backgroundColor = 'rgba(255,255,255,0.9)';
            this.addTileToGroup(e);
        });

        // 右クリック
        this.element.addEventListener('contextmenu', (e) => {
            if (e.target === this.element || e.target === this.header) {
                e.preventDefault();
                const action = confirm('グループ操作\n\nOK: 名前変更\nキャンセル: 削除');
                if (action) {
                    this.renameGroup();
                } else {
                    this.deleteGroup();
                }
            }
        });
    }

    // 新機能：1マス縮小表示
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            // 1マス縮小
            this.element.style.width = this.gridSize + 'px';
            this.element.style.height = this.gridSize + 'px';
            this.element.style.overflow = 'hidden';
            this.header.style.fontSize = '10px';
            this.header.textContent = this.tiles.length.toString();

            // タイル非表示
            this.tiles.forEach(tile => {
                tile.element.style.display = 'none';
            });
        } else {
            // 展開
            this.element.style.width = this.pixelWidth + 'px';
            this.element.style.height = this.pixelHeight + 'px';
            this.element.style.overflow = 'visible';
            this.header.style.fontSize = '12px';
            this.header.textContent = this.name;

            // タイル表示
            this.tiles.forEach(tile => {
                tile.element.style.display = 'flex';
            });
        }

        console.log('[INFO] Group collapsed state:', this.isCollapsed);
    }

    // グリッド制約移動
    startGridDrag(e) {
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startGridX = this.gridPosition.x;
        const startGridY = this.gridPosition.y;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startMouseX;
            const deltaY = e.clientY - startMouseY;

            const newGridX = startGridX + Math.round(deltaX / this.gridSize);
            const newGridY = startGridY + Math.round(deltaY / this.gridSize);

            // 境界チェック
            if (newGridX >= 0 && newGridY >= 0) {
                // 重なりチェック（後で実装）
                this.moveToGrid(newGridX, newGridY);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (window.linkCanvas) {
                window.linkCanvas.saveData();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    moveToGrid(gridX, gridY) {
        this.gridPosition.x = gridX;
        this.gridPosition.y = gridY;
        this.element.style.left = (gridX * this.gridSize) + 'px';
        this.element.style.top = (gridY * this.gridSize) + 'px';
    }

    addTileToGroup(dropEvent) {
        if (!window.linkCanvas || !window.linkCanvas.dragState.draggedTile) return;

        const tile = window.linkCanvas.dragState.draggedTile;
        if (tile.groupId === this.id) return;

        // 既存グループから除外
        if (tile.groupId) {
            const oldGroup = window.linkCanvas.groups.get(tile.groupId);
            if (oldGroup) oldGroup.removeTile(tile);
        }

        // このグループに追加
        this.addTile(tile);
        this.arrangeInternalTiles();
        this.recalculateSize();
    }

    addTile(tile) {
        tile.groupId = this.id;
        this.tiles.push(tile);

        // DOM移動
        this.element.appendChild(tile.element);
        console.log('[INFO] Tile added to group:', tile.id);
    }

    removeTile(tile) {
        const index = this.tiles.indexOf(tile);
        if (index > -1) {
            this.tiles.splice(index, 1);
            tile.groupId = null;
        }
    }

    // グループ内タイル自動配置
    arrangeInternalTiles() {
        const headerHeight = 34; // ヘッダー + マージン
        const tileSize = this.gridSize - 10; // マージン考慮
        const tilesPerRow = Math.floor((this.pixelWidth - 10) / tileSize);

        this.tiles.forEach((tile, index) => {
            const row = Math.floor(index / tilesPerRow);
            const col = index % tilesPerRow;

            tile.element.style.position = 'absolute';
            tile.element.style.left = (5 + col * tileSize) + 'px';
            tile.element.style.top = (headerHeight + row * tileSize) + 'px';
            tile.element.style.width = (tileSize - 5) + 'px';
            tile.element.style.height = (tileSize - 5) + 'px';
        });
    }

    recalculateSize() {
        this.calculateGridSize(this.tiles.length);
        if (!this.isCollapsed) {
            this.element.style.width = this.pixelWidth + 'px';
            this.element.style.height = this.pixelHeight + 'px';
        }
        this.arrangeInternalTiles();
    }

    renameGroup() {
        const newName = prompt('グループ名:', this.name);
        if (newName && newName.trim()) {
            this.name = newName.trim();
            if (!this.isCollapsed) {
                this.header.textContent = this.name;
            }
        }
    }

    deleteGroup() {
        if (!confirm('グループを削除しますか？')) return;

        // タイルを個別配置に戻す
        this.tiles.forEach(tile => {
            tile.groupId = null;
            if (window.linkCanvas) {
                // 空いている場所を探して配置
                const freePosition = window.gridManager.findNearestFreePosition(
                    this.gridPosition.x * this.gridSize,
                    this.gridPosition.y * this.gridSize
                );
                tile.position = freePosition;
                tile.element.style.left = freePosition.x + 'px';
                tile.element.style.top = freePosition.y + 'px';
                tile.element.style.width = this.gridSize + 'px';
                tile.element.style.height = this.gridSize + 'px';
                window.linkCanvas.canvas.appendChild(tile.element);
            }
        });

        // グループ削除
        if (window.linkCanvas) {
            window.linkCanvas.groups.delete(this.id);
            window.linkCanvas.saveData();
        }
        this.element.remove();
    }
}
  