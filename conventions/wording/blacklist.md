# Blacklist

Reject these at every rung. Typical marks of AI-written UI copy.

## Narrating what the app did

UI state already shows it. Show, don't tell.

| ✗ | ✓ |
|---|---|
| "Your changes have been saved successfully!" | Checkmark on button, or nothing |
| "The file was imported successfully." | File appears in list |
| "We've updated your preferences." | Toggle reflects new state |
| "Project created! You can now start adding tasks." | Open new project |

## Explaining how the UI works

UI needs manual → fix UI.

| ✗ | ✓ |
|---|---|
| "Tap the + button below to add an item." | "+" button |
| "Swipe left to delete." | Swipe action with trash icon |
| "Use the toggle to enable notifications." | Toggle labeled "Notifications" |
| "Select an option from the list below:" | The list |

## Describing behavior or internals

| ✗ | ✓ |
|---|---|
| "This will automatically sync across all your devices." | Nothing, or "Synced" state indicator |
| "Your data is stored locally and encrypted." (settings row) | Nothing — privacy page if anywhere |
| "The list refreshes every 5 minutes." | Nothing |

## Filler politeness

| ✗ | ✓ |
|---|---|
| "Please enter your password" | "Password" |
| "Please wait…" | Spinner |
| "Please select a date" | "Date" |
| "Thank you for your patience" | Nothing |

## Vague reassurance and fake emotion

| ✗ | ✓ |
|---|---|
| "Don't worry, your data is safe." | Say concretely what happens, or nothing |
| "Oops! Something went wrong 😕" | "Couldn't load. Try again" |
| "Great job! 🎉" on routine actions | Nothing |

## Repeating the user's own action

| ✗ | ✓ |
|---|---|
| "You have selected 3 items." | "3 selected" in toolbar, or checkmarks |
| "You changed your name." | New name displayed |

## Dev jargon

| ✗ | ✓ |
|---|---|
| "Error 500: Internal Server Error" | "Server unavailable. Try again later" |
| "null", "undefined", "NaN" | Placeholder dash, or hide element |
| "Sync failed (code -1009)" | "Offline" |
| "Invalid input" | Say what is expected: "8 characters minimum" |

## Weak buttons

| ✗ | ✓ |
|---|---|
| "OK" / "Yes" on destructive confirm | "Delete" |
| "Submit" | Actual action: "Send", "Book", "Pay €12" |
| "Click here" | Destination or action |
| "Continue" when something specific happens | "Create account" |

## Punctuation and formatting tics

- Exclamation marks on routine actions.
- Ellipsis "…" except on actions opening further step (menu items, macOS convention) or real ongoing progress.
- Periods at end of buttons, titles, labels.
- Emoji, unless glossary or **Voice** explicitly allows them.
- Title Case in languages that don't use it (`native.md`).
