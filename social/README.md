# Social post template

Makes Kevis's Sold, Under Contract and Coming Soon posts, all in the same design:
- The full listing photo, with a red diagonal status ribbon in the corner and big status lettering in the sky.
- Kevis's headshot, name and phone along the bottom left, and the address, price and details along the bottom right.
- The Linda Blue logo in the top right.

Every post produces two images:

| File | What it's for |
|---|---|
| `out/<slug>.png` | The 1080 x 1080 image to upload to Instagram and Facebook |
| `out/<slug>-instagram.png` | A phone preview showing the caption, to send Kevis for approval |

Captions follow [`../CAPTIONS.md`](../CAPTIONS.md).

## Make a new post

1. **Add the photo.** Put the front photo in `social/photos/`, or use one that's already in `images/`.
2. **Add an entry to `posts.json`.** Copy an existing post and change:
   - `slug`: short and unique, used for the file names, like `sold-1612-4th-ave-sw`.
   - `status`: `sold`, `under-contract` or `coming-soon`. This sets the ribbon and the big lettering.
   - `photo`: the path from the repo root, like `social/photos/1612-4th-ave-sw.webp`.
   - `photoPosition`: which part of the photo to keep when it's cropped square. `50% 50%` is the center. Lower the second number to show more sky.
   - `subtitle`: the line under the big lettering, like `Another home sold in Decatur, AL`.
   - `address`, `price`, `specs`: shown on the post. Use only verified facts.
   - `courtesy`: for another brokerage's listing, like `Listing courtesy of KW Huntsville`. Otherwise `null`.
   - `caption` and `extraHashtags`: used in the Instagram preview. The five standard hashtags are added automatically.
3. **Render it** (see below), then check both images before sending.

## Render

You need [Node.js](https://nodejs.org) and an internet connection for the fonts. The first time only:

```bash
cd social
npm install
npx playwright install chromium
```

Then, from the `social` folder:

```bash
npm run render              # every post
node render.js 1612         # only posts whose slug contains "1612"
```

The images land in `social/out/`, which isn't committed. To use a Chromium that's already installed, set `CHROMIUM_PATH` to its path.

## Rules baked into the design

- **Sold** posts go up only after the closing. Until then, use `under-contract`.
- **Buyer-side posts** say "for my buyers" in the subtitle and fill in `courtesy`.
- **No made-up details.** The Instagram preview shows no likes or comments.
