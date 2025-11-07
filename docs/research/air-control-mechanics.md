# Air Control & Inertia in 2D Games

## Overview

Air control refers to how much a player can influence their movement while airborne in a 2D game. This research document covers best practices from successful platformers and how to implement satisfying aerial movement.

## The Core Design Tension

### Realism vs. Game Feel

**Real Physics:**
- Once airborne, you cannot change momentum
- Direction changes require ground contact
- Feels "realistic" but often frustrating

**Game Physics:**
- Allow some mid-air control
- Players expect to be able to steer
- Feels responsive and fair

### The Solution: Reduced Air Control

Most successful 2D games use a **middle ground**:
- Preserve momentum from ground speed
- Allow direction changes but make them gradual
- Reduce (but don't eliminate) acceleration in air

## Research Findings

### From Successful Platformers

**Celeste:**
- 8-way air dash transfers momentum
- Wall jumps maintain speed
- Air control feels tight but weighted

**Hollow Knight:**
- Unaccelerated movement
- Simple but effective mid-air control
- Double jump allows course correction

**Super Meat Boy:**
- Very high air control (arcade feel)
- Instant direction changes
- Prioritizes responsiveness over realism

### Key Insight from Research

> "Going for something in between, where you've got aerial momentum but can affect it to some degree mid-air, can give a nice weightiness to the jump while still giving the player room to correct errors and feel in control."
>
> — Game Developer (2D Platformer Design)

## Implementation Patterns

### Pattern 1: Reduced Acceleration (Most Common)

```typescript
// Ground acceleration: 5000 px/sec²
// Air acceleration: 3000 px/sec² (60%)

const accel = isAirborne ? groundAccel * 0.6 : groundAccel;
```

**Pros:**
- Feels natural and intuitive
- Momentum matters but not punishing
- Standard in modern platformers

**Cons:**
- Less precise than full control
- Requires player to anticipate jumps

### Pattern 2: Speed Cap Reduction

```typescript
// Ground max speed: 150 px/sec
// Air max speed: 100 px/sec (66%)

const maxSpeed = isAirborne ? groundSpeed * 0.66 : groundSpeed;
```

**Pros:**
- Maintains acceleration feel
- Limits runaway momentum

**Cons:**
- Punishes running jumps
- Can feel inconsistent

### Pattern 3: Reduced Drag (Momentum Preservation)

```typescript
// Ground drag: 12 (per second)
// Air drag: 8 (67%)

const drag = isAirborne ? groundDrag * 0.67 : groundDrag;
```

**Pros:**
- Momentum carries further
- Rewards skilled movement
- Feels "floaty" in a good way

**Cons:**
- Can overshoot targets
- Less precise control

### Pattern 4: Hybrid (Recommended)

```typescript
// Combine reduced acceleration + reduced drag
const accel = isAirborne ? groundAccel * 0.6 : groundAccel;
const drag = isAirborne ? groundDrag * 0.67 : groundDrag;
const maxSpeed = groundSpeed; // Keep same max speed
```

**Pros:**
- Best of all approaches
- Momentum preserved but controllable
- Sprint jumps feel powerful

**Cons:**
- More parameters to tune
- Can take time to feel "right"

## Design Principles

### ✅ DO:

1. **Preserve momentum** - Velocity continues from ground to air
2. **Reduce acceleration** - 40-80% of ground acceleration
3. **Reduce drag** - Less friction in air preserves momentum
4. **Keep max speed** - Don't cap speed lower in air
5. **Make sprint meaningful** - Running jumps should go further

### ❌ DON'T:

1. **Zero air control** - Feels frustrating (Castlevania I/III problem)
2. **Full air control** - Feels weightless and unrealistic
3. **Lower max speed** - Punishes running jumps (feels bad)
4. **Instant direction changes** - Breaks physics immersion
5. **Same drag everywhere** - No difference between ground/air

## Tuning Guidelines

### Three Feel Profiles

**Arcade (Forgiving):**
```
Air Acceleration: 80% of ground
Air Drag: 60% of ground
Max Speed: Same as ground

Feel: Responsive, easy to control
Best For: Casual games, fast-paced action
Example: Super Meat Boy
```

**Realistic (Momentum-Heavy):**
```
Air Acceleration: 40% of ground
Air Drag: 80% of ground
Max Speed: Same as ground

Feel: Weighty, skill-based
Best For: Precision platformers
Example: Classic Castlevania
```

**Balanced (Recommended):**
```
Air Acceleration: 60% of ground
Air Drag: 67% of ground
Max Speed: Same as ground

Feel: Controllable but has weight
Best For: Most games
Example: Celeste, Hollow Knight
```

## Testing Scenarios

### Critical Test Cases

1. **Standing Jump**
   - Jump from standstill
   - Try to move left/right in air
   - Should feel gradual, not instant

2. **Running Jump**
   - Run at full speed
   - Jump while running
   - Should cover significantly more distance

3. **Sprint Jump**
   - Sprint at max speed
   - Jump while sprinting
   - Should be noticeably longer than regular jump

4. **Direction Change**
   - Run right at full speed
   - Jump, then try to go left
   - Should feel like "drifting" not instant reversal

5. **Precision Landing**
   - Jump toward small platform
   - Try to adjust landing mid-air
   - Should require skill but be possible

## Common Pitfalls

### Mistake 1: Too Much Air Control

**Symptom:** Character feels floaty, can reverse direction instantly
**Fix:** Lower airControlFactor from 0.8 to 0.6 or 0.5

### Mistake 2: Too Little Air Control

**Symptom:** Players feel helpless, fall to their death often
**Fix:** Increase airControlFactor from 0.3 to 0.5 or 0.6

### Mistake 3: High Drag in Air

**Symptom:** Jumps feel short, momentum dies quickly
**Fix:** Reduce airDragFactor from 1.0 to 0.6-0.7

### Mistake 4: Capping Air Speed

**Symptom:** Sprint jumps don't feel rewarding
**Fix:** Remove air speed cap, keep same maxSpeed

### Mistake 5: No Momentum Preservation

**Symptom:** All jumps feel the same regardless of ground speed
**Fix:** Don't reset velocity when jumping, preserve vx/vy

## Frame-Rate Independence

**Critical:** All air control must be frame-rate independent.

```typescript
// BAD: Frame-dependent
vx += moveX * accel;

// GOOD: Frame-independent
vx += moveX * accel * deltaTime;
```

Use delta time (seconds) for all velocity/acceleration calculations.

## Top-Down vs. Side-Scrolling

**Important Note:** This research primarily covers side-scrolling platformers.

**Top-Down Differences:**
- No gravity on horizontal plane
- Jump affects sprite Y-offset only
- Momentum works same way (preserve velocity)
- Air control principles still apply

**Implementation for Top-Down:**
```typescript
// Same air control logic, different rendering
const accel = isAirborne ? groundAccel * 0.6 : groundAccel;
const drag = isAirborne ? groundDrag * 0.67 : groundDrag;

// Horizontal movement unchanged
vx += moveX * accel * dt;
vy += moveY * accel * dt;

// Jump only affects sprite height (not position)
sprite.y = -jumpHeight;
```

## Summary

**Key Takeaways:**

1. **Use hybrid approach**: Reduce both acceleration (60%) and drag (67%) in air
2. **Preserve momentum**: Ground velocity carries into jump
3. **Keep max speed**: Don't cap speed lower in air
4. **Test thoroughly**: Use all test scenarios above
5. **Tune to taste**: Start with 0.6/0.67, adjust based on feel

**Recommended Default:**
```typescript
airControlFactor: 0.6   // 60% acceleration in air
airDragFactor: 0.67     // 67% drag in air (33% reduction)
maxSpeed: unchanged     // Same max speed everywhere
```

This creates jumps that feel:
- ✅ Responsive (can change direction)
- ✅ Weighty (momentum matters)
- ✅ Skillful (timing is rewarded)
- ✅ Fair (mistakes can be corrected)

## References

- [Designing a 2D Jump](https://www.gamedeveloper.com/design/designing-a-2d-jump) - Game Developer
- [Physics in Platformer Games](https://2dengine.com/doc/platformers.html) - 2D Engine
- [The Mechanics Behind Satisfying 2D Jumping](https://kotaku.com/the-mechanics-behind-satisfying-2d-jumping-1761940693) - Kotaku
- [13 More Tips for Making a Fun Platformer](http://devmag.org.za/2012/07/19/13-more-tips-for-making-a-fun-platformer/) - Dev.Mag
