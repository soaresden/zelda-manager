"""Convertit les 3 classeurs Excel (dossier parent) en fichiers data/*.js pour le site.

Usage :  python tools/extract_data.py [dossier_des_xlsx]
Les données viennent des tableaux Excel (onglets GameBDD / QST-LVL cachés compris),
ce qui récupère la totalité du contenu, même pour les versions "Trial".
"""
import json
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Dossier des classeurs : argument optionnel, sinon le dossier parent du site
XL_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(ROOT)
FILES = {
    "oot": "Zelda Ocarina Manager v7.xlsx",
    "mm": "Zelda Majora Manager v4 Trial.xlsx",
    "tfh": "Zelda Tri-Force Heroes Manager v6 Trial.xlsx",
}


def load_tables(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    out = {}
    for ws in wb.worksheets:
        for name in ws.tables:
            rows = [[c.value for c in r] for r in ws[ws.tables[name].ref]]
            out[name] = rows[1:]
    return out


def clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).replace("_x000D_", "").replace("\r", "").replace("\xa0", " ")
    return re.sub(r"[ \t]+\n", "\n", s).strip()


def tr(fr, en):
    fr, en = clean(fr), clean(en)
    return {"fr": fr or en, "en": en or fr}


def item(id_, name, info=None, tags=None, **extra):
    d = {"id": str(id_), "name": name}
    if info and (info["fr"] or info["en"]):
        d["info"] = info
    if tags:
        d["tags"] = [t for t in tags if t and (t["fr"] or t["en"])]
    d.update(extra)
    return d


def group(title, items, **extra):
    return dict({"title": title, "items": items}, **extra)


def section(id_, title, icon, groups, kind="checklist", **extra):
    return dict({"id": id_, "title": title, "icon": icon, "kind": kind, "groups": groups}, **extra)


# --------------------------------------------------------------------------- OoT
def build_oot(t):
    ages = {r[0]: tr(r[1], r[0]) for r in t["TabloPerso"]}

    def age(en):
        return ages.get(clean(en), tr(en, en))

    # Améliorations : un item par palier
    upgrades, order = {}, []
    for name_en, lvl, name_fr, age_en, _, info_en, info_fr in t["tabloupgrade"]:
        key = clean(name_en)
        if key not in upgrades:
            upgrades[key] = group(tr(name_fr, name_en), [])
            order.append(key)
        upgrades[key]["items"].append(item(
            f"up-{len(order)}-{lvl}", tr(f"Niveau {lvl}", f"Level {lvl}"),
            tr(info_fr, info_en), [age(age_en)]))
    magic = group(tr("Magie", "Magic"), [
        item(f"magic-{r[2]}", tr(r[1], r[0]), tr(r[4], r[3])) for r in t["tablomagie"]])
    upgrade_groups = [upgrades[k] for k in order] + [magic]

    arrows = group(tr("Flèches", "Arrows"), [
        item(f"arrow-{r[0]}", tr(r[2], r[1]), tr(r[4], r[3])) for r in t["tablofleches"]],
        icons=["ico-fire-arrow", "ico-ice-arrow", "ico-light-arrow"])
    spells = group(tr("Sorts des Grandes Fées", "Great Fairy spells"), [
        item(f"spell-{r[0]}", tr(r[2], r[1]), tr(r[4], r[3])) for r in t["tablosorts"]],
        icons=["ico-din", "ico-farore", "ico-nayru"])
    bigg = group(tr("Quête de l'épée de Biggoron (échanges)", "Biggoron's Sword trade quest"), [
        item(f"bigg-{r[0]}", tr(r[2], r[1]), tr(r[4], r[3]), [tr(r[6], r[5])])
        for r in t["tablobigg"]], ordered=True)

    # Skulltulas : 100 emplacements, variante Master Quest pour certains donjons
    sk = {int(r[0]): r for r in t["Tabloskulltulas"]}
    mq_of = {int(r[0]): int(r[2]) for r in t["equivMQ"] if int(r[1]) != int(r[2])}

    def sk_item(r):
        _, loc_en, loc_fr, time_en, time_fr, age_en, age_fr, note_en, note_fr = r
        return {"name": tr(loc_fr, loc_en), "info": tr(note_fr, note_en),
                "tags": [tr(time_fr, time_en), tr(age_fr, age_en)]}

    sk_groups, by_loc = [], {}
    for n in range(1, 101):
        base = sk_item(sk[n])
        loc = base["name"]["en"]
        if loc not in by_loc:
            by_loc[loc] = group(base["name"], [], mqKey=None)
            sk_groups.append(by_loc[loc])
        it = item(f"sk-{n}", tr(f"Skulltula n°{n}", f"Skulltula #{n}"), base["info"], base["tags"])
        if n in mq_of:
            mq = sk_item(sk[mq_of[n]])
            it["mq"] = {"info": mq["info"], "tags": mq["tags"]}
            by_loc[loc]["mqKey"] = loc
        by_loc[loc]["items"].append(it)
    rewards = [{"at": int(r[0]), "label": tr(r[2], r[1])} for r in t["tabloreward"]]

    hearts, by_loc = [], {}
    for r in t["TabloCoeur"]:
        n, loc_en, loc_fr, age_en, _, info_en, info_fr = r
        key = clean(loc_en)
        if key not in by_loc:
            by_loc[key] = group(tr(loc_fr, loc_en), [])
            hearts.append(by_loc[key])
        by_loc[key]["items"].append(item(
            f"heart-{n}", tr(f"Quart de cœur n°{n}", f"Piece of Heart #{n}"),
            tr(info_fr, info_en), [age(age_en)]))

    bottles = group(tr("Bouteilles", "Bottles"), [
        item(f"bottle-{r[0]}", tr(r[2], r[1]), tr(r[6], r[5]), [age(r[3])]) for r in t["tablobottle"]])
    songs = group(tr("Chants de l'ocarina", "Ocarina songs"), [
        item(f"song-{i}", tr(r[1], r[0]), tr(r[3], r[2])) for i, r in enumerate(t["tabloocarina"], 1)])
    masks = group(tr("Masques (Foire aux masques)", "Masks (Happy Mask Shop)"), [
        item(f"mask-{i}", tr(r[1], r[0]), tr(r[3], r[2])) for i, r in enumerate(t["tablomasques"], 1)],
        ordered=True)

    return {
        "id": "oot", "title": tr("Ocarina of Time", "Ocarina of Time"),
        "subtitle": tr("Atteindre les 100 %", "Helping you reach 100%"),
        "logo": "img/oot-logo.png", "theme": "oot",
        "version": "v7",
        "sections": [
            section("upgrades", tr("Améliorations", "Upgrades"), "ico-bag", upgrade_groups),
            section("arrows", tr("Flèches & sorts", "Arrows & spells"), "ico-fire-arrow", [arrows, spells]),
            section("biggoron", tr("Biggoron", "Biggoron"), "ico-kokiri-sword", [bigg]),
            section("skulltulas", tr("Skulltulas d'or", "Gold Skulltulas"), "ico-skulltula", sk_groups,
                    rewards=rewards, mqToggle=True),
            section("hearts", tr("Quarts de cœur", "Pieces of Heart"), "ico-heart", hearts),
            section("bottles", tr("Bouteilles", "Bottles"), "ico-bottle", [bottles]),
            section("ocarina", tr("Ocarina & masques", "Ocarina & masks"), "ico-ocarina", [songs, masks]),
        ],
    }


# --------------------------------------------------------------------------- Majora
MM_SONGS_EN = {
    "Song of Appeasement": "Song of Healing", "Song of inverted time": "Inverted Song of Time",
    "Song of the Scarecrow": "Scarecrow's Song", "Accelerated Song": "Song of Double Time",
    "Song of the flight": "Song of Soaring", "Ode of Call": "Oath to Order",
    "Goron lullaby": "Goron Lullaby", "Song of Epona": "Epona's Song",
    "Bossa-Nova": "New Wave Bossa Nova", "Void Anthem": "Elegy of Emptiness",
}
MM_MASKS_EN = {
    "Deku": "Deku Mask", "Goron": "Goron Mask", "Zora": "Zora Mask", "Giant": "Giant's Mask",
    "Oni-Link": "Fierce Deity's Mask", "Great Fairy": "Great Fairy's Mask", "Kafei": "Kafei's Mask",
    "Bremen": "Bremen Mask", "Blast": "Blast Mask", "Kamaro": "Kamaro's Mask", "Bunny": "Bunny Hood",
    "Scents": "Mask of Scents", "Truth": "Mask of Truth", "Keaton": "Keaton Mask",
    "Postman": "Postman's Hat", "Don Gero": "Don Gero's Mask", "Stone": "Stone Mask",
    "Garo": "Garo's Mask", "Romani": "Romani's Mask", "Couple": "Couple's Mask",
    "Troop Leader": "Troupe Leader's Mask", "All-Night": "All-Night Mask", "Captain": "Captain's Hat",
    "Gibdo": "Gibdo Mask",
}
MM_UPGRADES_EN = {
    "Lame Rasoir": "Razor Sword", "Lame Dorée": "Gilded Sword",
    "Bourses (100/200r/500r)": "Wallet (200r/500r)", "Sac de Bombes (20/30/40)": "Bomb Bag (20/30/40)",
    "Carquois (30/40/50)": "Quiver (30/40/50)",
}
MM_DUNGEONS = {
    "a": tr("Temple de Bois-Cascade", "Woodfall Temple"),
    "b": tr("Temple du Pic des Neiges", "Snowhead Temple"),
    "c": tr("Temple de la Grande Baie", "Great Bay Temple"),
    "d": tr("Temple de la Forteresse de Pierre", "Stone Tower Temple"),
}


# Moment où chaque quart de cœur est accessible (colonne "Moment" du classeur, raccourcie et traduite)
MM_HEART_WHEN = {
    2: ("Chaque nuit, minuit → 6h", "Every night, midnight → 6am"),
    3: ("3e jour", "Day 3"),
    6: ("Nuits 1 et 2, 18h → 6h", "Nights 1 and 2, 6pm → 6am"),
    8: ("J1 15h → minuit ; J2 0h → 6h et 15h → 21h", "D1 3pm → midnight; D2 0 → 6am and 3pm → 9pm"),
    20: ("Après le 1er temple (même cycle)", "After the 1st temple (same cycle)"),
    21: ("Tous les jours, 6h → 22h", "Every day, 6am → 10pm"),
    22: ("Tous les jours, 6h → 22h", "Every day, 6am → 10pm"),
    23: ("3e jour, 6h → 22h", "Day 3, 6am → 10pm"),
    26: ("Tous les jours, 6h → 22h", "Every day, 6am → 10pm"),
    27: ("2e nuit", "Night 2"),
    28: ("Après Rhork (même cycle)", "After Goht (same cycle)"),
    34: ("La nuit", "At night"),
    39: ("Après Rhork (même cycle)", "After Goht (same cycle)"),
    40: ("Jours 1 et 2, 8h → 18h", "Days 1 and 2, 8am → 6pm"),
    41: ("Tous les jours, 8h → 18h", "Every day, 8am → 6pm"),
    42: ("Jours 1 et 2, 10h → 20h", "Days 1 and 2, 10am → 8pm"),
    45: ("Après Gyorg (même cycle), 6h → 18h", "After Gyorg (same cycle), 6am → 6pm"),
}


def build_mm(t):
    masks = [item(f"mask-{i}", tr(r[0], MM_MASKS_EN.get(clean(r[3]), r[3])),
                  tr(f"{clean(r[1])}\n→ {clean(r[2])}", f"{clean(r[4])}\n→ {clean(r[5])}"))
             for i, r in enumerate(t["tablomasques"], 1)]
    transfo = [masks[i] for i in (0, 1, 2, 4)]
    others = [m for i, m in enumerate(masks) if i not in (0, 1, 2, 4)]

    fairies = []
    for letter, title in MM_DUNGEONS.items():
        rows = [r for r in t["fees"] if clean(r[0]).startswith(letter)]
        fairies.append(group(title, [
            item(f"fairy-{clean(r[0])}", tr(f"Fée n°{clean(r[0])[1:]}", f"Fairy #{clean(r[0])[1:]}"),
                 tr(r[1], r[2])) for r in rows]))

    skull = []
    for letter, title in (("a", tr("Maison Skulltula du Marais", "Swamp Spider House")),
                          ("b", tr("Maison Skulltula de l'Océan", "Ocean Spider House"))):
        rows = [r for r in t["Tabloskulltulas"] if clean(r[0]).startswith(letter)]
        skull.append(group(title, [
            item(f"sk-{clean(r[0])}", tr(f"n°{clean(r[0])[1:]} – {clean(r[1])}", f"#{clean(r[0])[1:]} – {clean(r[3])}"),
                 tr(r[2], r[4])) for r in rows]))

    up_groups, by_name = [], {}
    for i, r in enumerate(t["tabloupgrade"], 1):
        fr = clean(r[0])
        en = clean(r[2]) or MM_UPGRADES_EN.get(fr, fr)
        if fr not in by_name:
            by_name[fr] = group(tr(fr, en), [])
            up_groups.append(by_name[fr])
        g = by_name[fr]
        n = len(g["items"]) + 1
        g["items"].append(item(f"up-{i}", tr(f"Obtenu" if n == 1 else f"Niveau {n}", "Obtained" if n == 1 else f"Level {n}"),
                               tr(r[1], r[3])))
    for g in up_groups:  # renommer "Obtenu" en "Niveau 1" quand il y a plusieurs paliers
        if len(g["items"]) > 1:
            g["items"][0]["name"] = tr("Niveau 1", "Level 1")
    arrows = group(tr("Flèches", "Arrows"), [
        item(f"arrow-{i}", tr(r[1], r[0]), tr(r[2], r[3])) for i, r in enumerate(t["tablofleches"], 1)],
        icons=["ico-fire-arrow", "ico-ice-arrow", "ico-light-arrow"])

    hearts, by_loc = [], {}
    for r in t["TabloCoeur"]:
        n, loc_fr, _, _, _, _, info_fr, loc_en, info_en = r
        key = clean(loc_fr)
        if key not in by_loc:
            by_loc[key] = group(tr(loc_fr, loc_en), [])
            hearts.append(by_loc[key])
        when = tr(*MM_HEART_WHEN.get(int(n), ("N'importe quand", "Anytime")))
        by_loc[key]["items"].append(item(f"heart-{n}", tr(f"Quart de cœur n°{n}", f"Piece of Heart #{n}"),
                                         tr(info_fr, info_en), [when]))

    quiz = group(tr("Questions de Keaton", "Keaton's quiz"), [
        item(f"quiz-{i}", tr(r[0], r[2]), answer=tr(r[1], r[3])) for i, r in enumerate(t["tabloquestion"], 1)])

    bottles = group(tr("Bouteilles", "Bottles"), [
        item(f"bottle-{r[0]}", tr(r[1], r[3]), tr(r[2], r[4])) for r in t["tablobottle"]], ordered=True)
    songs = group(tr("Chants de l'ocarina", "Ocarina songs"), [
        item(f"song-{i}", tr(r[0], MM_SONGS_EN.get(clean(r[1]), r[1])), tr(r[3], r[2]))
        for i, r in enumerate(t["tabloocarina"], 1)])

    steps = []
    for i, (fr, en) in enumerate(t["kafei"], 1):
        head_fr, _, body_fr = clean(fr).partition("\n")
        head_en, _, body_en = clean(en).partition("\n")
        steps.append(item(f"kafei-{i}", tr(head_fr.strip(), head_en.strip()), tr(body_fr.strip(), body_en.strip())))
    kafei = [group(tr("Planning de la quête (dans l'ordre)", "Quest planning (in order)"), steps, ordered=True)]

    return {
        "id": "mm", "title": tr("Majora's Mask", "Majora's Mask"),
        "subtitle": tr("72 heures pour tout compléter", "72 hours to complete everything"),
        "logo": "img/mm-logo.png", "theme": "mm", "version": "v4",
        "sections": [
            section("masks", tr("Masques", "Masks"), "ico-mask-keaton",
                    [group(tr("Masques de transformation", "Transformation masks"), transfo),
                     group(tr("Autres masques (ordre de l'histoire)", "Other masks (story order)"), others)]),
            section("fairies", tr("Fées égarées", "Stray Fairies"), "ico-fairy", fairies),
            section("skulltulas", tr("Skulltulas", "Skulltulas"), "ico-skulltula", skull),
            section("upgrades", tr("Améliorations", "Upgrades"), "ico-sword", up_groups + [arrows]),
            section("hearts", tr("Quarts de cœur", "Pieces of Heart"), "ico-heart", hearts),
            section("quiz", tr("Quiz de Keaton", "Keaton's quiz"), "ico-mask-keaton", [quiz], kind="quiz",
                    countsForTotal=False),
            section("bottles", tr("Bouteilles & ocarina", "Bottles & ocarina"), "ico-bottle", [bottles, songs]),
            section("kafei", tr("Anju & Kafei", "Anju & Kafei"), "ico-letter", kafei),
        ],
    }


# --------------------------------------------------------------------------- Tri Force Heroes
def build_tfh(t):
    norm = lambda s: re.sub(r"[^a-z0-9]", "", clean(s).lower())

    zones = {}
    mats = []
    for fr, lieu_fr, id_, en, lieu_en, _ in t["TableauObjets"]:
        if norm(en) == "random":
            continue
        z = int(re.search(r"Zone (\d)", clean(lieu_fr)).group(1))
        zfr = clean(lieu_fr).split(" - ", 1)[1]
        zen = clean(lieu_en).split(" - ", 1)[1] if " - " in clean(lieu_en) else zfr
        zones.setdefault(z, tr(zfr, zen if z != 0 else "Castle"))
        mats.append({"id": f"m{int(id_)}", "name": tr(fr, en), "zone": z, "drops": [], "usedBy": []})
    mat_by = {}
    for m in mats:
        mat_by[norm(m["name"]["en"])] = m
        mat_by[norm(m["name"]["fr"])] = m

    stage_names = {}
    for code, _, _, nfr, nen in t["NiveauIndex"]:
        stage_names[int(code) // 10] = tr(nfr, nen)

    levels, missing = [], set()
    for code, lib_fr, d66fr, d33fr, label_en, d66en, d33en in t["TableauQueteComplete"]:
        code = int(code)
        w, s, c = code // 100, (code // 10) % 10, code % 10
        lab_en = clean(label_en)
        if lab_en == clean(lib_fr) and w != 9:  # traductions manquantes dans le classeur
            lab_en = {"Gagnez sans utiliser d'objets": "Win without using items",
                      "Sans Defi": "Normal level"}.get(lab_en, lab_en)
        drops = []
        for en_name, fr_name, p in ((d66en, d66fr, 66), (d33en, d33fr, 33)):
            m = mat_by.get(norm(en_name)) or mat_by.get(norm(fr_name))
            if m:
                drops.append({"m": m["id"], "p": p})
                m["drops"].append({"lvl": str(code), "p": p})
            elif norm(en_name) not in ("random", "freebie", ""):
                missing.add(clean(en_name))
            elif norm(en_name) == "freebie":
                drops.append({"m": None, "p": p, "label": tr("Gratuit", "Freebie")})
        levels.append({"id": str(code), "world": w, "stage": s, "challenge": c,
                       "label": tr(lib_fr, lab_en), "drops": drops})
    if missing:
        print("  ! matériaux non reconnus dans les niveaux :", sorted(missing), file=sys.stderr)

    desc = {norm(r[2]): (r[1], r[3]) for r in t["TranslateOutfits"]}
    outfits = []
    for r in t["BDDTENUESREF"]:
        n, en, fr = r[0], r[1], r[2]
        ing = {}
        for x_en, x_fr in zip(r[8:13], r[3:8]):
            if not clean(x_en) and not clean(x_fr):
                continue
            qty = 1
            q = re.search(r"\((\d+)\)\s*$", clean(x_en))
            if q:  # ex. "Freebie (10)"
                qty = int(q.group(1))
                x_en, x_fr = re.sub(r"\s*\(\d+\)\s*$", "", clean(x_en)), re.sub(r"\s*\(\d+\)\s*$", "", clean(x_fr))
            m = mat_by.get(norm(x_en)) or mat_by.get(norm(x_fr))
            if not m:
                print("  ! ingrédient inconnu", x_en, x_fr, file=sys.stderr)
                continue
            ing[m["id"]] = ing.get(m["id"], 0) + qty
        price = r[13]
        d = desc.get(norm(en), ("", ""))
        o = {"id": f"o{int(n)}", "name": tr(fr, en), "desc": tr(d[0], d[1]),
             "ingredients": [{"m": k, "q": v} for k, v in ing.items()]}
        if isinstance(price, (int, float)) and price:
            o["price"] = int(price)
        elif clean(price) and not isinstance(price, (int, float)):
            o["note"] = tr("Débloquée à la fin du jeu", "Unlocked at the end of the game")
        elif not ing:
            o["note"] = tr("Obtenue automatiquement", "Obtained automatically")
        outfits.append(o)
        for k in ing:
            next(m for m in mats if m["id"] == k)["usedBy"].append(o["id"])

    worlds = {}
    for z, name in zones.items():
        if 1 <= z <= 8:
            worlds[z] = name
    worlds[9] = tr("La Crypte", "Den of Trials")

    return {
        "id": "tfh", "title": tr("Tri Force Heroes", "Tri Force Heroes"),
        "subtitle": tr("Quêtes, matériaux et tenues", "Quests, materials and outfits"),
        "logo": "img/tfh-logo.jpg", "theme": "tfh", "version": "v6",
        "zones": zones, "worlds": worlds,
        "stages": {str(k): v for k, v in stage_names.items()},
        "levels": levels, "materials": mats, "outfits": outfits,
        "sections": [
            {"id": "levels", "title": tr("Défis", "Challenges"), "kind": "tfh-levels", "icon": "ico-sword"},
            {"id": "outfits", "title": tr("Tenues", "Outfits"), "kind": "tfh-outfits", "icon": "ico-bag"},
            {"id": "materials", "title": tr("Matériaux", "Materials"), "kind": "tfh-materials", "icon": "ico-fairy"},
        ],
    }


# --------------------------------------------------------------------------- Illustrations
# Images reprises des classeurs (dossier img/). Section -> icône, groupe (par index) -> image,
# item (par id) -> image.
IMAGES = {
    "oot": {
        "art": ["img/oot-link-adult.png", "img/oot-link-child.png"],
        "sections": {"upgrades": "oot-bullet-bag", "arrows": "fire-arrow", "biggoron": "oot-biggoron-sword",
                     "skulltulas": "mm-skull-token", "hearts": "heart", "bottles": "bottle", "ocarina": "mm-link-ocarina"},
        "groups": {"upgrades": ["oot-bullet-bag", "bomb-bag", "quiver", "oot-deku-stick", "oot-deku-nut", "oot-scale",
                                "wallet", "potion"],
                   "arrows": ["fire-arrow", "oot-great-fairies"], "biggoron": ["oot-biggoron-sword"],
                   "bottles": ["bottle"], "ocarina": ["mm-link-ocarina", "oot-mask-keaton"]},
        "items": {"arrow-1": "fire-arrow", "arrow-2": "ice-arrow", "arrow-3": "light-arrow",
                  "spell-1": "oot-din", "spell-2": "oot-farore", "spell-3": "oot-nayru",
                  "bottle-4": "oot-poe", "bigg-5": "oot-biggoron-sword",
                  "mask-1": "oot-mask-keaton", "mask-2": "oot-mask-skull", "mask-3": "oot-mask-spooky",
                  "mask-4": "oot-mask-bunny", "mask-5": "oot-mask-truth", "mask-6": "oot-mask-zora",
                  "mask-7": "oot-mask-goron", "mask-8": "oot-mask-gerudo"},
        "maps": {"bottles": {"src": "img/oot-map.png",
                             "title": {"fr": "Carte de la plaine d'Hyrule — les 10 Esprits (Big Poes)",
                                       "en": "Hyrule Field map — the 10 Big Poes"}}},
    },
    "mm": {
        "art": ["img/mm-hero.png", "img/mm-kafei.png"],
        "sections": {"masks": "mm-mask-keaton", "fairies": "mm-stray-fairy", "skulltulas": "mm-skull-token",
                     "upgrades": "mm-razor-sword", "hearts": "heart", "quiz": "mm-mask-keaton", "bottles": "bottle",
                     "kafei": "mm-mask-couple"},
        "groups": {"masks": ["mm-mask-deku", "mm-mask-great-fairy"],
                   "fairies": ["mm-stray-fairy"] * 4, "skulltulas": ["mm-skull-token"] * 2,
                   "upgrades": ["potion", "mm-spin-attack", "mm-tunic", "mm-fairy-sword", "mm-razor-sword",
                                "mm-gilded-sword", "wallet", "bomb-bag", "quiver", "fire-arrow"],
                   "hearts": [], "quiz": ["mm-mask-keaton"], "bottles": ["bottle", "mm-link-ocarina"],
                   "kafei": ["mm-kafei"]},
        "items": dict(
            {f"mask-{i}": f"mm-mask-{n}" for i, n in enumerate(
                ["deku", "goron", "zora", "giant", "fierce-deity", "great-fairy", "kafei", "bremen", "blast",
                 "kamaro", "bunny", "scents", "truth", "keaton", "postman", "don-gero", "stone", "garo", "romani",
                 "couple", "troupe-leader", "all-night", "captain", "gibdo"], 1)},
            **{"arrow-1": "fire-arrow", "arrow-2": "ice-arrow", "arrow-3": "light-arrow", "bottle-1": "potion"}),
    },
    "tfh": {
        "art": [],
        "sections": {"levels": "⚔️", "outfits": "👘", "materials": "💎"},
    },
}


def decorate(key, data):
    conf = IMAGES[key]
    data["art"] = conf.get("art", [])
    for sec in data["sections"]:
        icon = conf["sections"].get(sec["id"], "")
        if icon and icon.isascii():
            sec["icon"] = f"img/{icon}.png"
        else:
            sec.pop("icon", None)
            sec["emoji"] = icon
        if sec["id"] in conf.get("maps", {}):
            sec["map"] = conf["maps"][sec["id"]]
        for gi, g in enumerate(sec.get("groups", [])):
            g.pop("icons", None)
            gimgs = conf.get("groups", {}).get(sec["id"], [])
            if gi < len(gimgs):
                g["img"] = f"img/{gimgs[gi]}.png"
            for it in g["items"]:
                if it["id"] in conf.get("items", {}):
                    it["img"] = f"img/{conf['items'][it['id']]}.png"
    return data


def main():
    builders = {"oot": build_oot, "mm": build_mm, "tfh": build_tfh}
    for key, fname in FILES.items():
        path = os.path.join(XL_DIR, fname)
        data = decorate(key, builders[key](load_tables(path)))
        data["source"] = fname
        out = os.path.join(ROOT, "data", f"{key}.js")
        with open(out, "w", encoding="utf-8") as f:
            f.write("// Généré par tools/extract_data.py depuis " + fname + " — ne pas éditer à la main.\n")
            f.write(f"window.ZDATA = window.ZDATA || {{}};\nZDATA.{key} = ")
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            f.write(";\n")
        n = sum(len(g["items"]) for s in data["sections"] for g in s.get("groups", []))
        print(f"{key}: {os.path.relpath(out, ROOT)}  ({n} éléments à cocher"
              + (f", {len(data['levels'])} défis, {len(data['outfits'])} tenues, {len(data['materials'])} matériaux" if key == "tfh" else "")
              + ")")


if __name__ == "__main__":
    main()
