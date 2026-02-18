# IceTop — Design System

## 1. Brand Identity

**IceTop** uses a flat vector SASS aesthetic inspired by modern data tooling interfaces. The visual language is clean, geometric, and information-dense without clutter.

**Design pillars:**
- **Flat & geometric** — No gradients, shadows minimal, vector-style iconography
- **Information density** — Maximize data visibility; minimize chrome
- **Professional calm** — Navy-dominant palette creates a focused, trustworthy environment
- **Accent with purpose** — Yellow and orange draw attention only where action is needed

---

## 2. Color Palette

### 2.1 Core Tokens

```scss
// Primary
$navy-900: #0A1628;     // Deepest — app background (dark mode)
$navy-800: #0F1F38;     // Sidebar background
$navy-700: #162A4A;     // Panel backgrounds, cards
$navy-600: #1D365C;     // Active states, selected items
$navy-500: #25436E;     // Hover states
$navy-400: #3A5A8C;     // Secondary text, borders
$navy-300: #5B7AAF;     // Muted text
$navy-200: #8BA3CC;     // Placeholder text
$navy-100: #C5D3E8;     // Subtle borders
$navy-50:  #E8EEF5;     // Light background (light mode)

// Accent — Yellow (Primary actions, success states)
$yellow-500: #F5A623;   // Primary accent — buttons, active tab indicator
$yellow-400: #F7B84D;   // Hover state
$yellow-300: #F9CA77;   // Subtle highlights
$yellow-200: #FBDCA1;   // Light badges
$yellow-100: #FEEED0;   // Background tint

// Accent — Orange (Warnings, secondary actions)
$orange-500: #E8713A;   // Secondary accent — run buttons, important actions
$orange-400: #EC8D5E;   // Hover state
$orange-300: #F0A982;   // Subtle highlights
$orange-200: #F5C5A6;   // Light badges
$orange-100: #FAE2D3;   // Background tint

// Semantic
$success:  #2ECC71;
$error:    #E74C3C;
$warning:  $orange-500;
$info:     $navy-300;

// Neutrals (for text, borders in light mode)
$gray-900: #1A1A2E;
$gray-800: #2D2D44;
$gray-700: #44445A;
$gray-600: #5C5C72;
$gray-500: #7A7A8E;
$gray-400: #9999AA;
$gray-300: #B8B8C6;
$gray-200: #D4D4DE;
$gray-100: #EBEBF0;
$gray-50:  #F5F5F8;
$white:    #FFFFFF;
```

### 2.2 Theme Application

```scss
// Dark mode (default)
:root[data-theme="dark"] {
  --bg-app:        #{$navy-900};
  --bg-sidebar:    #{$navy-800};
  --bg-panel:      #{$navy-700};
  --bg-card:       #{$navy-600};
  --bg-input:      #{$navy-800};
  --bg-hover:      #{$navy-500};
  --bg-active:     #{$navy-600};

  --text-primary:  #{$gray-100};
  --text-secondary:#{$navy-200};
  --text-muted:    #{$navy-300};

  --border:        #{$navy-400};
  --border-subtle: #{$navy-600};

  --accent-primary:   #{$yellow-500};
  --accent-secondary: #{$orange-500};
}

// Light mode
:root[data-theme="light"] {
  --bg-app:        #{$gray-50};
  --bg-sidebar:    #{$white};
  --bg-panel:      #{$white};
  --bg-card:       #{$navy-50};
  --bg-input:      #{$white};
  --bg-hover:      #{$navy-50};
  --bg-active:     #{$navy-100};

  --text-primary:  #{$navy-900};
  --text-secondary:#{$navy-400};
  --text-muted:    #{$navy-300};

  --border:        #{$navy-100};
  --border-subtle: #{$gray-200};

  --accent-primary:   #{$yellow-500};
  --accent-secondary: #{$orange-500};
}
```

---

## 3. Typography

```scss
// Font stack
$font-family-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-family-mono:  'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

// Scale
$font-size-xs:    0.6875rem;   // 11px — metadata, badges
$font-size-sm:    0.75rem;     // 12px — sidebar labels, status bar
$font-size-base:  0.8125rem;   // 13px — body text (dense desktop app)
$font-size-md:    0.875rem;    // 14px — input fields, chat messages
$font-size-lg:    1rem;        // 16px — panel headers
$font-size-xl:    1.25rem;     // 20px — page titles
$font-size-2xl:   1.5rem;      // 24px — onboarding titles

// Weights
$font-weight-normal:  400;
$font-weight-medium:  500;
$font-weight-semibold:600;
$font-weight-bold:    700;

// Line heights
$line-height-tight:   1.25;
$line-height-normal:  1.5;
$line-height-loose:   1.75;
```

---

## 4. Spacing & Layout

```scss
// Spacing scale (4px base)
$space-1:  4px;
$space-2:  8px;
$space-3:  12px;
$space-4:  16px;
$space-5:  20px;
$space-6:  24px;
$space-8:  32px;
$space-10: 40px;
$space-12: 48px;

// Layout
$sidebar-width:        260px;
$sidebar-width-collapsed: 48px;
$toolbar-height:       40px;
$tab-height:           36px;
$status-bar-height:    24px;
$panel-min-width:      300px;

// Borders
$border-radius-sm:  4px;
$border-radius-md:  6px;
$border-radius-lg:  8px;
$border-radius-xl:  12px;
$border-width:      1px;
```

---

## 5. Component Styles

### 5.1 Sidebar Tree Node

```scss
.tree-node {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 $space-3;
  font-size: $font-size-sm;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: $border-radius-sm;
  transition: background-color 120ms ease;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &--active {
    background: var(--bg-active);
    color: var(--accent-primary);
  }

  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

### 5.2 Buttons

```scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  border: none;
  border-radius: $border-radius-md;
  cursor: pointer;
  transition: background-color 120ms ease, transform 80ms ease;

  &:active {
    transform: scale(0.97);
  }

  &--primary {
    background: var(--accent-primary);
    color: $navy-900;
  }

  &--secondary {
    background: var(--accent-secondary);
    color: $white;
  }

  &--ghost {
    background: transparent;
    color: var(--text-secondary);

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }
}
```

### 5.3 Tab Bar

```scss
.tab-bar {
  display: flex;
  height: $tab-height;
  background: var(--bg-panel);
  border-bottom: $border-width solid var(--border-subtle);
  overflow-x: auto;

  &__tab {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: 0 $space-4;
    font-size: $font-size-sm;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    cursor: pointer;

    &--active {
      color: var(--text-primary);
      border-bottom-color: var(--accent-primary);
    }

    &:hover:not(&--active) {
      color: var(--text-secondary);
    }
  }
}
```

### 5.4 Chat Bubble

```scss
.message {
  max-width: 85%;
  padding: $space-3 $space-4;
  border-radius: $border-radius-lg;
  font-size: $font-size-md;
  line-height: $line-height-normal;

  &--user {
    align-self: flex-end;
    background: var(--accent-primary);
    color: $navy-900;
    border-bottom-right-radius: $border-radius-sm;
  }

  &--assistant {
    align-self: flex-start;
    background: var(--bg-card);
    color: var(--text-primary);
    border-bottom-left-radius: $border-radius-sm;
  }

  code {
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    background: rgba(0, 0, 0, 0.15);
    padding: 2px 4px;
    border-radius: $border-radius-sm;
  }
}
```

---

## 6. Iconography

- **Style**: Flat, 1.5px stroke, rounded caps, 20×20 viewBox
- **Source**: Lucide Icons (MIT license, consistent with flat aesthetic)
- **Color**: Inherit from parent `color` property
- **Catalog icon**: Database cylinder
- **Namespace icon**: Folder
- **Table icon**: Grid/table
- **Chat icon**: Message bubble
- **SQL icon**: Code terminal
- **Notebook icon**: Book/journal
- **Settings icon**: Gear/cog

---

## 7. Motion & Animation

```scss
// Transitions
$transition-fast:    120ms ease;
$transition-normal:  200ms ease;
$transition-slow:    300ms ease-in-out;

// Use sparingly — flat design avoids excessive motion
// Allowed animations:
// - Sidebar expand/collapse (height transition)
// - Tab switch (opacity crossfade)
// - Button press (scale 0.97)
// - Loading spinner (rotate)
// - Chat message entrance (translateY + opacity)
```

---

## 8. Layout Blueprint

```
┌──────────────────────────────────────────────────────────────┐
│  ● ● ●   IceTop                                    ─ □ ✕   │  ← Title bar
├────────────┬─────────────────────────────────────────────────┤
│            │  ┌─ Chat ─┬─ SQL ─┬─ Notebook ─┐              │  ← Tab bar
│  Catalogs  │  │        │       │             │              │
│  ─────────  │  │                              │              │
│  ▸ default │  │                              │              │
│    ▸ prod  │  │     Active panel content     │              │
│      users │  │                              │              │
│      orders│  │                              │              │
│  ▸ staging │  │                              │              │
│            │  │                              │              │
│  ─────────  │  │                              │              │
│  📖 Docs   │  │                              │              │
│  ⚙ Settings│  │                              │              │
├────────────┴─────────────────────────────────────────────────┤
│  ● Connected: default  │  Python 3.12  │  Theme: Dark       │  ← Status bar
└──────────────────────────────────────────────────────────────┘
```
