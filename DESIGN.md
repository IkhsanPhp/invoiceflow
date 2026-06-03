---
name: Systematic Ledger
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#001334'
  on-tertiary: '#ffffff'
  tertiary-container: '#00275b'
  on-tertiary-container: '#4c8dff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for high-utility enterprise environments where accuracy and efficiency are paramount. The brand personality is **trustworthy, efficient, transparent, and robust**, reflecting the critical nature of financial data management.

The visual style is **Corporate / Modern**, leaning into a modular, data-dense layout that maintains readability through rigorous whitespace management. The interface prioritizes functional clarity over decorative elements, utilizing a structured grid to organize complex invoice workflows and financial reporting.

## Colors
The palette is anchored by **Deep Navy (#1E293B)** for structural elements and navigation, providing a sense of authority. **Corporate Blue (#2563EB)** serves as the primary action color, ensuring high visibility for interactive elements.

**Functional Color Application:**
- **Primary Action**: Use Corporate Blue for CTA buttons and active states.
- **Surface Layering**: The main application background uses Light Gray (#F8FAFC), while content containers and cards use White (#FFFFFF) to create a clear visual hierarchy.
- **Status Indicators**: Use success (green), warning (yellow/orange), and error (red) colors with high-contrast text. For badges, use a 10% opacity tint of the status color as the background.

## Typography
The design system utilizes **Inter** exclusively to ensure maximum legibility across dense data tables and financial forms.

## Layout & Spacing
This design system employs a **12-column fluid grid** for the main content area, allowing the dashboard to scale from compact laptops to large desktop monitors.

**Layout Rules:**
- **Grid Strategy**: Use a fixed sidebar (280px) with a fluid content area.
- **Margins**: Use 24px (lg) margins for the main content container and 16px (md) internal padding for cards.
- **Data Tables**: Use a condensed vertical rhythm within tables (8px padding per row) to maximize information density while maintaining a 16px gutter between columns.

## Elevation & Depth
Depth in the design system is communicated through **Tonal Layers** and **Ambient Shadows**. This approach ensures that the interface feels structured rather than flat, guiding the user's eye to primary tasks.

## Shapes
The shape language is defined by a consistent **8px (0.5rem)** radius. This "Rounded" setting strikes a balance between professional rigor and modern accessibility.

## Components
Consistent component behavior ensures the system remains robust under heavy use.

**Core Components:**
- **Buttons**: Primary buttons use Corporate Blue with white text. Secondary buttons use a white background with a Navy border. All buttons have a height of 40px for standard actions and 32px for table-row actions.
- **Status Badges**: Use a pill shape with a 10% opacity background of the status color and 100% opacity text of the same color (e.g., Verified: Green text on light green background; Needs Revision: Yellow text on light yellow background).
- **Input Fields**: 1px border (#CBD5E1) that shifts to Corporate Blue on focus. Labels must always be visible above the input.
- **Data Tables**: Header rows should have a subtle gray background (#F1F5F9). Rows should have a hover state (#F8FAFC) to help users track information across wide screens.
- **Invoice Summary Cards**: Feature a bold "headline-md" amount and a "label-sm" category title, used at the top of dashboards for quick financial overviews.

## Authentication & Session UI Patterns (Better Auth Integration)
- **Login & Signup Screens**: Clean, centered 400px card component with elegant input fields and modern typography.
- **Role Selection dropdown**: Clean select components using the shape language (8px radius) to toggle between Vendor, Procurement, and Finance interfaces for developer preview.
- **User Profile Menu**: Dropdown in the header displaying user avatar, name, and strongly highlighted role badge.