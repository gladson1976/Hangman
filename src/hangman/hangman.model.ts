export class HangmanWord {
	constructor (
		public selectedWord ?: string,
		public selectedHint ?: string,
		public playWord ?: string,
		public maxMoves ?: number,
		public movesDone ?: number,
		public clueCount ?: number,
		public usedLetters ?: string[]
	) {
		this.selectedWord = "";
		this.selectedHint = "";
		this.playWord = "";
		this.maxMoves = 0;
		this.movesDone = 0;
		this.clueCount = 0;
		this.usedLetters = [];
	}
}

export class PersistData {
	constructor (
		public difficulty ?: number,
		public inProgress ?: PersistDataHangman,
		public hangmanStats ?: PersistDataStats
	) {
		this.difficulty = 0;
		this.inProgress = new PersistDataHangman();
		this.hangmanStats = new PersistDataStats();
	}
}

export class PersistDataHangman {
	constructor (
		public hangmanWord ?: HangmanWord
	) {
		this.hangmanWord = null;
	}

}

export class PersistDataStats {
	constructor (
		public played ?: number[],
		public won ?: number[]
	) {
		this.played = [0, 0, 0];
		this.won = [0, 0, 0];
	}

}

export class kbkey {
	constructor(
		public isLetter ?: boolean,
		public key ?: string
	) {

	}
}