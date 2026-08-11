# How to add a listing

There are two ways. **Use the first one.** The second is there for when you want
fine control, or something needs fixing by hand.

---

## The easy way: fill in a form

1. Go to the repo's **Issues** tab → **New issue** → **New listing** → **Get started**.
2. Fill in the address, city, price, and status. Everything else is optional.
3. Drag your photos into the Photos box — or tap it and pick them from your phone.
4. Click **Submit new issue**.

About a minute later a bot replies on the issue confirming the listing is live, and
the site updates itself.

**The first photo becomes the card image. The rest become the photo strip** further
down the properties section. Photos are resized and converted automatically, so upload
them straight from your phone at full size — no need to shrink anything.

### Changing or removing a listing

The issue *is* the listing. It stays open as its record.

- **Change something** — price drop, status change, better photos: **edit the issue**
  and save. The site updates again.
- **Take it off the site**: **close the issue**. Its photos get cleaned up too.
- **Put it back**: reopen the issue.

You never need to touch `listings.json` for any of this.

### If something goes wrong

The bot comments on the issue with what happened. If a photo fails to convert (iPhone
HEIC files sometimes do), it tells you which one and publishes the rest — re-upload
that photo as a JPEG and it'll pick it up.

Only you (and anyone you add as a repo collaborator) can publish this way. Issues
opened by anyone else are ignored.

---

## The manual way: edit `listings.json`

Everything on the properties section comes from `listings.json`. You can edit it
directly on GitHub with the pencil icon — useful for reordering listings, adding photo
captions, or fixing a typo without going through the form.

Photos live in the `images` folder. Upload with **Add file → Upload files**, and name
them lowercase-with-dashes: `412-oak-street-1.webp`.

A listing looks like this:

```json
    {
      "price": "$289,900",
      "address": "412 Oak Street",
      "city": "Huntsville, AL",
      "badge": "Blossomwood",
      "status": "For Sale",
      "specs": ["4 Beds", "3 Baths", "2,240 Sq Ft"],
      "url": "https://www.realtor.com/PASTE-REAL-LINK-HERE",
      "photo": "images/412-oak-street-1.webp",
      "alt": "412 Oak Street, Huntsville, AL — front exterior"
    },
```

### What each field means

| Field | Required? | What it does |
|---|---|---|
| `price` | yes | Big number on the card. Typed exactly as shown, including `$` and commas. |
| `address` | yes | Street line. Also how the form matches an edit to an existing listing. |
| `city` | yes | Grey line under the address. |
| `specs` | yes | The row of details at the bottom. Any number of items. |
| `status` | optional | Black tag, top right — `For Sale`, `Under Contract`, `Sold`, `Coming Soon`. |
| `badge` | optional | White tag, top left. Usually the neighborhood. |
| `url` | optional | Where the card links. Must start with `http://` or `https://`, or it's ignored. |
| `photo` | optional | Path to the card photo, e.g. `images/412-oak-street-1.webp`. |
| `alt` | optional | Describes the photo for screen readers and when an image won't load. |
| `art` | optional | Used **only when there's no photo**: `"house"`, `"building"`, or `"land"`. |
| `demo` | optional | `true` marks it a placeholder — badge reads "Demo listing", card doesn't link. |
| `gallery` | optional | The photo strip below the grid. See below. |

### The photo strip (`gallery`)

```json
      "gallery": {
        "title": "More views — 412 Oak Street",
        "subtitle": "Kitchen, primary suite, backyard",
        "photos": [
          { "photo": "images/412-oak-2.webp", "caption": "Kitchen", "alt": "412 Oak Street — kitchen" },
          { "photo": "images/412-oak-3.webp", "caption": "Primary Suite", "alt": "412 Oak Street — primary bedroom" }
        ]
      }
```

Any number of photos works — the strip adjusts. The form doesn't set `caption` or
`subtitle`, so add those here if you want them.

### Three rules that prevent most mistakes

1. **Text goes in double quotes.** `"price": "$289,900"`.
2. **Commas between items, never after the last one.**
3. **Don't delete the outer brackets** — the file starts `{ "listings": [` and ends `] }`.

If the page says listings couldn't be loaded, there's a typo. Paste the file into
<https://jsonlint.com> and it points at the line.

---

## Your headshot

The About section shows a "KE" monogram until a photo is there. To replace it:

1. Get the photo out of the Photos app if that's where it lives: select it, then
   **File → Export → Export 1 Photo…**, set Photo Kind to **JPEG**, and save it to your
   Desktop. (Photos has no filenames of its own, so you can't rename it in there.)
2. In Finder, click the file once, press **Return**, and name it **`kevis-ellison`**.
   Leave whatever extension it already has — `.jpg`, `.jpeg`, `.png` and `.JPG` all work.
3. On GitHub, open the **`images`** folder → **Add file** → **Upload files** → drag it
   in → **Commit changes**.

That's it. No code change — the page looks for that name and uses it the moment it
exists. Remove the file and the monogram comes back.

A portrait-shaped photo works best, since the space is taller than it is wide. The
image is cropped from the center outward and anchored to the top, so your head stays
in frame. If the file ends in `.HEIC` (Apple's default), open it in Preview →
**File → Export** → set Format to **JPEG** → save, or Chrome visitors won't see it.

---

## Client reviews

The "What clients say" section is **hidden until there's a real review to show**,
so an empty file makes the site look finished rather than half-built.

To add one, edit `testimonials.json`:

```json
{
  "testimonials": [
    {
      "quote": "Kevis answered every call and walked us through our first closing.",
      "name": "First Name L.",
      "city": "Decatur"
    }
  ]
}
```

The section appears as soon as there's one entry, and lays out cleanly with one,
two, three or more.

**Only add reviews you actually received.** Invented testimonials are fake
endorsements — the FTC has rules against them, and for a licensed agent the
exposure isn't worth it. If you have reviews on Zillow, realtor.com, your Google
Business Profile, or Facebook, those are real and fair to quote. Asking a past
client for a line by text works too.

---

## Two notes about the site itself

**Previewing locally.** Opening `index.html` by double-clicking it shows "Listings
couldn't be loaded" — browsers block reading `listings.json` from a plain file path.
That's expected, not a broken site. View it through GitHub Pages instead.

**Publishing.** GitHub Pages isn't switched on yet. Turn it on under
**Settings → Pages → Source: Deploy from a branch → main / (root)**. On a free GitHub
account the repo has to be public for Pages to work; keeping it private requires
GitHub Pro. Either way the publishing form keeps working — strangers can't use it.
