class ColorManager {
    constructor() {
        this.colors = [
            '#007acc', // Blue
            '#28a745', // Green
            '#dc3545', // Red
            '#fd7e14', // Orange
            '#6f42c1', // Purple
            '#20c997', // Teal
            '#e83e8c', // Pink
            '#ffc107', // Yellow
            '#6c757d'  // Gray
        ];
        this.usedColors = new Set();
        this.currentIndex = 0;
    }

    getNextColor() {
        // まず未使用の色から選択
        for (let i = 0; i < this.colors.length; i++) {
            const color = this.colors[(this.currentIndex + i) % this.colors.length];
            if (!this.usedColors.has(color)) {
                this.usedColors.add(color);
                this.currentIndex = (this.currentIndex + i + 1) % this.colors.length;
                console.log('[INFO] Color assigned:', color);
                return color;
            }
        }

        // すべて使用済みの場合は順番に再利用
        const color = this.colors[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.colors.length;
        console.log('[INFO] Color reused:', color);
        return color;
    }

    releaseColor(color) {
        this.usedColors.delete(color);
        console.log('[INFO] Color released:', color);
    }

    getColorName(color) {
        const colorNames = {
            '#007acc': 'ブルー',
            '#28a745': 'グリーン',
            '#dc3545': 'レッド',
            '#fd7e14': 'オレンジ',
            '#6f42c1': 'パープル',
            '#20c997': 'ティール',
            '#e83e8c': 'ピンク',
            '#ffc107': 'イエロー',
            '#6c757d': 'グレー'
        };
        return colorNames[color] || 'Unknown';
    }

    getAllColors() {
        return [...this.colors];
    }

    isValidColor(color) {
        return this.colors.includes(color);
    }

    getRandomColor() {
        const randomIndex = Math.floor(Math.random() * this.colors.length);
        return this.colors[randomIndex];
    }

    // 使用状況をリセット
    reset() {
        this.usedColors.clear();
        this.currentIndex = 0;
        console.log('[INFO] ColorManager reset');
    }

    // 使用中の色を復元（データロード時）
    restoreUsedColors(usedColorArray) {
        this.usedColors.clear();
        usedColorArray.forEach(color => {
            if (this.isValidColor(color)) {
                this.usedColors.add(color);
            }
        });
        console.log('[INFO] Used colors restored:', this.usedColors.size);
    }
}
  