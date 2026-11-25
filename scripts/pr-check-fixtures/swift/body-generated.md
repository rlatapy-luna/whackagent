<!-- lb-agents -->
Feed thumbnails stay in memory while scrolling.

### Changes

<dl><dd><details>
<summary>Add a memory cache for feed thumbnails</summary>
<dl><dd><br>

**Before**: each thumbnail loaded again when it scrolled back in.

**Now**: `ThumbnailCache` keeps the images of the feed by URL.

</dd></dl>
</details></dd></dl>

- Update translations from Loco

Closes #12

### How to test
1. **Path**: Launch → Feed
2. Scroll down, then back up → thumbnails show at once.
<!-- /lb-agents -->
