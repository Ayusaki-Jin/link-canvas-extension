class NameGenerator {
    constructor() {
        this.groupCounter = 1;
        this.usedNames = new Set();
    }

    generateGroupName() {
        let name;
        do {
            name = `グループ ${this.groupCounter}`;
            this.groupCounter++;
        } while (this.usedNames.has(name));

        this.usedNames.add(name);
        console.log('[INFO] Group name generated:', name);
        return name;
    }

    releaseName(name) {
        this.usedNames.delete(name);
    }

    reset() {
        this.usedNames.clear();
        this.groupCounter = 1;
    }
}
