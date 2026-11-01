---
name: Mindful Cadence
colors:
  surface: '#f7faf8'
  surface-dim: '#d7dbd9'
  surface-bright: '#f7faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f2'
  surface-container: '#ebefed'
  surface-container-high: '#e6e9e7'
  surface-container-highest: '#e0e3e1'
  on-surface: '#181c1b'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2d3130'
  inverse-on-surface: '#eef1ef'
  outline: '#6f7975'
  outline-variant: '#bec9c4'
  surface-tint: '#186a57'
  primary: '#005645'
  on-primary: '#ffffff'
  primary-container: '#1f6f5c'
  on-primary-container: '#a3efd7'
  inverse-primary: '#8ad5be'
  secondary: '#51625d'
  on-secondary: '#ffffff'
  secondary-container: '#d4e6e0'
  on-secondary-container: '#576863'
  tertiary: '#35514a'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d6961'
  on-tertiary-container: '#c8e7de'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a5f2d9'
  primary-fixed-dim: '#8ad5be'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#005141'
  secondary-fixed: '#d4e6e0'
  secondary-fixed-dim: '#b9cac5'
  on-secondary-fixed: '#0f1e1b'
  on-secondary-fixed-variant: '#3a4a46'
  tertiary-fixed: '#cae9e0'
  tertiary-fixed-dim: '#aecdc4'
  on-tertiary-fixed: '#03201a'
  on-tertiary-fixed-variant: '#304c45'
  background: '#f7faf8'
  on-background: '#181c1b'
  surface-variant: '#e0e3e1'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Sora
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Sora
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: DM Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for an intentional-scrolling mobile experience that actively counteracts algorithmic hyper-stimulation. Its personality is serene, grounded, clear-eyed, and inherently supportive. Rather than leveraging predatory engagement loops, dopamine triggers, or shame-driven mechanics like streaks, the interface establishes an atmosphere of agency, natural closure, and emotional decompression.

The aesthetic fuses modern Japanese minimalist editorial layouts with soft organic warmth. It employs generous spatial pacing, whisper-quiet micro-interactions, and deliberate structure. Every visual element communicates stability and pause: tactile pure-white cards hover quietly over a tinted sage environment, high-legibility typography creates clear reading rhythms, and subtle structural borders ground interactive surfaces. The overall tone feels like entering an unhurried, naturally lit architectural pavilion—comforting, clear, and unburdened by digital noise.

## Colors

The palette is rooted in grounding botanical shades, quiet tinted whites, and high-legibility deep tones. 

- **Primary (`#1F6F5C`)**: A deep spruce green serving as the intentional anchor for high-priority interactive touchpoints, key progress indicators, and active borders.
- **Secondary / Selected Accent (`#DCEEE8`)**: A pale, aerated sage mist used for selected pill fills, subtle highlight containers, and secondary badges, paired with the primary green border.
- **Special Dark / Handoff Surface (`#14302A`)**: A deep, tranquil forest green utilized exclusively for closing screens, evening check-outs, and reflective pauses, providing an intentional sensory downshift.
- **Canvas Neutral (`#F2F5F3`)**: A soft sage-tinted chalk that removes harsh optical glare while remaining airy and crisp.
- **Card & Elevated Surfaces (`#FFFFFF`)**: Pure flat white to elevate content with quiet clarity.
- **Typography & Details**:
  - Primary Headlines & Body: Near-black pine (`#12201B`), high contrast without the clinical sharpness of pure `#000000`.
  - Secondary & Supporting Text: Weathered grey-green (`#5B6B64`), soft yet fully WCAG AA compliant.
  - Borders & Outlines: Subtle edge tint (`#D9E1DD`) for interactive surface boundaries, and muted dividers (`#E2E8E4`) for structural demarcation.

## Typography

The typographic hierarchy establishes clear structural presence alongside relaxed reading comfort. 

- **Display & Headings (Sora)**: Tuned with tight tracking and confident weights (`600` and `700`). Sora introduces structured, modern geometry that frames content cleanly without shouting.
- **Reading & Functional Elements (DM Sans)**: Built for effortless legibility. Line heights are deliberately expanded (`1.45` to `1.55`) to facilitate unhurried, comfortable comprehension on handheld displays.
- **Handoff Screen Variant**: When appearing over the tertiary dark surface (`#14302A`), Sora headings adopt `#F2F5F3` and DM Sans body text adopts `#A4B6AE` to preserve visual softness during evening or session-conclusion periods.

## Layout & Spacing

Designed specifically for single-column portrait viewport environments (optimized around 390x844pt mobile devices), the spatial system prioritizes rhythm, breathing room, and predictable vertical flow.

- **Canvas Grids**: Fixed portrait margin of `20px` (`1.25rem`), keeping content off device bezels while maximizing surface space. Internal vertical sections maintain a standard `24px` to `32px` cadence to prevent visual density.
- **Safe Areas & Reach**: Top status bars and bottom navigation hubs observe full native safe-area insets. Primary action triggers are consistently placed within the bottom thumb-reach zone (between `16px` and `32px` above home indicator limits).
- **Breathing Space**: Vertical rhythm avoids compact layouts; cards and sections never press against each other, consistently spaced by at least `space-md` (`16px`) or `space-lg` (`24px`).

## Elevation & Depth

This design system avoids loud skeuomorphic drops and high-contrast ambient shadows. Depth is achieved purely through precise tonal separation and low-contrast outlines:

1. **Surface Base (Level 0)**: The canvas sits on `#F2F5F3`. It remains matte, textureless, and unadorned.
2. **Elevated Surface (Level 1 - Cards & Trays)**: Rendered in `#FFFFFF`, isolated cleanly from the canvas via a crisp `1px solid #D9E1DD` outline. A minimal, imperceptible ambient diffuse shadow (`0 4px 16px rgba(18, 32, 27, 0.03)`) may be used on dynamic floating sheets to provide lift without distraction.
3. **Modal & Floating Hubs (Level 2)**: Bottom sheets and floating context controllers use pure white, the standard 1px border (`#D9E1DD`), and a gentle diffuse floor shadow (`0 8px 24px rgba(18, 32, 27, 0.06)`).
4. **Handoff Mode (Special Transition)**: Complete canvas transformation to `#14302A`, flattening elevation into a single meditative plane with `1px solid rgba(220, 238, 232, 0.12)` borders.

## Shapes

The shape system blends friendly ergonomic curves with architectural precision:

- **Cards & Primary Modules**: Strict `20px` corner radius. This softens card-heavy feeds, matching modern hardware edge fillets without looking cartoonish.
- **Interactive Controls (Buttons & Selectable Chips)**: Fully pill-shaped (`rounded-full` / `9999px`) to invite natural fingertip placement.
- **Inputs & Smaller Containers**: Standardized at `12px` to `16px` border radii to maintain harmonious proportion alongside 20px parent cards.
- **Iconography**: Clean vector stroke language strictly configured at `1.8px` line width with rounded terminal caps and joins. Avoid filled, heavy, or visual-noise icons.

## Components

### Buttons
- **Primary Action**: 56px fixed height, pill-shaped (`rounded-full`), `#1F6F5C` background, `#FFFFFF` Sora/DM Sans label (`label-lg`, weight 600). Pressed state transitions gently to `#185849`.
- **Secondary / Ghost**: 56px height, pill-shaped, `#FFFFFF` background with `1px solid #D9E1DD` border, `#12201B` text. Active state subtly transitions to `#F2F5F3`.
- **Quiet Utility**: 44px height, transparent background, `#5B6B64` text, no border.

### Cards & Content Surfaces
- Pure `#FFFFFF` background, `20px` border radius, bounded by `1px solid #D9E1DD`.
- Internal padding is set to `20px` (`space-lg`), separating media, typography, and card actions with an uncluttered hierarchy.

### Selectable Chips & Pills
- Minimum height of 40px for comfortable tap targeting.
- **Unselected**: `#FFFFFF` background, `1px solid #D9E1DD`, text `#5B6B64`.
- **Selected**: Pale sage background `#DCEEE8`, accented with a `1.5px solid #1F6F5C` border and `#1F6F5C` text label.

### Form Inputs & Text Fields
- 52px height, `14px` border radius, `#FFFFFF` background with `1px solid #D9E1DD`.
- Placeholder text rendered in `#5B6B64` at 60% opacity. Focused state transitions border to `1.5px solid #1F6F5C` without aggressive glow rings.

### Checkboxes & Radios
- Checkboxes: 22x22px, `6px` radius, `1.8px solid #D9E1DD`. Checked state transitions to `#1F6F5C` fill with a pure white 1.8px stroke checkmark.
- Radios: 22x22px circular, `1.8px solid #D9E1DD`. Selected state features an interior `#1F6F5C` solid dot.

### Specialized Intentionality Components
- **The Handoff View**: Fullscreen surface styled in `#14302A`, centered typography (`headline-lg` in `#F2F5F3`), supporting serene reflection text in `#A4B6AE`, paired with a single quiet exit button.
- **Reading Breather / Section Delimiters**: Instead of dense infinite-scroll loaders, feeds terminate into an organic, centered glyph marker with quiet text ("You are caught up") framed by generous `48px` vertical margins.