export class CompWordsIterator {
    private cword: number;
    compWords: string[];
    currentWordIndex: number;

    constructor(compWords: string[], compCword: number) {
        this.compWords = compWords;

        if (this.compWords.length === 0 || Number.isNaN(compCword)) this.cword = -1;
        else this.cword = compCword;
        this.currentWordIndex = 0;
    }
    word() {
        return this.compWords[this.currentWordIndex];
    }
    wordsLeft() {
        return this.cword - this.currentWordIndex;
    }
    valid() {
        return this.wordsLeft() > 0;
    }
    next() {
        this.currentWordIndex += 1;
        return this;
    }
    previous() {
        this.currentWordIndex -= 1;
        return this;
    }
    cursor() {
        this.currentWordIndex = this.cword
        return this;
    }
}
