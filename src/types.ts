//========= GLOBALLY USED TYPES =========//
export interface Updatable {
  update(dt: number): void; // delta time in milliseconds
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Coordinates {
  x: number;
  y: number;
}
