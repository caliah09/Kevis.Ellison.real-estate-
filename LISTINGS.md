# How to add a listing

All property cards on the site come from one file: **`listings.json`**. You edit that
file, save it, and the site updates. You never have to touch `index.html`.

---

## The short version

1. Upload your photos to the **`images`** folder.
2. Open **`listings.json`** and add a block for the new property.
3. Commit. Done.

---

## Step 1 — Upload the photos

On GitHub, open the **`images`** folder → **Add file** → **Upload files** → drag your
photos in → **Commit changes**.

Name files in lowercase with dashes, no spaces, e.g.
`412-oak-street-exterior.jpg`. Photos around 1200–1600 px wide are plenty — the cards
are cropped to a 4:3 shape, so a normal landscape photo works well.

## Step 2 — Add the listing

Open **`listings.json`** on GitHub and click the pencil icon to edit it.

Copy this block and paste it inside the square brackets, right after the `[` so the new
listing shows up first. **Every listing block ends with a comma except the last one.**

```json
    {
      "price": "$289,900",
      "address": "412 Oak Street",
      "city": "Huntsville, AL",
      "badge": "Blossomwood",
      "status": "For Sale",
      "specs": ["4 Beds", "3 Baths", "2,240 Sq Ft"],
      "url": "https://www.realtor.com/PASTE-THE-REAL-LISTING-LINK-HERE",
      "photo": "images/412-oak-street-exterior.jpg",
      "alt": "412 Oak Street, Huntsville, AL — front exterior"
    },
```

Change the values between the quotation marks to match the property. Then scroll to the
bottom, write a short note like "Add 412 Oak Street", and click **Commit changes**.

The site picks it up within a minute or two.

---

## What each field means

| Field | Required? | What it does |
|---|---|---|
| `price` | yes | Big number on the card. Type it exactly as you want it shown, including the `$` and commas. |
| `address` | yes | Street line. |
| `city` | yes | Grey line under the address. |
| `specs` | yes | The row of details at the bottom. Any number of items — `["3 Beds", "2 Baths", "1,840 Sq Ft"]` or `["Commercial", "6,400 Sq Ft"]`. |
| `status` | optional | Black tag, top right — `For Sale`, `Under Contract`, `Sold`, `Coming Soon`. Leave it out and no tag shows. |
| `badge` | optional | White tag, top left. Good for a neighborhood name. |
| `url` | optional | Where the card links when clicked — the realtor.com listing, usually. Opens in a new tab. |
| `photo` | optional | Path to the main photo, e.g. `images/412-oak-street-exterior.jpg`. |
| `alt` | optional | Description of the photo for screen readers and for when an image fails to load. |
| `art` | optional | Used **only when there's no photo**. Draws a line sketch instead: `"house"`, `"building"`, or `"land"`. |
| `demo` | optional | `true` marks it as a placeholder — badge reads "Demo listing" and the card doesn't link anywhere. Delete this line once it's a real listing. |
| `gallery` | optional | The extra photo strip below the grid. See below. |

## The photo strip (`gallery`)

To show extra photos of a property underneath the card grid, add a `gallery` to that
listing:

```json
      "gallery": {
        "title": "More views — 412 Oak Street",
        "subtitle": "Kitchen, primary suite, backyard",
        "photos": [
          { "photo": "images/412-oak-kitchen.jpg", "caption": "Kitchen", "alt": "412 Oak Street — kitchen" },
          { "photo": "images/412-oak-primary.jpg", "caption": "Primary Suite", "alt": "412 Oak Street — primary bedroom" },
          { "photo": "images/412-oak-yard.jpg", "caption": "Backyard", "alt": "412 Oak Street — backyard" }
        ]
      }
```

Any number of photos works — the strip adjusts. If a listing has a `gallery` **and**
other fields after it, remember the comma rules below.

---

## Removing or changing a listing

- **Change a price or status:** edit the text between the quotation marks. That's it.
- **Remove a listing:** delete the whole block from `{` to `}`, plus its trailing comma.
- **Mark something sold:** change `"status": "For Sale"` to `"status": "Sold"`.

---

## Three rules that prevent 99% of mistakes

1. **Text goes in double quotes.** `"price": "$289,900"` — not `'$289,900'`, not
   `$289,900`.
2. **Commas between items, never after the last one.** Between two listing blocks:
   `},` then `{`. After the final `}` in the list: no comma.
3. **Don't delete the outer brackets** — the file must still start with
   `{ "listings": [` and end with `] }`.

If the page shows "Listings couldn't be loaded", the JSON has a typo. Paste the file
into <https://jsonlint.com> and it will point at the line.

---

## A note on previewing

Opening `index.html` by double-clicking it on your computer will show the "Listings
couldn't be loaded" message — browsers block reading `listings.json` from a plain file
path for security reasons. That's expected and does **not** mean the site is broken.
View the site through GitHub Pages (or any web server) to see it properly.
