import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Piece, PieceType, PieceColor, Position } from '../../models/piece.model';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.scss']
})
export class ChessBoardComponent {
  board: (Piece | null)[][] = [];
  selectedPiece: Piece | null = null;
  possibleMoves: Position[] = [];
  currentPlayer: PieceColor = PieceColor.WHITE;
  gameOver = false;
  winner: PieceColor | null = null;
  gameStarted = false;
  selectedBoardRows = 8;
  selectedBoardCols = 8;
  boardRows = 8;
  boardCols = 8;
  isShaking = false;
  invalidMove = false;

  // Expor enums para o template
  PieceType = PieceType;
  PieceColor = PieceColor;

  constructor() {
    // Não iniciar o jogo automaticamente
  }

  // Lógica do jogo movida para dentro do componente
  initializeBoard(rows: number = 8, cols: number = 8): void {
    // Valida o tamanho do tabuleiro (entre 6 e 12)
    if (rows < 6 || rows > 12 || cols < 6 || cols > 12) {
      throw new Error('Tamanho do tabuleiro deve estar entre 6 e 12 para linhas e colunas');
    }
    
    this.boardRows = rows;
    this.boardCols = cols;
    
    // Cria tabuleiro vazio com verificação de segurança
    this.board = [];
    for (let i = 0; i < rows; i++) {
      this.board[i] = [];
      for (let j = 0; j < cols; j++) {
        this.board[i][j] = null;
      }
    }
    
    console.log('Tabuleiro criado:', this.board.length, 'x', this.board[0]?.length);
    
    // Posiciona peças brancas (canto inferior esquerdo)
    this.placePieces(PieceColor.WHITE, 'bottom-left');
    
    // Posiciona peças pretas (canto superior direito)
    this.placePieces(PieceColor.BLACK, 'top-right');
    
    this.currentPlayer = PieceColor.WHITE;
    this.selectedPiece = null;
    this.gameOver = false;
    this.winner = null;
  }

  private placePieces(color: PieceColor, corner: 'top-right' | 'bottom-left'): void {
    let positions: { type: PieceType; row: number; col: number }[] = [];
    
    if (corner === 'bottom-left') {
      // Peças brancas no canto inferior esquerdo
      positions = [
        { type: PieceType.OWNER, row: this.boardRows - 1, col: 0 },        // Product Owner no canto
        { type: PieceType.DEVELOPER, row: this.boardRows - 1, col: 1 },     // Developer à direita do PO
        { type: PieceType.DESIGNER, row: this.boardRows - 1, col: 2 }       // Designer à direita do Developer
      ];
    } else {
      // Peças pretas no canto superior direito
      positions = [
        { type: PieceType.OWNER, row: 0, col: this.boardCols - 1 },         // Product Owner no canto
        { type: PieceType.DEVELOPER, row: 0, col: this.boardCols - 2 },     // Developer à esquerda do PO
        { type: PieceType.DESIGNER, row: 0, col: this.boardCols - 3 }       // Designer à esquerda do Developer
      ];
    }

    positions.forEach((pos) => {
      // Verifica se a posição é válida
      if (pos.row >= 0 && pos.row < this.boardRows && 
          pos.col >= 0 && pos.col < this.boardCols && 
          this.board[pos.row] && this.board[pos.row][pos.col] !== undefined) {
        
        const piece: Piece = {
          type: pos.type,
          color: color,
          position: { row: pos.row, col: pos.col },
          id: `${color}-${pos.type}`
        };
        this.board[pos.row][pos.col] = piece;
      }
    });
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
      // Movimento inválido - ativar efeito visual
      this.triggerInvalidMoveEffect();
      return false;
    }

    // Lógica especial para captura do Developer
    if (this.selectedPiece.type === PieceType.DEVELOPER) {
      this.handleDeveloperMove(fromPos, toPos);
    } else {
      // Captura normal para outras peças
      const capturedPiece = this.board[toRow][toCol];
      
      // Move a peça
      this.board[fromPos.row][fromPos.col] = null;
      this.board[toRow][toCol] = this.selectedPiece;
      this.selectedPiece.position = toPos;
    }

    // Verifica condição de vitória
    this.checkWinCondition();

    // Troca de jogador
    this.currentPlayer = this.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    this.selectedPiece = null;

    return true;
  }
  
  private handleDeveloperMove(fromPos: Position, toPos: Position): void {
    const deltaRow = toPos.row - fromPos.row;
    const deltaCol = toPos.col - fromPos.col;
    const absDeltaRow = Math.abs(deltaRow);
    const absDeltaCol = Math.abs(deltaCol);
    
    // Move a peça
    this.board[fromPos.row][fromPos.col] = null;
    this.board[toPos.row][toPos.col] = this.selectedPiece;
    this.selectedPiece!.position = toPos;
    
    // Se o movimento tem distância > 1, pode ter pulado sobre peças
    const maxDistance = Math.max(absDeltaRow, absDeltaCol);
    if (maxDistance > 1) {
      const stepRow = deltaRow === 0 ? 0 : deltaRow / absDeltaRow;
      const stepCol = deltaCol === 0 ? 0 : deltaCol / absDeltaCol;
      
      let currentRow = fromPos.row + stepRow;
      let currentCol = fromPos.col + stepCol;
      
      // Remove todas as peças adversárias que foram puladas
      while (currentRow !== toPos.row || currentCol !== toPos.col) {
        const pieceInPath = this.board[currentRow][currentCol];
        if (pieceInPath && pieceInPath.color !== this.selectedPiece?.color) {
          this.board[currentRow][currentCol] = null; // Remove a peça pulada
        }
        currentRow += stepRow;
        currentCol += stepCol;
      }
    }
  }
  
  private triggerInvalidMoveEffect(): void {
    this.invalidMove = true;
    this.isShaking = true;
    
    // Remove o efeito após a animação
    setTimeout(() => {
      this.isShaking = false;
      this.invalidMove = false;
    }, 300);
  }

  private isValidMove(piece: Piece, toPos: Position): boolean {
    const fromPos = piece.position;
    const deltaRow = toPos.row - fromPos.row;
    const deltaCol = toPos.col - fromPos.col;

    // Verifica se está dentro do tabuleiro
    if (toPos.row < 0 || toPos.row >= this.boardRows || toPos.col < 0 || toPos.col >= this.boardCols) {
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
        return this.isValidDeveloperMove(fromPos, toPos);
      
      case PieceType.DESIGNER:
        return this.isValidDesignerMove(fromPos, toPos);
      
      case PieceType.OWNER:
        return Math.abs(deltaRow) <= 1 && Math.abs(deltaCol) <= 1;
      
      default:
        return false;
    }
  }

  private isValidDeveloperMove(from: Position, to: Position): boolean {
    const deltaRow = to.row - from.row;
    const deltaCol = to.col - from.col;
    const absDeltaRow = Math.abs(deltaRow);
    const absDeltaCol = Math.abs(deltaCol);
    
    // Não pode ficar na mesma posição
    if (absDeltaRow === 0 && absDeltaCol === 0) {
      return false;
    }
    
    // Verifica se é movimento em linha reta (horizontal, vertical ou diagonal)
    const isHorizontal = absDeltaRow === 0 && absDeltaCol <= 3;
    const isVertical = absDeltaCol === 0 && absDeltaRow <= 3;
    const isDiagonal = absDeltaRow === absDeltaCol && absDeltaRow <= 3;
    
    // Deve ser um dos movimentos válidos
    if (!isHorizontal && !isVertical && !isDiagonal) {
      return false;
    }
    
    // Máximo 3 casas em qualquer direção válida
    const maxDistance = Math.max(absDeltaRow, absDeltaCol);
    if (maxDistance > 3) {
      return false;
    }
    
    const targetPiece = this.board[to.row][to.col];
    
    // Se há uma peça no destino
    if (targetPiece) {
      // Só pode capturar se for adversário e estiver pulando por cima
      if (targetPiece.color !== this.selectedPiece?.color) {
        // Deve estar pulando por cima (não pode parar diretamente em cima)
        // Para isso, a distância deve ser > 1
        if (maxDistance === 1) {
          return false; // Não pode parar diretamente em cima de adversário
        }
        
        // Verifica se há uma peça para pular entre origem e destino
        const stepRow = deltaRow === 0 ? 0 : deltaRow / absDeltaRow;
        const stepCol = deltaCol === 0 ? 0 : deltaCol / absDeltaCol;
        
        let foundPieceToJump = false;
        let currentRow = from.row + stepRow;
        let currentCol = from.col + stepCol;
        
        // Verifica o caminho até o destino
        while (currentRow !== to.row || currentCol !== to.col) {
          const pieceInPath = this.board[currentRow][currentCol];
          if (pieceInPath && pieceInPath.color !== this.selectedPiece?.color) {
            foundPieceToJump = true;
          }
          currentRow += stepRow;
          currentCol += stepCol;
        }
        
        // Só pode capturar se pulou por cima de uma peça adversária
        return foundPieceToJump;
      } else {
        return false; // Não pode capturar peça própria
      }
    }
    
    // Movimento para casa vazia - sempre válido se dentro das regras de distância
    return true;
  }

  private isValidDesignerMove(from: Position, to: Position): boolean {
    const deltaRow = Math.abs(to.row - from.row);
    const deltaCol = Math.abs(to.col - from.col);
    
    // Movimento em L: (2,1) ou (1,2)
    return (deltaRow === 2 && deltaCol === 1) || (deltaRow === 1 && deltaCol === 2);
  }

  private checkWinCondition(): void {
    const whitePieces = this.countPieces(PieceColor.WHITE);
    const blackPieces = this.countPieces(PieceColor.BLACK);

    console.log('Verificando condição de vitória:', {
      whitePieces,
      blackPieces,
      gameOver: this.gameOver
    });

    // Condições de vitória:
    // 1. Capturar o Owner do oponente
    // 2. Reduzir o oponente a apenas 1 peça
    if (whitePieces.owner === 0 || blackPieces.total === 1) {
      console.log('Vitória das PRETAS!');
      this.gameOver = true;
      this.winner = PieceColor.BLACK;
    } else if (blackPieces.owner === 0 || whitePieces.total === 1) {
      console.log('Vitória das BRANCAS!');
      this.gameOver = true;
      this.winner = PieceColor.WHITE;
    }

    if (this.gameOver) {
      console.log('Jogo acabou! Winner:', this.winner);
    }
  }

  private countPieces(color: PieceColor): { developer: number; designer: number; owner: number; total: number } {
    let developer = 0, designer = 0, owner = 0;

    for (let row = 0; row < this.boardRows; row++) {
      for (let col = 0; col < this.boardCols; col++) {
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
    
    for (let row = 0; row < this.boardRows; row++) {
      for (let col = 0; col < this.boardCols; col++) {
        if (this.isValidMove(piece, { row, col })) {
          moves.push({ row, col });
        }
      }
    }
    
    return moves;
  }

  private updateGameState(): void {
    if (this.selectedPiece) {
      this.possibleMoves = this.getPossibleMoves(this.selectedPiece);
    } else {
      this.possibleMoves = [];
    }
    this.updateCSSVariables();
  }

  startGame(): void {
    console.log('Botão clicado! Valores atuais:', {
      selectedBoardRows: this.selectedBoardRows,
      selectedBoardCols: this.selectedBoardCols,
      gameStarted: this.gameStarted
    });
    
    try {
      console.log('Iniciando jogo com dimensões:', this.selectedBoardRows, 'x', this.selectedBoardCols);
      
      // Valida os valores selecionados
      if (!this.selectedBoardRows || !this.selectedBoardCols) {
        throw new Error('Dimensões do tabuleiro não foram selecionadas corretamente');
      }
      
      // Converte para números se necessário
      const rows = Number(this.selectedBoardRows);
      const cols = Number(this.selectedBoardCols);
      
      console.log('Dimensões convertidas:', rows, 'x', cols);
      
      this.initializeBoard(rows, cols);
      this.gameStarted = true;
      this.updateGameState();
      
      console.log('Jogo iniciado com sucesso! gameStarted:', this.gameStarted);
    } catch (error) {
      console.error('Erro ao iniciar jogo:', error);
      alert('Erro ao iniciar o jogo: ' + error);
    }
  }

  private updateCSSVariables(): void {
    // Define as variáveis CSS para as dimensões do tabuleiro
    document.documentElement.style.setProperty('--board-rows', this.boardRows.toString());
    document.documentElement.style.setProperty('--board-cols', this.boardCols.toString());
  }

  onSquareClick(row: number, col: number): void {
    if (this.gameOver || !this.gameStarted) return;

    const piece = this.board[row][col];
    
    if (this.selectedPiece) {
      // Tentativa de movimento
      const success = this.makeMove(row, col);
      if (success) {
        this.updateGameState();
      } else {
        // Movimento inválido - não trocar turno, permitir nova seleção
        // Se clicou em uma peça própria, seleciona ela
        if (piece && piece.color === this.currentPlayer) {
          this.selectPiece(row, col);
          this.updateGameState();
        }
        // Se clicou em quadrado vazio ou peça adversária, mantém seleção atual
        // O efeito visual já foi ativado no makeMove
      }
    } else {
      // Seleção de peça
      if (piece && piece.color === this.currentPlayer) {
        this.selectPiece(row, col);
        this.updateGameState();
      }
    }
  }

  isPossibleMove(row: number, col: number): boolean {
    return this.possibleMoves.some(move => move.row === row && move.col === col);
  }

  isSelected(row: number, col: number): boolean {
    return this.selectedPiece?.position.row === row && this.selectedPiece?.position.col === col;
  }

  getSquareClass(row: number, col: number): string {
    let classes = [];
    
    // Cor base do quadrado
    classes.push((row + col) % 2 === 0 ? 'light-square' : 'dark-square');
    
    // Quadrado selecionado
    if (this.isSelected(row, col)) {
      classes.push('selected');
    }
    
    // Movimento possível
    if (this.isPossibleMove(row, col)) {
      classes.push('possible-move');
    }
    
    return classes.join(' ');
  }

  getPieceImagePath(piece: Piece): string {
    const colorName = piece.color === PieceColor.WHITE ? 'White' : 'Black';
    let typeName = '';
    
    switch (piece.type) {
      case PieceType.DEVELOPER:
        typeName = 'Developer';
        break;
      case PieceType.DESIGNER:
        typeName = 'Designer';
        break;
      case PieceType.OWNER:
        typeName = 'Owner';
        break;
    }
    
    const imagePath = `pieces/${colorName}${typeName}.png`;
    console.log('Tentando carregar imagem:', imagePath);
    return imagePath;
  }

  onImageLoad(piece: Piece): void {
    console.log('Imagem carregada com sucesso:', this.getPieceImagePath(piece));
  }

  onImageError(event: any, piece: Piece): void {
    console.error('Erro ao carregar imagem:', this.getPieceImagePath(piece));
    console.error('Peça:', piece);
    
    // Mostra um placeholder visual se necessário
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.opacity = '0.3';
      img.alt = `${piece.type} (imagem não encontrada)`;
    }
  }

  getPieceTitle(piece: Piece): string {
    const color = piece.color === PieceColor.WHITE ? 'Branco' : 'Preto';
    let type = '';
    
    switch (piece.type) {
      case PieceType.DEVELOPER:
        type = 'Developer';
        break;
      case PieceType.DESIGNER:
        type = 'Designer';
        break;
      case PieceType.OWNER:
        type = 'Owner';
        break;
    }
    
    return `${type} ${color}`;
  }

  resetGame(): void {
    this.initializeBoard(this.boardRows, this.boardCols);
    this.updateGameState();
  }

  newGame(): void {
    this.gameStarted = false;
    this.selectedBoardRows = 8;
    this.selectedBoardCols = 8;
  }

  getCurrentPlayerName(): string {
    return this.currentPlayer === PieceColor.WHITE ? 'Brancas' : 'Pretas';
  }

  getWinnerName(): string {
    if (!this.winner) return '';
    return this.winner === PieceColor.WHITE ? 'Brancas' : 'Pretas';
  }

  getColumnLabels(): string[] {
    const labels = [];
    for (let i = 0; i < this.boardCols; i++) {
      labels.push(String.fromCharCode(65 + i)); // A, B, C, D, etc.
    }
    return labels;
  }

  getRowLabels(): number[] {
    const labels = [];
    for (let i = this.boardRows; i >= 1; i--) {
      labels.push(i); // 8, 7, 6, 5, etc. (ordem reversa para visualização)
    }
    return labels;
  }
}
