# True 3D rendering for the gameplay scene

**Status**: accepted (2026-09-04) — supersedes the "Do not use a full 3D engine for the first version" decision in `plan/a.md` §13.

The product brief originally prescribed a 2.5D look built from voxel-style sprites over a static background image. The static result felt dead, so we decided to render the gameplay scene as a true 3D scene instead: voxel characters and environment as real 3D geometry, lit and animated, viewed through a **fixed side-view camera with no user camera control**. The fixed camera keeps gameplay effectively 2D (typing targets stay screen-space, the danger line stays a screen position) while the scene gains real depth, lighting, and animation.

## Considered options

- **Pseudo-3D sprites with parallax** (the original plan_a §13 position): rejected — still reads as flat, which is what triggered this change.
- **Full free camera 3D**: rejected — camera control adds nothing to a typing game and risks obscuring enemy text, the most important UI element.

## Consequences

- WebGL becomes a hard requirement for the gameplay screen (desktop-first per plan_a §15).
- A 3D rendering library enters the bundle, deployed via Cloudflare Workers.
- Enemy text must be layered over the 3D scene (see plan_a §15: large, readable, never overlapping).
- The static background PNG (`public/voxel-battlefield.png`) is replaced by the 3D environment.
