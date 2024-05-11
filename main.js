// TODO: Mobile optimization
// TODO: Persistance
// TODO: Reset buton
// TODO: Solved state
// TODO: Seeded/generative puzzles
// TODO: Meme puzzles
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
let validWordList = new Set();
(async () => {
    const response = await fetch('wordlist.txt');
    const text = await response.text();
    validWordList = new Set(text.split(/\r?\n/));
})();
document.addEventListener('alpine:init', () => {
    Alpine.data('crossout', () => ({
        puzzles: {
            1: {
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
                initialLetters: {
                    13: 'E',
                    36: 'F',
                    54: 'G',
                    63: 'G',
                }
            },
            2: {
                wordList: {
                    "LAST": {state: WordStates.NOT_PLACED},
                    "LEST": {state: WordStates.NOT_PLACED},
                    "LIST": {state: WordStates.NOT_PLACED},
                    "LOST": {state: WordStates.NOT_PLACED},
                    "LUST": {state: WordStates.NOT_PLACED},
                    "GO": {state: WordStates.NOT_PLACED},
                    "TO": {state: WordStates.NOT_PLACED},
                    "BATTLE": {state: WordStates.NOT_PLACED},
                    "SOUR": {state: WordStates.NOT_PLACED},
                    "UNTO": {state: WordStates.NOT_PLACED},
                    "AGHAST": {state: WordStates.NOT_PLACED},
                    "ING": {state: WordStates.NOT_PLACED},
                    "LY": {state: WordStates.NOT_PLACED},
                    "YOU": {state: WordStates.NOT_PLACED},
                },
                initialLetters: {
                    37: 'T',
                    41: 'T',
                    63: 'T',
                    76: 'T',
                    85: 'T',
                }
            },
        },
        test: 'test',
        wordList: {},
        solvedWords: [],
        initialLetters: {},
        placedWords: [],
        cells: [],
        async init(){
            let params = Object.fromEntries(new URLSearchParams(location.search));
            const puzzle = this.puzzles.hasOwnProperty(params.puzzle) ? this.puzzles[params.puzzle] : this.puzzles[1];
            this.wordList = puzzle.wordList;
            this.initialLetters = puzzle.initialLetters;
            this.updateCells();
        },
        drag: '',
        dragX: 0,
        dragY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragRotation: false,
        startGridDrag(cell, e){
            if(e.type == 'mousedown' && e.which != 1){
                return;
            }
            if(!cell.words.length){
                return;
            }
            const wordObj = cell.words[0];
            // Set up drag
            const rect = document.querySelectorAll('.grid-cell')[wordObj.index].getBoundingClientRect();
            this.dragRotation = wordObj.rotated,
            this.dragOffsetX = 20;
            this.dragOffsetY = 20;
            this.dragX = e.pageX;
            this.dragY = e.pageY;
            this.drag = wordObj.word;
            this.removeWord(wordObj);
            this.updateCells();
        },
        startListDrag(word, e){
            this.dragRotation = false;
            // Check if this word is already placed and remove if so
            const placedWord = this.placedWords.find(wordObj => wordObj.word == word);
            if(placedWord){
                this.removeWord(placedWord);
            }
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
            if(!this.drag){
                return;
            }
            if(e.touches){
                e = e.touches[0];
            }
            this.dragX = e.pageX;
            this.dragY = e.pageY;
        },
        endDrag(e){
            if(!this.drag){
                return;
            }
            const draggedword = this.drag;
            this.drag = '';
            // Need to find real target based on x,y because of ghost
            const target = document.elementsFromPoint(this.dragX, this.dragY).find(el => el.classList.contains('grid-cell'));
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
            const placedLetters = this.getPlacedLetters();
            for(const {index, letter} of letterIndexes){
                if(this.initialLetters.hasOwnProperty(index)){
                    if(this.initialLetters[index] != letter){
                        console.log("ignoring word placement because mismatched initial letter");
                        return false;
                    } else {
                        attached = true;
                    }
                }
                if(placedLetters.hasOwnProperty(index)){
                    if(placedLetters[index].letter != letter){
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
            this.placedWords.push({
                index,
                word: draggedword,
                rotated: this.dragRotation,
            });
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
        removeWord(wordObj){
            this.placedWords = this.placedWords.filter(x => !(x.word == wordObj.word && x.index == wordObj.index && x.rotated == wordObj.rotated));
            console.log(this.placedWords);
        },
        clearCell(index){
            const cell = this.cells[index];
            if(!cell){
                return;
            }
            const wordObj = cell.words[0];
            if(!wordObj){
                return;
            }
            this.removeWord(wordObj);
            this.updateCells();
        },
        updateCells(){
            this.cells = this.getCells();
            const allGridWords = this.getGridWords();
            this.validateGridWords(allGridWords);
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
        getGridWords(){
            const allGridWords = [];
            const rawCells = Object.values(Alpine.raw(this.cells));
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
                const vIndex = getVerticalIndex(i);
                const vCell = rawCells[vIndex];
                if(newRow || cell.value == ''){
                    if(hWord.length > 1){
                        allGridWords.push({
                            word: hWord,
                            index: i - hWord.length + 1,
                            rotated: false,
                        });
                        if(!validWordList.has(hWord)){
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
                        allGridWords.push({
                            word: vWord,
                            index: vIndex - (vWord.length-1)*10,
                            rotated: true,
                        });
                        if(!validWordList.has(vWord)){
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
            return allGridWords;
        },
        validateGridWords(allGridWords){
            allGridWords.forEach(wordObj => {
                const word = wordObj.word;
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
                const foundCount = allGridWords.filter(row => row.word.includes(word)).length;
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
        getPlacedLetters(){
            // Convert list of words to object of index:letter
            const placedLetters = {};
            this.placedWords.forEach(word => {
                // TODO: Possibly need to check if letter is already an initial letter
                this.getLetterIndexes(word.word, word.index, word.rotated).forEach(x => {
                    if(placedLetters.hasOwnProperty(x.index)){
                        placedLetters[x.index].words.push(Alpine.raw(word));
                        return;
                    }
                    placedLetters[x.index] = {
                        letter: x.letter,
                        words: [Alpine.raw(word)],
                    };
                });
            });
            return placedLetters;
        },
        getCells(){
            const placedLetters = this.getPlacedLetters();
            return new Array(100)
                .fill({value: '', type: CellTypes.EMPTY, valid: true})
                .map((cell, i) => {
                    if(this.initialLetters.hasOwnProperty(i)){
                        return {
                            key: i,
                            valid: true,
                            words: placedLetters.hasOwnProperty(i) ? placedLetters[i].words : [],
                            value: this.initialLetters[i],
                            type: CellTypes.INITIAL,
                        }
                    }
                    if(placedLetters.hasOwnProperty(i)){
                        return {
                            key: i,
                            valid: true,
                            words: placedLetters[i].words,
                            value: placedLetters[i].letter,
                            type: CellTypes.PLACED,
                        }
                    }
                    return {
                        key: i,
                        valid: true,
                        words: [],
                        value: '',
                        type: CellTypes.EMPTY,
                    };
                });
        },
    }));
});