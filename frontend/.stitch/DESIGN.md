# Sovereign AI — Interface System

## Product character

Sovereign AI is a private intelligence workspace, not a consumer chatbot. The interface should feel quiet, precise, secure, and operational. It uses restraint to communicate trust: one controlled accent, low-noise surfaces, strong typographic hierarchy, and motion only where it confirms state.

## Foundation

- Canvas: `#07090D`
- Navigation: `#0B0E13`
- Surface: `#10141B`
- Elevated/hover surface: `#171C25`
- Primary text: `#F4F6FA`
- Secondary text: `#A6AFBD`
- Muted text: `#6F7886`
- Primary action: `#78A7FF`
- Success: `#51D6A5`
- Warning: `#F2BD66`
- Destructive: `#FF7F8F`
- Default border: white at 7–9% opacity

Use the blue accent for primary actions, selected navigation, focus, and intelligence-related signals only. Status colors are semantic and must not become decoration.

## Typography

- UI: Inter when available, followed by Segoe UI Variable and system sans.
- Technical metadata: Cascadia Code or another platform monospace.
- Page titles use 600–650 weight, tight tracking, and sentence case.
- Labels use 9–10px monospace, uppercase, and generous tracking.
- Avoid uppercase headings and excessive bold weight.

## Geometry and depth

- Inputs and compact controls: 10–12px radius.
- Product cards: 16–22px radius.
- Borders carry most hierarchy; shadows remain broad, dark, and quiet.
- Do not stack multiple glowing borders. A single subtle focus edge is enough.

## Layout

- Desktop app navigation is 280px; mobile navigation is an off-canvas sheet.
- Top bar is 60px and keeps status compact.
- Content pages use a maximum width of 1180px with 16/24/40px responsive gutters.
- Chat content is limited to 820px for reading quality.
- Data tables keep density but need clear header separation and generous row hit areas.

## Interaction

- Standard transitions: 150–250ms.
- Page entry: short 7px rise with opacity.
- Buttons may move up no more than 2px on hover.
- Always honor `prefers-reduced-motion`.
- Focus indication must remain visible for keyboard users.

## Voice

Prefer concise operational language: “New conversation”, “Approvals”, “Documents”, “Private intelligence”. Avoid cyberpunk copy, fake terminal jargon, and decorative version/status noise.
