import { Injectable } from '@angular/core';
import { Piece, PieceType, PieceColor, Position, Move } from '../models/piece.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private board: (Piece | null)[][] = [];
  private currentPlayer: PieceColor = PieceColor.WHITE;
  private selectedPiece: Piece | null = null;
  private gameOver = false;
  private winner: PieceColor | null = null;
  private boardSize = 8; // Tamanho padrão do tabuleiro

  constructor() {
    // Não inicializar o tabuleiro automaticamente
  }

  initializeBoard(size: number = 8): void {
    // Valida o tamanho do tabuleiro (entre 6 e 12)
    if (size < 6 || size > 12) {
      throw new Error('Tamanho do tabuleiro deve estar entre 6 e 12');
    }
    
    this.boardSize = size;
    
    // Cria tabuleiro vazio
    this.board = Array(size).fill(null).map(() => Array(size).fill(null));
    
    // Posiciona peças brancas (linha inferior)
    this.placePieces(PieceColor.WHITE, size - 1);
    
    // Posiciona peças pretas (linha superior)
    this.placePieces(PieceColor.BLACK, 0);
    
    this.currentPlayer = PieceColor.WHITE;
    this.selectedPiece = null;
    this.gameOver = false;
    this.winner = null;
  }

  private placePieces(color: PieceColor, row: number): void {
    // Calcula as posições centrais para as 3 peças
    const centerCol = Math.floor(this.boardSize / 2);
    const pieces = [
      { type: PieceType.DEVELOPER, col: centerCol - 1 },
      { type: PieceType.DESIGNER, col: centerCol },
      { type: PieceType.OWNER, col: centerCol + 1 }
    ];

    pieces.forEach((pieceInfo, index) => {
      const piece: Piece = {
        type: pieceInfo.type,
        color: color,
        position: { row, col: pieceInfo.col },
        id: `${color}-${pieceInfo.type}`
      };
      this.board[row][pieceInfo.col] = piece;
    });
  }

  getBoardSize(): number {
    return this.boardSize;
  }

  getBoard(): (Piece | null)[][] {
    return this.board;
  }

  getCurrentPlayer(): PieceColor {
    return this.currentPlayer;
  }

  getSelectedPiece(): Piece | null {
    return this.selectedPiece;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  getWinner(): PieceColor | null {
    return this.winner;
  }

  selectPiece(row: number, col: number): boolean {
    const piece = this.board[row][col];
    
    if (!piece || piece.color !== this.currentPlayer) {
      this.selectedPiece = null;
      return false;
    }

    this.selectedPiece = piece;
    return true;
  }

  makeMove(toRow: number, toCol: number): boolean {
    if (!this.selectedPiece || this.gameOver) {
      return false;
    }

    const fromPos = this.selectedPiece.position;
    const toPos = { row: toRow, col: toCol };

    if (!this.isValidMove(this.selectedPiece, toPos)) {
      return false;
    }

    // Captura peça se houver
    const capturedPiece = this.board[toRow][toCol];
    
    // Move a peça
    this.board[fromPos.row][fromPos.col] = null;
    this.board[toRow][toCol] = this.selectedPiece;
    this.selectedPiece.position = toPos;

    // Verifica condição de vitória
    this.checkWinCondition();

    // Troca de jogador
    this.currentPlayer = this.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    this.selectedPiece = null;

    return true;
  }

  private isValidMove(piece: Piece, toPos: Position): boolean {
    const fromPos = piece.position;
    const deltaRow = toPos.row - fromPos.row;
    const deltaCol = toPos.col - fromPos.col;

    // Verifica se está dentro do tabuleiro
    if (toPos.row < 0 || toPos.row >= this.boardSize || toPos.col < 0 || toPos.col >= this.boardSize) {
      return false;
    }

    // Verifica se não está tentando capturar peça própria
    const targetPiece = this.board[toPos.row][toPos.col];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    // Regras de movimento específicas para cada tipo de peça
    switch (piece.type) {
      case PieceType.DEVELOPER:
        // Pode pular até 3 casas por turno em qualquer direção (vertical, horizontal ou diagonal)
        // Pode pular sobre outras peças
        return this.isValidDeveloperMove(fromPos, toPos);
      
      case PieceType.DESIGNER:
        // Move em formato "L" (como o cavalo do xadrez)
        return this.isValidDesignerMove(fromPos, toPos);
      
      case PieceType.OWNER:
        // Move uma casa por turno em qualquer direção (vertical, horizontal ou diagonal)
        return Math.abs(deltaRow) <= 1 && Math.abs(deltaCol) <= 1;
      
      default:
        return false;
    }
  }

  private isValidDeveloperMove(from: Position, to: Position): boolean {
    const deltaRow = Math.abs(to.row - from.row);
    const deltaCol = Math.abs(to.col - from.col);
    
    // Pode mover até 3 casas em qualquer direção
    const maxDistance = Math.max(deltaRow, deltaCol);
    
    // Não pode ficar na mesma posição
    if (maxDistance === 0) {
      return false;
    }
    
    // Máximo 3 casas
    if (maxDistance > 3) {
      return false;
    }
    
    // Pode pular sobre outras peças, então não verificamos se o caminho está livre
    return true;
  }

  private isValidDesignerMove(from: Position, to: Position): boolean {
    const deltaRow = Math.abs(to.row - from.row);
    const deltaCol = Math.abs(to.col - from.col);
    
    // Movimento em L: (2,1) ou (1,2)
    return (deltaRow === 2 && deltaCol === 1) || (deltaRow === 1 && deltaCol === 2);
  }

  private isPathClear(from: Position, to: Position): boolean {
    // Esta função não é mais necessária para o Developer (pode pular sobre peças)
    // Mantida apenas para compatibilidade, mas não é usada
    const deltaRow = to.row - from.row;
    const deltaCol = to.col - from.col;
    
    const stepRow = deltaRow === 0 ? 0 : deltaRow / Math.abs(deltaRow);
    const stepCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);
    
    let currentRow = from.row + stepRow;
    let currentCol = from.col + stepCol;
    
    while (currentRow !== to.row || currentCol !== to.col) {
      if (this.board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += stepRow;
      currentCol += stepCol;
    }
    
    return true;
  }

  private checkWinCondition(): void {
    const whitePieces = this.countPieces(PieceColor.WHITE);
    const blackPieces = this.countPieces(PieceColor.BLACK);

    // Condições de vitória:
    // 1. Capturar o Owner do oponente
    // 2. Reduzir o oponente a apenas 1 peça
    if (whitePieces.owner === 0 || blackPieces.total === 1) {
      this.gameOver = true;
      this.winner = PieceColor.BLACK;
    } else if (blackPieces.owner === 0 || whitePieces.total === 1) {
      this.gameOver = true;
      this.winner = PieceColor.WHITE;
    }
  }

  private countPieces(color: PieceColor): { developer: number; designer: number; owner: number; total: number } {
    let developer = 0, designer = 0, owner = 0;

    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          switch (piece.type) {
            case PieceType.DEVELOPER:
              developer++;
              break;
            case PieceType.DESIGNER:
              designer++;
              break;
            case PieceType.OWNER:
              owner++;
              break;
          }
        }
      }
    }

    return {
      developer,
      designer,
      owner,
      total: developer + designer + owner
    };
  }

  getPossibleMoves(piece: Piece): Position[] {
    const moves: Position[] = [];
    
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (this.isValidMove(piece, { row, col })) {
          moves.push({ row, col });
        }
      }
    }
    
    return moves;
  }

  resetGame(size?: number): void {
    this.initializeBoard(size || this.boardSize);
  }
}
