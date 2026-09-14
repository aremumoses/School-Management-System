# Shared Design System

Every frontend prompt in this folder references this file. Read it once, set it up in Stage 0, and every later screen stays visually consistent instead of each prompt inventing its own colors and spacing. The goal: a Nigerian secondary school's parents and staff open this on a mid-range Android phone and it feels as polished as a well-funded fintech app — calm, trustworthy, legible, fast.

## 1. Brand Personality
Trustworthy, modern, warm, optimistic — never cold/corporate, never childish. This handles a parent's school fees and a child's academic record; it should feel like it takes that seriously while still being pleasant to use every day.

## 2. Color Palette
Defined as CSS variables in `app/globals.css` via Tailwind v4's `@theme` block (there is no `tailwind.config.ts` in Tailwind v4 — it's all CSS-first now). Set these once, then never hardcode a hex value in a component.

**Premium redesign (2026-08-23)**, from `new-design.md`: the brand hue deepened from Violet 600 to Violet 700 so `primary` clears AA for *text and icons* on white (7.6:1), not only as a button fill — which removes the need for a separate "brand text" colour. Neutrals were re-cut with a slight cool cast so they sit under the brand hue instead of fighting it, elevation and motion became token scales (§4), and the categorical chart palette was replaced with a validated set (§7). Dark mode went from "optional, nice-to-have" to shipped and wired (§11).

The earlier Stage 32 restyle established the direction this builds on — light sidebar with a tinted active pill, pastel KPI tiles, generously rounded cards — taken from a reference dashboard screenshot ("Schoooli"-branded admin UI). Information architecture was preserved through both passes; what changed is the shell around it (§5) and the depth of the token system.

| Token | Hex | Use |
|---|---|---|
| `primary` | `#1D4ED8` (Blue 700) — aliases `brand` | Primary buttons, links, focus rings, the sidebar fill. 6.7:1 on `surface`, so it is also safe as text/icon colour |
| `primary-hover` | `#1E40AF` (Blue 800) — aliases `brand-hover` | Hover/pressed state of primary elements |
| `secondary` | `#059669` (Emerald 600) | Positive metrics, "Paid"/"Present"/"Approved" badges, growth indicators on charts |
| `accent` | `#F59E0B` (Amber 500) | High-attention CTAs ("Pay Now"), highlights, notification dots |
| `success` | `#16A34A` (Green 600) | Success toasts, confirmation states |
| `warning` | `#D97706` (Amber 600) | "Pending"/"Due soon" badges, non-blocking warnings |
| `error` | `#DC2626` (Red 600) | "Overdue"/"Absent"/"Failed" badges, destructive actions, form errors |
| `info` | `#0284C7` (Sky 600) | Informational banners/tooltips |
| `surface` | `#FFFFFF` | Card/panel backgrounds |
| `background` | `#E8EDF5` | App background — Akademi's grey-blue canvas, so white cards read as raised panels. Components that want a *white* surface use `bg-card`, never `bg-background` |
| `border` | `#E6E8F0` | Card borders, dividers |
| `text-primary` | `#0E1220` | Headings, primary body text |
| `text-secondary` | `#58617A` | Secondary/helper text — 5.9:1 on `surface` |
| `text-muted` | `#94A3B8` | Placeholders, disabled text, timestamps |

Every one of these has a re-stepped dark-mode counterpart in `globals.css`; see §11. The **categorical chart palette** (`--chart-1` … `--chart-5`) is deliberately *not* in this table — it is a validated set with its own rules, in §7.

**Stat-tile circles** (Akademi, 2026-09-13; replaced the Stage 32 pastel `stat-*` tints) — the shared `StatCard` shows a solid colour circle with a white icon beside its label and value. A purely informational count (e.g. "Active students") takes a *decorative* variant — `brand`, `coral` (`brand-coral`) or `amber` (`brand-amber`) — cycled across a row for variety. A tile with a real pass/fail meaning (attendance rate, collection rate) takes a *semantic* variant (`default`/`success`/`warning`/`error`/`info`), which fills the circle with that status colour. The glyph is decorative — the label names the stat — so a white icon is acceptable even on amber.

**Rule**: color is never the only signal. Every status badge pairs its color with a text label (e.g., a red badge always also says "Overdue", never just a red dot). The same rule is why a KPI delta carries an arrow glyph as well as a tint, and why the mobile bottom tab bar marks the active tab with a filled pill behind the icon and not just a colour change.

**Rule**: `secondary` and `accent` are two different things in this codebase and the collision is deliberate. The *brand* emerald and amber above are exposed as `--success` / `--brand-accent`. shadcn's own `--secondary` and `--accent` slots are **structural** (low-emphasis button fill, hover background) and stay neutral grey — using a brand colour for every "Cancel" button and every hover state would be far too loud. Reaching for `bg-accent` expecting amber is a recurring mistake; it is grey.

**Badge color pairs** (verified against WCAG AA, ≥4.5:1 — a naive "10% tint of the base color + text in that same base color" does **not** reliably pass AA for mid-tone colors like these, so use these exact verified pairs instead of inventing a tint at render time):

| Status | Background | Text |
|---|---|---|
| Success | `#DCFCE7` (`success-soft`) | `#166534` (`success-soft-foreground`) — 6.5:1 |
| Warning | `#FEF3C7` (`warning-soft`) | `#92400E` (`warning-soft-foreground`) — 6.4:1 |
| Error | `#FEE2E2` (`error-soft`) | `#991B1B` (`error-soft-foreground`) — 6.8:1 |
| Info | `#E0F2FE` (`info-soft`) | `#075985` (`info-soft-foreground`) — 6.6:1 |

The base `success`/`warning`/`error`/`info` colors from the table above are for icons, chart series, and borders — not for pairing with same-hue text on a light tint, and not for white text either (e.g. white-on-`success` is only 3.3:1, white-on-`warning` only 3.2:1 — both fail). `error`/`#DC2626` does clear AA with white text (4.83:1) if a solid-fill destructive button is ever needed.

### Akademi brand set (redesign in progress)
The UI is being restyled module by module to follow the Akademi school-admin template, in blue rather than Akademi's violet. `primary`, `ring` and the light-mode `sidebar` alias `brand`, so the brand hue is app-wide even on screens whose layout has not been converted yet:

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand` / `brand-foreground` | `#1D4ED8` / white (6.7:1) | `#2F6FEB` / white (4.6:1) | Brand panels, the sidebar, primary CTAs. As small text on a dark card it is only 3.8:1 — use it for icons and large text there, `foreground` for small labels |
| `brand-hover` | `#1E40AF` | `#2563EB` | Hover fill for `brand` |
| `brand-coral` | `#FB7D5B` | `#FB7D5B` | Logo mark and decorative accents only — 2.6:1 with white, never behind readable text |
| `brand-amber` | `#FCC43E` | `#FCC43E` | Akademi's yellow — decorative stat circles only, never text or a fill behind text |
| `heading` | `#303972` (10.7:1) | `#E9ECF5` | Titles, form labels, and input text on converted screens |

Akademi's muted body grey (`#A098AE`) is deliberately **not** adopted: it is 2.8:1 on white and fails AA. Converted screens keep `muted-foreground` for secondary text.

Converted so far: auth (`/login`); the app shell (sidebar, top bar, page background) for all 10 dashboards; the admin dashboard, including the shared `StatCard`, `ChartCard`, `GreetingHeader`, `ActivityFeed`, `QuickActions` and `AtRiskList` it uses (so their restyle also reaches the other dashboards); the admin Students module (directory, profile and its tabs, add-student wizard), plus the shared `PageHeader`, `Stepper` and `InlineEditField`; the admin Staff module (directory, add-staff dialog, profile and its tabs — the profile and directory are also what HR sees), plus the shared `DataTable` (restyled for all 20 list pages that use it), `ProfileHero`, `FormFieldLabel`, `TablePagination` and the `pill` tab variant; the admin Academics setup pages (sessions and terms, classes and arms, subjects and their class mapping); the admin Timetable builder, Attendance and Lesson Note Approvals pages, plus the shared read-only `WeekGrid` (so the teacher and student timetables changed with them); the admin Admissions list and applicant page, and the public `/apply` admission form; the Assessment group — Assessment Structure (the Exam Officer's page shares its editor and the new `TermPillNav`), Result Approvals and Scores Bulk Import — plus the shared `BroadsheetTable` (so the Exam Officer broadsheet and the teacher's class ratings changed with it); the Administration group's Fee Structure (it is the Bursar's builder, so both views changed), Discipline (the shared incident list, form and detail are also what teachers and hostel/transport staff see) and Clubs pages; the rest of the Administration group — Consent Forms, Documents (the shared document table, request dialog and preview) and Audit Log. Every dashboard shell also has a Log out button pinned to the bottom of the sidebar (icon-only in the collapsed rail) and at the end of the phone "More" sheet, alongside the account menu's.

Patterns established so far — reuse them rather than re-deriving per module:
- **Toolbar card**: search and filters sit together in a white `rounded-xl bg-card` panel above the list, with 40px controls.
- **Table card**: a white `rounded-xl bg-card` panel (ring only in dark mode); a `bg-primary/5` header row with `font-semibold text-primary` headings; 20px outer cell padding; an avatar beside a `text-heading` name; identifiers in `text-primary`; a footer reading "Showing X–Y of Z" with numbered page buttons. `DataTable` draws this whole pattern (its search sits in the card's top bar), and `TablePagination` is the footer for hand-built tables.
- **Profile hero**: a `brand` banner with decorative coral and amber blocks, the photo overlapping it with an 8px card-coloured ring, the name as the page's H1, and key details beside `brand-coral` icon circles. Use the shared `ProfileHero`.
- **Expandable list card**: a white card whose header row (a `bg-primary/10` icon circle, a `text-heading` title, a muted one-line summary, a chevron) toggles a divided list of child rows; the toggle carries `aria-expanded`. Child items that are just names (e.g. class arms) are `bg-primary/10` pills with their edit/delete buttons inside.
- **Section card**: a white `rounded-xl bg-card` panel whose top row holds a `text-lg font-semibold text-heading` title, a muted one-line description and any controls on the right (they wrap underneath on phones). A table inside runs edge to edge under a top border, in the table-card header style.
- **Record page**: a person who is not a student or staff member yet (e.g. an admission applicant) still gets the shared `ProfileHero`, followed by an action card (status, guidance, decision buttons) and side-by-side section cards of label/value pairs (`text-xs text-muted-foreground` label over a `font-semibold text-heading` value).
- **Public forms**: pages outside the app shell (the `/apply` admission form) reuse the sign-in page's layout — a brand panel with the school mark beside a white form column, 48px fields and `FormFieldLabel` labels.
- **Card grid**: records people browse rather than compare (clubs) are white cards in a 1/2/3-column grid — an icon circle and a count pill on top, the name, a two-line description, then key facts with small muted icons under a divider. The whole card is the link.
- **Wizard step card**: under the shared `Stepper`, each step of a multi-step flow is one white card — a title and one-line description on top, the step's fields in the middle, and Back / Continue in a bordered footer (Scores Bulk Import).
- **Inline-edit table cells**: values that save on blur are borderless inputs that read as plain text and show an edit frame on hover or focus (Assessment Structure components).
- **Scroll containers with sr-only text**: a hand-built `overflow-x-auto` table wrapper must also be `relative`. `sr-only` labels are absolutely positioned; without a positioned scroller they escape its clip and make the whole page scroll sideways on phones (the shared `Table` container already has `relative`).
- **Sticky table columns**: a sticky cell over a tinted header needs an opaque fill — mix the tint onto the card (`bg-[color-mix(in_oklab,var(--primary)_5%,var(--card))]`) rather than a translucent `bg-primary/5`, or scrolled columns show through (`BroadsheetTable`).
- **Schedule grid**: period rows × day columns in the table-card style. A scheduled lesson is a `border-l-4 border-primary bg-primary/10` block (`bg-primary/20` in dark mode); a free slot is a dashed "Assign" button in the builder and a dash in the read-only `WeekGrid`. Below `md` it becomes one card per day.
- **Pill tabs**: `<TabsList variant="pill">` — a white rounded tab strip; the active tab is `bg-primary/10 text-primary`. Filters that navigate rather than switch panels (e.g. lesson-note status) copy the same look on plain buttons with `aria-pressed`.
- **Form fields**: `text-primary` labels (`text-heading` in dark mode), a red asterisk plus a screen-reader "(required)" on required fields, and 44px inputs and selects. Use the shared `FormFieldLabel`.
- Small text in `text-primary` swaps to `text-foreground`/`text-heading` in dark mode, where the brand blue is only 3.8:1 on a card.

The project holds an Akademi license, so the template's imagery can be used on converted screens. The login panel uses its 3D character (`web/public/auth/login-illustration.png`, cropped from the template's `pic-2.png`). Skip template imagery whose content does not fit this product — e.g. its demo cards with crypto and dollar figures.

## 3. Typography
- **Font**: [Poppins](https://fonts.google.com/specimen/Poppins) for everything — UI text, body copy, and numbers — matching the Akademi template. Load via `next/font/google`. Poppins is not a variable font, so the weights in use (300–700) are listed explicitly in `app/layout.tsx`; a weight outside that list renders as the nearest loaded one. Use `tabular-nums` in any table column with numbers, so digits align.
- **Type scale** (Tailwind classes, mobile-first — these sizes apply at all breakpoints unless a screen says otherwise):

| Role | Class | Size / Line height | Weight |
|---|---|---|---|
| Page title (H1) | `text-2xl sm:text-3xl` | 1.5rem → 1.875rem / 1.2 | 700 (bold) |
| Section header (H2) | `text-2xl` | 1.5rem / 1.25 | 600 (semibold) |
| Card header (H3) | `text-xl` | 1.25rem / 1.3 | 600 (semibold) |
| Sub-header (H4) | `text-lg` | 1.125rem / 1.4 | 600 (semibold) |
| Body | `text-base` | 1rem / 1.5 | 400 (regular) |
| Body small / table cells | `text-sm` | 0.875rem / 1.4 | 400 (regular) |
| Caption / badge / timestamp | `text-xs` | 0.75rem / 1.3 | 500 (medium) |

Never go below `text-xs` (12px) for anything a user has to read — many users are on small, lower-resolution Android screens.

Headings carry `letter-spacing: -0.018em` (applied globally to `h1`/`h2`/`h3` in `globals.css`). Tight tracking at display sizes is most of what separates a considered type ramp from a default one; do not re-set it per component.

H1 steps down to `text-2xl` below `sm`. At 375px a 30px bold heading consumes a third of the fold before any content appears — which is exactly the "shrunk desktop design" §9 warns against.

## 4. Spacing, Radius, Elevation & Motion Tokens
- Spacing: Tailwind's default 4px scale (`p-2`, `p-4`, `p-6`...). Card interior padding: `p-6` desktop / `p-4` mobile.
- Border radius: base `--radius` is `0.75rem` (12px, Stage 32 — was 8px), giving `rounded-lg` (buttons/inputs) = 12px and `rounded-xl` (cards, the shadcn `Card` default) = 16.8px. `rounded-full` on avatars, status pills, notification badges. Reach for `rounded-2xl`/`rounded-3xl` on a card that should read as a prominent tile (KPI stat cards, promo/CTA cards) rather than a plain content panel.
- Elevation: `shadow-sm` on resting cards, `shadow-md` on dropdowns/popovers, `shadow-lg` on modals, `shadow-xl` on the command palette. Never stack more than one shadow level on nested elements.
  The scale is redefined in `globals.css` against a `--shadow-tint-*` triplet rather than pure black, and that triplet is redefined again under `.dark`. Consequence: `shadow-md` is already correct in both themes — never write a `dark:shadow-*` variant at a call site.
- Motion tokens: `--duration-fast` (120ms), `--duration-base` (180ms), `--duration-slow` (280ms), with `--ease-out-soft` / `--ease-in-out-soft`. Use these rather than Tailwind's raw duration utilities so timing stays consistent, e.g. `duration-[--duration-fast] ease-[--ease-out-soft]`. `prefers-reduced-motion` is honoured by a single global guard in `globals.css`; no component needs its own.
- Max content width: forms/detail panels `max-w-2xl`; full dashboard content area `max-w-7xl` centered, with the sidebar fixed outside that.

## 5. Layout Patterns
- **Staff dashboards** (Admin, Teacher, Bursar, Exam Officer, Librarian, Hostel/Transport, HR, Front Desk): persistent left sidebar filled with `brand` (Akademi's solid column; deep navy in dark mode, where a blue column would glare), white text, and a translucent white `sidebar-primary` pill marking the active item. User-collapsible to an 88px icon rail via the grid button at the left of the top bar; the choice persists in `localStorage` (it's a viewport preference, not user data — don't spend a round-trip on it). Below `md` the same nav opens as a slide-over sheet.
- **Grouped navigation is mandatory, not optional.** Every nav item declares a `group` and an `icon` in `lib/dashboard-config.ts`; the sidebar buckets them under small uppercase section headings in first-appearance order. Admin alone has 25 destinations — a flat list of that length is not navigable, and the icons are what keep the collapsed rail usable. Icons are referenced *by name* through `lib/nav-icons.ts`, never as component references: the nav list is built in a Server Component and handed to a Client Component, and a component reference cannot cross that boundary.
- **Top bar**: sits on the page background with no fill or border, Akademi-style. On the left, the sidebar toggle and breadcrumbs (dashboard → nav group → page), with the current page set large in `heading` colour so it doubles as the header title; on the right, global search, theme toggle, notification bell and user menu as white `bg-card` squares. It is `sticky top-0` with a translucent blurred background so the trail and the search stay reachable down a long table. Below `sm` the breadcrumb collapses to just the current page's name.
- **Parent & Student dashboards**: mobile-first. Below `md`, a **fixed bottom tab bar** (4–5 items, last one "More") — the primary nav for most parents, who use this on a phone. The active tab is marked by a filled pill behind its icon as well as by colour, so the state is not colour-only. Tabs use `shortLabel` where the full nav label won't fit ~70px. "More" opens a **bottom sheet** carrying the same grouped nav, not a side drawer. Above `md` the same items move into the standard left sidebar.
- Every page has a clear page title (H1) and, where relevant, a primary action top-right (e.g., "+ Add Student", "Broadcast Notice").
- **Dashboard home pages** open with `GreetingHeader` rather than `PageHeader`: greeting, school name, session, term and today's date. Every figure below is meaningless without knowing which term it belongs to, and admins routinely have last term open in another tab.

### Command palette (⌘K)

`GlobalSearchTrigger` in the header owns the binding and is mounted by both shells. Two result sources with deliberately different latencies: **pages**, filtered in memory from the caller's own already-role-scoped, already-module-filtered nav list — so the palette can never advertise a screen the user would be bounced from, and is useful on the first keystroke; and **records** (students, staff) via a debounced server action. Each record leg is caught independently: `/students` is open to any authenticated user (scoped server-side), `/staff` is not, so one 403 must not empty the whole result set.

## 6. Core Components (via shadcn/ui + Radix)
- **Buttons**: `primary` (solid `primary` bg, white text), `secondary` (outline, `primary` border/text), `ghost` (no border, text-only, for low-emphasis actions), `destructive` (solid `error` bg) — consistent height (`h-10` default, `h-9` for compact table-row actions), `active:scale-[0.98]` for tactile press feedback.
- **Status badges/pills**: rounded-full, `text-xs font-medium`, using the verified `*-soft` background/text pairs from §2 (e.g., `bg-success-soft text-success-soft-foreground`) — not a same-hue tint-plus-base-color combo, which fails AA for these colors (see §2). Used consistently for payment status, attendance status, result-approval status, discipline severity.
- **Data tables** (TanStack Table + shadcn Table): sticky header, sortable columns with a small chevron indicator, row hover state (`bg-accent/60` — a *token*, never `bg-slate-50`: a hardcoded palette value stays light in dark mode), pagination footer, a real empty state (icon + one-line message + a primary action when relevant — never just a blank table), skeleton-row loading state (never a bare spinner for tabular data).
  **Below `md` the table becomes a card list**, one card per row with each cell labelled by its column header. A nine-column student row cannot be read on a phone at any horizontal scroll offset, because the header scrolls out of view and every cell loses the label that gave it meaning. Sorting moves into an explicit "Sort" dropdown at that width, since the headers it normally lives in are no longer rendered.
- **Forms** (React Hook Form + Zod + shadcn Form): label above input, helper text below in `text-secondary`, validation errors in `error` color with a small icon, required fields marked with a subtle asterisk, submit button shows a spinner + disables while pending.
- **Cards**: `surface` background, `border` 1px, `shadow-sm`, `rounded-xl`, `p-6`.
- **Stat/KPI tiles** (the shared `StatCard` component): a white card with Akademi's solid icon circle (see "Stat-tile circles" in §2). Informational counts take a decorative variant (`brand`/`coral`/`amber`); a tile with a status meaning takes a semantic variant — don't give a meaningful stat a decorative colour, that would muddy the signal. The circle sits beside the text when the tile is at least 13rem wide (a container query) and stacks above it otherwise — the same rule for every tile, so a row never mixes layouts. The value's font size is computed from the tile width and the value's length, so a long naira balance shrinks to fit rather than wrapping or clipping. Values use proportional figures, never `tabular-nums`.
- **Modals/Dialogs**: centered, backdrop blur (`backdrop-blur-sm` + `bg-black/30`), max-width scaled to content, always keyboard-dismissible (Esc) and focus-trapped.
- **Toasts**: bottom-right on desktop, top-center on mobile, auto-dismiss after 4s, success/error variants matching the semantic palette.
- **Empty / error states**: use the shared `EmptyState` and `ErrorState` (`components/dashboard/`), never a bespoke centred paragraph. Both answer the same three questions in the same order — what would be here, why it isn't, and the one next action — so a user who has learned one recognises all of them. An empty-state `title` names the missing thing ("No students yet"), not the failure ("Nothing found"). An error state says what the user lost and what to do next; it never surfaces a status code or an exception message.
- **Charts**: see §7 below — the palette and the rules around it are load-bearing enough to have their own section.

## 7. Data Visualisation
Charts are read by people and executed by us, so the colour part is computed rather than eyeballed.

**The categorical series palette is `--chart-1` … `--chart-5`, in that fixed order.** Both modes were run through the data-viz validator (lightness band, chroma floor, adjacent-pair colourblind separation, normal-vision floor, contrast against the card surface) and pass as a set:

| Slot | Hue | Light | Dark |
|---|---|---|---|
| `--chart-1` | blue (brand) | `#1d4ed8` | `#2f6feb` |
| `--chart-2` | orange | `#eb6834` | `#d95926` |
| `--chart-3` | aqua | `#1baf7a` | `#199e70` |
| `--chart-4` | yellow | `#eda100` | `#c98500` |
| `--chart-5` | magenta | `#e87ba4` | `#d55181` |

Re-derived 2026-09-13 for the blue brand: the data-viz skill's documented default order, with slot 1 snapped to `brand`. Worst adjacent colourblind separation ΔE 9.1 light / 8.4 dark, normal-vision 19.6 / 19.3. **Slots 3–5 are below 3:1 on the white card**, so they may only be used where every value is also shown as a visible label or in a table view. In practice: a single-series chart uses slot 1, and a two-series stack uses slots 1–2.

Rules that are not negotiable, because breaking them silently produces a chart that misleads:

- **Do not reorder the slots and do not hand-edit one.** The *ordering* is the colourblind-safety mechanism — adjacent pairs were what got validated. A single swapped hue invalidates the set.
- **Assign in fixed order, never cycled.** Past five series, fold the tail into "Other" or split into small multiples. A sixth line reusing slot 1 is worse than a sixth line not drawn — see `PerformanceTrendChart`, which caps at five and says in words how many classes it left out.
- **One y-axis. Never two.** Two measures of different scale become two charts, or are indexed to a common base.
- **Categorical ≠ status.** A bar coloured by "is this failing?" is a *status* encoding and takes `--color-success` / `--color-warning` / `--color-destructive`, never a categorical slot. Grade bands, pass rates and threshold-coloured bars are all status. The reverse also holds: status colours are reserved and are never reused as "series 4".
- **Sequential = one hue, light→dark.** Never a rainbow. Colouring each bar of a single-measure comparison differently implies the categories mean different things.
- **Two or more series always carry a legend**, and stacked segments get a 2px `var(--color-card)` gap between them so the boundary reads without depending on the hue difference.
- **Read colours from CSS variables, never from literals.** `fill={SERIES[2]}` resolves through `--chart-3`, which is redefined under `.dark` — so a chart is correct in both themes with no `useTheme` call and no second colour table. A hardcoded `#ef4444` stays bright red on a charcoal card.

Shared furniture lives in `components/dashboard/chart-kit.tsx`: `SERIES`, `SEMANTIC`, `AXIS_TICK`, `GRID_PROPS`, `TOOLTIP_PROPS`, `LEGEND_PROPS`, and the `ChartCard` wrapper. `ChartCard` takes an `isEmpty` flag and renders a message in place of the plot — no chart should ever draw an empty axis frame with nothing in it. Grid and axes stay recessive (solid 1px `border`-coloured horizontals — never dashed — no vertical grid, no axis lines). Marks: 2px lines; markers `r=4` with a 2px `var(--color-card)` ring (`DOT_PROPS` / `ACTIVE_DOT_PROPS`); area fills as a light wash (~12% at the top); bars at most 24px thick with a 4px rounded data-end.

**Never invent a data point to fill a slot.** A stat with one period of history gets no sparkline; a trend needing two terms says so rather than drawing a flat line at zero.

## 8. Forms & Multi-Step Flows
Standard fields follow §6. Beyond that:

- **Multi-step wizards for anything long.** "Add Student" is Personal → Guardian → Academic → Documents → Review, not one 30-field page. Show the step count and which step is current (`components/dashboard/stepper.tsx`), validate per step so a mistake surfaces at the point it was made, and make Review a real summary the user can jump back from.
- Validate inline on blur, not only on submit. An error that appears next to the field beats an error summary at the top.
- Error messages say what to do ("Enter a valid email address"), not what failed ("Invalid input").
- Destructive actions go through a confirmation dialog naming the specific record (`confirm-delete-button.tsx`), never a bare "Are you sure?".

## 9. Responsive & Performance Notes (Nigeria-specific)
- Design mobile-first; **375px width is the primary target** for Parent/Student screens (a common low-to-mid-end Android viewport), not an afterthought tested last.
- Compress and lazy-load all images (student photos, logos); never ship an unoptimized multi-MB image to a screen likely loaded on mobile data.
- Avoid layout-shifting content loads — reserve space (skeletons) for async content so the page doesn't jump around on a slow connection.
- Keep the JS bundle lean: avoid pulling in a heavy component library beyond shadcn/ui + Recharts; code-split rarely-used screens.

## 10. Loading, Empty & Error States
- **Skeletons, not spinners**, for anything over ~300ms, and the skeleton matches the shape of the content it stands in for (`components/dashboard/skeletons.tsx`). Never leave a large blank region while content loads.
- The `Skeleton` component sweeps a shimmer rather than pulsing opacity: a block fading in and out reads as "broken", directional movement reads as "in progress". The shimmer is attached to `[data-slot="skeleton"]` in `globals.css`, so every skeleton gets it and no call site opts in.
- **Empty states** use `EmptyState` (§6) and always offer the next action where one exists.
- **Error states** use `ErrorState` (§6): friendly sentence, a Try again where a retry is possible, never a status code.
- A dashboard panel fetches independently and degrades to its own empty state. On a first-login screen especially, one unpopulated module (a school that hasn't raised invoices yet) must never blank the whole page — this is why the dashboard pages wrap each fetch in a local `safe()` helper instead of one shared `try`.

## 11. Dark Mode
Dark mode is **shipped and wired**, not optional: `next-themes` mounts at the root (`components/theme-provider.tsx`), the header carries a Light / Dark / System toggle, and the preference defaults to following the OS.

It is a *selected* palette, not an inversion:

- Deep, slightly blue charcoal ground (`#0b0e17`) with a distinctly lighter card plane above it (`#141926`) — surfaces separate by luminance, not by hard outlines.
- The brand hue lifts (Violet 600 → Violet 500) so it stays legible on a dark ground.
- Every status pair, stat tint and chart slot has its own re-stepped dark value, validated against the dark card surface. None of them is the light value dimmed.
- Shadows switch to a darker, wider tint (§4) — the light-mode tints are invisible at these luminances.
- The sidebar sits flush with the page ground and separates with a border alone; a light sidebar would glare against a dark page.

Because all of this lives in tokens, a correctly-built component needs **no `dark:` variants at all**. If you find yourself writing one, the underlying value is probably a hardcoded colour that should be a token.

## 12. Motion & Interaction
- Transitions: use the motion tokens from §4 (`duration-[--duration-fast] ease-[--ease-out-soft]` for hover/focus, `--duration-base` for layout changes like the sidebar collapse) — snappy, not floaty; many users are on low-end devices where heavy animation feels laggy.
- Page content gets a single shared entrance (`.animate-page-in`, a 4px rise over `--duration-slow`), applied by the shell to `<main>` and keyed on the pathname — so every page has it and no page implements it.
- `prefers-reduced-motion` is honoured by one global guard in `globals.css`. Don't re-implement it per component. (Note it does *not* reach JS-driven animation such as Recharts' entrance transitions — those are short and non-essential, but keep that in mind before adding a long one.)
- Loading: skeleton placeholders matching the shape of the real content, not generic spinners, for anything that takes >300ms.
- Optimistic UI: actions like marking attendance or submitting a quick form should update the UI immediately and roll back with a toast if the server rejects it.
- Micro-feedback: a brief success animation (checkmark, color flash) after a payment completes or a result publishes — this is a moment users should feel good about, not just see a plain confirmation.

## 13. Notification Centre
`NotificationBell` is mounted in both shells' top bars and polls a summary endpoint (there is no socket infrastructure in this app).

- The trigger shows an **unread count**, not a bare dot — "how many" is the first thing anyone wants from the control, and a number is a non-colour cue as well.
- The panel groups into **Today / Earlier**, and shows read and unread differently (weight, tint, and a brand-coloured dot).
- **Marking read is an explicit action** ("Mark all read"), never a side effect of opening the panel. Clearing everything on open makes the read/unread state it renders meaningless — you could never come back to something you only glanced at.
- The unread marker uses `--primary`. It must not use `--accent`, which is the *neutral structural* slot (a grey hover background) and renders as an invisible grey-on-grey dot.

## 14. Accessibility
- Minimum WCAG AA contrast (4.5:1) for all body text against its background — the palette in §2 is chosen to satisfy this against `surface`/`background`.
- Every interactive element gets a visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`). Unstyled focusables fall back to the browser's own outline, which `globals.css` tints to the brand ring via `outline-ring/50` on `*` — so nothing is ever focusable-but-invisible. Do **not** add a second global `:focus-visible` rule; components layer their own ring on top and you would get a doubled halo.
- Every icon-only button has an `aria-label`. The active nav item carries `aria-current="page"`.
- Touch targets are at least 44×44px on mobile — the bottom tab bar's columns are `min-h-16` full-height for this reason, and the "More" sheet's rows are `min-h-11`.
- **Never signal state with colour alone** — see the rule in §2, and §7 for what that means in charts.
- Keyboard paths are first-class, not an afterthought: ⌘K opens search from anywhere, the palette is arrow-navigable with Enter to open and Esc to close, and the sidebar collapse control reports `aria-expanded`.
- Respects the browser's text-zoom; never use `px` for font sizes in custom CSS (use Tailwind's `rem`-based classes).

## 15. How Frontend Prompts Use This File
Every frontend prompt in `prompts/stage-XX-*/` will say "follow `prompts/00-DESIGN-SYSTEM.md`" instead of repeating these rules. If a stage needs an exception (e.g., a print-only report card layout that intentionally ignores the app chrome), the prompt says so explicitly — otherwise, this file is the default.

One distinct exception worth flagging now: the **school's own logo/colors** (set in Stage 2's School Profile screen) are used only on *generated documents* — report cards, receipts, certificates — matching [14-module-academic-results.md](../docs/14-module-academic-results.md) §6. They never override this app's own UI chrome. The product's design system (this file) and the school's printed-document branding are two separate, intentionally non-overlapping things.
