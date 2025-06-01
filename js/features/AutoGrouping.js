class AutoGrouping {
    constructor(linkCanvas) {
        this.canvas = linkCanvas;
        this.HOVER_DELAY = 800;
        this.hoverTimer = null;
        this.hoverIndicator = null;
        this.currentHoverPair = null; // 追加：現在のホバー対象を記録

        this.init();
    }

    init() {
        console.log('[INIT] AutoGrouping initialized');
        this.createHoverIndicator();
    }

    startHoverTimer(draggedTile, targetTile) {
        // 新しい判定：同じタイル組み合わせなら継続
        const newPairKey = `${draggedTile.id}-${targetTile.id}`;

        if (this.currentHoverPair === newPairKey && this.hoverTimer) {
            // 同じ組み合わせで既にタイマー動作中なら何もしない
            console.log('[DEBUG] Same pair hover - continuing timer');
            return;
        }

        // 異なる組み合わせまたは初回の場合のみクリア
        this.clearHoverTimer();
        this.currentHoverPair = newPairKey;

        console.log('[SCAN] Starting NEW hover timer for tiles:', draggedTile.id, 'over', targetTile.id);

        // ホバー視覚フィードバック開始
        this.showHoverProgress(targetTile);

        this.hoverTimer = setTimeout(() => {
            console.log('[INFO] Hover timer COMPLETED - creating group');
            this.createAutoGroup(draggedTile, targetTile);
        }, this.HOVER_DELAY);
    }

    clearHoverTimer() {
        if (this.hoverTimer) {
            console.log('[INFO] Hover timer cleared');
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
            this.currentHoverPair = null; // 追加：ペア記録もクリア
            this.hideHoverProgress();
        }
    }

    createAutoGroup(tile1, tile2) {
        console.log('[INFO] Creating auto-group - START');
        console.log('[DEBUG] Tile1:', tile1.id, 'groupId:', tile1.groupId);
        console.log('[DEBUG] Tile2:', tile2.id, 'groupId:', tile2.groupId);

        // 安全チェック
        if (!tile1 || !tile2 || tile1.id === tile2.id) {
            console.log('[ERROR] Invalid tiles for grouping');
            return null;
        }

        if (tile1.groupId || tile2.groupId) {
            console.log('[ERROR] One tile already in group');
            return null;
        }

        try {
            // グループ設定
            console.log('[DEBUG] Getting color and name');
            const colorData = this.canvas.colorManager.getNextColor();
            const name = this.canvas.nameGenerator.generateGroupName();
            const groupId = this.generateGroupId();

            console.log('[DEBUG] Color:', colorData, 'Name:', name, 'ID:', groupId);

            // 位置計算
            const position = {
                x: Math.min(tile1.position.x, tile2.position.x),
                y: Math.min(tile1.position.y, tile2.position.y)
            };

            // グリッドにスナップ
            const snappedPosition = this.canvas.snapToGrid(position.x, position.y);
            console.log('[DEBUG] Group position:', snappedPosition);

            // グループエリア作成
            console.log('[DEBUG] Creating GroupArea');
            const groupArea = new GroupArea(groupId, colorData, name, snappedPosition, { width: 120, height: 100 });

            // タイルをキャンバスから削除
            console.log('[DEBUG] Removing tiles from canvas');
            if (tile1.element.parentNode) {
                tile1.element.parentNode.removeChild(tile1.element);
                console.log('[DEBUG] Tile1 removed from DOM');
            }
            if (tile2.element.parentNode) {
                tile2.element.parentNode.removeChild(tile2.element);
                console.log('[DEBUG] Tile2 removed from DOM');
            }

            // タイルをグループに追加
            console.log('[DEBUG] Adding tiles to group');
            groupArea.addTile(tile1);
            groupArea.addTile(tile2);

            // グループサイズ調整
            console.log('[DEBUG] Auto-resizing group');
            groupArea.autoResize();

            // キャンバスに登録
            console.log('[DEBUG] Registering group to canvas');
            this.canvas.groups.set(groupId, groupArea);
            this.canvas.canvas.appendChild(groupArea.element);

            // アニメーション
            groupArea.element.classList.add('group-forming');
            setTimeout(() => {
                groupArea.element.classList.remove('group-forming');
            }, 500);

            // データ保存
            this.canvas.saveData();

            console.log('[INFO] Auto-group created successfully:', groupId);

            // タイマー状態クリア
            this.clearHoverTimer();

            return groupArea;

        } catch (error) {
            console.log('[ERROR] Failed to create group:', error);
            console.log('[ERROR] Stack trace:', error.stack);
            return null;
        }
    }

    showHoverProgress(targetTile) {
        if (!this.hoverIndicator) {
            console.log('[ERROR] Hover indicator not found');
            return;
        }

        const rect = targetTile.element.getBoundingClientRect();

        this.hoverIndicator.style.left = (rect.left - 5) + 'px';
        this.hoverIndicator.style.top = (rect.top - 5) + 'px';
        this.hoverIndicator.style.width = (rect.width + 10) + 'px';
        this.hoverIndicator.style.height = (rect.height + 10) + 'px';
        this.hoverIndicator.style.display = 'block';

        // プログレスアニメーション開始
        this.hoverIndicator.classList.add('hover-indicator');
        console.log('[DEBUG] Hover progress animation started');
    }

    hideHoverProgress() {
        if (this.hoverIndicator) {
            this.hoverIndicator.style.display = 'none';
            this.hoverIndicator.classList.remove('hover-indicator');
            console.log('[DEBUG] Hover progress animation stopped');
        }
    }

    createHoverIndicator() {
        this.hoverIndicator = document.createElement('div');
        this.hoverIndicator.id = 'hover-indicator';
        this.hoverIndicator.style.position = 'fixed';
        this.hoverIndicator.style.border = '3px solid #007acc';
        this.hoverIndicator.style.borderRadius = '8px';
        this.hoverIndicator.style.background = 'rgba(0, 122, 204, 0.1)';
        this.hoverIndicator.style.pointerEvents = 'none';
        this.hoverIndicator.style.display = 'none';
        this.hoverIndicator.style.zIndex = '999';

        document.body.appendChild(this.hoverIndicator);
        console.log('[DEBUG] Hover indicator created');
    }

    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
