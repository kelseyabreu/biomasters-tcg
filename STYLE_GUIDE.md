# Species Combat TCG - Style Guide

## 🎨 Design System Overview

This style guide ensures consistent theming and styling across all components in the Species Combat TCG application.

## 🌈 Theme System

### Core Principles
- **No hardcoded colors** - All colors use CSS custom properties
- **No gradients** - Consistent solid colors for better accessibility
- **High contrast** - Improved text readability across all themes
- **Responsive design** - Works on all screen sizes
- **Accessibility first** - Supports high contrast and reduced motion

### Available Themes
1. **Forest Ecosystem** - Deep greens and earth tones
2. **Ocean Depths** - Blues and teals
3. **Desert Sands** - Warm earth tones
4. **Arctic Tundra** - Cool blues and whites
5. **Dark Forest** - Dark mode with forest colors

## 🎯 CSS Variables

### Core Variables
```css
/* Colors */
--tcg-card-background
--tcg-text-primary
--tcg-text-secondary
--tcg-accent
--tcg-highlight

/* Trophic Roles */
--tcg-producer
--tcg-herbivore
--tcg-carnivore
--tcg-omnivore
--tcg-detritivore
--tcg-decomposer
--tcg-scavenger

/* Conservation Status */
--tcg-extinct
--tcg-critically-endangered
--tcg-endangered
--tcg-vulnerable
--tcg-near-threatened
--tcg-least-concern

/* Spacing */
--tcg-spacing-xs: 4px
--tcg-spacing-sm: 8px
--tcg-spacing-md: 16px
--tcg-spacing-lg: 24px
--tcg-spacing-xl: 32px

/* Typography */
--tcg-font-size-small: 12px
--tcg-font-size-medium: 14px
--tcg-font-size-large: 16px
--tcg-font-size-xlarge: 18px
--tcg-font-weight-normal: 400
--tcg-font-weight-medium: 500
--tcg-font-weight-bold: 600

/* Borders & Shadows */
--tcg-border-radius: 12px
--tcg-border-radius-small: 8px
--tcg-border-radius-large: 16px
--tcg-shadow-small: 0 2px 4px rgba(0, 0, 0, 0.1)
--tcg-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.15)
--tcg-shadow-large: 0 8px 16px rgba(0, 0, 0, 0.2)

/* Transitions */
--tcg-transition-fast: 0.2s ease
--tcg-transition-medium: 0.3s ease
--tcg-transition-slow: 0.5s ease
```

## 🧩 Component Guidelines

### Cards
```css
.card-standard {
  background: var(--tcg-card-background);
  border: 1px solid var(--tcg-card-border);
  border-radius: var(--tcg-border-radius);
  box-shadow: var(--tcg-shadow-medium);
  padding: var(--tcg-spacing-md);
  color: var(--tcg-text-primary);
  transition: all var(--tcg-transition-medium);
}
```

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--tcg-accent);
  color: var(--tcg-text-primary);
  border: 1px solid var(--tcg-accent);
  border-radius: var(--tcg-border-radius-small);
  padding: var(--tcg-spacing-sm) var(--tcg-spacing-md);
  font-weight: var(--tcg-font-weight-medium);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--tcg-accent);
  border: 1px solid var(--tcg-accent);
}
```

### Text
```css
/* Primary text */
color: var(--tcg-text-primary);

/* Secondary text */
color: var(--tcg-text-secondary);

/* Accent text */
color: var(--tcg-accent);
```

## 🎨 Utility Classes

### Text Utilities
- `.text-primary` - Primary text color
- `.text-secondary` - Secondary text color
- `.text-accent` - Accent color
- `.text-center` - Center align
- `.font-bold` - Bold weight
- `.text-sm` - Small font size

### Background Utilities
- `.bg-primary` - Primary background
- `.bg-secondary` - Secondary background
- `.bg-card` - Card background
- `.bg-accent` - Accent background

### Spacing Utilities
- `.p-sm` - Small padding
- `.p-md` - Medium padding
- `.m-sm` - Small margin
- `.gap-md` - Medium gap

### Layout Utilities
- `.flex` - Flexbox display
- `.flex-col` - Column direction
- `.items-center` - Center align items
- `.justify-between` - Space between

### Trophic Role Colors
- `.trophic-producer` - Producer color
- `.trophic-herbivore` - Herbivore color
- `.trophic-carnivore` - Carnivore color
- `.trophic-omnivore` - Omnivore color

## 🚫 What NOT to Use

### ❌ Avoid These Patterns
```css
/* DON'T use hardcoded colors */
color: #333333;
background: #ffffff;

/* DON'T use gradients */
background: linear-gradient(45deg, #ff0000, #00ff00);

/* DON'T use hardcoded spacing */
padding: 16px;
margin: 8px;

/* DON'T use hardcoded font sizes */
font-size: 14px;
```

### ✅ Use These Instead
```css
/* DO use theme variables */
color: var(--tcg-text-primary);
background: var(--tcg-card-background);

/* DO use solid colors */
background: var(--tcg-accent);

/* DO use spacing variables */
padding: var(--tcg-spacing-md);
margin: var(--tcg-spacing-sm);

/* DO use font size variables */
font-size: var(--tcg-font-size-medium);
```

## 📱 Ionic Component Theming

### Automatic Theming
All Ionic components are automatically themed via global CSS:

```css
ion-card {
  --background: var(--tcg-card-background);
  --color: var(--tcg-text-primary);
  border: 1px solid var(--tcg-card-border);
}

ion-button[fill="solid"] {
  --background: var(--tcg-accent);
  --color: var(--tcg-text-primary);
}

ion-item {
  --background: var(--tcg-card-background);
  --color: var(--tcg-text-primary);
  --border-color: var(--tcg-card-border);
}
```

## 🔧 Implementation Checklist

When creating new components:

- [ ] Use only CSS custom properties for colors
- [ ] Use spacing variables for padding/margin
- [ ] Use font size and weight variables
- [ ] Use border radius variables
- [ ] Use shadow variables for depth
- [ ] Use transition variables for animations
- [ ] Test in all available themes
- [ ] Ensure high contrast readability
- [ ] Add hover states with theme colors
- [ ] Use utility classes where appropriate

## 🧪 Testing Themes

Use these browser console commands to test theming:

```javascript
// Test theme switching
quickThemeTest()

// Comprehensive theme testing
runAllThemeTests()

// Test accessibility features
testThemeAccessibility()
```

## 📚 Resources

- **Theme Provider**: `src/theme/ThemeProvider.tsx`
- **Theme System**: `src/theme/themeSystem.ts`
- **Global CSS**: `src/theme/global.css`
- **Utilities**: `src/theme/utilities.css`
- **Settings Page**: `src/pages/Settings.tsx`

## 🎯 Best Practices

1. **Always use theme variables** instead of hardcoded values
2. **Test in all themes** before committing changes
3. **Use utility classes** for common patterns
4. **Maintain high contrast** for accessibility
5. **Keep animations subtle** and respect reduced motion preferences
6. **Use consistent spacing** throughout the application
7. **Follow the component patterns** established in this guide

This style guide ensures the Species Combat TCG maintains a consistent, accessible, and beautiful design across all platforms and themes! 🎮🌿🎨
