const CellTypes = {
    BLOCKED: -1,
    EMPTY: 0,
    INITIAL: 1,
    PLACED: 2,
};
const WordStates = {
    INVALID: -1,
    NOT_PLACED: 0,
    VALID: 1,
    DUPLICATED: 2,
};
document.addEventListener('alpine:init', () => {
    Alpine.data('crossout', () => ({
        test: 'test',
        wordList: {
            "hello": {state: WordStates.NOT_PLACED},
            "world": {state: WordStates.NOT_PLACED},
        },
        solvedWords: [],
        initialLetters: {
            76: 'd',
            33: 'h',
        },
        placedLetters: {},
        cells: [],
        ghostImage: null,
        init(){
            this.ghostImage = new Image();
            this.ghostImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
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
            this.dragOffsetX = e.clientX - rect.x;
            this.dragOffsetY = e.clientY - rect.y;
            this.dragX = e.pageX;
            this.dragY = e.pageY;
            // e.dataTransfer.setDragImage(this.ghostImage, 0, 0);
            this.drag = word;
        },
        handleDragOver(e){
            this.dragX = e.pageX;
            this.dragY = e.pageY;
        },
        endDrag(e){
            const draggedword = this.drag;
            this.drag = '';
            // Need to find real target based on x,y because of ghost
            const target = document.elementsFromPoint(e.pageX, e.pageY).find(el => el.classList.contains('drop-cell'));
            if(!target){
                return;
            }
            const index = Array.prototype.indexOf.call(target.parentNode.childNodes, target) - 2; // One for template, one for 0-index
            const letterIndexes = this.getLetterIndexes(draggedword, index, this.dragRotation);
            // TODO: visually indicate why
            if(!letterIndexes){
                return false;
            }
            if(!this.validateWordPlacement(letterIndexes)){
                return false;
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
            if(!rotated && (index%10)+word.length > 10){
                return false;
            }
            if(rotated && index + (word.length*10) > 100){
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
        validateWordPlacement(letterIndexes){
            let attached = false;
            for(const {index, letter} of letterIndexes){
                if(this.initialLetters.hasOwnProperty(index)){
                    if(this.initialLetters[index] != letter){
                        return false;
                    } else {
                        attached = true;
                    }
                }
                if(this.placedLetters.hasOwnProperty(index) && this.placedLetters[index] != ''){
                    if(this.placedLetters[index] != letter){
                        return false;
                    } else {
                        attached = true;
                    }
                }
            }
            if(!attached){
                return false;
            }
            return true;
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
            this.checkSolvedWords();
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
                console.log(word, foundCount);
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
        getCells(){
            return new Array(100)
                .fill({value: '', type: CellTypes.EMPTY})
                .map((cell, i) => {
                    if(this.initialLetters.hasOwnProperty(i)){
                        return {
                            key: i,
                            value: this.initialLetters[i],
                            type: CellTypes.INITIAL,
                        }
                    }
                    if(this.placedLetters.hasOwnProperty(i) && this.placedLetters[i] != ''){
                        return {
                            key: i,
                            value: this.placedLetters[i],
                            type: CellTypes.PLACED,
                        }
                    }
                    return {
                        key: i,
                        value: '',
                        type: CellTypes.EMPTY,
                    };
                });
        },
    }));
});