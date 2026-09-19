---
name: Pinjari Heritage Archive
description: An illuminated living ancestral archive merging royal Islamic heritage with modern archival clarity.
colors:
  primary: "#0E382F"
  primary-dark: "#08241E"
  accent-gold: "#C6A15B"
  gold-light: "#E2C78A"
  gold-bright: "#D8B46B"
  parchment-bg: "#FAF7F0"
  parchment-subtle: "#F5EFE4"
  neutral-dark: "#171714"
  neutral-muted: "#8C7A63"
  neutral-subtle: "#78716C"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.08em"
  headline:
    fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.02em"
  title:
    fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body:
    fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.gold-bright}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  button-gold:
    backgroundColor: "{colors.accent-gold}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  card-parchment:
    backgroundColor: "{colors.parchment-bg}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Pinjari Heritage Archive

## Overview

**Creative North Star: "The Living Ancestral Sanctuary"**

The Pinjari Heritage Archive is an illuminated digital heirloom crafted to preserve, celebrate, and authenticate the genealogical lineage of the Pinjari family. The interface evokes the enduring gravitas of royal Islamic heritage manuscripts, family crests, and archival ledgers, paired harmoniously with modern digital responsiveness, tactile micro-interactions, and cryptographic QR authentication.

Every surface is built around warm, heirloom ivory parchment (`#FAF7F0`), deep forest emerald green (`#0E382F`), and antique spun gold (`#C6A15B`). The experience conveys permanence, ancestral dignity, and deep familial unity ("*Ek Khuda Ek Parivar*").

**Key Characteristics:**
- **Heirloom Parchment & Deep Emerald Tone**: Tactile warmth that honors ancestral documents rather than sterile modern white dashboards.
- **Architectural Symmetry & Arabesque Flourish**: Balanced geometric jali fretwork and golden hairlines framing authentic family portraits and legal records.
- **Sacred Archival Integrity**: High-legibility serif and sans typography calibrated for family elders, legal verification, and mobile reading.
- **Print & Physical Immortality**: Vector-solid backgrounds immune to browser print color stripping, ensuring digital ID cards print with 100% color saturation.

## Colors

The palette draws from historic Islamic illuminated manuscripts, antique gold foil, and warm parchment stationery.

### Primary
- **Forest Emerald Green** (`#0E382F`): The authoritative anchor color representing life, lineage, and Islamic heritage. Used for identity card left pillars, major callouts, primary buttons, and navigational focus.
- **Deep Sanctuary Green** (`#08241E`): Deep shadow variant for hover states, active pill buttons, and rich container depths.

### Secondary
- **Antique Heritage Gold** (`#C6A15B`): The sacred metallic accent representing honor and timeless value. Used for the Heritage Tree emblem, card hairlines, branch identifiers, and pillar rules.
- **Spun Gold Bright** (`#D8B46B`): Illuminated gold tone for typography on dark emerald backgrounds and tree foliage highlights.
- **Pale Gold Silk** (`#E2C78A`): Soft gold tint for italics, calligraphy ("*Ek Khuda Ek Parivar*"), and subtle badge glows.

### Neutral
- **Warm Ivory Parchment** (`#FAF7F0`): The foundational background canvas for identity cards, profile drawers, and document vaults.
- **Aged Paper Subtle** (`#F5EFE4`): Slightly deeper neutral used for input wells, secondary cards, and table headers.
- **Obsidian Archival Ink** (`#171714`): Primary text color, magnetic stripe graphic, and high-contrast title typography.
- **Warm Earth Umber** (`#8C7A63`): Secondary label color for metadata tags, generation indicators, and archival stamps.
- **Stone Umber Muted** (`#78716C`): Subdued tertiary text for legal disclaimers, timestamps, and subtle watermarks.
- **Pure White** (`#FFFFFF`): Reserved exclusively for photo frames, QR code backgrounds, and high-clarity document preview containers.

### Named Rules
**The Gold Hairline Rule.** Gold borders and dividers are always hairline-thin (1px to 2px max). Gold is an illuminating accent of distinction, never a loud or heavy fill.
**The Vector Fill Rule.** Any major brand background (Forest Emerald `#0E382F`, Parchment `#FAF7F0`, Obsidian `#171714`) intended for print or export must be backed by an inline SVG vector `<rect>` to guarantee full color immunity against browser print engines.

## Typography

**Display Font:** Cormorant Garamond / Playfair Display / Serif fallback  
**Body Font:** Inter / System-UI Sans fallback  
**Label / Mono Font:** JetBrains Mono / Monospace fallback  

**Character:** A dignified dialogue between historic editorial serif elegance (revering names, family roots, and spiritual mottoes) and ultra-clean modern grotesque sans (delivering effortless clarity for dates, roles, and administrative data).

### Hierarchy
- **Display** (Bold 700 / Black 900, clamp(1.75rem, 4vw, 2.5rem), line-height 1.15, tracking `0.08em` to `0.22em`): Used for primary institution marks (`PINJAR BADDA`), generational page titles, and hero member names.
- **Headline** (SemiBold 600 / Bold 700, 1.5rem, line-height 1.25): Modal titles, section headers, and kinship relationship groups.
- **Title** (Bold 700, 1.125rem, line-height 1.3): Member names in lists, document titles, and card headers.
- **Body** (Regular 400 / Medium 500, 0.875rem (14px), line-height 1.6): Biographies, legal disclaimers, document metadata, and general text.
- **Label / Tag** (SemiBold 600 / Bold 700, 0.6875rem to 0.75rem (11px-12px), uppercase, tracking `0.18em` to `0.28em`): Metadata kickers (`NAME`, `ROLE`, `BRANCH`, `GENERATION`, `MEMBER SINCE`).

### Named Rules
**The Lineage Kicker Rule.** Every metadata field on an identity or kinship surface must be paired with an uppercase, wide-tracked micro-label (e.g., `BRANCH: PINJ-G2-AKHTAR`) in Warm Earth Umber (`#8C7A63`) positioned above the bold value.

## Layout

The spatial model uses an 8px modular baseline grid with generous internal breathing room and high visual symmetry.

- **Containers**: Primary identity cards adhere strictly to the ISO/IEC 7810 ID-1 standard aspect ratio (1.586 : 1), scaling fluidly across viewport widths up to 680px.
- **Dividers**: Thin antique gold hairlines (`#C6A15B` with 30% to 50% opacity) separate panels, headers, and footers without creating visual clutter.
- **Responsive Layout**: On mobile viewports (<640px), cards and drawers maintain optical proportion while touch targets remain at minimum 44px for effortless elder accessibility.

## Elevation & Depth

Depth is established primarily through **tonal parchment layering** and crisp golden strokes rather than heavy artificial drop shadows.

- **Surfaces**: Flat parchment at rest with subtle 1px border contrast (`#E7DFD5` or `#C6A15B`/40).
- **Modals & Drawers**: Deep backdrop blur (`backdrop-blur-sm` over `rgba(0, 0, 0, 0.6)`) with soft ambient grounding shadows (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`).
- **Glassmorphic Accents**: Translucent panels (`rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(12px)`) used for floating controls and toolbars.

### Named Rules
**The Tactile Rest Rule.** Cards and document items rest comfortably on the parchment plane. Hover effects use slight scale lifts (`translateY(-2px)`) and golden border shifts rather than intense color shifts.

## Shapes

- **Card Outer Corners**: Generous rounded corners (`24px` to `32px` radius) providing a warm, friendly, heirloom feel.
- **Buttons & Inner Containers**: Medium rounded corners (`12px` to `16px` radius) balancing modern ergonomics with classical architecture.
- **Pills & Badges**: Fully rounded capsules (`9999px` radius) for status tags, generation chips, and family lead insignias.
- **Geometric Jali Borders**: Continuous arabesque diamond and rosette fretwork running along the bottom edges of official documents and identity cards.

## Components

### Member ID Card
- **Structure**: Dual-sided ISO ID-1 card (Front & Back).
- **Front Face**: Deep Forest Green (`#0E382F`) left pillar containing the Golden Heritage Tree emblem, `PINJAR BADDA` bold display typography, core values (`HERITAGE`, `UNITY`, `SUPPORT`, `PROGRESS`), and cursive script `Ek Khuda Ek Parivar`. Right panel contains portrait frame, name, Hindi name, role, generation, scannable QR code, and verified family motto.
- **Back Face**: Top deep green header band (`PINJARI HERITAGE ARCHIVE • GENEALOGICAL RECORD`), archival magnetic stripe graphic, authoritative lineage trail (`Root: Mohammad Pinjari ➔ ...`), verified spouse & children boxes, and archival security verification footer.
- **Actions**: Smooth 3D screen flip, direct 1-click **Download Color PDF**, permanent QR link copier, and print sheet.

### Buttons
- **Primary Emerald Button**: Deep Forest Green (`#0E382F`) background, Spun Gold (`#D8B46B`) text, rounded (`12px` to `16px`), padding `10px 20px`. Hover deepens to `#08241E`.
- **Secondary Parchment Button**: Crisp white or aged parchment background, border `1px solid #E7DFD5`, neutral dark text. Hover shifts to subtle warm stone.
- **Gold Action Pill**: Antique Gold (`#C6A15B`) border with soft gold tint fill (`rgba(198, 161, 91, 0.15)`), Spun Gold text, tracking `0.05em`.

### Document Cupboard & Vault Items
- **Card Styling**: Rounded (`16px`), warm parchment container with hairline border.
- **Badges**: Document type indicators (Aadhaar, PAN, Birth Certificate, Deed) color-coded with muted archival tones.
- **Actions**: Preview eye button, direct download, and bulk download checklist selection.

### Heritage Navigation
- **Top Bar**: Glassmorphic parchment blur with warm stone border, royal tree crest icon, quick search shortcut, language switcher, and authenticated user avatar.

## Do's and Don'ts

### Do:
- **Do** preserve the sacred tri-color harmony: Deep Forest Green (`#0E382F`), Warm Ivory Parchment (`#FAF7F0`), and Spun Antique Gold (`#C6A15B`).
- **Do** maintain authentic, verified data only (zero fake or demo placeholders).
- **Do** back all printable colored surfaces with vector SVG `<rect>` elements so browser print engines never strip background colors.
- **Do** provide bilingual transliterations (English & Hindi) for member names wherever available.
- **Do** ensure QR codes link permanently to `/documents?person=[id]` with high error-correction level (Level H).

### Don't:
- **Don't** use neon, harsh primary colors, or generic flat blues/purples that undermine the historical dignity of the archive.
- **Don't** use standard corporate SaaS dashboard patterns (stark white cards, cold gray borders, generic flat badges).
- **Don't** truncate or summarize genealogical lineage without showing the direct descent from Patriarch Mohammad Pinjari.
- **Don't** allow browser print styles to leak page navigation, background drawers, or action buttons onto identity card printouts.
