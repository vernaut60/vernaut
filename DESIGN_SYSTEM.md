Vernaut Design System (Foundations)

This doc captures app-wide foundations to align with UI fundamentals: color, typography, visual hierarchy, contrast, and alignment.

1) Colors (Tokens)

- Brand & surfaces
  - --color-bg: #0b0b10
  - --color-surface: #0d0d14
  - --color-border: rgba(255,255,255,0.08)
  - --color-ring: rgba(255,255,255,0.06)

- Primary / Accent
  - --color-primary-500: #4361ee
  - --color-primary-600: #3a56d8
  - --color-primary-700: #2f48b7
  - --color-accent-500: #6b73ff
  - --color-accent-600: #5a63ff

- Neutrals
  - --color-text: #e5e7eb
  - --color-text-muted: #9ca3af
  - --color-muted: rgba(255,255,255,0.06)
  - --color-muted-strong: rgba(255,255,255,0.12)

- Semantic
  - --color-info: #38bdf8
  - --color-success: #22c55e
  - --color-warn: #f59e0b
  - --color-danger: #ef4444

Usage
- 60-30-10 per page template: 60% surface/neutral, 30% secondary, 10% accent.
- Primary actions use --color-primary-500/600 gradients; borders use --color-border.

2) Typography (Scale)

- Sizes/line-height: xs(12/1.5), sm(14/1.5), base(16/1.5), lg(18/1.45), xl(20/1.4), 2xl(24/1.35), 3xl(30/1.3), 4xl(36/1.2)
- Weights: Body 400/500; Headings 600/700
- Rules: Left-align body; avoid centering long text; use larger line-height for small text.

3) Spacing (Scale)

- 4, 8, 12, 16, 24, 32, 48
- Apply to: card paddings, modal padding, section gaps, grid gutters.

4) Visual Hierarchy & Alignment

- Pattern: Header > Content > Actions. Dividers use .divider-subtle.
- Primary CTA prominent; secondary subdued.
- Align body text left; consistent gutters.

5) Contrast & Accessibility

- Body text ≥ 4.5:1; large headings ≥ 3:1.
- Check placeholders and disabled states; ensure visible focus rings.
- Respect prefers-reduced-motion.

Adoption Notes
- Tokens live in src/app/globals.css and are additive (non-breaking).
- Use tokens via CSS variables or Tailwind arbitrary values (e.g., text-[var(--color-text)]).
- Helpers: .surface-card, .divider-subtle for gradual migration.

Next Steps
- Apply tokens to primitives (Buttons, Inputs, Card, Modal) and high-traffic screens.
- Add PR checklist: tokens used, contrast checked, spacing/hierarchy/align verified.

