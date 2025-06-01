class AutoGrouping {
    constructor(linkCanvas) {
        this.canvas = linkCanvas;
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
        }
    }

    createAutoGroup(tile1, tile2) {
        console.log('[INFO] Creating auto-group');

        // 安全チェック
        if (!tile1 || !tile2 || tile1.id === tile2.id) {
            return null;
        }

        if (tile1.groupId || tile2.groupId) {
            console.log('[INFO] One tile already in group, skipping');
            return null;
        }

        // グループ設定
        const colorData = this.canvas.colorManager.getNextColor();
        const name = this.canvas.nameGenerator.generateGroupName();
        const groupId = this.generateGroupId();

        // グリッド位置計算
        const position = {
            x: Math.min(tile1.position.x, tile2.position.x),
            y: Math.min(tile1.position.y, tile2.position.y)
        };

        // グリッドに合わせてスナップ
        const snappedPosition = this.canvas.snapToGrid(position.x, position.y);

        // グループサイズ計算
        const size = { width: 120, height: 100 };

        console.log('[INFO] Creating group at position:', snappedPosition);

        try {
            // グループエリア作成
            const groupArea = new GroupArea(groupId, colorData, name, snappedPosition, size);

            // タイルをキャンバスから削除
            if (tile1.element.parentNode) {
                tile1.element.parentNode.removeChild(tile1.element);
            }
            if (tile2.element.parentNode) {
                tile2.element.parentNode.removeChild(tile2.element);
            }

            // タイルをグループに追加
            groupArea.addTile(tile1);
            groupArea.addTile(tile2);

            // グループサイズ調整
            groupArea.autoResize();

            // キャンバスに登録
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
            return groupArea;

        } catch (error) {
            console.log('[ERROR] Failed to create group:', error);
            return null;
        }
    }

    showHoverProgress(targetTile) {
        if (!this.hoverIndicator) return;

        const rect = targetTile.element.getBoundingClientRect();

        this.hoverIndicator.style.left = (rect.left - 5) + 'px';
        this.hoverIndicator.style.top = (rect.top - 5) + 'px';
        this.hoverIndicator.style.width = (rect.width + 10) + 'px';
        this.hoverIndicator.style.height = (rect.height + 10) + 'px';
        this.hoverIndicator.style.display = 'block';

        // プログレスアニメーション開始
        this.hoverIndicator.classList.add('hover-indicator');
    }

    hideHoverProgress() {
        if (this.hoverIndicator) {
            this.hoverIndicator.style.display = 'none';
            this.hoverIndicator.classList.remove('hover-indicator');
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
    }

    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
