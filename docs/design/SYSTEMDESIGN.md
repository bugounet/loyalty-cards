Design System Document: Fidelity-Cards app
This design system is a bespoke framework for a high-end loyalty card wallet. It moves beyond the "standard" mobile interface, embracing an editorial layout that prioritizes clarity, sophisticated depth, and an obsessive focus on tonal harmony. We are not just building a list of cards; we are creating a digital sanctuary for a user’s value.
---
1. Overview & Creative North Star
Creative North Star: "Fidelity cards"
The objective is to make the user feel like they are interacting with a premium, physical leather wallet that has been reimagined in a digital, glass-like space.
Instead of rigid, boxed grids, this design system utilizes intentional asymmetry and tonal layering. We break the "template" look by using exaggerated typographic scales—where massive headlines meet tiny, high-contrast labels—and by allowing elements to overlap slightly to create a sense of tactile depth. The goal is "Organized Efficiency": everything has a place, but that place is defined by light and shadow, not by lines.
---
2. Colors & Surface Philosophy
Our palette is anchored by a vibrant, authoritative indigo (`primary: #0032b4`) set against a base of hyper-clean, "Cool Paper" neutrals.
The "No-Line" Rule
Explicit Instruction: Designers are prohibited from using 1px solid borders to define sections.
Boundaries must be created through:
Tonal Shifts: Placing a `surface-container-low` (#f4f2fc) element on a `surface` (#fbf8ff) background.
Negative Space: Using generous padding (1.5rem+) to separate thoughts.
Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine paper or frosted glass.
Base: `surface` (#fbf8ff)
Sectioning: `surface-container` (#efedf6) for large grouped content.
Interactive Cards: `surface-container-lowest` (#ffffff) for the highest visual prominence and "lift."
The "Glass & Gradient" Rule: Floating elements (like navigation bars or "Add Card" buttons) should use `surface-tint` (#104af0) at 8% opacity with a `24px` backdrop blur.
Signature Textures
Avoid flat primary blocks. For hero sections or primary CTAs, apply a subtle linear gradient:
From: `primary` (#0032b4) To: `primary-container` (#0145ec).
This creates "visual soul" and prevents the app from feeling like a basic utility.
---
3. Typography: The Editorial Engine
We pair the utilitarian clarity of Inter with the architectural character of Manrope.
Role	Font	Size	Intent
Display	Manrope	3.5rem	Used for reward balances and "big wins."
Headline	Manrope	2rem	For screen titles. Set with tight letter-spacing (-0.02em).
Title	Inter	1.125rem	Semi-bold. For card names and merchant titles.
Body	Inter	1rem	Regular. The workhorse for descriptions.
Label	Inter	0.75rem	All-caps, tracked out (+0.05em). For metadata.
The Hierarchy Rule: Use `on-surface-variant` (#454652) for body text and `on-surface` (#1a1b22) for headlines to create a sophisticated grey-to-black contrast that feels more "magazine" than "database."
---
4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "software-like." This design system uses Ambient Tonal Lift.
The Layering Principle: To lift a loyalty card from the background, place a `surface-container-lowest` card on a `surface-container` background. The subtle shift from `#efedf6` to `#ffffff` provides all the separation needed.
Ambient Shadows: If a shadow is required for a floating action button, use:
`blur: 40px`, `y: 12px`, `color: rgba(0, 50, 180, 0.08)`.
The shadow is tinted with the primary blue, making it feel like light is passing through the element.
The "Ghost Border": For cards with white backgrounds on white surfaces, use `outline-variant` (#c5c5d4) at 15% opacity. It should be felt, not seen.
---
5. Components
Cards (The Core Component)
Style: No borders. Use `lg` (1rem) corner radius.
Content: Vertical spacing between merchant logo and loyalty points should be `xl` (1.5rem) to signify premium air.
Prohibition: Never use a horizontal divider line inside a card. Use a `surface-variant` (#e3e1ea) background for the footer area of the card instead.
Buttons
Primary: Gradient of `primary` to `primary-container`. Corner radius `full` (pill shape).
Secondary: `secondary-container` (#c9cffd) background with `on-secondary-container` (#51577f) text.
Tertiary: No background. Text-only using `primary` color, heavy weight.
Input Fields
Layout: "Floating" style. The label sits in a `label-md` style above the field.
State: The field itself is `surface-container-low` (#f4f2fc) with a `0.75rem` radius. On focus, the background remains, but a `2px` "Ghost Border" of `primary` appears.
Chips (Category Filters)
Unselected: `surface-container-high` (#e9e7f0) with `on-surface-variant`.
Selected: `primary` (#0032b4) with `on-primary` (#ffffff).
---
6. Do’s and Don’ts
Do:
Use Asymmetry: Align text to the left but place currency/points to the far right, potentially overlapping the merchant logo slightly for an editorial feel.
Embrace Whitespace: If you think there is enough space, add 8px more.
Focus on Iconography: Use friendly, 2px stroke "Outline" icons. Ensure they are always centered in a `40x40px` soft-radius container.
Don’t:
Don't use Dividers: Never use a `1px` line to separate list items. Use an `8px` or `12px` gap.
Don't use Pure Black: Always use `on-surface` (#1a1b22) for high-contrast text. Pure black (#000000) is too harsh for this system.
Don't use Standard Shadows: Avoid the "Default" shadow settings in design tools. Always tint your shadows with the Primary or Secondary colors.
---
7. Roundedness Scale
Token	Value	Use Case
none	0px	Never used in this system.
sm	0.25rem	Small tags or tooltips.
md	0.75rem	Input fields and small nested components.
lg	1rem	Primary loyalty cards and containers.
xl	1.5rem	Modals and bottom sheets.
full	9999px	Buttons and search bars.

