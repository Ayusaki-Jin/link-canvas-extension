class ContextMenu {
    constructor(linkCanvas) {
        this.canvas = linkCanvas;
        this.menu = document.getElementById('context-menu');
        this.currentTarget = null;
        this.currentTargetType = null; // 'tile' or 'group'

        this.init();
    }

    init() {
        console.log('[INIT] ContextMenu initialized');
        if (!this.menu.parentNode) {
            document.body.appendChild(this.menu);
        }
        this.setupEventListeners();
        this.createMenuItems();
    }

    setupEventListeners() {
        // メニュー外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // メニュー項目クリック
        this.menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.executeAction(action);
                this.hide();
            }
        });

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    createMenuItems() {
        // 基本メニュー項目は既にHTMLに定義済み
        // 動的メニュー項目があればここで追加
    }

    showForTile(e, tile) {
        e.preventDefault();
        this.currentTarget = tile;
        this.currentTargetType = 'tile';

        // タイル用メニュー項目を設定
        this.updateMenuForTile();
        this.showAt(e.clientX, e.clientY);

        console.log('[INFO] Context menu shown for tile:', tile.id);
    }

    showForGroup(e, groupArea) {
        e.preventDefault();
        this.currentTarget = groupArea;
        this.currentTargetType = 'group';

        // グループ用メニュー項目を設定
        this.updateMenuForGroup();
        this.showAt(e.clientX, e.clientY);

        console.log('[INFO] Context menu shown for group:', groupArea.id);
    }

    updateMenuForTile() {
        const items = this.menu.querySelectorAll('.context-item');

        // タイル用メニュー設定
        items.forEach(item => {
            const action = item.dataset.action;
            switch (action) {
                case 'rename':
                    item.textContent = 'タイトル編集';
                    item.style.display = 'block';
                    break;
                case 'ungroup':
                    if (this.currentTarget.groupId) {
                        item.textContent = 'グループから除外';
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                    break;
                case 'open-all':
                    item.style.display = 'none';
                    break;
                case 'delete-all':
                    item.textContent = '削除';
                    item.style.display = 'block';
                    break;
            }
        });
    }

    updateMenuForGroup() {
        const items = this.menu.querySelectorAll('.context-item');

        // グループ用メニュー設定
        items.forEach(item => {
            const action = item.dataset.action;
            switch (action) {
                case 'rename':
                    item.textContent = 'グループ名変更';
                    item.style.display = 'block';
                    break;
                case 'ungroup':
                    item.textContent = 'グループ化解除';
                    item.style.display = 'block';
                    break;
                case 'open-all':
                    item.textContent = 'すべて開く';
                    item.style.display = 'block';
                    break;
                case 'delete-all':
                    item.textContent = 'グループごと削除';
                    item.style.display = 'block';
                    break;
            }
        });
    }

    showAt(x, y) {
        this.menu.style.left = x + 'px';
        this.menu.style.top = y + 'px';
        this.menu.classList.remove('hidden');

        // 画面外にはみ出さないよう調整
        this.adjustPosition();
    }

    adjustPosition() {
        const rect = this.menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            this.menu.style.left = (viewportWidth - rect.width - 10) + 'px';
        }

        if (rect.bottom > viewportHeight) {
            this.menu.style.top = (viewportHeight - rect.height - 10) + 'px';
        }
    }

    hide() {
        this.menu.classList.add('hidden');
        this.currentTarget = null;
        this.currentTargetType = null;
    }

    executeAction(action) {
        if (!this.currentTarget) return;

        console.log('[INFO] Executing action:', action, 'on', this.currentTargetType);

        switch (action) {
            case 'rename':
                this.handleRename();
                break;
            case 'ungroup':
                this.handleUngroup();
                break;
            case 'open-all':
                this.handleOpenAll();
                break;
            case 'delete-all':
                this.handleDeleteAll();
                break;
        }
    }

    handleRename() {
        if (this.currentTargetType === 'tile') {
            this.renameTile(this.currentTarget);
        } else if (this.currentTargetType === 'group') {
            this.renameGroup(this.currentTarget);
        }
    }

    renameTile(tile) {
        const newTitle = prompt('新しいタイトルを入力:', tile.title);
        if (newTitle && newTitle.trim()) {
            tile.title = newTitle.trim();
            const titleElement = tile.element.querySelector('.title');
            if (titleElement) {
                titleElement.textContent = tile.title;
            }
            this.canvas.saveData();
            console.log('[INFO] Tile renamed:', tile.id, '→', tile.title);
        }
    }

    renameGroup(groupArea) {
        const newName = prompt('新しいグループ名を入力:', groupArea.name);
        if (newName !== null) {
            groupArea.setName(newName.trim());
            this.canvas.saveData();
            console.log('[INFO] Group renamed:', groupArea.id, '→', groupArea.name);
        }
    }

    handleUngroup() {
        if (this.currentTargetType === 'tile' && this.currentTarget.groupId) {
            this.ungroupSingleTile(this.currentTarget);
        } else if (this.currentTargetType === 'group') {
            this.canvas.autoGrouping.ungroupTiles(this.currentTarget);
        }
    }

    ungroupSingleTile(tile) {
        const groupArea = this.canvas.groups.get(tile.groupId);
        if (!groupArea) return;

        // タイルをグループから除外
        groupArea.removeTile(tile);

        // 絶対位置に変換
        const absolutePosition = {
            x: groupArea.position.x + tile.relativePosition.x,
            y: groupArea.position.y + tile.relativePosition.y
        };
        tile.position = this.canvas.snapToGrid(absolutePosition.x, absolutePosition.y);
        tile.groupId = null;

        // DOM要素をキャンバスに戻す
        this.canvas.canvas.appendChild(tile.element);
        tile.element.style.left = tile.position.x + 'px';
        tile.element.style.top = tile.position.y + 'px';

        delete tile.relativePosition;

        // グループが空になったら削除
        if (groupArea.tiles.length === 0) {
            groupArea.element.remove();
            this.canvas.groups.delete(groupArea.id);
        } else {
            groupArea.updateSize();
        }

        this.canvas.saveData();
        console.log('[INFO] Tile ungrouped from group:', tile.id);
    }

    handleOpenAll() {
        let urlsToOpen = [];

        if (this.currentTargetType === 'tile') {
            urlsToOpen = [this.currentTarget.url];
        } else if (this.currentTargetType === 'group') {
            urlsToOpen = this.currentTarget.tiles.map(tile => tile.url);
        }

        // 一括で開く（最大10個まで制限）
        urlsToOpen.slice(0, 10).forEach(url => {
            window.open(url, '_blank');
        });

        if (urlsToOpen.length > 10) {
            alert(`${urlsToOpen.length}個のリンクがありますが、最初の10個のみ開きました。`);
        }

        console.log('[INFO] Opened URLs:', urlsToOpen.length);
    }

    handleDeleteAll() {
        const confirmMessage = this.currentTargetType === 'group'
            ? `グループ「${this.currentTarget.name}」とその中のすべてのリンクを削除しますか？`
            : `リンク「${this.currentTarget.title}」を削除しますか？`;

        if (confirm(confirmMessage)) {
            if (this.currentTargetType === 'tile') {
                this.deleteTile(this.currentTarget);
            } else if (this.currentTargetType === 'group') {
                this.deleteGroup(this.currentTarget);
            }
        }
    }

    deleteTile(tile) {
        // グループ内タイルの場合
        if (tile.groupId) {
            const groupArea = this.canvas.groups.get(tile.groupId);
            if (groupArea) {
                groupArea.removeTile(tile);
                if (groupArea.tiles.length === 0) {
                    groupArea.element.remove();
                    this.canvas.groups.delete(groupArea.id);
                }
            }
        }

        // タイル削除
        tile.element.remove();
        this.canvas.tiles.delete(tile.id);
        this.canvas.saveData();

        console.log('[INFO] Tile deleted:', tile.id);
    }

    deleteGroup(groupArea) {
        // グループ内のすべてのタイルを削除
        groupArea.tiles.forEach(tile => {
            tile.element.remove();
            this.canvas.tiles.delete(tile.id);
        });

        // グループエリア削除
        groupArea.element.remove();
        this.canvas.groups.delete(groupArea.id);
        this.canvas.saveData();

        console.log('[INFO] Group deleted:', groupArea.id);
    }
}
  