// TODO: Drag words off puzzle
// TODO: Mobile optimization
// TODO: Puzzles
// TODO: Persistance
// TODO: Reset buton
// TODO: Solved state
const CellTypes = {
    BLOCKED: -1,
    EMPTY: 0,
    INITIAL: 1,
    PLACED: 2,
};
const CellStates = {
    ...CellTypes,
    INVALID: 3,
}
const WordStates = {
    INVALID: -1,
    NOT_PLACED: 0,
    VALID: 1,
    DUPLICATED: 2,
};
let validWords = new Set();
(async () => {
    const response = await fetch('wordlist.txt');
    const text = await response.text();
    validWords = new Set(text.split(/\r?\n/));
})();
document.addEventListener('alpine:init', () => {
    Alpine.data('crossout', () => ({
        test: 'test',
        wordList: {
            "DEAF": {state: WordStates.NOT_PLACED},
            "DING": {state: WordStates.NOT_PLACED},
            "EN": {state: WordStates.NOT_PLACED},
            "FLAG": {state: WordStates.NOT_PLACED},
            "GY": {state: WordStates.NOT_PLACED},
            "GROG": {state: WordStates.NOT_PLACED},
            "GROSS": {state: WordStates.NOT_PLACED},
            "GONG": {state: WordStates.NOT_PLACED},
        },
        solvedWords: [],
        initialLetters: {
            13: 'E',
            36: 'F',
            54: 'G',
            63: 'G',
        },
        placedLetters: {},
        cells: [],
        async init(){
            this.updateCells();
        },
        drag: '',
        dragX: 0,
        dragY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragRotation: false,
        startDrag(word, e){
            this.dragRotation = false;
            const rect = e.target.getBoundingClientRect();
            if(e.touches){
                e = e.touches[0];
            }
            this.dragOffsetX = e.clientX - rect.x;
            this.dragOffsetY = e.clientY - rect.y;
            this.dragX = e.pageX;
            this.dragY = e.pageY;
            this.drag = word;
        },
        handleDragOver(e){
            if(e.touches){
                e = e.touches[0];
            }
            this.dragX = e.pageX;
            this.dragY = e.pageY;
        },
        endDrag(e){
            const draggedword = this.drag;
            this.drag = '';
            // Need to find real target based on x,y because of ghost
            const target = document.elementsFromPoint(this.dragX, this.dragY).find(el => el.classList.contains('drop-cell'));
            if(!target){
                return;
            }
            const index = Array.prototype.indexOf.call(target.parentNode.childNodes, target) - 2; // One for template, one for 0-index
            const letterIndexes = this.getLetterIndexes(draggedword, index, this.dragRotation);
            // TODO: visually indicate why
            if(!letterIndexes){
                return false;
            }
            // Validate placement
            let attached = false;
            for(const {index, letter} of letterIndexes){
                if(this.initialLetters.hasOwnProperty(index)){
                    if(this.initialLetters[index] != letter){
                        console.log("ignoring word placement because mismatched initial letter");
                        return false;
                    } else {
                        attached = true;
                    }
                }
                if(this.placedLetters.hasOwnProperty(index) && this.placedLetters[index] != ''){
                    if(this.placedLetters[index] != letter){
                        console.log("ignoring word placement because mismatched placed letter");
                        return false;
                    } else {
                        attached = true;
                    }
                }
            }

            if(!attached){
                // Disabling for now
                // If we enable this, we need to check neighboring tiles of all letters
                console.log("could ignore word placement because not attached");
                // return false;
            }
            for(const {index, letter} of letterIndexes){
                this.placedLetters[index] = letter;
            }
            this.updateCells();
        },
        handleDropEvent(e){
        },
        handleKeyPress(e){
            if(!this.drag.length){
                return;
            }
            if(e.key != 'r'){
                return;
            }
            e.preventDefault();
            this.dragRotation = !this.dragRotation;
        },
        getLetterIndexes(word, index, rotated = false){
            if(!rotated && (index%10)+word.length-1 > 10){
                return false;
            }
            if(rotated && index + ((word.length-1)*10) > 100){
                return false;
            }
            return word.split('').map((letter, i) => {
                const placeIndex = ((rotated ? 10 : 1) * i) + index;
                return {
                    letter,
                    index: placeIndex,
                };
            });
        },
        removeWord(){
            // TODO
        },
        clearCell(index){
            this.placedLetters[index] = '';
            this.updateCells();
        },
        updateCells(){
            this.cells = this.getCells();
            this.validateGridWords();
        },
        checkSolvedWords(){
            this.solvedWords = [];
            const rows = Alpine.raw(this.cells).reduce((res, cell, i) => {
                const rowIndex = Math.floor(i/10);
                if(!res[rowIndex]){
                    res[rowIndex] = '';
                }
                res[rowIndex] += cell.value;
                return res;
            }, []);
            const cols = Alpine.raw(this.cells).reduce((res, cell, i) => {
                const rowIndex = Math.floor(i%10);
                if(!res[rowIndex]){
                    res[rowIndex] = '';
                }
                res[rowIndex] += cell.value;
                return res;
            }, []);
            for(const word in this.wordList){
                const foundCount = rows.filter(row => row.includes(word)).length+cols.filter(col => col.includes(word)).length;
                if(foundCount == 0){
                    this.wordList[word].state = WordStates.NOT_PLACED;
                    continue;
                }
                if(foundCount == 1){
                    this.wordList[word].state = WordStates.VALID;
                    continue;
                }
                this.wordList[word].state = WordStates.DUPLICATED;
            }
        },
        validateGridWords(){
            const rawCells = Alpine.raw(this.cells);
            const gridWordList = [];
            this.solvedWords = [];
            this.invalidWords = [];
            const getVerticalIndex = i => {
                if(i < 10){
                    return i*10;
                }
                if(i < 100){
                    const iStr = i.toString();
                    return parseInt(iStr[1]+iStr[0])
                }
                return i;
            }
            let hWord = '';
            let vWord = '';
            rawCells.forEach((cell, i) => {
                const newRow = i%10 == 0;
                const vCell = rawCells[getVerticalIndex(i)];
                if(newRow || cell.value == ''){
                    if(hWord.length > 1){
                        gridWordList.push(hWord);
                        if(!validWords.has(hWord)){
                            // Mark cells invalid
                            hWord.split('').forEach((letter, ii) => {
                                this.cells[i-ii-1].valid = false;
                            });
                        }
                    }
                    hWord = '';
                }
                if(cell.value != ''){
                    hWord += cell.value;
                }
                if(newRow || vCell.value == ''){
                    if(vWord.length > 1){
                        gridWordList.push(vWord);
                        if(!validWords.has(vWord)){
                            // Mark cells invalid
                            vWord.split('').forEach((letter, ii) => {
                                this.cells[getVerticalIndex(i-1)-(ii)*10].valid = false;
                            });
                        }
                    }
                    vWord = '';
                }
                if(vCell.value != ''){
                    vWord += vCell.value;
                }
            });
            console.log(gridWordList);
            gridWordList.forEach(word => {
                if(!this.wordList.hasOwnProperty(word) || this.wordList[word].state == WordStates.DUPLICATED){
                    return;
                }
                if(this.wordList[word].state == WordStates.VALID){
                    this.wordList[word].state = WordStates.DUPLICATED;
                    return;
                }
                if(this.wordList[word].state == WordStates.NOT_PLACED){
                    this.wordList[word].state = WordStates.VALID;
                    return;
                }
            });
            for(const word in this.wordList){
                const foundCount = gridWordList.filter(row => row.includes(word)).length;
                if(foundCount == 0){
                    this.wordList[word].state = WordStates.NOT_PLACED;
                    continue;
                }
                if(foundCount == 1){
                    this.wordList[word].state = WordStates.VALID;
                    continue;
                }
                this.wordList[word].state = WordStates.DUPLICATED;
            }
            console.log(Alpine.raw(this.invalidWords));
        },
        getCells(){
            return new Array(100)
                .fill({value: '', type: CellTypes.EMPTY, valid: true})
                .map((cell, i) => {
                    if(this.initialLetters.hasOwnProperty(i)){
                        return {
                            key: i,
                            value: this.initialLetters[i],
                            type: CellTypes.INITIAL,
                            valid: true,
                        }
                    }
                    if(this.placedLetters.hasOwnProperty(i) && this.placedLetters[i] != ''){
                        return {
                            key: i,
                            value: this.placedLetters[i],
                            type: CellTypes.PLACED,
                            valid: true,
                        }
                    }
                    return {
                        key: i,
                        value: '',
                        type: CellTypes.EMPTY,
                        valid: true,
                    };
                });
        },
    }));
});