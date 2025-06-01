class GroupArea {
    // js/components/GroupArea.js のコンストラクタ部分を修正
    constructor(id, color, name, position, size) {
        this.id = id;

        // カラー処理を安全に
        if (typeof color === 'object' && color.hex) {
            this.color = color.hex;
            this.colorName = color.name;
        } else if (typeof color === 'string') {
            this.color = color;
            this.colorName = this.getColorNameFromHex(color);
        } else {
            this.color = '#007acc';
            this.colorName = 'blue';
        }

        console.log('[DEBUG] GroupArea created with color:', this.color, 'name:', this.colorName);

        this.name = name;
        this.position = position || { x: 0, y: 0 };
        this.size = size || { width: 120, height: 100 };
        this.tiles = [];
        this.isExpanded = true;
        this.gridSize = 50;

        this.element = this.createElement();
        this.header = this.createHeader();
        this.setupEventListeners();
    }

    // 新しいメソッドを追加
    getColorNameFromHex(hex) {
        const colorMap = {
            '#007acc': 'blue',
            '#28a745': 'green',
            '#dc3545': 'red',
            '#fd7e14': 'orange',
            '#6f42c1': 'purple',
            '#20c997': 'teal',
            '#e83e8c': 'pink',
            '#ffc107': 'yellow',
            '#6c757d': 'gray'
        };
        return colorMap[hex] || 'blue';
    }


    createElement() {
        const element = document.createElement('div');
        element.className = `group-area group-color-${this.colorName}`;
        element.id = this.id;
        element.style.position = 'absolute';
        element.style.left = this.position.x + 'px';
        element.style.top = this.position.y + 'px';
        element.style.width = this.size.width + 'px';
        element.style.height = this.size.height + 'px';
        element.style.borderColor = this.color;

        return element;
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'group-header';
        header.style.backgroundColor = this.color;
        header.textContent = this.name;

        this.element.appendChild(header);
        return header;
    }

    setupEventListeners() {
        // ヘッダークリック - 展開/縮小
        this.header.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExpansion();
        });

        // ヘッダードラッグで移動（グリッド制約）
        this.header.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                e.preventDefault();
                this.startGridDrag(e);
            }
        });
        // グループエリア全体でのドラッグ移動（空の領域）
        this.element.addEventListener('mousedown', (e) => {
            // タイル上でもヘッダー上でもない場合にグループ移動
            if (e.target === this.element && e.button === 0) {
                e.preventDefault();
                console.log('[DEBUG] Group area drag started');
                this.startGridDrag(e);
            }
        });

        // グループ全体でのドラッグ&ドロップ受け入れ
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.element.classList.add('hover');
        });

        this.element.addEventListener('dragleave', (e) => {
            if (!this.element.contains(e.relatedTarget)) {
                this.element.classList.remove('hover');
            }
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.element.classList.remove('hover');
            this.handleTileDrop(e);
        });

        // 右クリック
        this.element.addEventListener('contextmenu', (e) => {
            if (e.target === this.element || e.target === this.header) {
                e.preventDefault();
                if (window.contextMenu) {
                    window.contextMenu.showForGroup(e, this);
                }
            }
        });
    }

    // 既存のtoggleExpansionメソッドを以下に完全置換：

    toggleExpansion() {
        this.isExpanded = !this.isExpanded;

        console.log('[DEBUG] Toggling expansion:', this.isExpanded, 'for group:', this.id);
        console.log('[DEBUG] Current size:', this.size, 'gridSize:', this.gridSize);

        // 展開部分のヘッダー復元箇所を以下に置換：

        if (this.isExpanded) {
            // 展開状態
            console.log('[DEBUG] Expanding group...');
            this.element.classList.remove('collapsed');

            // 元のサイズに戻す（強制）
            this.element.style.height = this.size.height + 'px';
            this.element.style.width = this.size.width + 'px';
            this.element.style.overflow = 'visible';
            this.element.style.minHeight = 'auto';
            this.element.style.maxHeight = 'none';
            this.element.style.minWidth = 'auto';
            this.element.style.maxWidth = 'none';

            // ヘッダーを元のスタイルに完全復元
            this.header.style.display = 'flex';
            this.header.style.visibility = 'visible';
            this.header.style.position = 'absolute';
            this.header.style.top = '-30px';
            this.header.style.left = '0';
            this.header.style.right = 'auto';
            this.header.style.width = 'auto';
            this.header.style.height = '24px';
            this.header.style.borderRadius = '12px 12px 0 0';
            this.header.style.padding = '0 12px';
            this.header.style.fontSize = '11px';
            this.header.style.fontWeight = 'bold';
            this.header.style.justifyContent = 'center';
            this.header.style.alignItems = 'center';
            this.header.style.minWidth = '80px';
            this.header.textContent = this.name;

            console.log('[DEBUG] Header fully restored to original style');

            // タイルを表示
            this.tiles.forEach((tile, index) => {
                if (tile.element) {
                    tile.element.style.display = 'flex';
                    tile.element.style.visibility = 'visible';
                    console.log('[DEBUG] Tile', index, 'made visible');
                }
            });

            console.log('[DEBUG] Group expanded to size:', this.size);
        }

        else {
            // 縮小状態（1マス表示）
            console.log('[DEBUG] Collapsing group...');
            this.element.classList.add('collapsed');

            // 強制的に1マスサイズに変更（インラインスタイルで確実に）
            this.element.style.height = '50px';
            this.element.style.width = '50px';
            this.element.style.minHeight = '50px';
            this.element.style.maxHeight = '50px';
            this.element.style.minWidth = '50px';
            this.element.style.maxWidth = '50px';
            this.element.style.overflow = 'hidden';

            console.log('[DEBUG] Forced element size to 50x50px');

            // ヘッダーをコンパクト表示
            this.header.style.display = 'flex';
            this.header.style.visibility = 'visible';
            this.header.style.position = 'static';
            this.header.style.width = '100%';
            this.header.style.height = '100%';
            this.header.style.top = '0';
            this.header.style.left = '0';
            this.header.style.right = '0';
            this.header.style.borderRadius = '8px';
            this.header.style.fontSize = '14px';
            this.header.style.fontWeight = 'bold';
            this.header.style.justifyContent = 'center';
            this.header.style.alignItems = 'center';
            this.header.textContent = this.tiles.length.toString();

            console.log('[DEBUG] Header set to tile count:', this.tiles.length);

            // タイルを完全に隠す
            this.tiles.forEach((tile, index) => {
                if (tile.element) {
                    tile.element.style.display = 'none';
                    tile.element.style.visibility = 'hidden';
                    console.log('[DEBUG] Tile', index, 'hidden');
                }
            });

            console.log('[DEBUG] Group collapsed to 50x50px');
        }

        // データ保存
        if (window.linkCanvas) {
            window.linkCanvas.saveData();
        }
    }




    startGridDrag(e) {
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = this.position.x;
        const startTop = this.position.y;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // グリッド制約付き移動
            if (window.gridManager) {
                const newPosition = window.gridManager.snapToGrid(
                    startLeft + deltaX,
                    startTop + deltaY
                );
                this.position.x = newPosition.x;
                this.position.y = newPosition.y;
            } else {
                this.position.x = startLeft + deltaX;
                this.position.y = startTop + deltaY;
            }

            this.element.style.left = this.position.x + 'px';
            this.element.style.top = this.position.y + 'px';
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

    handleTileDrop(dropEvent) {
        if (!window.linkCanvas || !window.linkCanvas.dragState.draggedTile) return;

        const tile = window.linkCanvas.dragState.draggedTile;
        if (tile.groupId === this.id) return; // 同じグループなら無視

        console.log('[INFO] Adding tile to group:', tile.id, '→', this.id);

        // 既存グループから除外
        if (tile.groupId) {
            const oldGroup = window.linkCanvas.groups.get(tile.groupId);
            if (oldGroup) {
                oldGroup.removeTile(tile);
                if (oldGroup.tiles.length === 0) {
                    oldGroup.element.remove();
                    window.linkCanvas.groups.delete(oldGroup.id);
                }
            }
        } else {
            // 単独タイルの場合、キャンバスから削除
            if (tile.element.parentNode === window.linkCanvas.canvas) {
                window.linkCanvas.canvas.removeChild(tile.element);
            }
        }

        // このグループに追加
        this.addTile(tile);
        this.autoResize();

        if (window.linkCanvas) {
            window.linkCanvas.saveData();
        }
    }

    addTile(tile) {
        tile.groupId = this.id;
        this.tiles.push(tile);

        // グループ内での相対位置計算
        const padding = 10;
        const tileSize = this.gridSize - 5;
        const tilesPerRow = Math.floor((this.size.width - padding * 2) / tileSize);
        const row = Math.floor((this.tiles.length - 1) / tilesPerRow);
        const col = (this.tiles.length - 1) % tilesPerRow;

        const relativeX = padding + col * tileSize;
        const relativeY = 35 + row * tileSize; // ヘッダー分を考慮

        // DOM移動
        this.element.appendChild(tile.element);
        tile.element.style.position = 'absolute';
        tile.element.style.left = relativeX + 'px';
        tile.element.style.top = relativeY + 'px';
        tile.element.style.width = (tileSize - 5) + 'px';
        tile.element.style.height = (tileSize - 5) + 'px';

        tile.relativePosition = { x: relativeX, y: relativeY };

        console.log('[INFO] Tile added to group:', tile.id);
    }

    removeTile(tile) {
        const index = this.tiles.indexOf(tile);
        if (index > -1) {
            this.tiles.splice(index, 1);
            tile.groupId = null;
            delete tile.relativePosition;

            // 残りのタイルを再配置
            this.rearrangeTiles();
        }
    }

    rearrangeTiles() {
        const padding = 10;
        const tileSize = this.gridSize - 5;
        const tilesPerRow = Math.floor((this.size.width - padding * 2) / tileSize);

        this.tiles.forEach((tile, index) => {
            const row = Math.floor(index / tilesPerRow);
            const col = index % tilesPerRow;

            const relativeX = padding + col * tileSize;
            const relativeY = 35 + row * tileSize;

            tile.element.style.left = relativeX + 'px';
            tile.element.style.top = relativeY + 'px';
            tile.relativePosition = { x: relativeX, y: relativeY };
        });
    }

    autoResize() {
        const padding = 20;
        const tileSize = this.gridSize - 5;
        const tilesPerRow = Math.floor((this.size.width - padding) / tileSize) || 1;
        const rows = Math.ceil(this.tiles.length / tilesPerRow);

        // 最小サイズとタイル数に基づくサイズ
        const minWidth = Math.max(120, tilesPerRow * tileSize + padding);
        const minHeight = Math.max(100, 60 + rows * tileSize);

        this.size.width = minWidth;
        this.size.height = minHeight;

        if (this.isExpanded) {
            this.element.style.width = this.size.width + 'px';
            this.element.style.height = this.size.height + 'px';
        }

        this.rearrangeTiles();
    }

    setName(newName) {
        this.name = newName;
        this.header.textContent = this.name;
    }

    disbandGroup() {
        if (!confirm('グループを解除しますか？（タイルは個別配置に戻ります）')) return;

        // タイルを個別配置に戻す
        this.tiles.forEach(tile => {
            tile.groupId = null;

            if (window.linkCanvas && window.gridManager) {
                const freePosition = window.gridManager.findNearestFreePosition(
                    this.position.x, this.position.y, [this.element]
                );
                tile.position = freePosition;
                tile.element.style.position = 'absolute';
                tile.element.style.left = freePosition.x + 'px';
                tile.element.style.top = freePosition.y + 'px';
                tile.element.style.width = this.gridSize + 'px';
                tile.element.style.height = this.gridSize + 'px';
                window.linkCanvas.canvas.appendChild(tile.element);
            }

            delete tile.relativePosition;
        });

        // グループ削除
        if (window.linkCanvas) {
            window.linkCanvas.groups.delete(this.id);
            window.linkCanvas.saveData();
        }

        this.element.remove();
        console.log('[INFO] Group disbanded:', this.id);
    }

    toJSON() {
        return {
            id: this.id,
            color: this.color,
            name: this.name,
            position: this.position,
            size: this.size,
            isExpanded: this.isExpanded,
            tileIds: this.tiles.map(tile => tile.id)
        };
    }
}
