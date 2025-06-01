class AutoGrouping {
    constructor(linkCanvas) {
        this.canvas = linkCanvas;
        this.colorManager = new ColorManager();
        this.nameGenerator = new NameGenerator();
        this.HOVER_DELAY = 800; // 0.8秒
        this.hoverTimer = null;
        this.hoverIndicator = null;

        this.init();
    }

    init() {
        console.log('[INIT] AutoGrouping initialized');
        this.createHoverIndicator();
    }

    startHoverTimer(draggedTile, targetTile) {
        this.clearHoverTimer();

        console.log('[SCAN] Hover timer started for auto-grouping');

        // ホバー視覚フィードバック開始
        this.showHoverProgress(targetTile);

        this.hoverTimer = setTimeout(() => {
            this.createAutoGroup(draggedTile, targetTile);
        }, this.HOVER_DELAY);
    }

    clearHoverTimer() {
        if (this.hoverTimer) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
            this.hideHoverProgress();
            console.log('[INFO] Hover timer cleared');
        }
    }
    
    createAutoGroup(tile1, tile2) {
        console.log('[INFO] Creating auto-group');

        // グループ設定
        const color = this.canvas.colorManager.getNextColor();
        const name = this.canvas.nameGenerator.generateGroupName();
        const groupId = this.generateGroupId();

        // グリッド位置計算（新方式）
        const gridPosition = {
            x: Math.min(
                Math.floor(tile1.position.x / this.canvas.gridSize),
                Math.floor(tile2.position.x / this.canvas.gridSize)
            ),
            y: Math.min(
                Math.floor(tile1.position.y / this.canvas.gridSize),
                Math.floor(tile2.position.y / this.canvas.gridSize)
            )
        };

        // 新しいGroupArea作成（引数変更）
        const groupArea = new GroupArea(groupId, color, name, gridPosition, 2);

        // タイルをグループに移動
        this.moveToGroup(tile1, groupArea);
        this.moveToGroup(tile2, groupArea);

        // 内部タイル配置
        groupArea.arrangeInternalTiles();

        // キャンバスに登録
        this.canvas.groups.set(groupId, groupArea);
        this.canvas.canvas.appendChild(groupArea.element);

        // データ保存
        this.canvas.saveData();

        console.log('[INFO] Auto-group created with new system:', groupId);
        return groupArea;
    }

    // moveToGroup メソッドも修正
    moveToGroup(tile, groupArea) {
        // 既存の位置から削除
        if (tile.element.parentNode) {
            tile.element.parentNode.removeChild(tile.element);
        }

        // グループに追加
        groupArea.addTile(tile);

        console.log('[INFO] Tile moved to group:', tile.id);
    }
    

    calculateGroupPosition(tile1, tile2) {
        const centerX = (tile1.position.x + tile2.position.x) / 2;
        const centerY = (tile1.position.y + tile2.position.y) / 2;

        // グリッドにスナップ
        return this.canvas.snapToGrid(centerX, centerY);
    }

    calculateInitialGroupSize() {
        const minWidth = this.canvas.gridSize * 3; // 3グリッド分
        const minHeight = this.canvas.gridSize * 2; // 2グリッド分

        return {
            width: minWidth,
            height: minHeight
        };
    }

    addTileToGroup(tile, groupArea) {
        // タイルの現在位置からグループ内相対位置を計算
        const relativePosition = {
            x: tile.position.x - groupArea.position.x + 10, // 10px余白
            y: tile.position.y - groupArea.position.y + 35  // ヘッダー分を考慮
        };

        // タイルをグループに関連付け
        tile.groupId = groupArea.id;
        tile.relativePosition = relativePosition;

        // DOM要素をグループ内に移動
        groupArea.element.appendChild(tile.element);
        tile.element.style.left = relativePosition.x + 'px';
        tile.element.style.top = relativePosition.y + 'px';

        // グループにタイル追加
        groupArea.addTile(tile);

        console.log('[INFO] Tile added to group:', tile.id, '→', groupArea.id);
    }

    showHoverProgress(targetTile) {
        const indicator = this.hoverIndicator;
        const rect = targetTile.element.getBoundingClientRect();

        indicator.style.left = (rect.left - 5) + 'px';
        indicator.style.top = (rect.top - 5) + 'px';
        indicator.style.width = (rect.width + 10) + 'px';
        indicator.style.height = (rect.height + 10) + 'px';
        indicator.style.display = 'block';

        // プログレスアニメーション開始
        indicator.style.animation = `hoverProgress ${this.HOVER_DELAY}ms linear`;
    }

    hideHoverProgress() {
        this.hoverIndicator.style.display = 'none';
        this.hoverIndicator.style.animation = 'none';
    }

    createHoverIndicator() {
        this.hoverIndicator = document.createElement('div');
        this.hoverIndicator.className = 'hover-indicator';
        this.hoverIndicator.style.position = 'fixed';
        this.hoverIndicator.style.border = '3px solid #007acc';
        this.hoverIndicator.style.borderRadius = '8px';
        this.hoverIndicator.style.background = 'rgba(0, 122, 204, 0.1)';
        this.hoverIndicator.style.pointerEvents = 'none';
        this.hoverIndicator.style.display = 'none';
        this.hoverIndicator.style.zIndex = '999';

        document.body.appendChild(this.hoverIndicator);

        // CSS アニメーション定義
        const style = document.createElement('style');
        style.textContent = `
        @keyframes hoverProgress {
          0% { border-color: #007acc; background: rgba(0, 122, 204, 0.1); }
          50% { border-color: #28a745; background: rgba(40, 167, 69, 0.2); }
          100% { border-color: #28a745; background: rgba(40, 167, 69, 0.3); }
        }
      `;
        document.head.appendChild(style);
    }

    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // グループ解除機能
    ungroupTiles(groupArea) {
        console.log('[INFO] Ungrouping tiles from:', groupArea.id);

        const tiles = [...groupArea.tiles];

        tiles.forEach(tile => {
            // タイルを個別配置に戻す
            tile.groupId = null;

            // 絶対位置に変換
            const absolutePosition = {
                x: groupArea.position.x + tile.relativePosition.x,
                y: groupArea.position.y + tile.relativePosition.y
            };
            tile.position = this.canvas.snapToGrid(absolutePosition.x, absolutePosition.y);

            // DOM要素をキャンバスに戻す
            this.canvas.canvas.appendChild(tile.element);
            tile.element.style.left = tile.position.x + 'px';
            tile.element.style.top = tile.position.y + 'px';

            delete tile.relativePosition;
        });

        // グループエリア削除
        groupArea.element.remove();
        this.canvas.groups.delete(groupArea.id);

        // データ保存
        this.canvas.saveData();

        console.log('[INFO] Group ungrouped:', groupArea.id);
    }

    // 手動グループ作成（設定画面等から）
    createManualGroup(selectedTiles, color = null, name = null) {
        if (selectedTiles.length < 2) {
            console.log('[ERROR] Need at least 2 tiles to create group');
            return null;
        }

        const groupColor = color || this.colorManager.getNextColor();
        const groupName = name || this.nameGenerator.generateGroupName();

        const firstTile = selectedTiles[0];
        const groupPosition = { ...firstTile.position };
        const groupSize = this.calculateGroupSizeForTiles(selectedTiles);

        const groupId = this.generateGroupId();
        const groupArea = new GroupArea(groupId, groupColor, groupName, groupPosition, groupSize);

        selectedTiles.forEach(tile => {
            this.addTileToGroup(tile, groupArea);
        });

        this.canvas.groups.set(groupId, groupArea);
        this.canvas.canvas.appendChild(groupArea.element);
        this.canvas.saveData();

        return groupArea;
    }

    calculateGroupSizeForTiles(tiles) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        tiles.forEach(tile => {
            minX = Math.min(minX, tile.position.x);
            minY = Math.min(minY, tile.position.y);
            maxX = Math.max(maxX, tile.position.x + this.canvas.gridSize);
            maxY = Math.max(maxY, tile.position.y + this.canvas.gridSize);
        });

        return {
            width: Math.max(maxX - minX + 40, this.canvas.gridSize * 3),
            height: Math.max(maxY - minY + 70, this.canvas.gridSize * 2)
        };
    }
}
  