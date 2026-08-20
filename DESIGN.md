# WeddingOS Design System

## Brand Colors

```css
brand: {
  50:  '#fdf4ff',  /* Lightest pink */
  100: '#fae8ff',
  200: '#f5d0fe',
  300: '#f0abfc',
  400: '#e879f9',
  500: '#d946ef',  /* Primary brand color */
  600: '#c026d3',
  700: '#a21caf',
  800: '#86198f',
  900: '#701a75',  /* Darkest purple */
}
```

## Typography

- **Font Family:** System UI stack (Tailwind `font-sans` default)
- **Headings:**
  - `h1`: `text-2xl font-bold text-gray-900`
  - `h2`: `text-lg font-semibold text-gray-900`
  - `h3`: `text-base font-semibold text-gray-900`
- **Body:** `text-sm text-gray-500` / `text-sm text-gray-900`
- **Labels:** `text-sm font-medium text-gray-700`

## Component Library

All components live at `@/components/ui/` and are exported from `@/components/ui/index.ts`.

### Button (`<Button />`)
- **Props:** `variant` ('primary' | 'secondary' | 'ghost' | 'danger'), `size` ('sm' | 'md' | 'lg'), `loading` (boolean), `disabled`, `className`, `onClick`, `type`
- **Primary:** `bg-brand-500 hover:bg-brand-600 text-white`
- **Secondary:** `bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`
- **Ghost:** `hover:bg-gray-100 text-gray-600`
- **Danger:** `bg-red-500 hover:bg-red-600 text-white`
- **Loading** shows a `Loader2` spinner with `animate-spin`

### Badge (`<Badge />`)
- **Props:** `variant` ('default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'), `children`, `className`
- Renders a `rounded-full` pill with variant-specific bg/text colors

### Card (`<Card />`)
- **Props:** `children`, `className`, `padding` (boolean, default true)
- White background, rounded corners, border, optional padding

### Skeleton (`<Skeleton />`)
- **Props:** `className`, `variant` ('text' | 'circular' | 'rectangular')
- Animated pulse placeholder for loading states

### EmptyState (`<EmptyState />`)
- **Props:** `icon` (LucideIcon component), `title`, `description`, `action` (ReactNode)
- Centered layout with icon, title, description, and optional action

### Input (`<Input />`)
- **Props:** `label`, `error`, + all standard input HTML attributes
- Consistent styling with focus ring and optional error message

### Select (`<Select />`)
- **Props:** `label`, `error`, + all standard select HTML attributes
- Consistent styling matching `Input`

### PageHeader (`<PageHeader />`)
- **Props:** `title`, `description`, `actions` (ReactNode for right-side buttons)
- Flex layout with h1 title and optional description

### LoadingSpinner (`<LoadingSpinner />`)
- **Props:** `size` ('sm' | 'md' | 'lg'), `className`
- Centered spinning `Loader2` icon

## Status Badge Color Mapping

| Status | Badge Variant |
|--------|--------------|
| active / paid / signed / published / completed | `success` |
| lead / draft / pending | `default` (or `warning` for lead) |
| expired / overdue / cancelled | `danger` |
| sent / scheduled | `info` |
| refunded | `purple` |
| archived | `default` |

## Layout Patterns

- **Vendor App:** Sidebar (64) + main content, `bg-gray-50` background
- **Admin Panel:** Sidebar (64) + main content on `bg-gray-900`
- **Public Pages:** Full-width centered layouts

## Icons

Uses **lucide-react** for all icons. No inline SVGs.

## Dark Mode

Dark mode is the **default**. Users can switch to light mode via:

1. **Sidebar** — "Light Mode" / "Dark Mode" toggle button in the footer area
2. **Mobile header** — Sun/Moon icon button
3. **Settings page** — Appearance section with Dark/Light radio buttons

The preference is persisted in `localStorage` under key `weddingos-theme`.

### Implementation

- `darkMode: "class"` in `tailwind.config.js`
- `ThemeProvider` context at `@/lib/theme` wraps the app in `App.tsx`
- All UI components use `dark:` variants for backgrounds, text, borders, and hover states
- The `<html>` element gets `class="dark"` applied/removed by the ThemeProvider

### Component Dark Variants

| Component | Light | Dark |
|-----------|-------|------|
| Page background | `bg-gray-50` | `bg-gray-950` |
| Card | `bg-white border-gray-200` | `bg-gray-800 border-gray-700` |
| Input / Select | `bg-white border-gray-300` | `bg-gray-700 border-gray-600` |
| Button (secondary) | `bg-white border-gray-300` | `bg-gray-700 border-gray-600` |
| Sidebar | `bg-white border-gray-200` | `bg-gray-900 border-gray-800` |
| Skeleton | `bg-gray-200` | `bg-gray-700` |
| Text (primary) | `text-gray-900` | `text-gray-100` |
| Text (secondary) | `text-gray-500` | `text-gray-400` |