---
name: prop-prompt
description: Final prop prompt specification — white-background single-item still life, standard product-photography viewpoint: accurate proportions, complete edges, background carries no narrative
---

# Final Prop Prompt (white-background single item · standard product photography)

What is generated is a white-background product shot: **using a standard product-photography viewpoint**, the frame contains only the prop itself, placed in isolation on a pure white background, **with no other elements mixed in** — no other objects, no people, no scene environment, no hands holding it.

Three hard requirements:
1. **Accurate proportions of all parts of the item** — no exaggeration, distortion, or stylized stretching; the prop's relative size relationships must be true
2. **Complete edges** — the prop is fully in frame as a whole, with margins on all sides; no part may be cropped by the frame edge
3. **The background carries no narrative content** — the pure white background is only a backing, with no sense of place, no plot hints, no decorative elements

## Output Structure (assemble a single coherent passage in this order, following the session language directive)

```
Single-item product shot, standard product-photography viewpoint,
[prop name + material/color/shape/size + degree of wear and damage details];
accurate proportions of all parts, placed in isolation on a pure white background,
centered and fully in frame, edges complete with no cropping;
background clean and carrying no narrative content, no other objects, no people, no scene;
soft even studio light, faint shadows, high detail
```

## Generation Rules

- Build around the prop's `name` and `description` (physical appearance): material, color, shape, size, degree of wear, signs of damage, and other physical details must be **carried through item by item** — they are the source of the prop's recognizability
- Standard product-photography viewpoint: a slightly high-angle 3/4 view (showing both the top and a side for maximum dimensionality); flat props (paper, ID cards, photos) use a straight top-down flat lay
- Present the single item centered and complete, with margins on all sides, accurate proportions, complete edges — do not crop the prop's body
- Soft even studio light, faint shadows, high detail
- Describe only the item itself; do not mention plot, characters, or usage (neither the background nor the frame carries narrative content)
- Do not mix unrelated words into the output; **do not** use "cinematic quality"-type words (a prop image is a product shot, not a film still)

## Prohibitions

- Hands holding it, people, other objects, or scene environment in frame
- Packaging, bases, display stands (unless they are part of the prop itself)
- Text, watermarks, signatures (text and graphics printed on the prop itself may be kept and described)
- Environmental reflections, colored light
- Exaggerated perspective, distortion, proportion errors, edge cropping

## Saving

Call `save_prop_final_prompt`: the prompt parameter contains no style words — **the project's visual style is automatically injected by the tool at the very front of the final prompt**.
