class ContextMenu {
    constructor(linkCanvas) {
        this.canvas = linkCanvas;
        this.menu = document.getElementById('context-menu');
        this.currentTarget = null;
        this.currentTargetType = null;

        this.init();
    }

    init() {
        console.log('[INIT] ContextMenu initialized');
        this.setupEventListeners();
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

    showForTile(e, tile) {
        e.preventDefault();
        this.currentTarget = tile;
        this.currentTargetType = 'tile';
        this.updateMenuForTile();
        this.showAt(e.clientX, e.clientY);
        console.log('[INFO] Context menu shown for tile:', tile.id);
    }

    showForGroup(e, groupArea) {
        e.preventDefault();
        this.currentTarget = groupArea;
        this.currentTargetType = 'group';
        this.updateMenuForGroup();
        this.showAt(e.clientX, e.clientY);
        console.log('[INFO] Context menu shown for group:', groupArea.id);
    }

    updateMenuForTile() {
        const items = this.menu.querySelectorAll('.context-item');
        items.forEach(item => {
            const action = item.dataset.action;
            switch (action) {
                case 'rename':
                    item.textContent = '名前変更';
                    item.style.display = 'block';
                    break;
                case 'ungroup':
                    item.style.display = 'none';
                    break;
                case 'open-all':
                    item.style.display = 'none';
                    break;
                case 'delete-all':
                    item.textContent = 'タイル削除';
                    item.style.display = 'block';
                    break;
            }
        });
    }

    updateMenuForGroup() {
        const items = this.menu.querySelectorAll('.context-item');
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
            const newTitle = prompt('新しいタイトル:', this.currentTarget.title);
            if (newTitle && newTitle.trim()) {
                this.currentTarget.title = newTitle.trim();
                const titleElement = this.currentTarget.element.querySelector('.title');
                if (titleElement) {
                    titleElement.textContent = this.currentTarget.title;
                }
                this.canvas.saveData();
            }
        } else if (this.currentTargetType === 'group') {
            const newName = prompt('新しいグループ名:', this.currentTarget.name);
            if (newName && newName.trim()) {
                this.currentTarget.setName(newName.trim());
                this.canvas.saveData();
            }
        }
    }

    handleUngroup() {
        if (this.currentTargetType === 'group') {
            this.currentTarget.disbandGroup();
        }
    }

    handleOpenAll() {
        let urls = [];

        if (this.currentTargetType === 'tile') {
            urls = [this.currentTarget.url];
        } else if (this.currentTargetType === 'group') {
            urls = this.currentTarget.tiles.map(tile => tile.url);
        }

        urls.slice(0, 10).forEach(url => {
            window.open(url, '_blank');
        });

        if (urls.length > 10) {
            alert(`${urls.length}個のリンクがありますが、最初の10個のみ開きました。`);
        }
    }

    handleDeleteAll() {
        if (this.currentTargetType === 'tile') {
            // タイル削除：確認ダイアログなしで即座削除
            this.deleteTile(this.currentTarget);
            console.log('[INFO] Tile deleted instantly:', this.currentTarget.id);
        } else if (this.currentTargetType === 'group') {
            // グループ削除：確認ダイアログあり
            const confirmMessage = `グループ「${this.currentTarget.name}」をすべて削除しますか？`;
            if (confirm(confirmMessage)) {
                this.deleteGroup(this.currentTarget);
            }
        }
    }

    // deleteTileメソッドを修正：

    deleteTile(tile) {
        // 削除前の状態を保存
        if (window.saveUndoState) {
            window.saveUndoState();
        }

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

        tile.element.remove();
        this.canvas.tiles.delete(tile.id);
        this.canvas.saveData();
    }


    deleteGroup(groupArea) {
        groupArea.tiles.forEach(tile => {
            tile.element.remove();
            this.canvas.tiles.delete(tile.id);
        });

        groupArea.element.remove();
        this.canvas.groups.delete(groupArea.id);
        this.canvas.saveData();
    }
}
