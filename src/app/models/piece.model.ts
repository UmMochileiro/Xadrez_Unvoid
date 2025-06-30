export enum PieceType {
  DEVELOPER = 'developer',
  DESIGNER = 'designer',
  OWNER = 'owner'
}

export enum PieceColor {
  WHITE = 'white',
  BLACK = 'black'
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  type: PieceType;
  color: PieceColor;
  position: Position;
  id: string;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
}
