# UI conventions

- Use `src/components/ui` for reusable UI and read `DESIGN.md` before changing the visual system.
- Use Radix UI primitives (`radix-ui`) for dialogs, menus, tooltips, selects, toggles and other interactive behavior. Do not hand-roll focus traps, keyboard menus or popup positioning for new UI.
- Style components with Tailwind utilities and shared tokens from `src/styles/tokens.css` / `tailwind.config.js`. Use `cn` and the existing component variants. Add a variant when a repeated need is real.
- Do not add page-specific CSS overrides for controls. Custom CSS is limited to semantic tokens, third-party integration, or effects Tailwind cannot reasonably express. Document the reason.
- Sonner owns notifications. Do not create a toast renderer or notification store.
- New or changed shared components need Storybook examples for relevant states and both themes. Extend the system as screens are reviewed; do not redesign unreviewed screens incidentally.
- Run `npm run check`, `npm run build`, and `npm run build-storybook` from the repository root for design-system changes. Verify affected interactions in the browser.
