import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { HangmanWord, PersistData, PersistDataHangman, PersistDataStats } from './hangman.model';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { WindowRef } from './windowref.service';
import { Http, Response } from '@angular/http';
import Words from './words';
import WordDefs from './WordDefs';

@Component({
  selector: 'hangman-root',
  templateUrl: './hangman.component.html',
  styleUrls: ['./hangman.component.css', './keyboard.css'],
  encapsulation: ViewEncapsulation.None
})

export class HangmanComponent {

  constructor( private modalService: NgbModal, private _sanitizer: DomSanitizer, private winRef: WindowRef, private http: Http ) { }

  @ViewChild('popupConfirm') private popupConfirm;
  @ViewChild('popupSettings') private popupSettings;
  @ViewChild('popupHighscore') private popupHighscore;
  @ViewChild('popupHelp') private popupHelp;

  private getRandom(min, max){
    return Math.floor(Math.random()*(max-min+1))+min;
  }

  words = Words;
  wordDefs = WordDefs;

  appTitle:string = "Hangman";
  appVersion:string = "1.1";

  persistData:PersistData = null;
  
  hangmanSize:number;
  hangmanMoves:number = -1;
  maxMoves:number;
  arrDifficulty:any[] = [
    {"index": 0, "difficultyName": "Easy", "maxMoves": 8, "minWordSize": 3, "maxWordSize": 6, "clueCount": 3, "tiles": [1, 2, 3, 4, 5, 6, 7, 8]},
    {"index": 1, "difficultyName": "Normal", "maxMoves": 6, "minWordSize": 7, "maxWordSize": 9, "clueCount": 2, "tiles": [2, 4, 5, 6, 7, 8]},
    {"index": 2, "difficultyName": "Hard", "maxMoves": 4, "minWordSize": 10, "maxWordSize": 0, "clueCount": 1, "tiles": [2, 4, 5, 8]}
  ];
  arrKeys = [
              ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
              ["#Q", "A", "S", "D", "F", "G", "H", "J", "K", "L"],
              ["#Q", "#H", "Z", "X", "C", "V", "B", "N", "M", "#H"],
              ["#H", "*HINT", "#Q", "*SPACE", "#H", "#H", "#H", "#H"]
            ]

  selectedDifficulty:number = 1;
  hangmanStarted:boolean = false;
  hangmanComplete:boolean = false;
  hangmanLost:boolean = false;
  flashNewWord:boolean = false;
  hangmanMessage:string = "";
  hangmanPopupMessage:string = "";

  settings:boolean = false;
  showDifficulty:boolean = false;
  newHighscore:boolean = false;
  openPopup:NgbModalRef = null;

  currentWord:string = "";
  currentHint:string = "";
  arrCurrentWord:string[] = this.currentWord.split("");
  hangmanCellSize:any;
  hangmanTableSize:any;
  hangPortrait:number;
  portraitIndex:number;
  clueCount:number;
  clueIndex:number;
  usedLetters:string[] = [];

  ngOnInit() {
    this.loadPersistData();
    this.initHangman();
  }

  loadPersistData() {
    if (this.winRef.nativeWindow.AppInventor) {
      this.persistData = JSON.parse(this.winRef.nativeWindow.AppInventor.getWebViewString());
    } else {
      this.persistData = JSON.parse(localStorage.getItem("hangmanPersist"));
    }

    if(this.persistData === null)
      this.persistData = new PersistData();

    if(this.persistData !== null) {
      this.selectedDifficulty = this.persistData.difficulty;
      this.words.words = this.words[this.arrDifficulty[this.selectedDifficulty].difficultyName.toLowerCase()];
      this.wordDefs.words = this.wordDefs[this.arrDifficulty[this.selectedDifficulty].difficultyName.toLowerCase()];

      if(this.persistData.inProgress.hangmanWord !== null) {
        this.currentWord = this.persistData.inProgress.hangmanWord.selectedWord;
        this.currentHint = this.persistData.inProgress.hangmanWord.selectedHint;
        this.arrCurrentWord = this.persistData.inProgress.hangmanWord.playWord.split(",");
        this.maxMoves = this.persistData.inProgress.hangmanWord.maxMoves;
        this.hangmanMoves = this.persistData.inProgress.hangmanWord.movesDone;
        this.clueCount = this.persistData.inProgress.hangmanWord.clueCount;
        this.usedLetters = this.persistData.inProgress.hangmanWord.usedLetters;
      }
    }
  }

  savePersistData(saveGrid:boolean = true) {
    this.persistData.difficulty = this.selectedDifficulty;
    if(saveGrid) {
      if(this.persistData.inProgress.hangmanWord === null)
        this.persistData.inProgress.hangmanWord = new HangmanWord();
      this.persistData.inProgress.hangmanWord.selectedWord = this.currentWord;
      this.persistData.inProgress.hangmanWord.selectedHint = this.currentHint;
      this.persistData.inProgress.hangmanWord.playWord = this.arrCurrentWord.join();
      this.persistData.inProgress.hangmanWord.maxMoves = this.maxMoves;
      this.persistData.inProgress.hangmanWord.movesDone = this.hangmanMoves;
      this.persistData.inProgress.hangmanWord.clueCount = this.clueCount;
      this.persistData.inProgress.hangmanWord.usedLetters = this.usedLetters;
    }
    if (this.winRef.nativeWindow.AppInventor) {
      this.winRef.nativeWindow.AppInventor.setWebViewString(JSON.stringify(this.persistData));
    } else {
      localStorage.setItem("hangmanPersist", JSON.stringify(this.persistData));
    }
    // this.loadPersistData();
  }

  initHangman() {
    let tempCell:HangmanWord;
    if(this.persistData !== null && this.persistData.inProgress.hangmanWord !== null) {
      this.hangPortrait = this.persistData.inProgress.hangmanWord.movesDone;
      this.portraitIndex = this.persistData.inProgress.hangmanWord.movesDone -1;
      this.hangmanStarted = true;
    } else {
      this.hangmanMoves = 0;
      this.hangPortrait = 0;
      this.portraitIndex = -1;
      this.hangmanStarted = false;
      this.maxMoves = this.arrDifficulty[this.selectedDifficulty].maxMoves;
      this.clueCount = this.arrDifficulty[this.selectedDifficulty].clueCount;
    }
    this.hangmanComplete = false;
    this.hangmanMessage = "";

    this.resizeViewport();

    if(this.persistData !== null) {
      this.hangmanStarted = true;
      this.checkHangman(true);
    }
    
    if(this.persistData.inProgress.hangmanWord === null) {
      this.startNewHangman();
    }
  }

  startNewHangman() {
    let getNewWord:boolean = false;
    let localDifficulty:number;
    if(this.hangmanStarted && this.usedLetters.length > 0) {
      this.hangmanPopupMessage = "Start new Hangman ?";
      this.modalService.open(this.popupConfirm, {}).result.then (
        (result) => {
          this.persistData.hangmanStats.played[this.selectedDifficulty]++;
          this.persistData.inProgress = new PersistDataHangman();
          this.hangmanStarted = false;
          this.savePersistData(false);
          getNewWord = true;
          this.getNewWord();
        },
        (reason) => {
          getNewWord = false;
        }
      )
    } else {
      this.persistData.inProgress = new PersistDataHangman();
      this.hangmanStarted = false;
      this.savePersistData(false);
      getNewWord = true;
      this.getNewWord();
    }
  }

  getNewWord() {
    // this.currentWord = this.words.words[this.getRandom(0, this.words.words.length)];
    var selWord = this.wordDefs.words[this.getRandom(0, this.wordDefs.words.length)];
    // var selWord = this.wordDefs.words[this.getRandom(0, 25)]; // DEBUG
    this.currentWord = selWord.word;
    this.currentHint = selWord.hint;
    this.currentHint = this.currentHint.replace(/~/gi, "\n");
    this.arrCurrentWord = Array(this.currentWord.length).fill("");
    this.setExtraChars();
    if(((32 + this.VW2PX(2)) * this.currentWord.length) <= this.VW2PX(94)) {
      this.hangmanCellSize = 32;
      this.hangmanTableSize = 32 * this.currentWord.length + (this.VW2PX(2) * (this.currentWord.length - 1));
    } else {
      this.hangmanCellSize = Math.floor((this.VW2PX(94) - (this.VW2PX(2) * (this.currentWord.length - 1))) / this.currentWord.length);
      this.hangmanTableSize = this.hangmanCellSize * this.currentWord.length + (this.VW2PX(2) * (this.currentWord.length - 1));
    }
    this.hangmanCellSize += "px";
    this.hangmanTableSize += "px";
    this.hangmanMoves = 0;
    this.hangPortrait = 0;
    this.portraitIndex = -1;
    this.maxMoves = this.arrDifficulty[this.selectedDifficulty].maxMoves;
    this.clueCount = this.arrDifficulty[this.selectedDifficulty].clueCount;
    this.clueIndex = -1;
    this.hangmanStarted = true;
    this.hangmanComplete = false;
    this.hangmanLost = false;
    this.usedLetters = [];
    this.flashNewWord = true;
    setTimeout(() => {
      this.flashNewWord = false;
    }, 500);
    this.savePersistData(true);
  }

  resizeViewport() {
  }

  setDifficulty(difficultyIndex) {
    this.selectedDifficulty = difficultyIndex;
    this.words.words = this.words[this.arrDifficulty[this.selectedDifficulty].difficultyName.toLowerCase()];
    this.showDifficulty = !this.showDifficulty;
    this.savePersistData(true);
  }

  resetStats() {
    this.persistData.hangmanStats = new PersistDataStats();
    this.savePersistData(true);
  }

  showSettings() {
    this.openPopup = this.modalService.open(this.popupSettings, {});
  }

  showHighscore() {
    this.openPopup = this.modalService.open(this.popupHighscore, {});
  }

  showHelp() {
    this.openPopup = this.modalService.open(this.popupHelp, {});
  }

  setExtraChars() {
    for(let i = 0; i < this.currentWord.length; i++) {
      if(!this.currentWord[i].match(/[A-Z]/)) {
        this.arrCurrentWord[i] = this.currentWord[i];
      }
    }
  }

  goHang(inputLeter:string = "", init:boolean = false) {
    let charIndex:number = 0;
    let charFound:boolean = false;
    let localDifficulty:number;

    localDifficulty = this.arrDifficulty.filter(d => d.maxMoves === this.maxMoves)[0].index;

    if(inputLeter === " ") {
      this.startNewHangman();
      return;
    } else if (inputLeter === "*" && !this.hangmanComplete && this.clueCount > 0) {
      this.getClue();
      return;
    } else if (inputLeter === "=" || inputLeter === null) {
      return;
    }

    if(this.hangmanComplete) return;

    this.usedLetters.push(inputLeter);
    while(charIndex < this.currentWord.length) {
      if(this.currentWord[charIndex] === inputLeter) {
        charFound = true;
        this.arrCurrentWord[charIndex] = inputLeter;
      }
      charIndex++;
    }
    
    if(!charFound) {
      this.hangmanMoves++;
      this.portraitIndex++;
      this.hangPortrait = this.arrDifficulty[localDifficulty].tiles[this.portraitIndex];
    }

    this.checkHangman();
    this.savePersistData(true);
  }

  checkHangman(onlyCheck:boolean = false) {
    let localDifficulty = this.arrDifficulty.filter(d => d.maxMoves === this.maxMoves)[0].index;
    if(this.arrCurrentWord.join("") === this.currentWord) {
      this.hangmanComplete = true;
      this.hangmanStarted = false;
      this.hangmanLost = false;
      if(!onlyCheck) {
        this.persistData.hangmanStats.won[localDifficulty]++;
        this.persistData.hangmanStats.played[localDifficulty]++;
        this.savePersistData(false);
      }
      setTimeout(() => {
        this.hangPortrait = 0;
        this.portraitIndex = -1;
      }, 1000);
    } else if(this.maxMoves === this.hangmanMoves) {
      this.hangmanComplete = true;
      this.hangmanStarted = false;
      this.hangmanLost = true;
      this.arrCurrentWord = this.currentWord.split("");
      if(!onlyCheck) {
        this.persistData.hangmanStats.played[localDifficulty]++;
        this.savePersistData(false);
      }
    }
    return false;
  }

  getClue() {
    let availableLetters:number[] = [];
    let clueIndex:number;
    let sameLetterStillAvailable:boolean;
    this.hangmanPopupMessage = "Need a clue ?";
    this.modalService.open(this.popupConfirm, {}).result.then (
      (result) => {
        for(let i = 0; i < this.arrCurrentWord.length; i++) {
          if(this.arrCurrentWord[i] === "") {
            availableLetters.push(i);
          }
        }
        clueIndex = availableLetters[this.getRandom(0, availableLetters.length - 1)];
        // clueIndex = 2; // DEBUG
        this.arrCurrentWord[clueIndex] = this.currentWord[clueIndex];
        this.clueCount--;
        if(!this.hangmanStarted)
          this.hangmanStarted = true;
        // Check if the same letter is still available in the word (ex. Word - SUMMIT, solved - S _ _ _ I T, clue - M).
        // Disable if the same letter is not available in the free spaces in the word.
        sameLetterStillAvailable = false;
        for(let i = 0; i < this.currentWord.length; i++) {
          if(i !== clueIndex && this.currentWord[clueIndex] === this.currentWord[i] && this.arrCurrentWord[i] === "") {
            sameLetterStillAvailable = true;
          }
        }
        if(!sameLetterStillAvailable) {
          this.usedLetters.push(this.currentWord[clueIndex]);
        }
        this.clueIndex = clueIndex;
        setTimeout(() => {
          this.clueIndex = -1;
        }, 1000);
        this.checkHangman();
        this.savePersistData();
      },
      (reason) => {
      }
    )

  }

  getKeyChar(row, keyNum){
		var keyChar = this.arrKeys[row][keyNum];
		if(keyChar == "*BKSPC")
			keyChar = "<";
		else if(keyChar == "*HINT")
			keyChar = "*";
		else if(keyChar == "*SPACE")
			keyChar = " ";
		else if(keyChar == "*MENU")
			keyChar = "=";
		else if(keyChar[0] == "#")
			keyChar = null;
		// console.log(row, keyNum, keyChar); //DEBUG
    // return keyChar;
    this.goHang(keyChar);
	}

  allFlooded() {
    return true;
  }

  VW2PX(VW){
    let w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
    let x = w.innerWidth || e.clientWidth || g.clientWidth;
    let result = (x * VW ) / 100;
    return result;
  }

  showHurrah() {
    this.newHighscore = true;
    setTimeout(() => {
      this.newHighscore = false;
    }, 5000);
  }

  readFiles() {
    let total_words:string[] = [];
    let fileNumber:number = 1;
    let maxFiles:number = 64;
    let fileJSON:any = null;

    for(let i = 1; i <= maxFiles; i++) {
      let file_words:string[] = [];
      this.http.get(`assets/words/${i}.json`).subscribe((response: Response) => {
            fileJSON = response.json();
            fileJSON.words_hor.forEach(element => {
              file_words.push(element.word.toUpperCase());
              total_words.push(element.word.toUpperCase());
            });
            fileJSON.words_ver.forEach(element => {
              file_words.push(element.word.toUpperCase());
              total_words.push(element.word.toUpperCase());
            });

            console.log(file_words, total_words);
        }
      )
    }

  }

}
