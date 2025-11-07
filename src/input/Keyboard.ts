export type Keys = Record<
  | "KeyW"
  | "ArrowUp"
  | "KeyA"
  | "ArrowLeft"
  | "KeyS"
  | "ArrowDown"
  | "KeyD"
  | "ArrowRight"
  | "ShiftLeft"
  | "ShiftRight"
  | "Space"
  | "KeyE"
  | "MouseLeft"
  | "KeyJ",
  boolean
>;

const keys: Keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ShiftLeft: false,
  ShiftRight: false,
  Space: false,
  KeyE: false,
  MouseLeft: false,
  KeyJ: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
};

let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;

  const onKeyDown = (e: KeyboardEvent) => {
    const code = e.code as keyof Keys;
    if (code in keys) {
      keys[code] = true;
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const code = e.code as keyof Keys;
    if (code in keys) {
      keys[code] = false;
      e.preventDefault();
    }
  };
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      keys.MouseLeft = true;
      e.preventDefault();
    }
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      keys.MouseLeft = false;
      e.preventDefault();
    }
  };
  const onBlur = () => {
    // prevent “stuck keys” if the tab loses focus
    for (const key of Object.keys(keys) as Array<keyof Keys>) {
      keys[key] = false;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", onBlur);

  // Vite HMR: clean up listeners on hot-reload so we don’t double-register
  const hot = (
    import.meta as ImportMeta & {
      hot?: { dispose(cb: () => void): void };
    }
  ).hot;
  if (hot) {
    hot.dispose(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
      initialized = false;
    });
  }
}

init();

// If you want to prevent accidental mutation, expose Readonly:
const Keyboard = {
  getKeys: (): Readonly<Keys> => keys,
} as const;

export default Keyboard;
