```markdown
# Design System Document

## 1. Overview & Creative North Star

This design system is built upon the Creative North Star of **"The Physics Explorer."** It is a high-fidelity interface that bridges the gap between nostalgic retro-arcade energy and cutting-edge digital translucency. By leveraging the theme of **Physics Glass**, the interface does not merely sit on top of the gaming experience; it floats within it, acting as a high-tech lens through which the user views the interactive environment.

To break away from "standard" web templates, this system avoids rigid vertical stacking. Instead, it utilizes **intentional asymmetry**, where key UI elements might overlap or extend beyond traditional container boundaries. We favor depth, glow, and atmospheric perspective over flat, grid-locked structures. This creates a sense of kinetic energy, as if the UI is caught in the same gravitational pull as the planetary bodies it orbits.

---

## 2. Colors & Atmospheric Depth

The palette is anchored by the infinite depth of space, punctuated by high-vibrancy "Energy Tokens" that signal interaction and power.

-   **The Background Role (`#070e1b`):** This isn't just a color; it’s a void. All panels must emerge from this dark navy/black base.
-   **Primary Accents (`primary`: `#c1fffe` / `primary_container`: `#00ffff`):** Representing "Deep Ocean Cyan," these are for high-priority interactive elements.
-   **Secondary Accents (`secondary`: `#fcdc00` / `secondary_container`: `#6d5e00`):** Representing "Static Energy Yellow," these signify achievement, scores, and celebratory states.

### The "No-Line" Rule
Sectioning must never be achieved with 1px solid borders. To define boundaries, use **background color shifts**. Use `surface_container_low` for sections resting on the main `surface`, or use `surface_bright` to highlight a focal point. Contrast is your separator, not lines.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of experimental matter. 
-   **Base:** `surface_dim` (#070e1b)
-   **Level 1 (Main Panels):** `surface_container` with 60% opacity and 20px backdrop-blur.
-   **Level 2 (Nested Items):** `surface_container_high` placed inside Level 1 to create a tactile lift.

### The "Glass & Gradient" Rule
Standard flat colors lack "soul." Every major surface must utilize **Glassmorphism**. Apply a `backdrop-blur(16px)` to any panel using a semi-transparent `surface_variant`. For CTAs, use a linear gradient transitioning from `primary_dim` to `primary` to simulate a glowing energy core.

---

## 3. Typography: The Dual-Era Approach

We balance precision with playfulness. The hierarchy is designed to be highly editorial, using massive scale shifts to create focal points.

-   **Display & Headline (Space Grotesk):** This is our "Retro-Arcade" soul. Used for scores, level titles, and "Game Over" screens. It should feel chunky, confident, and intentional.
    -   *Strategy:* Use `display-lg` (3.5rem) for hero moments. Don't be afraid to overlap these headers slightly with the UI panels below them.
-   **Title, Body, & Labels (Inter):** This is the "Clean Modern" side of the system. It handles the heavy lifting of information density.
    -   *Strategy:* Use `body-md` for general instructions. Maintain a generous line-height to ensure the cosmic background doesn't interfere with legibility.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows feel "heavy." In an experimental environment, light is ambient and multidirectional.

-   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. To make a card feel "active," move it from `surface_container_low` to `surface_container_highest`. 
-   **Ambient Shadows:** Use shadows only when an element is "floating" (above all else). Use the `on_surface` color as the shadow tint at 6% opacity with a blur radius of 32px or higher. This mimics the soft light-bleed of a nearby source.
-   **The "Ghost Border" Fallback:** If a divider is mandatory for accessibility, use the `outline_variant` token at **15% opacity**. It should feel like a faint light refraction on the edge of a glass pane, never a hard stroke.
-   **The Glow State:** Interactive elements (buttons, icons) should use a `primary` outer glow (`box-shadow: 0 0 15px rgba(0, 255, 255, 0.4)`) to indicate they are charged with energy.

---

## 5. Components

### Buttons (Energy Cores)
-   **Primary:** Rounded `xl` (3rem), `primary_container` background with a subtle glow. High-contrast `on_primary_container` text.
-   **Secondary:** Glassmorphic background (`surface_container_high` at 40% opacity) with a `primary` Ghost Border.
-   **States:** On hover, the button should "pulse" — increasing the glow radius and slightly shifting the gradient.

### Target Reticles (Interactive Motif)
Replace standard hover states or focus indicators with a **Target Reticle**. Use the `primary` color for a four-cornered bracket motif that frames the selected element, nodding to the precision mechanics of the inspiration.

### Cards & Lists
-   **No Dividers:** Separate list items using the **Spacing Scale** `spacing-4` (1.4rem) or by alternating background tints between `surface_container_low` and `surface_container`.
-   **Curvature:** All cards must use `rounded-lg` (2rem) to maintain the soft, organic aesthetic.

### Tooltips (Energy Fragments)
-   **Style:** `surface_container_highest` with 80% opacity and a `secondary` (Static Energy Yellow) "Ghost Border."
-   **Animation:** Tooltips should float in with a slight "gravity" bounce (overshoot transition).

---

## 6. Do's and Don'ts

### Do
-   **Do** allow the background textures and light rays to peek through the UI via backdrop blurs.
-   **Do** use `secondary` (Yellow) sparingly for "Success" states and "Collections" to make them feel rewarding.
-   **Do** use asymmetrical spacing; for example, a larger `spacing-12` top margin and a `spacing-8` bottom margin to create a sense of upward lift.

### Don't
-   **Don't** use pure `#000000` for panels. It kills the "Cosmic Glass" effect. Always use the `surface` tokens.
-   **Don't** use sharp 90-degree corners. The system is built on "Planetary Curves" (`rounded-lg` and `rounded-xl`).
-   **Don't** use high-opacity borders. If the border is the first thing you see, it's too heavy. It should only be visible upon close inspection.
-   **Don't** overcrowd the screen. Space is vast; your UI should be too. Use `spacing-16` or `spacing-20` to separate major content groups.

---

*Director's Note: Every pixel should feel like it's made of light and glass. If a component feels "heavy" or "static," increase the transparency, soften the corners, and add a blur. We aren't building a website; we're building a cockpit for a starship.*```