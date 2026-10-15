#!/usr/bin/env python3
"""Bangun aset preset 2D gaya busana "umum" (tanpa hijab).

Sumber: assets/media-source/garden-2d-umum/*.jpeg (hasil generate, latar putih).
Hasil:  static/presets/garden-2d/assets/{mempelai,wedding-hosts,wedding-guests,seated-guests,
        ceremony-background,wedding-card-blank}-umum.webp, woman-atlas-umum.png (karakter Woman),
        + static/media/busana/{hijab,umum}.webp (thumbnail dashboard).

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


# Atlas karakter "Woman" (game.js): 8 baris arah x 8 kolom (kolom 0 idle, 1-7 jalan), sel 68 px,
# digambar dengan jangkar (34, 57). Atlas lama: tinggi idle 46 px (baris 11-56), tengah kolom 34.
WOMAN_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']
WOMAN_SOURCES = {'east': 'timur', 'south-east': 'tenggara', 'south': 'selatan', 'north': 'utara', 'north-east': 'timur-laut'}
WOMAN_MIRROR = {'west': 'east', 'south-west': 'south-east', 'north-west': 'north-east'}
CELL, WALK_FRAMES, IDLE_HEIGHT, FOOT_ROW = 68, 7, 46, 56


def strip_frames(rgba, min_gap=12, min_width=40):
    """Potong strip horizontal per frame berdasarkan kolom kosong. Serpihan sempit digabung ke tetangga."""
    cols = (rgba[..., 3] > 0).sum(0) > 2
    runs, start, gap = [], None, 0
    for x, filled in enumerate(cols):
        if filled:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                runs.append([start, x - gap + 1])
                start, gap = None, 0
    if start is not None:
        runs.append([start, len(cols)])
    merged = []
    for r in runs:
        if merged and (r[1] - r[0] < min_width or merged[-1][1] - merged[-1][0] < min_width):
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    frames = []
    for x0, x1 in merged:
        part = rgba[:, x0:x1]
        ys = np.nonzero(part[..., 3].any(1))[0]
        frames.append(Image.fromarray(part[ys.min():ys.max() + 1].copy(), 'RGBA'))
    return frames


def place_in_cell(img):
    """Rata bawah di FOOT_ROW, tengah kepala (30% baris teratas) di kolom 34."""
    a = np.asarray(img)[..., 3] > 0
    head = np.nonzero(a[: max(1, int(img.height * 0.3))].any(0))[0]
    cx = (head.min() + head.max() + 1) / 2
    cell = Image.new('RGBA', (CELL, CELL))
    cell.alpha_composite(img, (round(CELL / 2 - cx), FOOT_ROW + 1 - img.height))
    return cell


def build_woman():
    rows = {}
    strips = {name: strip_frames(cutout(SRC / 'karakter-jalan' / f'{name}.jpeg')) for name in WOMAN_SOURCES.values()}
    palette = woman_palette([f for frames in strips.values() for f in frames])
    for direction, name in WOMAN_SOURCES.items():
        frames = strips[name]
        idle, walk = frames[0], frames[1:]
        assert len(walk) >= WALK_FRAMES, f'{name}: hanya {len(walk)} frame jalan'
        # Siklus jalan sumber bisa 7-9 frame: ambil 7 yang tersebar merata supaya loop tetap mulus.
        picks = [walk[int(k * len(walk) / WALK_FRAMES)] for k in range(WALK_FRAMES)]
        factor = IDLE_HEIGHT / idle.height
        # Satu strip = satu gambar AI: ukuran 'piksel'-nya sama. Median antar-frame mencegah satu frame salah baca.
        # Piksel dianggap persegi: periode vertikal (lebih stabil) dipakai untuk kedua sumbu, supaya
        # proporsi tidak melebar bila periode horizontal salah terbaca (mis. 14 vs 16 px).
        period = float(np.median([grid_axis(f, 1)[0] for f in frames]))
        periods = [period, period]
        native = [sample_grid(f, periods) for f in [idle, *picks]]
        # Ukuran asli gambar AI ~46-49 px (timur-laut ~60): samakan tinggi idle ke 46 dengan nearest.
        factor = IDLE_HEIGHT / native[0].height
        rows[direction] = [place_in_cell(pixel_outline(resize_nearest(f, factor), saturation=1.05)) for f in native]
    for direction, source in WOMAN_MIRROR.items():
        rows[direction] = [c.transpose(Image.FLIP_LEFT_RIGHT) for c in rows[source]]
    atlas = Image.new('RGBA', (CELL * (WALK_FRAMES + 1), CELL * len(WOMAN_DIRS)))
    for r, direction in enumerate(WOMAN_DIRS):
        for c, cell in enumerate(rows[direction]):
            atlas.alpha_composite(cell, (c * CELL, r * CELL))
    atlas.save(OUT / 'woman-atlas-umum.png', optimize=True)
    return atlas


def grid_axis(img, axis, period=None):
    """Periode & fase grid 'piksel' gambar AI di satu sumbu, dari puncak gradien warna (analisis Fourier).
    Bila `period` diberikan, hanya fasenya yang dicari."""
    a = np.asarray(img).astype(np.float32)
    rgb, op = a[..., :3], a[..., 3] > 0
    if axis == 0:
        g = (np.abs(np.diff(rgb, axis=1)).sum(2) * (op[:, 1:] & op[:, :-1])).sum(0)
    else:
        g = (np.abs(np.diff(rgb, axis=0)).sum(2) * (op[1:] & op[:-1])).sum(1)
    g = g - g.mean()
    n = np.arange(len(g))
    periods = [period] if period else np.arange(8, 30, 0.05)
    best = max(((abs(z), p, z) for p in periods for z in [(g * np.exp(-2j * np.pi * n / p)).sum()]),
               key=lambda t: t[0])
    _, period, z = best
    edge = (np.angle(z) % (2 * np.pi)) * period / (2 * np.pi) + 0.5  # posisi batas antar 'piksel'
    return period, edge


def sample_grid(img, periods):
    """Baca warna di tengah tiap kotak grid (median 5x5, tahan noise JPEG) -> sprite tajam resolusi asli.
    `periods` (x, y) sama untuk satu strip; per frame hanya fase grid yang dicari."""
    a = np.asarray(img)
    h, w = a.shape[:2]
    centers = []
    for axis, size in ((0, w), (1, h)):
        period, edge = grid_axis(img, axis, periods[axis])
        start = edge - period * np.floor(edge / period) + period / 2
        centers.append(np.arange(start - period, size, period))
    out = []
    for cy in centers[1]:
        row = []
        for cx in centers[0]:
            x, y = int(round(cx)), int(round(cy))
            if not (0 <= x < w and 0 <= y < h):
                row.append((0, 0, 0, 0))
                continue
            win = a[max(0, y - 2):y + 3, max(0, x - 2):x + 3].reshape(-1, 4)
            solid = win[win[:, 3] > 0]
            if len(solid) * 2 < len(win):
                row.append((0, 0, 0, 0))
            else:
                r, g, b = np.median(solid[:, :3], axis=0).astype(np.uint8)
                row.append((r, g, b, 255))
        out.append(row)
    sprite = Image.fromarray(np.array(out, np.uint8), 'RGBA')
    return sprite.crop(sprite.getbbox())


def resize_nearest(img, factor):
    if abs(factor - 1) < 0.03:
        return img
    return img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), Image.NEAREST)


def woman_palette(frames, colors=40):
    """Satu palet untuk semua arah (warna konsisten), diambil dari piksel opaque semua frame."""
    px = np.concatenate([np.asarray(f)[..., :3][np.asarray(f)[..., 3] > 0][::7] for f in frames])
    side = int(np.ceil(np.sqrt(len(px))))
    sample = np.zeros((side * side, 3), np.uint8)
    sample[: len(px)] = px
    sample[len(px):] = px[0]
    return Image.fromarray(sample.reshape(side, side, 3), 'RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT)


def scale_mode(img, factor, palette, coverage=0.45):
    """Pengecilan gaya pixel art: warna dikunci ke palet, lalu tiap piksel hasil = warna paling dominan
    di kotak sumbernya (bukan rata-rata, jadi tidak ada warna campuran/buram)."""
    w, h = img.size
    tw, th = max(1, round(w * factor)), max(1, round(h * factor))
    a = np.asarray(img)
    idx = np.asarray(img.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE))
    pal = np.array(palette.getpalette()[: 3 * 256], np.uint8).reshape(-1, 3)
    opaque = a[..., 3] > 0
    xs = np.linspace(0, w, tw + 1).round().astype(int)
    ys = np.linspace(0, h, th + 1).round().astype(int)
    out = np.zeros((th, tw, 4), np.uint8)
    for j in range(th):
        for i in range(tw):
            block = opaque[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
            if block.size == 0 or block.mean() < coverage:
                continue
            counts = np.bincount(idx[ys[j]:ys[j + 1], xs[i]:xs[i + 1]][block], minlength=256)
            out[j, i, :3] = pal[counts.argmax()]
            out[j, i, 3] = 255
    return pixel_outline(Image.fromarray(out, 'RGBA'), saturation=1.0)


def scale_box(img, factor):
    """Pengecilan besar (sprite AI ~15 px per 'piksel' -> 1 px): rata-rata kotak, lalu alfa tegas."""
    w, h = img.size
    a = np.asarray(img).astype(np.float32)
    rgb = a[..., :3] * (a[..., 3:] / 255)  # premultiplied supaya tepi tidak keputihan
    pre = Image.fromarray(np.dstack([rgb, a[..., 3]]).astype(np.uint8), 'RGBA')
    size = (max(1, round(w * factor)), max(1, round(h * factor)))
    r = np.asarray(pre.resize(size, Image.BOX)).astype(np.float32)
    alpha = r[..., 3]
    out = np.zeros_like(r)
    solid = alpha >= 110
    out[..., :3] = np.where(solid[..., None], r[..., :3] * 255 / np.maximum(alpha[..., None], 1), 0)
    out[..., 3] = np.where(solid, 255, 0)
    return pixel_outline(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA'))


def pixel_outline(img, darken=0.32, saturation=1.15):
    """Gaya sprite lama: garis tepi gelap 1 px + warna sedikit lebih jenuh (pengecilan membuat kusam)."""
    a = np.asarray(img).astype(np.float32)
    solid = a[..., 3] > 0
    rgb = a[..., :3]
    gray = rgb.mean(axis=2, keepdims=True)
    rgb = np.clip(gray + (rgb - gray) * saturation, 0, 255)
    pad = np.pad(solid, 1)
    edge = solid & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    rgb = np.where(edge[..., None], np.minimum(rgb * darken + np.array([10, 10, 28]), 255), rgb)
    a[..., :3] = rgb
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


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
    steps = sys.argv[1:] or ['couple', 'hosts', 'guests', 'seated', 'ceremony', 'card', 'woman']
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
    if 'woman' in steps:
        build_woman()
    print('selesai:', ', '.join(steps))
