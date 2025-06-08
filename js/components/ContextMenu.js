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
                case 'delete-all':
                    item.textContent = 'タイル削除';
                    item.style.display = 'block';
                    break;
                case 'open-all':
                    item.textContent = '新規タブで開く';
                    item.style.display = 'block';
                            break;
            }
        });
    }

    // updateMenuForGroupメソッドを以下に置換：

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

        // 色変更メニューを動的追加
        const colorItem = document.createElement('div');
        colorItem.className = 'context-item';
        colorItem.dataset.action = 'change-color';
        colorItem.textContent = '色変更';
        colorItem.style.borderTop = '1px solid #eee';
        this.menu.appendChild(colorItem);
    }

    // executeActionメソッドに色変更処理を追加：

    // 203行目付近の重複executeActionメソッドを削除し、83行目のexecuteActionを以下に置換：

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
            case 'change-color':
                this.handleColorChange();
                break;
        }
    }


    // 新しいメソッド：色変更処理
    handleColorChange() {
        if (this.currentTargetType !== 'group') return;

        const groupArea = this.currentTarget;
        this.showColorPicker(groupArea);
    }

    // カラーピッカー表示
    showColorPicker(groupArea) {
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker-dialog';
        colorPicker.innerHTML = `
        <div class="color-picker-overlay">
            <div class="color-picker-content">
                <h3>グループの色を選択</h3>
                <div class="color-palette" id="color-palette"></div>
                <button class="cancel-color-btn" id="cancel-color">キャンセル</button>
            </div>
        </div>
    `;

        // スタイル設定
        const style = document.createElement('style');
        style.textContent = `
        .color-picker-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            background: rgba(0,0,0,0.5);
        }
        
        .color-picker-overlay {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .color-picker-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            min-width: 300px;
        }
        
        .color-picker-content h3 {
            margin: 0 0 20px 0;
            color: #333;
            font-size: 16px;
        }
        
        .color-palette {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .color-option {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        
        .color-option:hover {
            transform: scale(1.1);
            border-color: #333;
        }
        
        .color-option.current {
            border-color: #000;
            box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
        }
        
        .cancel-color-btn {
            padding: 8px 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            color: #666;
        }
    `;
        document.head.appendChild(style);

        // カラーパレット作成
        const palette = colorPicker.querySelector('#color-palette');
        const colors = [
            { hex: '#007acc', name: 'ブルー' },
            { hex: '#28a745', name: 'グリーン' },
            { hex: '#dc3545', name: 'レッド' },
            { hex: '#fd7e14', name: 'オレンジ' },
            { hex: '#6f42c1', name: 'パープル' },
            { hex: '#20c997', name: 'ティール' },
            { hex: '#e83e8c', name: 'ピンク' },
            { hex: '#ffc107', name: 'イエロー' },
            { hex: '#6c757d', name: 'グレー' }
        ];

        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color.hex;
            colorOption.textContent = color.name;

            // 現在の色にマーク
            if (color.hex === groupArea.color) {
                colorOption.classList.add('current');
            }

            colorOption.addEventListener('click', () => {
                this.changeGroupColor(groupArea, color);
                document.body.removeChild(colorPicker);
            });

            palette.appendChild(colorOption);
        });

        // キャンセルボタン
        colorPicker.querySelector('#cancel-color').addEventListener('click', () => {
            document.body.removeChild(colorPicker);
        });

        // 背景クリックで閉じる
        colorPicker.addEventListener('click', (e) => {
            if (e.target.className === 'color-picker-overlay') {
                document.body.removeChild(colorPicker);
            }
        });

        document.body.appendChild(colorPicker);
    }

    // グループ色変更実行
    // changeGroupColorメソッドを以下に置換：

    // changeGroupColorメソッドを以下に置換：

    changeGroupColor(groupArea, colorData) {
        try {
            // Undo状態保存
            if (window.saveUndoState) {
                window.saveUndoState();
            }

            console.log('[DEBUG] Changing group color from', groupArea.color, 'to', colorData.hex);

            // 【重要】DOM要素を強制的に再描画
            const element = groupArea.element;
            const header = groupArea.header;

            // 古い色クラスを削除
            const oldColorName = this.getColorNameFromHex(groupArea.color);
            element.classList.remove(`group-color-${oldColorName}`);

            // 新しい色データを設定
            groupArea.color = colorData.hex;
            groupArea.colorName = colorData.name.toLowerCase();

            // 【強制】既存のスタイルをクリア
            element.style.borderColor = '';
            if (header) {
                header.style.backgroundColor = '';
                header.style.color = '';
            }

            // 【強制】新しいスタイルを直接適用
            setTimeout(() => {
                element.style.borderColor = colorData.hex;
                element.style.setProperty('border-color', colorData.hex, 'important');

                if (header) {
                    header.style.backgroundColor = colorData.hex;
                    header.style.setProperty('background-color', colorData.hex, 'important');

                    // 文字色の調整
                    if (colorData.hex === '#ffc107') {
                        header.style.setProperty('color', '#333', 'important');
                    } else {
                        header.style.setProperty('color', 'white', 'important');
                    }
                }

                // 新しい色クラスを追加
                const newColorClass = `group-color-${groupArea.colorName}`;
                element.classList.add(newColorClass);

                // 【重要】DOM要素を強制再描画
                element.style.display = 'none';
                element.offsetHeight; // リフロー強制実行
                element.style.display = '';

                console.log('[DEBUG] Styles applied successfully');
            }, 10);

            // データ保存
            this.canvas.saveData();

            showSuccessMessage(`グループの色を${colorData.name}に変更しました`);
            console.log('[INFO] Group color changed successfully:', groupArea.id, '→', colorData.name);

        } catch (error) {
            console.log('[ERROR] Failed to change group color:', error);
            showErrorMessage('色変更に失敗しました');
        }
    }



    // ヘックス値から色名を取得
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

    // hideメソッドを以下に置換：

    hide() {
        // 動的に追加された色変更メニューをクリーンアップ
        const colorItems = this.menu.querySelectorAll('[data-action="change-color"]');
        colorItems.forEach(item => {
            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
        });

        this.menu.classList.add('hidden');
        this.currentTarget = null;
        this.currentTargetType = null;
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
