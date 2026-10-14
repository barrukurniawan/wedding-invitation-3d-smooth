#!/usr/bin/env python3
"""Bangun aset preset 2D gaya busana "umum" (tanpa hijab).

Sumber: assets/media-source/garden-2d-umum/*.jpeg (hasil generate, latar putih).
Hasil:  static/presets/garden-2d/assets/{mempelai,wedding-hosts,wedding-guests,seated-guests,
        ceremony-background,wedding-card-blank}-umum.webp + static/media/busana/{hijab,umum}.webp
        (thumbnail dashboard).

Setiap sosok ditempatkan di kanvas dan kotak crop yang sama dengan aset lama (hostCrops,
gardenGuests[].crop, seatedCrops di game.js; kanvas 393x370 untuk pengantin), jadi game.js
tidak perlu diubah. Butuh Pillow, numpy, dan cwebp/img2webp (libwebp).

Pakai: python3 -I scripts/media/build-garden-umum.py   (dari root repo)
"""
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/media-source/garden-2d-umum'
OUT = ROOT / 'static/presets/garden-2d/assets'
THUMBS = ROOT / 'static/media/busana'

# Kotak crop dari game.js (harus sama persis).
HOST_CROPS = [(138, 106, 484, 1070), (685, 178, 332, 998)]
GUEST_CROPS = [(221, 134, 317, 505), (772, 145, 278, 504), (230, 692, 277, 505), (745, 698, 306, 506)]
SEATED_CROPS = [(71, 74, 260, 394), (469, 84, 225, 386), (848, 95, 239, 373), (1220, 84, 259, 390),
                (70, 555, 254, 398), (449, 537, 268, 418), (843, 554, 250, 398), (1221, 563, 252, 391)]
COUPLE_CANVAS = (393, 370)
COUPLE_HEIGHT = 367  # tinggi opaque pengantin lama (lihat positionWeddingCouple di game.js)


def label(mask):
    """Komponen terhubung (4-arah). Mengembalikan (labels, daftar dict per komponen)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    comps = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n = len(comps) + 1
        lab[y0, x0] = n
        q = deque([(y0, x0)])
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    q.append((yy, xx))
        ys, xs = np.array(pts).T
        comps.append({'id': n, 'area': len(pts), 'cx': xs.mean(), 'cy': ys.mean(),
                      'edge': xs.min() == 0 or ys.min() == 0 or xs.max() == w - 1 or ys.max() == h - 1})
    return lab, comps


def cutout(path, tol=22, pocket_min=400):
    """Latar putih -> transparan: semua putih yang menyentuh tepi, plus kantong putih murni
    besar yang terkurung (sela antar-karakter). Kilau kecil/hangat (tiara, mata) dipertahankan."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    near = ((255 - rgb.min(2)) <= tol) & ((rgb.max(2) - rgb.min(2)) <= 12)
    lab, comps = label(near)
    bg = np.zeros(near.shape, bool)
    for c in comps:
        if c['edge']:
            bg |= lab == c['id']
        elif c['area'] >= pocket_min:
            m = lab == c['id']
            mean = rgb[m].mean(0)
            if mean.min() >= 251 and mean.max() - mean.min() <= 3:
                bg |= m
    rgba = np.dstack([rgb.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    return rgba


def sprites(rgba, assign, min_area=60):
    """Kelompokkan piksel opaque per sosok. assign(cx, cy) -> indeks sosok (atau None)."""
    lab, comps = label(rgba[..., 3] > 0)
    groups = {}
    for c in comps:
        if c['area'] < min_area:
            continue
        k = assign(c['cx'], c['cy'])
        if k is not None:
            groups.setdefault(k, []).append(c['id'])
    out = {}
    for k, ids in groups.items():
        m = np.isin(lab, ids)
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        part = rgba[y0:y1, x0:x1].copy()
        part[..., 3] = np.where(m[y0:y1, x0:x1], part[..., 3], 0)
        out[k] = Image.fromarray(part, 'RGBA')
    return [out[k] for k in sorted(out)]


def scale(img, factor):
    w, h = img.size
    r = img.resize((max(1, round(w * factor)), max(1, round(h * factor))), Image.LANCZOS)
    a = np.asarray(r).copy()
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)  # tepi tegas ala pixel art, tanpa halo putih
    return Image.fromarray(a, 'RGBA')


def into_rect(canvas, img, rect):
    """Isi tinggi kotak (sama seperti game.js menggambar sw x sh), rata bawah, tengah horizontal."""
    sx, sy, sw, sh = rect
    f = min(sh / img.height, sw / img.width)
    s = scale(img, f)
    canvas.alpha_composite(s, (sx + (sw - s.width) // 2, sy + sh - s.height))


def webp(img, dest, q=82):
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d) / 'in.png'
        img.save(tmp)
        subprocess.run(['cwebp', '-quiet', '-q', str(q), '-alpha_q', '100', '-exact', str(tmp), '-o', str(dest)], check=True)


def seam(alpha, nominal, axis, span=90):
    """Garis potong dengan piksel opaque paling sedikit di sekitar garis grid (frame bisa bersentuhan)."""
    counts = (alpha > 0).sum(axis)
    lo, hi = int(nominal - span), int(nominal + span)
    return lo + int(np.argmin(counts[lo:hi]))


def build_couple():
    rgba = cutout(SRC / 'pengantin.jpeg')
    h, w = rgba.shape[:2]
    ymid = seam(rgba[..., 3], h / 2, 1)
    frames = []
    for y0, y1 in ((0, ymid), (ymid, h)):
        band = rgba[y0:y1]
        xs = [0] + [seam(band[..., 3], w * k / 4, 0) for k in (1, 2, 3)] + [w]
        for x0, x1 in zip(xs, xs[1:]):
            cell = band[:, x0:x1].copy()
            lab, comps = label(cell[..., 3] > 0)
            big = max(c['area'] for c in comps)
            cw = x1 - x0
            for c in comps:
                m = lab == c['id']
                cols = np.nonzero(m.any(0))[0]
                at_cut = (cols.min() == 0 and x0 > 0) or (cols.max() == cw - 1 and x1 < w)
                # Buang bintik kecil & serpihan frame tetangga yang terpotong di garis potong.
                if c['area'] < 400 or (at_cut and c['area'] < big * 0.15):
                    cell[..., 3][m] = 0
            frames.append(sprites(cell, lambda cx, cy: 0)[0])
    assert len(frames) == 8, f'pengantin: {len(frames)} frame, harus 8'
    f = min(COUPLE_HEIGHT / max(fr.height for fr in frames), COUPLE_CANVAS[0] / max(fr.width for fr in frames))
    out = []
    for fr in frames:
        s = scale(fr, f)
        a = np.asarray(s)[..., 3]
        feet = np.nonzero(a[int(s.height * 0.85):].any(0))[0]  # jangkar: tengah area kaki/gaun bawah
        anchor = (feet.min() + feet.max()) / 2
        c = Image.new('RGBA', COUPLE_CANVAS)
        c.alpha_composite(s, (round(COUPLE_CANVAS[0] / 2 - anchor), COUPLE_CANVAS[1] - 1 - s.height))
        out.append(c)
    with tempfile.TemporaryDirectory() as d:
        args = ['img2webp', '-loop', '0', '-lossy', '-q', '82']
        for i, c in enumerate(out):
            p = Path(d) / f'{i}.png'
            c.save(p)
            args += ['-d', '200', str(p)]
        subprocess.run(args + ['-o', str(OUT / 'mempelai-umum.webp')], check=True, capture_output=True)
    return out[0]


def build_hosts():
    rgba = cutout(SRC / 'penerima-tamu.jpeg')
    mid = rgba.shape[1] / 2
    people = sprites(rgba, lambda cx, cy: 0 if cx < mid else 1)
    assert len(people) == 2
    canvas = Image.new('RGBA', (1254, 1254))
    for img, rect in zip(people, HOST_CROPS):
        into_rect(canvas, img, rect)
    webp(canvas, OUT / 'wedding-hosts-umum.webp')
    return canvas


def build_guests():
    rgba = cutout(SRC / 'tamu-berdiri.jpeg')
    h, w = rgba.shape[:2]
    people = sprites(rgba, lambda cx, cy: (0 if cy < h / 2 else 2) + (0 if cx < w / 2 else 1))
    assert len(people) == 4
    canvas = Image.new('RGBA', (1254, 1254))
    for img, rect in zip(people, GUEST_CROPS):
        into_rect(canvas, img, rect)
    webp(canvas, OUT / 'wedding-guests-umum.webp')
    return canvas


def recolor(img, hue_range, target_rgb, min_val=25):
    """Ganti warna baju: piksel dengan hue di hue_range (derajat) diwarnai ulang ke target_rgb,
    skala kecerahan relatif dipertahankan supaya motif batik tetap terlihat."""
    rgba = np.asarray(img).astype(np.float32)
    hsv = np.asarray(img.convert('RGB').convert('HSV')).astype(np.float32)
    hue = hsv[..., 0] * 360 / 255
    lo, hi = hue_range
    inr = (hue >= lo) & (hue <= hi) if lo <= hi else (hue >= lo) | (hue <= hi)
    m = inr & (hsv[..., 1] > 25) & (hsv[..., 2] > min_val) & (rgba[..., 3] > 0)
    lum = rgba[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    factor = lum / np.median(lum[m])
    tinted = np.clip(np.array(target_rgb, np.float32) * factor[..., None], 0, 255)
    rgba[..., :3] = np.where(m[..., None], tinted, rgba[..., :3])
    return Image.fromarray(rgba.astype(np.uint8), 'RGBA')


def build_seated():
    src = Image.open(OUT / 'seated-guests.png').convert('RGBA')
    crop = lambda i: src.crop((SEATED_CROPS[i][0], SEATED_CROPS[i][1],
                               SEATED_CROPS[i][0] + SEATED_CROPS[i][2], SEATED_CROPS[i][1] + SEATED_CROPS[i][3]))
    trim = lambda img: img.crop(img.getbbox())
    wavy, braid = trim(crop(2)), trim(crop(7))  # dua wanita tanpa hijab di sheet lama
    # Warna target = median warna baju tamu berhijab yang diganti (krem, marun, mustard).
    replace = {
        1: recolor(braid, (120, 220), (180, 151, 114)),
        4: recolor(wavy, (350, 14), (95, 31, 37), min_val=110),  # min_val: rambut cokelat gelap tidak ikut
        6: recolor(braid, (120, 220), (201, 140, 63)),
    }
    canvas = src.copy()
    for i, img in replace.items():
        sx, sy, sw, sh = SEATED_CROPS[i]
        canvas.paste((0, 0, 0, 0), (sx, sy, sx + sw, sy + sh))
        into_rect(canvas, img, SEATED_CROPS[i])
    webp(canvas, OUT / 'seated-guests-umum.webp')
    return canvas


def build_ceremony():
    img = Image.open(SRC / 'latar-akad-resepsi.jpeg').convert('RGB').resize((1536, 1536), Image.LANCZOS)
    webp(img, OUT / 'ceremony-background-umum.webp')


# Kotak kosong kartu (pecahan lebar/tinggi), diukur dari gambar: kiri kotak nama, kanan kotak HP,
# atas kotak nama, bawah kotak seri. Nama/tahun/seri ditulis di posisi persen tetap (.card-name dkk.
# di style.css), jadi kartu baru dipotong supaya kotak-kotak ini jatuh di posisi kartu lama.
CARD_OLD = {'left': 0.1938, 'right': 0.8850, 'top': 0.0385, 'bottom': 0.9400}
CARD_NEW = {'left': 0.1914, 'right': 0.8677, 'top': 0.0387, 'bottom': 0.9242}


def build_card():
    img = Image.open(SRC / 'kartu-cover.jpeg').convert('RGB')
    w, h = img.size
    sx = (CARD_OLD['right'] - CARD_OLD['left']) / (CARD_NEW['right'] - CARD_NEW['left'])
    sy = (CARD_OLD['bottom'] - CARD_OLD['top']) / (CARD_NEW['bottom'] - CARD_NEW['top'])
    to_new_x = lambda u: CARD_NEW['left'] + (u - CARD_OLD['left']) / sx
    to_new_y = lambda v: CARD_NEW['top'] + (v - CARD_OLD['top']) / sy
    box = (to_new_x(0) * w, to_new_y(0) * h, to_new_x(1) * w, to_new_y(1) * h)
    webp(img.resize((800, 1117), Image.LANCZOS, box=box), OUT / 'wedding-card-blank-umum.webp')


def build_thumbs(umum_frame):
    THUMBS.mkdir(parents=True, exist_ok=True)
    hijab = Image.open(OUT / 'mempelai.gif').convert('RGBA')
    for name, img in (('hijab', hijab), ('umum', umum_frame)):
        img = img.crop(img.getbbox())
        t = Image.new('RGBA', (img.width + 40, img.height + 24))
        t.alpha_composite(img, (20, 12))
        t = t.resize((round(t.width * 240 / t.height), 240), Image.LANCZOS)
        webp(t, THUMBS / f'{name}.webp', q=85)


if __name__ == '__main__':
    steps = sys.argv[1:] or ['couple', 'hosts', 'guests', 'seated', 'ceremony', 'card']
    if 'couple' in steps:
        build_thumbs(build_couple())
    if 'hosts' in steps:
        build_hosts()
    if 'guests' in steps:
        build_guests()
    if 'seated' in steps:
        build_seated()
    if 'ceremony' in steps:
        build_ceremony()
    if 'card' in steps:
        build_card()
    print('selesai:', ', '.join(steps))
