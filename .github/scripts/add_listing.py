#!/usr/bin/env python3
"""Turn a "New listing" issue into an entry in listings.json.

Reads the issue body from $ISSUE_BODY, downloads any photos attached to the
issue, optimizes them into images/, and adds or updates the matching listing.
Closing the issue removes the listing again.

Writes a summary for the bot to post back to the issue into comment.md, and
reports what it did through $GITHUB_OUTPUT.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LISTINGS = ROOT / "listings.json"
IMAGES = ROOT / "images"
COMMENT = ROOT / "comment.md"

BODY = os.environ.get("ISSUE_BODY") or ""
ACTION = (os.environ.get("ISSUE_ACTION") or "opened").strip()
NUMBER = os.environ.get("ISSUE_NUMBER") or "0"
TOKEN = os.environ.get("GITHUB_TOKEN") or ""

# Issue-form labels, as they appear as "### headings" in the issue body.
FIELDS = {
    "Street address": "address",
    "City and state": "city",
    "Price": "price",
    "Property type": "type",
    "Status": "status",
    "Bedrooms (optional)": "beds",
    "Bathrooms (optional)": "baths",
    "Square feet (optional)": "sqft",
    "Lot size (optional)": "lot",
    "Neighborhood or subdivision (optional)": "neighborhood",
    "Listing link (optional)": "link",
    "Photos (optional)": "photos",
}

MAX_EDGE = "1600x1600>"
WEBP_QUALITY = "82"


# ---------------------------------------------------------------- output


def emit(**pairs):
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as fh:
        for key, value in pairs.items():
            fh.write(f"{key}={value}\n")


def finish(status, comment=None, **extra):
    if comment:
        COMMENT.write_text(comment.rstrip() + "\n", encoding="utf-8")
    emit(status=status, **extra)
    sys.exit(0)


# ---------------------------------------------------------------- parsing


def parse_body(body):
    """Split an issue-form body into {field_id: value}."""
    values = {}
    seen_headings = set()
    current, buf = None, []

    for line in body.replace("\r\n", "\n").split("\n"):
        heading = re.match(r"^###\s+(.*?)\s*$", line)
        if heading:
            if current:
                values[current] = "\n".join(buf).strip()
            label = heading.group(1)
            seen_headings.add(label)
            current, buf = FIELDS.get(label), []
        elif current:
            buf.append(line)
    if current:
        values[current] = "\n".join(buf).strip()

    # GitHub fills skipped fields with this placeholder.
    cleaned = {}
    for key, value in values.items():
        value = value.strip()
        cleaned[key] = "" if value in ("_No response_", "_No response_.") else value
    return cleaned, seen_headings


def digits(text):
    return re.sub(r"[^\d.]", "", text or "")


def money(text):
    raw = digits(text)
    if not raw:
        return (text or "").strip()
    try:
        return "$" + format(int(round(float(raw))), ",")
    except ValueError:
        return text.strip()


def whole(text):
    raw = digits(text)
    if not raw:
        return ""
    try:
        return format(int(round(float(raw))), ",")
    except ValueError:
        return ""


def counted(text, singular, plural):
    """'4' -> '4 Beds';  '1' -> '1 Bed';  '2.5' -> '2.5 Baths'."""
    raw = digits(text)
    if not raw:
        return None
    try:
        amount = float(raw)
    except ValueError:
        return None
    shown = str(int(amount)) if amount == int(amount) else f"{amount:g}"
    return f"{shown} {singular if amount == 1 else plural}"


def build_specs(data):
    kind = (data.get("type") or "Residential").strip().lower()
    specs = []

    if kind.startswith("commercial"):
        specs.append("Commercial")
    elif kind.startswith("land"):
        if data.get("lot"):
            specs.append(data["lot"].strip())
    else:
        for value in (
            counted(data.get("beds"), "Bed", "Beds"),
            counted(data.get("baths"), "Bath", "Baths"),
        ):
            if value:
                specs.append(value)

    area = whole(data.get("sqft"))
    if area:
        specs.append(f"{area} Sq Ft")

    if not kind.startswith("land") and data.get("lot") and not area:
        specs.append(data["lot"].strip())

    return specs


def art_for(data):
    kind = (data.get("type") or "").strip().lower()
    if kind.startswith("commercial"):
        return "building"
    if kind.startswith("land"):
        return "land"
    return "house"


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return slug or "listing"


def normalize(address):
    return re.sub(r"[^a-z0-9]", "", (address or "").lower())


# ---------------------------------------------------------------- photos


def photo_urls(text):
    urls = []
    urls += re.findall(r"!\[[^\]]*\]\(\s*(https?://[^)\s]+)", text)
    urls += re.findall(r"<img[^>]+src=[\"'](https?://[^\"']+)", text)
    if not urls:
        for line in text.split("\n"):
            line = line.strip()
            if re.match(r"^https?://\S+$", line):
                urls.append(line)

    seen, ordered = set(), []
    for url in urls:
        if url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def download(url, dest):
    """Fetch an issue attachment. The token goes in a config file rather than
    argv so it never shows up in the runner's process list."""
    cmd = ["curl", "-sSL", "--fail", "--max-time", "90", "-o", str(dest)]
    config = None
    if TOKEN and "github.com" in url:
        config = tempfile.NamedTemporaryFile("w", suffix=".curlrc", delete=False)
        config.write(f'header = "Authorization: Bearer {TOKEN}"\n')
        config.close()
        cmd += ["-K", config.name]
    cmd.append(url)
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    finally:
        if config:
            os.unlink(config.name)


def sniff(path):
    head = path.read_bytes()[:16]
    if head[:3] == b"\xff\xd8\xff":
        return "jpg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[4:12] in (b"ftypheic", b"ftypheix", b"ftyphevc", b"ftypmif1"):
        return "heic"
    return ""


def to_webp(src, dest):
    for binary in ("magick", "convert"):
        try:
            subprocess.run(
                [binary, str(src), "-auto-orient", "-strip",
                 "-resize", MAX_EDGE, "-quality", WEBP_QUALITY, str(dest)],
                check=True, capture_output=True,
            )
            if dest.exists() and dest.stat().st_size > 0:
                return True
        except (OSError, subprocess.CalledProcessError):
            continue
    return False


def save_photos(urls, slug):
    """Download, optimize, and store photos. Returns (paths, problems)."""
    paths, problems = [], []
    IMAGES.mkdir(exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        for index, url in enumerate(urls, start=1):
            raw = Path(tmp) / f"raw-{index}"
            try:
                download(url, raw)
            except subprocess.CalledProcessError:
                problems.append(f"Photo {index} couldn't be downloaded.")
                continue

            kind = sniff(raw)
            if not kind:
                problems.append(f"Photo {index} wasn't a recognized image and was skipped.")
                continue

            target = IMAGES / f"{slug}-{index}.webp"
            if to_webp(raw, target):
                paths.append(f"images/{target.name}")
                continue

            if kind == "heic":
                problems.append(
                    f"Photo {index} is an iPhone HEIC file this runner can't convert — "
                    "re-upload it as a JPEG."
                )
                continue

            fallback = IMAGES / f"{slug}-{index}.{kind}"
            fallback.write_bytes(raw.read_bytes())
            paths.append(f"images/{fallback.name}")

    return paths, problems


def referenced(items):
    used = set()
    for item in items:
        if item.get("photo"):
            used.add(item["photo"])
        for photo in (item.get("gallery") or {}).get("photos") or []:
            if photo.get("photo"):
                used.add(photo["photo"])
    return used


def drop_orphans(old_paths, items):
    """Delete image files the remaining listings no longer point at."""
    still_used = referenced(items)
    removed = []
    for path in old_paths:
        if path in still_used:
            continue
        target = ROOT / path
        if target.is_file() and IMAGES in target.parents:
            target.unlink()
            removed.append(path)
    return removed


# ---------------------------------------------------------------- main


def load():
    if not LISTINGS.exists():
        return {"listings": []}
    try:
        data = json.loads(LISTINGS.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        finish("error", f"`listings.json` has a syntax error, so nothing was changed:\n\n```\n{exc}\n```")
    if not isinstance(data.get("listings"), list):
        data["listings"] = []
    return data


def save(data):
    LISTINGS.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def photos_of(item):
    paths = []
    if item.get("photo"):
        paths.append(item["photo"])
    for photo in (item.get("gallery") or {}).get("photos") or []:
        if photo.get("photo"):
            paths.append(photo["photo"])
    return paths


def main():
    data, headings = parse_body(BODY)
    if "Street address" not in headings:
        finish("skipped")  # An ordinary issue, not a listing form.

    address = (data.get("address") or "").strip()
    if not address:
        finish("error", "This listing needs a street address. Edit the issue to add one.")

    store = load()
    items = store["listings"]
    key = normalize(address)
    index = next(
        (i for i, item in enumerate(items) if normalize(item.get("address", "")) == key),
        None,
    )

    if ACTION == "closed":
        if index is None:
            finish("skipped")
        old = photos_of(items[index])
        items.pop(index)
        drop_orphans(old, items)
        save(store)
        finish(
            "changed",
            f"Took **{address}** off the site. Reopen this issue to put it back.",
            commit_message=f"Remove listing: {address} (#{NUMBER})",
        )

    city = (data.get("city") or "").strip()
    slug = slugify(address)
    existing = items[index] if index is not None else None

    urls = photo_urls(data.get("photos") or "")
    problems = []
    if urls:
        old = photos_of(existing) if existing else []
        paths, problems = save_photos(urls, slug)
        if not paths and existing:
            paths = old  # keep what was there rather than stripping the card bare
            old = []
    elif existing:
        paths, old = photos_of(existing), []
    else:
        paths, old = [], []

    listing = {
        "price": money(data.get("price")),
        "address": address,
        "city": city,
    }
    if data.get("neighborhood"):
        listing["badge"] = data["neighborhood"].strip()
    if data.get("status"):
        listing["status"] = data["status"].strip()
    listing["specs"] = build_specs(data)
    if data.get("link"):
        listing["url"] = data["link"].strip()

    if paths:
        listing["photo"] = paths[0]
        listing["alt"] = f"{address}, {city}".strip().strip(",")
        if len(paths) > 1:
            listing["gallery"] = {
                "title": f"More views — {address}",
                "photos": [
                    {"photo": path, "alt": f"{address} — photo {n}"}
                    for n, path in enumerate(paths[1:], start=2)
                ],
            }
    else:
        listing["art"] = art_for(data)

    verb = "Updated" if index is not None else "Added"
    if index is not None:
        items[index] = listing
    else:
        items.insert(0, listing)

    if urls and old:
        drop_orphans(old, items)

    save(store)

    lines = [f"**{address}** is {'updated on' if index is not None else 'live on'} the site."]
    lines.append("")
    lines.append(f"- {listing['price']} · {' · '.join(listing['specs']) or 'no details given'}")
    if paths:
        strip = f", {len(paths) - 1} in the photo strip" if len(paths) > 1 else ""
        lines.append(f"- {len(paths)} photo{'s' if len(paths) != 1 else ''} saved (first one on the card{strip})")
    else:
        lines.append("- No photos yet, so the card shows a line drawing. Edit this issue and drop some in.")
    if not listing.get("url"):
        lines.append("- No listing link, so the card isn't clickable. Edit this issue to add one.")
    if problems:
        lines.append("")
        lines.append("Some photos had trouble:")
        lines += [f"- {p}" for p in problems]
    lines.append("")
    lines.append("_Edit this issue to change the listing. Close it to take the listing down._")

    finish(
        "changed",
        "\n".join(lines),
        commit_message=f"{verb} listing: {address} (#{NUMBER})",
    )


if __name__ == "__main__":
    main()
