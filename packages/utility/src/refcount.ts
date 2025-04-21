export class RefCountHandler {
    constructor(private onNonZero: () => void, private onZero: () => void) {}

    private count = 0;

    ref() {
        if (++this.count === 1) {
            this.onNonZero();
        }
    }

    unref() {
        if (--this.count === 0) {
            this.onZero();
        }
    }
}
