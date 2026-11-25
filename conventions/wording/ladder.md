# The ladder

Go down in order. Stop at first rung that works. Most strings stop at rung 1 or 2.

## 1. Remove

Ask: *string gone — would user miss anything?*

Remove when string:
- repeats another element (title = button label, subtitle = title, alert message = alert title)
- describes what is visible (list header "Your projects" above obvious project list, on screen titled "Projects")
- explains interaction UI already affords (chevron, tappable card, swipe action, text field with cursor)
- confirms something user already sees happened (item appeared in list)
- labels field whose placeholder or context is unambiguous — keep label if field could be misread once filled

| Before | After |
|---|---|
| Title "Delete project" + message "Do you want to delete this project?" + button "Delete" | Title "Delete “Trip”?" + message with consequence + button "Delete" |
| Screen "Projects" + section header "Your projects" | Screen "Projects", no header |
| Card with chevron + caption "Tap to see details" | Card with chevron |
| Row added to list + toast "Item added" | Row added (animate insertion) |

## 2. Show

Ask: *can something visual say this without words?* Rules and per-platform components: `visuals.md`.

| Before | After |
|---|---|
| Toast "Saved successfully" | Button turns into checkmark for ~1 s (+ success haptic on iOS) |
| Label "Loading your data, please wait…" | Spinner / skeleton |
| Text "3 unread messages" next to Inbox | Badge `3` |
| Button "Share" in toolbar | `square.and.arrow.up` icon, a11y label "Share" |
| "No results found for your search" | Native empty state: magnifying glass + "No results" |
| "This field is required" under untouched field | Nothing until submit; then red outline + short message |

## 3. Shorten

Text needed. Fewest words that keep meaning.

- Buttons: verb, object only if ambiguous. "Save", "Delete", "Add photo". Never "OK" / "Yes" / "Submit" when precise verb exists.
- Titles: noun or question. No trailing period.
- Messages: one sentence max, usually fragment.
- Cut: "successfully", "please", "currently", "simply", "just", "in order to", "you can", "be able to".
- Numbers over words: "3 photos", not "three photos".
- Key word first: "Wi-Fi off" beats "You are currently not connected to Wi-Fi".

| Before | After |
|---|---|
| "Save changes" (only thing button saves) | "Save" |
| "You don't have any notifications at the moment" | "No notifications" |
| "Click here to create your first project" | "Create project" |
| "Please enter your email address" | "Email" (label) |

## 4. Tune

Apply base tone from `wording.md` → **Project voice**, overridden by situation (`situations.md`). Tone changes word choice and rhythm, **never length**: playful string ≠ longer string.

| Neutral | Complice |
|---|---|
| "No projects" | "Nothing here yet." |
| "Connection lost. Retry" | "Offline. Try again?" |

## Required text — never remove

- **Irreversible destructive action**: name object and what is lost. "12 photos will be deleted."
- **Error**: what to do next. Not what happened technically.
- **Legal, consent, pricing, renewal**: clarity over brevity.
- **Icon-only controls**: text stays as accessibility label.
