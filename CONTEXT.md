# Voxel Typing Game

A web-based touch-typing game in an original voxel sandbox style: enemies walk toward the player carrying words, and the player defeats them by typing those words correctly. "Minecraft Typing" is only a temporary project name.

## Language

### Visuals

**Voxel Style**:
The game's original block-based visual style for characters and environment. No Minecraft assets, characters, or textures may be copied.
_Avoid_: "Minecraft look", pixel art

**Side View**:
The fixed camera that looks at the scene from the side, like a classic side-scrolling action game. The player never controls the camera.
_Avoid_: 2.5D, isometric

### Gameplay

**Player**:
The stationary character standing at the far left that attacks each time a key is pressed correctly.
_Avoid_: hero, character (unqualified)

**Enemy**:
A creature that appears on the right and carries a Word. Defeated by typing its Word completely. Kinds: Zombie, Skeleton, Creeper, Dragon — one kind per World.
_Avoid_: monster, mob

**Word**:
The letter sequence displayed above an enemy's head. Typing it completely defeats that enemy.
_Avoid_: label, text, name

**Matched Letter**:
A Word letter already typed correctly, displayed in red instead of white.
_Avoid_: hit letter, typed letter

**Candidate Group**:
The set of enemies whose Words still match the current typed sequence. Every correct key hits all of them; a miss resets the group and returns all Words to white.
_Avoid_: target lock, selection

**Danger Line**:
The position near the Player that an Enemy must not reach. Any enemy reaching it ends the game (Game Over).
_Avoid_: deadline, base

### Progression

**World**:
A group of Levels sharing one enemy kind and one training theme: Zombies (new keys), Skeletons (finger association), Creepers (common words), Dragon (short sentences).
_Avoid_: stage, chapter

**Level**:
A single playable stage inside a World that trains a specific set of keys or words, with its own best score and stars.
_Avoid_: mission, wave
