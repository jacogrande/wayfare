# Tilemap Editor Plan

## Overview

Build an in-game tilemap editor that allows creating and editing maps using our custom tilesets. The editor should support multi-layer editing, real-time preview, and export to our JSON format.

## Goals

### Primary Goals
1. Create and edit tilemaps visually
2. Support all existing tile types and variants
3. Edit multiple layers independently
4. Export to our JSON format
5. Real-time preview with proper rendering
6. Usable with keyboard and mouse

### Secondary Goals
1. Import existing maps for editing
2. Undo/redo functionality
3. Layer visibility toggle
4. Grid overlay
5. Copy/paste tile regions
6. Fill tool for large areas

### Non-Goals (Future)
1. Custom tilesets (use existing OVERWORLD_TILESET only)
2. Tile animation preview
3. Multiplayer editing
4. Auto-tiling/smart tiles

## Architecture

### SOLID Design

**Separation of Concerns:**
1. **EditorScene** - Main editor scene (container, lifecycle)
2. **EditorToolbar** - Tool selection UI (paint, erase, fill)
3. **EditorLayerPanel** - Layer management UI (add, delete, visibility, z-index)
4. **EditorTilePalette** - Tile selection UI (displays available tiles)
5. **EditorCanvas** - Interactive map editing surface
6. **EditorState** - Editor state management (current tool, layer, tile)
7. **EditorExporter** - Export to JSON format
8. **EditorImporter** - Import from JSON format

**Dependency Injection:**
- EditorCanvas receives `tileMap`, `renderer`, `state`
- EditorToolbar receives `state` (to update tool)
- Components don't directly reference each other

### Component Breakdown

#### 1. EditorScene (Entry Point)

```typescript
class EditorScene extends Scene {
  private toolbar: EditorToolbar;
  private layerPanel: EditorLayerPanel;
  private tilePalette: EditorTilePalette;
  private canvas: EditorCanvas;
  private state: EditorState;

  async start() {
    // Initialize components
    // Set up layout
    // Wire up event handlers
  }

  update(dt: number) {
    // Update canvas (cursor preview, etc.)
  }
}
```

**Responsibilities:**
- Create and layout all UI components
- Manage editor state
- Handle save/load operations
- Switch between editor and game mode

#### 2. EditorState (State Management)

```typescript
interface EditorStateData {
  // Current selections
  currentTool: 'paint' | 'erase' | 'fill' | 'eyedropper';
  currentTileId: TileId | null;
  currentLayerName: string;

  // Map being edited
  tileMap: TileMap;
  mapName: string;

  // UI state
  showGrid: boolean;
  layerVisibility: Map<string, boolean>;

  // History
  history: EditorAction[];
  historyIndex: number;
}

class EditorState {
  private data: EditorStateData;
  private listeners: Set<(data: EditorStateData) => void>;

  // Getters
  getTool(): string;
  getCurrentTile(): TileId | null;
  getCurrentLayer(): TileLayer;

  // Setters (notify listeners)
  setTool(tool: string): void;
  setCurrentTile(tileId: TileId): void;
  setCurrentLayer(layerName: string): void;

  // History
  pushAction(action: EditorAction): void;
  undo(): void;
  redo(): void;

  // Listeners
  subscribe(listener: (data: EditorStateData) => void): void;
  unsubscribe(listener: (data: EditorStateData) => void): void;
  private notify(): void;
}
```

**Responsibilities:**
- Centralized state management
- Observer pattern for UI updates
- Undo/redo history
- No direct UI references

#### 3. EditorCanvas (Interactive Map)

```typescript
class EditorCanvas {
  private container: Container;
  private tileMap: TileMap;
  private renderer: TileMapRenderer;
  private state: EditorState;
  private cursorSprite: Sprite;
  private gridOverlay: Graphics;

  constructor(tileMap: TileMap, renderer: TileMapRenderer, state: EditorState);

  // Input handling
  private onMouseDown(event: PointerEvent): void;
  private onMouseMove(event: PointerEvent): void;
  private onMouseUp(event: PointerEvent): void;

  // Drawing operations
  private paintTile(tileX: number, tileY: number): void;
  private eraseTile(tileX: number, tileY: number): void;
  private fillArea(tileX: number, tileY: number): void;
  private eyedropTile(tileX: number, tileY: number): void;

  // Rendering
  private updateCursorPreview(tileX: number, tileY: number): void;
  private drawGrid(): void;

  // Coordinate conversion
  private screenToTile(screenX: number, screenY: number): { x: number; y: number };
}
```

**Responsibilities:**
- Handle mouse input for tile placement
- Show cursor preview
- Execute tool operations
- Grid overlay rendering
- Coordinate conversion

#### 4. EditorToolbar (Tool Selection)

```typescript
interface Tool {
  id: 'paint' | 'erase' | 'fill' | 'eyedropper';
  name: string;
  icon: string;
  hotkey: string;
}

class EditorToolbar {
  private container: Container;
  private state: EditorState;
  private tools: Tool[];
  private buttons: Map<string, Graphics>;

  constructor(state: EditorState);

  private createToolButton(tool: Tool): Graphics;
  private onToolSelected(toolId: string): void;
  private updateActiveButton(): void;

  // Keyboard shortcuts
  private setupHotkeys(): void;
}
```

**Responsibilities:**
- Display tool buttons
- Handle tool selection
- Keyboard shortcuts (P=paint, E=erase, F=fill, I=eyedropper)
- Visual feedback for active tool

#### 5. EditorLayerPanel (Layer Management)

```typescript
interface LayerListItem {
  name: string;
  zIndex: number;
  visible: boolean;
}

class EditorLayerPanel {
  private container: Container;
  private state: EditorState;
  private layerList: LayerListItem[];

  constructor(state: EditorState);

  // UI
  private createLayerItem(layer: LayerListItem): Container;
  private refreshLayerList(): void;

  // Actions
  private onLayerSelected(layerName: string): void;
  private onVisibilityToggle(layerName: string): void;
  private onAddLayer(): void;
  private onDeleteLayer(layerName: string): void;
  private onMoveLayerUp(layerName: string): void;
  private onMoveLayerDown(layerName: string): void;
}
```

**Responsibilities:**
- Display list of layers
- Select active layer
- Toggle layer visibility
- Add/delete layers
- Reorder layers (change z-index)

#### 6. EditorTilePalette (Tile Selection)

```typescript
class EditorTilePalette {
  private container: Container;
  private state: EditorState;
  private tileButtons: Map<TileId, Sprite>;
  private textures: Map<TileId, Texture[]>;

  constructor(state: EditorState, textures: Map<TileId, Texture[]>);

  private createTileButton(tileId: TileId): Sprite;
  private onTileSelected(tileId: TileId): void;
  private updateSelectedTile(): void;

  // Variant selection
  private showVariantPicker(tileId: TileId): void;
}
```

**Responsibilities:**
- Display available tiles
- Tile selection
- Show tile variants
- Visual feedback for selected tile

#### 7. EditorExporter (Save Maps)

```typescript
class EditorExporter {
  static exportToJSON(tileMap: TileMap, mapName: string): TileMapData {
    return TileMapLoader.exportToData(tileMap);
  }

  static downloadJSON(data: TileMapData, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  static async saveToFile(data: TileMapData, path: string): Promise<void> {
    // In browser: download file
    // In Electron/Tauri: write to filesystem
  }
}
```

**Responsibilities:**
- Convert TileMap to JSON format
- Trigger file download
- Handle save operations

#### 8. EditorImporter (Load Maps)

```typescript
class EditorImporter {
  static async importFromFile(file: File): Promise<TileMap> {
    const json = await file.text();
    const data = JSON.parse(json) as TileMapData;
    return TileMapLoader.parseMapData(data);
  }

  static async loadFromPath(path: string): Promise<TileMap> {
    return TileMapLoader.loadFromFile(path);
  }
}
```

**Responsibilities:**
- Parse uploaded JSON files
- Load maps for editing
- Validate imported data

## UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Toolbar: [Paint] [Erase] [Fill] [Eyedropper]  [Save] [Load]   │
├─────────────┬──────────────────────────────────┬───────────────┤
│             │                                  │               │
│  Tile       │                                  │    Layer      │
│  Palette    │        Canvas                    │    Panel      │
│             │      (Editable Map)              │               │
│  [Grass]    │                                  │  ☑ walls      │
│  [Water]    │                                  │  ☑ objects    │
│  [Rock]     │                                  │  ☑ ground     │
│  [Tree]     │                                  │               │
│  [Log]      │                                  │  [+ Add]      │
│             │                                  │  [- Delete]   │
│             │                                  │               │
└─────────────┴──────────────────────────────────┴───────────────┘
```

### Layout Specifications

**Toolbar** (Top):
- Height: 50px
- Tools: Paint, Erase, Fill, Eyedropper
- Actions: Save, Load, New, Export
- Position: Fixed at top

**Tile Palette** (Left):
- Width: 150px
- Shows all available tiles as clickable sprites
- Scrollable if many tiles
- Highlights selected tile

**Canvas** (Center):
- Takes remaining space
- Centered map view
- Pan with middle mouse or arrow keys
- Zoom with scroll wheel
- Grid overlay (toggle with G key)

**Layer Panel** (Right):
- Width: 200px
- Lists all layers with visibility checkboxes
- Active layer highlighted
- Add/delete layer buttons
- Move layer up/down buttons

**Status Bar** (Bottom, optional):
- Height: 30px
- Shows: cursor position, current layer, current tile, map dimensions

## User Interactions

### Mouse Controls

**Left Click:**
- Paint tool: Place current tile
- Erase tool: Remove tile
- Fill tool: Flood fill area
- Eyedropper tool: Pick tile from map

**Right Click:**
- Quick erase (regardless of current tool)

**Middle Mouse Drag:**
- Pan canvas view

**Scroll Wheel:**
- Zoom in/out

**Drag (planned):**
- Paint tool: Paint multiple tiles
- Erase tool: Erase multiple tiles

### Keyboard Shortcuts

**Tools:**
- `P` - Paint tool
- `E` - Erase tool
- `F` - Fill tool
- `I` - Eyedropper tool

**Actions:**
- `Ctrl/Cmd + S` - Save map
- `Ctrl/Cmd + O` - Open map
- `Ctrl/Cmd + N` - New map
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

**View:**
- `G` - Toggle grid
- `Arrow Keys` - Pan view
- `+/-` - Zoom in/out
- `0` - Reset zoom

**Layers:**
- `[` - Select layer below
- `]` - Select layer above
- `H` - Toggle current layer visibility

## Implementation Phases

### Phase 1: Core Editor (MVP)
**Goal:** Basic editing functionality

1. ✅ Create EditorScene skeleton
2. ✅ Implement EditorState
3. ✅ Create EditorCanvas with mouse input
4. ✅ Implement paint tool
5. ✅ Implement erase tool
6. ✅ Create EditorToolbar with tool switching
7. ✅ Create EditorTilePalette
8. ✅ Basic layout (toolbar + canvas + palette)
9. ✅ Export to JSON

**Deliverable:** Can paint and erase tiles, export to JSON

### Phase 2: Layer Support
**Goal:** Multi-layer editing

1. ✅ Create EditorLayerPanel
2. ✅ Layer selection
3. ✅ Layer visibility toggle
4. ✅ Add/delete layers
5. ✅ Integrate with canvas (only edit current layer)
6. ✅ Layer ordering (move up/down)

**Deliverable:** Can edit multiple layers independently

### Phase 3: Advanced Tools
**Goal:** Productivity features

1. ✅ Fill tool (flood fill algorithm)
2. ✅ Eyedropper tool
3. ✅ Grid overlay
4. ✅ Cursor preview (ghost tile)
5. ✅ Pan/zoom controls
6. ✅ Keyboard shortcuts

**Deliverable:** Efficient editing experience

### Phase 4: Undo/Redo
**Goal:** Mistake recovery

1. ✅ Define EditorAction interface
2. ✅ Implement action history in EditorState
3. ✅ Undo functionality
4. ✅ Redo functionality
5. ✅ UI feedback (undo/redo buttons)

**Deliverable:** Can undo/redo changes

### Phase 5: Import/Export
**Goal:** Complete workflow

1. ✅ File download for export
2. ✅ File upload for import
3. ✅ New map dialog (set dimensions)
4. ✅ Save dialog (set name)
5. ✅ Load existing maps

**Deliverable:** Complete map creation workflow

### Phase 6: Polish
**Goal:** Professional feel

1. ⏳ Keyboard shortcut hints (tooltips)
2. ⏳ Status bar with info
3. ⏳ Confirmation dialogs (delete layer, new map)
4. ⏳ Better visual design (icons, colors)
5. ⏳ Loading indicators
6. ⏳ Error messages (validation)

**Deliverable:** Polished, user-friendly editor

### Phase 7: Advanced Features (Future)
**Goal:** Power user features

1. ⏳ Copy/paste tile regions
2. ⏳ Selection rectangle
3. ⏳ Tile rotation/flipping
4. ⏳ Find/replace tiles
5. ⏳ Tileset hot-reload
6. ⏳ Map preview (playtest mode)

**Deliverable:** Advanced editing capabilities

## Technical Considerations

### Performance

**Large Maps:**
- Use same chunk-based rendering as game
- Only render visible portion
- Lazy load chunks as user pans

**Undo/Redo:**
- Store diffs, not full map copies
- Limit history size (e.g., 50 actions)
- Compress old history entries

**UI Updates:**
- Debounce mouse move events
- Batch tile updates during drag
- Use observer pattern to minimize re-renders

### Data Structures

**EditorAction (for undo/redo):**
```typescript
interface EditorAction {
  type: 'paint' | 'erase' | 'fill' | 'addLayer' | 'deleteLayer';
  layerName: string;

  // For tile operations
  tiles?: Array<{ x: number; y: number; before: Tile | null; after: Tile | null }>;

  // For layer operations
  layer?: TileLayer;

  // Execute and reverse
  execute(): void;
  undo(): void;
}
```

**EditorState Change Events:**
```typescript
type EditorStateChange =
  | { type: 'tool-changed'; tool: string }
  | { type: 'tile-changed'; tileId: TileId }
  | { type: 'layer-changed'; layerName: string }
  | { type: 'visibility-changed'; layerName: string; visible: boolean }
  | { type: 'map-modified' };
```

### Integration with Game

**Scene Switching:**
```typescript
// Enter editor mode
gameScene.pause();
editorScene.start(currentMap);

// Exit editor mode
editorScene.stop();
gameScene.resume(updatedMap);
```

**Shared Resources:**
- Use same TileMap, TileMapRenderer
- Use same tileset textures
- Use same TileConfig for collision preview

### Testing Strategy

**Unit Tests:**
- EditorState (tool switching, history)
- Fill algorithm (flood fill correctness)
- Coordinate conversion (screen to tile)
- Export/import (JSON round-trip)

**Integration Tests:**
- Paint multiple tiles
- Undo/redo sequence
- Layer visibility affects rendering
- Export then import map

**Manual Tests:**
- Create 20x20 map with 3 layers
- Paint complex pattern
- Undo 10 times, redo 5 times
- Export, close, import, verify unchanged
- Test all keyboard shortcuts

## File Structure

```
src/
├── editor/
│   ├── EditorScene.ts           # Main editor scene
│   ├── EditorState.ts           # State management
│   ├── EditorCanvas.ts          # Interactive map surface
│   ├── EditorToolbar.ts         # Tool selection UI
│   ├── EditorLayerPanel.ts      # Layer management UI
│   ├── EditorTilePalette.ts     # Tile selection UI
│   ├── EditorExporter.ts        # Export to JSON
│   ├── EditorImporter.ts        # Import from JSON
│   ├── tools/
│   │   ├── PaintTool.ts         # Paint tile logic
│   │   ├── EraseTool.ts         # Erase tile logic
│   │   ├── FillTool.ts          # Flood fill algorithm
│   │   └── EyedropperTool.ts    # Pick tile logic
│   └── actions/
│       ├── EditorAction.ts      # Action interface
│       ├── PaintAction.ts       # Paint action (undo/redo)
│       ├── EraseAction.ts       # Erase action
│       └── FillAction.ts        # Fill action
```

## Future Enhancements

### Tileset Management
- Add new tile types without code changes
- Import custom tilesets
- Tile property editor (collision, height, behavior)

### Collaborative Editing
- Multi-user editing (WebRTC)
- Real-time cursor sharing
- Conflict resolution

### Auto-Tiling
- Smart tiles (auto-connect water, paths)
- Brush presets (forest, village, dungeon)
- Pattern templates

### Scripting
- Place entities with properties
- Trigger zones
- Spawn points
- Event scripting

### Visual Enhancements
- Minimap
- Layer blending modes
- Tile animation preview
- Lighting preview

## Success Criteria

### Minimum Viable Product (MVP)
- ✅ Create new map with dimensions
- ✅ Paint tiles on multiple layers
- ✅ Switch between layers
- ✅ Export to JSON format
- ✅ Import existing maps

### Full Release
- ✅ All MVP features
- ✅ Undo/redo (50 actions)
- ✅ Fill tool
- ✅ Grid overlay
- ✅ Keyboard shortcuts
- ✅ File download/upload
- ✅ Clean UI layout

### Polish Release
- ⏳ Keyboard shortcut hints
- ⏳ Status bar
- ⏳ Error handling
- ⏳ Loading states
- ⏳ Copy/paste regions
- ⏳ Preview mode (playtest)

## Resources Needed

### Assets
- Tool icons (paint, erase, fill, eyedropper)
- UI sprites (buttons, panels, checkboxes)
- Cursor sprites (for each tool)

### Dependencies
- No new dependencies needed
- Uses existing Pixi.js and game systems

### Documentation
- User guide for editor
- Video tutorial (optional)
- Keyboard shortcut reference

## Timeline Estimate

**Phase 1 (MVP):** 2-3 days
- Core editing, basic export

**Phase 2 (Layers):** 1-2 days
- Layer management UI

**Phase 3 (Tools):** 2-3 days
- Advanced tools, shortcuts

**Phase 4 (Undo/Redo):** 1-2 days
- History system

**Phase 5 (Import/Export):** 1 day
- File handling

**Phase 6 (Polish):** 2-3 days
- UI improvements, error handling

**Phase 7 (Advanced):** 3-5 days
- Copy/paste, preview mode

**Total:** 12-19 days for full release

## Summary

This tilemap editor will enable:
- ✅ Visual map creation (no hand-editing JSON)
- ✅ Multi-layer support (ground, objects, walls)
- ✅ Real-time preview (WYSIWYG)
- ✅ Export to our JSON format
- ✅ Undo/redo for mistakes
- ✅ Efficient workflow (keyboard shortcuts)

**Architecture highlights:**
- SOLID principles (separate components)
- Observer pattern (state management)
- Command pattern (undo/redo)
- Reuses existing game systems (TileMap, TileMapRenderer)

**Next step:** Begin Phase 1 implementation (EditorScene, EditorState, basic painting)
