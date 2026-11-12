# ידיים (Yadaim) — UI Design System & Agent Handoff

**Status:** Design direction approved.  
**Product:** Hebrew-first web marketplace connecting licensed foreign-worker staffing agencies in construction with contractors and site managers in Israel.  
**Use this file as the visual and UX source of truth when building new pages.**

## 1. Design intent

**Keywords:** Practical, confident, trustworthy, clear, fast, construction-aware, modern Israeli B2B SaaS.

The product should feel like a reliable professional tool for construction sites, **not** like a generic AI startup or an enterprise ERP from 2008.

- **Light UI only.** A dark-navy navigation bar/sidebar is permitted; do not create a dark-mode product.
- **Photography + precise interface:** one tasteful construction photograph in the landing hero and restrained blueprint/construction motifs; real UI everywhere else.
- **Navy provides structure and credibility; lime identifies the main action.** Do not flood the entire UI with lime.
- **Functional clarity is more important than decoration.** Real construction managers use the product outside, on phones, under time pressure.
- Use warm-white/neutral backgrounds, clean surfaces, strong typography, ample whitespace, simple borders, and very limited shadow.
- Do **not** add gratuitous cranes, blueprint lines, 3D illustrations, strong gradients, glassmorphism, or decorative dashboards to every screen.
- The photographed construction imagery belongs mainly to marketing/landing pages; logged-in task screens should be much quieter.

### Reference assets

- `user_approved_reference.png` — visual direction selected by the product owner.
- `YADAIM_Landing_Desktop.png` — implementation-oriented desktop layout mockup.
- `YADAIM_Landing_Mobile.png` — mobile layout mockup.

**Visual hierarchy:** approved reference sets the aesthetic; this Markdown sets precise implementation behavior and tokens. Generated image mockups are illustrative, not authoritative for exact glyphs, prices, layouts, or factual claims. **Never use a mockup screenshot as the actual rendered website background.** Build semantic components and genuine controls.

## 2. Core tokens

### Colors

| Token | Hex | Purpose |
|---|---|---|
| `brand.navy` | `#0E2A44` | Brand text, outlines, dark primary CTA, navigation |
| `brand.navyDeep` | `#092238` | Stronger dark surface/sidebar |
| `brand.lime` | `#D4F25A` | Main conversion CTA, active choice, small accents |
| `surface.base` | `#FFFFFF` | Page and cards |
| `surface.soft` | `#F7F6F2` | Light warm sections |
| `surface.cool` | `#F4F8FB` | Light blue-tinted hero/forms |
| `border.default` | `#DFE5E9` | Card and input outlines |
| `text.muted` | `#526574` | Secondary content |
| `text.faint` | `#738493` | Explanatory labels |
| `status.success` | `#168848` | Approved / valid |
| `status.warning` | `#E69B21` | Expiring soon |
| `status.error` | `#D94848` | Expired / blocked |
| `status.info` | `#3277C8` | Informational |

**Important:** Lime is not a regular text color on a white background. Use it primarily as a filled button/selection background with navy text. Critical state meaning must not rely on color alone.

```css
:root {
  --color-brand-navy: #0e2a44;
  --color-brand-navy-deep: #092238;
  --color-brand-lime: #d4f25a;
  --color-surface: #ffffff;
  --color-surface-soft: #f7f6f2;
  --color-surface-cool: #f4f8fb;
  --color-border: #dfe5e9;
  --color-text-primary: #0e2a44;
  --color-text-muted: #526574;
  --color-success: #168848;
  --color-warning: #e69b21;
  --color-error: #d94848;
  --color-info: #3277c8;

  --radius-control: 10px;
  --radius-card: 18px;
  --radius-hero: 22px;
  --shadow-card: 0 3px 16px rgba(14, 42, 68, 0.045);
  --shadow-floating: 0 14px 36px rgba(14, 42, 68, 0.10);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Typography

- **Primary:** `Heebo`, fallback `Arial, sans-serif`; use same family for UI and marketing to preserve the crisp reference design.
- Optional secondary: `Assistant` for dense data tables if it improves readability. Avoid mixing many fonts.
- Desktop hero: `clamp(42px, 4.1vw, 64px)`, weight `800–900`, tight tracking, line-height `1.13–1.2`.
- Mobile hero: `32–38px`, weight `800–900`, line-height `1.20–1.3`.
- Section headers: `26–34px / 750–800` desktop, `22–28px` mobile.
- UI body: `15–16px`, with `1.5–1.65` line-height.
- Small labels: `12–13px`, not for essential user actions.
- Data/KPI figures: `24–36px / 800`; avoid wide decorative numerals.
- Avoid excessive underlining or random all-caps English in a Hebrew UI.

### Icons and imagery

- Use one consistent line-icon family, ideally **Lucide**, with `1.75–2px` stroke at `20–24px` size; large feature icons may be `28–32px`.
- Use authentic, high-quality imagery of construction work in Israel, with no visible company branding unless licensed/approved.
- One worker photo on the landing hero, building/site photo as background context. Use composition and spacing to preserve headline readability. **Never apply a white fade, opacity overlay, gradient, blur, or mask across a person’s face or hard hat.** Any edge-blending effect must start outside the subject’s entire head; preserve natural skin contrast and sharpness on desktop and mobile.
- Use actual user/worker photography only where the product requires a worker image and appropriate permissions exist; illustrative mockups may use placeholders.
- Do not use emoji as product icons. Do not treat image-generator text as usable typography.
- Keep the approved brand logo **visually consistent**. Replace any cropped reference mockup with an actual logo SVG/PNG asset in the production repository; do not use a screenshot crop as the final logo.

## 3. Layout and RTL

- All Hebrew application views: `<html lang="he" dir="rtl">`.
- Start with a **12-column fluid grid**, max content width `1240–1320px`.
- Desktop side padding `32–48px`; tablet `24px`; phone `16px`.
- Major vertical section spacing `48–72px`; inside card `20–28px`.
- Main breakpoints (guideline): mobile `< 768px`, tablet `768–1199px`, desktop `>= 1200px`.
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `border-inline-start`) and `start`/`end` in layouts. Avoid hardcoding left/right for content.
- Arabic also RTL; English LTR. Numbers, currency and dates should render unambiguously with bidi isolation where necessary.
- No horizontal page scrolling at `360px` viewport width. Mobile primary controls must have at least **44×44px** click/tap targets; prefer `48–52px` height.
- Brand header: logo on the **right** in RTL; navigation in the middle; sign-in and primary conversion actions on the **left**.

## 4. Landing page composition

**This is a marketing homepage, not a logged-in dashboard.** Do not put an entire admin UI into the hero.

### Header

- White, approximately 76–84px tall on desktop; 64–70px on mobile.
- Brand logo on the right; links: `איך זה עובד`, `לקבלנים`, `לתאגידים`, `למה ידיים?`, `אודות` (adjust only to actual routes).
- Left actions: bordered `כניסה`; lime-filled `התחלה בחינם` (only if the registration flow exists).
- Mobile: logo, login action and hamburger menu.

### Hero

**Headline (exact copy):**  
`יודעים מראש מי מגיע לאתר, ומה המחיר הסופי ליום.`

**Supporting text:**  
`הפלטפורמה שמחברת בין תאגידי כוח אדם זר לקבלנים בענף הבנייה. מוצאים עובדים מאומתים, בודקים זמינות ומזמינים בביטחון.`

- Hero occupies approximately the first `440–510px` below navigation on desktop.
- Main heading is large, navy and dominant. Underline only a short meaningful phrase with an irregular lime stroke/highlight.
- Worker portrait on the **left**, building/crane scene on the **right**; both fade into a white/light-blue central content area.
- Two immediately visible audience actions: `אני קבלן` (dark navy primary), `אני תאגיד` (outlined secondary).
- Both actions lead to the appropriate flow. Do not route both to the same generic registration page without recording role choice.

### Search entry point

- On desktop: single elevated horizontal white bar with three real inputs: `מקצוע`, `עיר/אזור`, `תאריך התחלה`, plus one lime `חיפוש עובדים` button.
- On mobile: real inputs in a compact stacked / 2-column layout and a **full-width** lime CTA.
- The search is contractor-oriented. It should link into the actual contractor search/registration flow; do not fake results.
- Allow keyboard navigation and visible focus states; labels are never placeholders only.

### Key value propositions

Use **four restrained icon/text items**, ideally one row on desktop and 2×2 on mobile:

1. `עובדים מאומתים` — `אשרות ואישורים בתוקף`
2. `יודעים מי מגיע` — `פרטים, מקצוע וניסיון מראש`
3. `הצוות ננעל ב־18:00` — `ודאות לקראת יום העבודה`
4. `מחיר יומי שקוף` — `כולל פרטי לינה והסעה`

Do not duplicate these as multiple oversized cards.

### Two audience cards

Two equal-size cards under the value propositions; stack vertically on mobile.

**Contractor card:**
- Title: `צריכים עובדים לאתר?`
- Support: find verified workers or available teams by profession, location and date.
- CTA: `לפרטים לקבלנים`.

**Agency card:**
- Title: `מנהלים עובדים? יש לכם ידיים.`
- Support: manage staffing, compliance, availability and share offers with contractors.
- CTA: `לפרטים לתאגידים`.

Use restrained photo/graphic decoration *within* the cards, not competing with their content.

### Statistics / trust strip

The source brief mentions roughly **220 licensed agencies**, **75–80k foreign construction workers**, the **18:00 team lock**, and a possible **₪0 charge when a worker is unsuitable**. **These numbers and commercial promises are unverified marketing copy, not implementation facts.** Validate them with product/legal before publication; prefer safe placeholders during development. **Do not expose service pricing on the landing page.**

## 5. Component rules

### Buttons

- Primary branded CTA: navy background + white text. High-emphasis acquisition CTA may instead be lime + navy text.
- Secondary: white background, 1px navy border, navy text.
- Tertiary: text only, navy, with a subtle arrow or icon.
- Heights: `48–56px` for key actions, `40–44px` for standard desktop UI. At least `44px` tap target on touch.
- Radius `10–12px`. Use consistent weights, no oversized pill shapes everywhere.
- All variants need hover, focus-visible, disabled, loading states.

### Cards and form fields

- Cards: white with `1px solid #DFE5E9`, radius `16–20px`, subtle shadow only when it helps hierarchy.
- Inputs: white, 1px border, labels above actual values; icon optionally near the label. Focus ring must be clearly visible.
- Avoid shadows on every nested element; a surface should not look like five cards inside five cards.
- Tabs/status chips can be lightly tinted; status must have icons and text, not color alone.
- Tables: narrow row separators, stable column alignment, no decorative photographs inside data grids unless it is the worker-avatar column.
- Loading and empty states must have short Hebrew microcopy and a next action.

### Status semantics

- **Valid** — green: `בתוקף`
- **Expiring soon** — amber: `עומד לפוג`
- **Expired / blocked** — red: `פג תוקף`
- **Pending** — neutral/blue: `ממתין`
- **Selected** — lime fill/border with check icon; never rely only on lime.

## 6. Logged-in product extension

The visual language must remain consistent, but authenticated application views should be denser and calmer than the marketing site.

### Contractor — phone first

- Search + availability results, verified worker cards, prices, certificates, experience and reviews.
- Worker row: recognizable image, short name, profession, years, rating/attendance, permit/insurance/height indicators, daily price, one obvious `הוספה`/`נבחר` action.
- Ready-made team card and **sticky bottom selection summary** (count, total daily amount, `המשך`).
- Morning check-in must have large Yes / Partial / No choices usable with gloves.
- The contractor should be able to complete the happy path quickly with minimal typing.

### Agency — desktop first

- Right-side navy navigation rail is acceptable, with lime active indicator.
- Data-heavy dashboards: KPIs, pending requests, expiring documents, occupancy/utilization, calendar, workers and teams.
- Status tags must be consistent with the token system.
- Use actual tables for worker management, not decorative dashboard cards for every field.
- Keep worker and agency dashboards visibly part of the same brand through typography, navy/lime, buttons, corner radii and icons.

## 7. Accessibility, quality, and implementation constraints

- WCAG AA contrast: body text target **4.5:1**; large text and active controls **3:1** where applicable.
- Visible keyboard focus, semantic forms, aria labels and validation messaging.
- Prefer logical CSS properties; test RTL deeply, including caret movement, dates, currency and search dropdowns.
- Responsive must be **designed**, not just desktop scaled down.
- Images should have meaningful alt text or empty alt when decorative; use optimized assets.
- Avoid motion that slows key tasks; respect reduced-motion settings.
- Do not infer analytics, pricing, reviews, availability or guarantees from illustrative mockup data.
- Reuse components and tokens; do not introduce one-off colors and radii for each page.

## 8. Definition of done — visual acceptance checklist

- [ ] Screenshot at `1440px` feels close to the approved reference: bright, photographic, refined, navy text, lime accent, no visual clutter.
- [ ] Screenshot at `390px` shows the hero, key actions and search clearly with no horizontal overflow.
- [ ] Hebrew labels are accurate, natural, RTL and not mirrored.
- [ ] Contractor and agency entry points are distinct and understandable.
- [ ] Search controls, sign-in links and action CTAs are real controls, not baked image text.
- [ ] Content/asset licensing and factual promotional claims are checked before production.
- [ ] No dark mode; dark sidebar only in authenticated agency views.
- [ ] Real content surfaces remain useful outdoors and on small screens.
- [ ] All new screens use the tokens and component grammar in this file.

## 9. Instruction for a coding agent

> Implement and maintain the product using `DESIGN_SYSTEM.md` as the shared visual system. Treat `user_approved_reference.png` and the desktop/mobile mockups as visual reference material, **not** as production assets or literal page screenshots. Use real React/components, semantic Hebrew RTL markup, reusable design tokens and proper responsive behavior. Prioritize the contractor booking journey on mobile and the agency operations journey on desktop. Preserve the approved navy/lime/white look while keeping logged-in screens more restrained than marketing pages. Never invent pricing, availability, ratings, regulatory approvals or marketing guarantees. Build the actual functional UI rather than recreating an image.
