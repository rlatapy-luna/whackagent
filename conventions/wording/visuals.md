# Visuals — rung 2 "Show"

## Rules

1. **Use what project already has.** Detect icon system and design-system components before proposing anything. Never add dependency. Nothing fits → propose, don't implement.
2. **Verify icon names exist.** Never invent SF Symbol, Material Symbol or lucide name. Unsure → say so, no guess.
3. **Icon alone only when meaning universal**: close, add, delete (trash), share, search, settings (gear), edit (pencil), back, more (ellipsis), favorite (heart/star), play/pause. Anything else → icon + short label, or label alone. Mystery icon worse than word.
4. **Native states before custom UI**: platform components and states over invented text.
5. **Accessibility label mandatory** on every icon-only control, carrying text it replaced.
6. **Structural changes stay in scope.** Replace existing text with visual, or add UI element, only when task covers that screen; else say it in `NOTES:`.

## Detecting the icon system

| Stack | Where to look | Icon source |
|---|---|---|
| SwiftUI / UIKit | `Image(systemName:)`, `UIImage(systemName:)`, asset catalogs | SF Symbols |
| Compose / Android | `Icons.Default.*`, `Icons.Rounded.*`, `res/drawable` | Material Symbols |
| Web | `package.json`: `lucide-react`, `@heroicons/*`, `@phosphor-icons/*`, `react-icons`, `@mui/icons-material`, `@radix-ui/react-icons`, icon sprites | That library |

Also local design-system components: `Badge`, `EmptyState`, `Toast`, `Spinner`, `Skeleton`, `IconButton`, `Tooltip`.

## Native components and states

| Intent | SwiftUI | UIKit | Web | Compose |
|---|---|---|---|---|
| Destructive action | `Button(role: .destructive)` | `UIAlertAction(style: .destructive)`, `.destructive` menu attribute | danger variant, red | `MaterialTheme.colorScheme.error` |
| Empty state | `ContentUnavailableView` | `UIContentUnavailableConfiguration` | `EmptyState` component | Custom composable, icon + text |
| Search empty | `ContentUnavailableView.search` | same config `.search()` | — | — |
| Loading | `ProgressView`, `.redacted(reason: .placeholder)` | `UIActivityIndicatorView` | spinner / skeleton, `aria-busy="true"` | `CircularProgressIndicator` |
| Unavailable action | `.disabled(true)` | `isEnabled = false` | `disabled`, `aria-disabled` | `enabled = false` |
| Count | `.badge(3)` | `tabBarItem.badgeValue` | badge component | `BadgedBox` |
| Success feedback | `.sensoryFeedback(.success, trigger:)`, symbol swap with `.contentTransition(.symbolEffect(.replace))` | `UINotificationFeedbackGenerator` | icon swap + `aria-live="polite"` | `HapticFeedbackType` |
| Accessibility label | `.accessibilityLabel("Share")` or `Label("Share", systemImage:).labelStyle(.iconOnly)` | `accessibilityLabel` | `aria-label` | `contentDescription` |

SwiftUI: prefer `Label("Share", systemImage: "square.and.arrow.up")` + `.labelStyle(.iconOnly)` — text stays for VoiceOver and localization for free.

## Success without text

After save, send, add, copy:
- result visible (item in list, new value shown) → nothing
- result not visible (copy to clipboard, background save) → brief icon swap to checkmark, haptic on mobile, polite live region on web
- toast justified only when action has undo, or its effect happens off-screen and matters
