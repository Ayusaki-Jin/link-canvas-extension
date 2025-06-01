class ColorManager {
    constructor() {
        this.colors = [
            { hex: '#007acc', name: 'blue' },
            { hex: '#28a745', name: 'green' },
            { hex: '#dc3545', name: 'red' },
            { hex: '#fd7e14', name: 'orange' },
            { hex: '#6f42c1', name: 'purple' },
            { hex: '#20c997', name: 'teal' },
            { hex: '#e83e8c', name: 'pink' },
            { hex: '#ffc107', name: 'yellow' },
            { hex: '#6c757d', name: 'gray' }
        ];
        this.currentIndex = 0;
        this.usedColors = new Set();
    }

    getNextColor() {
        const color = this.colors[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.colors.length;
        this.usedColors.add(color.hex);
        console.log('[INFO] Color assigned:', color.hex);
        return color;
    }

    getAllColors() {
        return this.colors.map(c => c.hex);
    }

    getColorByName(name) {
        return this.colors.find(c => c.name === name);
    }

    releaseColor(colorHex) {
        this.usedColors.delete(colorHex);
    }

    reset() {
        this.usedColors.clear();
        this.currentIndex = 0;
    }
}
