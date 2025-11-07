# Landing Assistance System

## Problem Statement

When a player jumps and lands with their horizontal position partially inside an obstacle, they can get stuck:
- Collision system detects blocking on all sides
- Player cannot move in any direction
- Frustrating gameplay experience

## Solution: Smart Landing Assistance

The `LandingAssist` class automatically corrects landing positions to prevent players from getting stuck in obstacles.

## How It Works

### 1. Detection Phase
When the player enters the **Landing** phase (touching ground after jump):
- Check if current position is blocked
- If blocked, trigger landing assistance

### 2. Search Phase
Find the nearest valid (unblocked) position:
- Search in expanding spiral pattern
- Check every 2 pixels outward
- Maximum search radius: 16 pixels (1 tile)
- Prioritize closest positions

### 3. Correction Phase
If valid position found:
- Move player to safe position
- Happens instantly during landing phase
- Player never notices the correction

## Configuration

```typescript
new LandingAssist({
  pushOutEnabled: true,   // Enable/disable system
  snapDistance: 6,        // Auto-snap within 6px
  checkRadius: 16,        // Search up to 16px away (1 tile)
});
```

### Parameters

**pushOutEnabled** (default: `true`)
- Enable automatic position correction
- If `false`, player can get stuck (testing mode)

**snapDistance** (default: `6` pixels)
- Distance threshold for instant snapping
- If nearest valid position is ≤6px away, use it immediately
- Prevents searching entire radius for close positions

**checkRadius** (default: `16` pixels)
- Maximum distance to search for valid positions
- 16px = 1 tile (matches game's tile size)
- Won't teleport player more than 1 tile away

## Search Algorithm

### Spiral Pattern Search

Searches in expanding square pattern:
```
        3
    3 2 2 2 3
  3 2 1 1 1 2 3
3 2 1 X 1 2 3
  3 2 1 1 1 2 3
    3 2 2 2 3
        3
```

**Priority order:**
1. Horizontal/Vertical (4 directions at each radius)
2. Diagonals (4 corners at each radius)
3. Closest distance wins

### Step Size: 2 pixels
- Balances precision vs. performance
- Finds valid positions quickly
- Smooth enough for gameplay

## Examples

### Example 1: Landing on Rock Edge

```
Before:               After Assistance:
┌─────┐              ┌─────┐
│ 🪨 │              │ 🪨 │
└──●──┘              └─────┘
   ▲                    ●──
Player stuck           Player pushed right (4px)
inside rock
```

### Example 2: Landing Between Two Obstacles

```
Before:               After Assistance:
┌─────┐  ┌─────┐    ┌─────┐  ┌─────┐
│ 🪨 │  │ 🌲 │    │ 🪨 │  │ 🌲 │
└──●──┘  └─────┘    └─────┘  └─────┘
   ▲                    ●
Stuck in gap         Pushed down (6px)
```

### Example 3: Landing Far From Valid Spot

```
Before:               After Assistance:
┌────────────┐        ┌────────────┐
│            │        │            │
│   ●        │        │●           │
│            │        │            │
└────────────┘        └────────────┘
Large water tile      Pushed to edge (10px)
(player in water)     (nearest valid position)
```

## Integration with Jump System

Landing assistance is **phase-triggered**:

```typescript
// In Player.update():
if (this.jumpState.getPhase() === JumpPhase.Landing) {
  const assisted = this.landingAssist.assistLanding(
    this.x,
    this.y,
    (wx, wy) => this.checkCollision(wx, wy),
  );

  if (assisted) {
    this.setPosition(assisted.x, assisted.y);
  }
}
```

**Why during Landing phase?**
- Landing phase lasts 100ms (brief window)
- Player experiences squash animation
- Position correction happens invisibly
- No jarring teleports

## Performance

**Worst Case:** 8 directions × 8 radii = 64 position checks
- Radius step: 2px
- Max radius: 16px
- Typically finds position within 2-3 checks (12-24 checks)

**Optimization:**
- Early exit when position found within snapDistance
- Uses simple distance calculation (no square root until needed)
- Only runs during Landing phase (infrequent)

**Impact:** <0.1ms per landing (negligible)

## Edge Cases

### No Valid Position Found

If no valid position within `checkRadius`:
- Player stays at current position
- May still be stuck (rare)
- Can happen in completely enclosed spaces

**Mitigation:**
- Design maps without inescapable pockets
- Use larger checkRadius if needed (e.g., 32px)

### Multiple Valid Positions

Always chooses **closest** position:
- Calculates distance to each valid position
- Selects minimum distance
- Tie-breaker: First found (spiral pattern bias)

### Landing While Moving

Assistance works with momentum:
- Corrects position immediately
- Player velocity unchanged
- Continues moving in same direction after correction

## Testing Scenarios

### Test 1: Edge Landing
1. Jump toward obstacle edge
2. Land slightly inside obstacle
3. **Expected:** Push to nearest side (2-4px correction)

### Test 2: Corner Landing
1. Jump toward obstacle corner
2. Land in corner pocket
3. **Expected:** Push to nearest diagonal (4-6px correction)

### Test 3: Center Landing
1. Jump onto small obstacle center
2. Land directly in middle
3. **Expected:** Push to any edge (6-8px correction)

### Test 4: Gap Landing
1. Jump between two close obstacles
2. Land in narrow gap
3. **Expected:** Push to either side or front/back

### Test 5: Sprint Jump Landing
1. Sprint jump at high speed
2. Land while moving fast
3. **Expected:** Correct position, maintain velocity

## Tuning Guidelines

### Forgiving (Easy Mode)
```typescript
snapDistance: 8,    // Larger snap zone
checkRadius: 24,    // Search further
```
- More assistance
- Easier for casual players
- May feel "magnetic"

### Strict (Precision Mode)
```typescript
snapDistance: 4,    // Smaller snap zone
checkRadius: 12,    // Search closer
```
- Less assistance
- Rewards precise jumping
- May frustrate some players

### Balanced (Default)
```typescript
snapDistance: 6,    // Medium snap zone
checkRadius: 16,    // 1 tile search
```
- Fair and forgiving
- Prevents frustration
- Maintains skill expression

## Alternative Approaches Considered

### ❌ Prevented Landing (Rejected)
**Idea:** Stop horizontal movement before landing in obstacle

**Why Rejected:**
- Removes player control
- Feels like collision while airborne
- Complex to implement correctly

### ❌ Bounce Back (Rejected)
**Idea:** Bounce player away when landing in obstacle

**Why Rejected:**
- Can bounce into danger
- Unpredictable behavior
- Feels punishing

### ❌ Gradual Push (Rejected)
**Idea:** Slowly push player out over multiple frames

**Why Rejected:**
- Visible sliding motion
- Feels glitchy
- Still stuck temporarily

### ✅ Instant Correction (Chosen)
**Why Chosen:**
- Invisible to player (happens during landing)
- Predictable (always nearest valid position)
- Forgiving (prevents stuck situations)
- Simple to implement and tune

## SOLID Principles

**Single Responsibility:**
- LandingAssist only handles position correction
- Doesn't modify jump physics or state
- Doesn't handle collision detection (uses callback)

**Open/Closed:**
- Configurable via constructor
- Can be extended with new search algorithms
- Closed for modification (stable API)

**Dependency Inversion:**
- Depends on collision check abstraction (callback)
- Doesn't know about Player or World internals
- Can be tested independently

## Future Enhancements

**Possible additions (not yet implemented):**

1. **Landing Preview**
   - Show where player will land before landing
   - Visual indicator for safe/unsafe landing spots

2. **Landing Particles**
   - Dust cloud effect on position correction
   - Visual feedback that correction happened

3. **Landing Sound**
   - Different sound for assisted landing
   - Audio cue for player awareness

4. **Adaptive Search**
   - Use player velocity to predict landing
   - Pre-calculate correction before landing phase

5. **Priority Directions**
   - Prefer pushing forward over backward
   - Respect player momentum direction

6. **Multi-Step Correction**
   - If first correction still blocked, try again
   - Recursive search for complex geometries

## Summary

Landing assistance makes jumping feel **fair and forgiving**:
- ✅ Prevents getting stuck in obstacles
- ✅ Invisible to player (no teleporting feel)
- ✅ Maintains game skill (precision still matters)
- ✅ Simple to tune (3 parameters)
- ✅ Performant (<0.1ms per landing)

Players can focus on **gameplay** instead of fighting collision edge cases.
