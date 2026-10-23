"""Extract a clean, georeferenced campus basemap from the original vector PDF.

Run from frontend: python scripts/build-campus-map.py
Build-time dependencies: PyMuPDF, numpy, scipy, opencv-python.
The original PDF and survey coordinates are never modified.
"""

from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re

import cv2
import fitz
import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "植物地图电子版.pdf"
DATA = ROOT / "public/legacy/data/ligneous_plants.geojson.js"
OUT = ROOT / "public/maps"
R = 6378137.0


def mercator(coords):
    coords = np.asarray(coords)
    return np.c_[R * np.radians(coords[:, 0]),
                 R * np.log(np.tan(np.pi / 4 + np.radians(coords[:, 1]) / 2))]


def latlng(x, y):
    return [float(np.degrees(2 * np.arctan(np.exp(y / R)) - np.pi / 2)),
            float(np.degrees(x / R))]


def apply(matrix, points):
    points = np.asarray(points)
    return np.c_[points, np.ones(len(points))] @ matrix.T


def circle(drawing):
    rect = drawing["rect"]
    return (len(drawing["items"]) == 4
            and all(item[0] == "c" for item in drawing["items"])
            and max(rect.width, rect.height) < 100)


def center(rect):
    return [(rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2]


def kind(drawing):
    """Keep base geometry, excluding survey markers and legend graphics."""
    if drawing["layer"] == "植物名" or drawing["rect"].x0 < 1300 or circle(drawing):
        return None
    fill = drawing.get("fill")
    if fill is None:
        return "outline" if drawing["rect"].width + drawing["rect"].height > 35 else None
    rgb = np.array(fill)
    if np.linalg.norm(rgb - [0.89, 0.84, 0.73]) < 0.045:
        return "building"
    if np.linalg.norm(rgb - [0.68, 0.81, 0.69]) < 0.035:
        return "green"
    if np.linalg.norm(rgb - [0.776, 0.882, 0.898]) < 0.03:
        return "water"
    if min(rgb) > 0.97:
        return "path"
    return None


def path_data(drawing):
    commands, previous = [], None
    def point(p):
        return f"{p.x:.2f},{p.y:.2f}"
    for item in drawing["items"]:
        if item[0] == "re":
            rect = item[1]
            commands.append(f"M{point(rect.tl)}L{point(rect.tr)}L{point(rect.br)}L{point(rect.bl)}Z")
            previous = None
        elif item[0] == "qu":
            q = item[1]
            commands.append(f"M{point(q.ul)}L{point(q.ur)}L{point(q.lr)}L{point(q.ll)}Z")
            previous = None
        elif item[0] in ("l", "c"):
            if previous != item[1]:
                commands.append("M" + point(item[1]))
            if item[0] == "l":
                commands.append("L" + point(item[2]))
            else:
                commands.append("C" + " ".join(point(p) for p in item[2:]))
            previous = item[-1]
        else:
            raise ValueError(f"Unsupported PDF path: {item[0]}")
    if drawing["closePath"]:
        commands.append("Z")
    return "".join(commands)


def supplement_northeast(page, drawings, matrix, by_code, survey_tree):
    """Recover only the missing northeast patch, with an explicit PDF code per point."""
    labels = []
    # Character boxes split joined text such as M7M7 into its two source labels.
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                chars = span["chars"]
                text = "".join(c["c"] for c in chars)
                for match in re.finditer(r"(?<![A-Za-z])[A-Z]\d{1,2}", text):
                    rect = fitz.Rect()
                    for char in chars[match.start():match.end()]:
                        rect |= fitz.Rect(char["bbox"])
                    if rect.x0 > 1300:
                        labels.append((match.group(), center(rect)))
    label_tree = cKDTree([label[1] for label in labels])
    # These two entries are absent from the legacy GeoJSON. Transcribed from
    # the original PDF legend, including its scientific names and taxonomy.
    legend = {
        "Q1": dict(chinese_name="黄栌", scientific_name="Cotinus coggygria",
                   category="漆树科", family="黄栌属"),
        "Q13": dict(chinese_name="红花碧桃", scientific_name="Amygdalus persica f. rubro-plena",
                    category="蔷薇科", family="桃属"),
    }
    features, offsets, separations = [], [], []
    for drawing in drawings:
        if not circle(drawing):
            continue
        x, y = center(drawing["rect"])
        if not (6050 < x < 6720 and 380 < y < 980):
            continue
        projected = apply(matrix, [[x, y]])[0]
        distance, _ = survey_tree.query(projected)
        # Exclude the uncertain seam with existing points. This patch has a
        # large empty interior; do not infer additional points elsewhere.
        if distance < 8:
            continue
        offset, index = label_tree.query([x, y])
        assert offset < 1.5, f"Uncertain plant label at {x}, {y}: {offset}"
        code = labels[index][0]
        if by_code.get(code):
            assert len({f["properties"]["chinese_name"] for f in by_code[code]}) == 1
            properties = dict(by_code[code][0]["properties"])
        else:
            assert code in legend, f"Review unknown PDF code {code}"
            properties = dict(code_id=code, **legend[code], flower_period="-", fruit_period="-", color="")
        properties.update(source="campus-pdf", source_region="衷和楼东北侧", pdf_position=[round(x, 3), round(y, 3)])
        lat, lng = latlng(*projected)
        features.append(dict(type="Feature", properties=properties,
                             geometry=dict(type="Point", coordinates=[lng, lat])))
        offsets.append(float(offset))
        separations.append(float(distance))
    assert len(features) == 503, "PDF patch changed: review source and region before publishing."
    positions = np.array([f["geometry"]["coordinates"] for f in features])
    assert len(np.unique(positions, axis=0)) == len(features), "Duplicate supplement positions."
    (OUT / "campus-supplement.geojson").write_text(
        json.dumps(dict(type="FeatureCollection", features=features), ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8")
    return dict(region="衷和楼东北侧", pdfBounds=[6050, 380, 6720, 980],
                count=len(features), species=len({f["properties"]["chinese_name"] for f in features}),
                maxCodeOffsetPdfPoints=round(max(offsets), 3),
                minLegacySeparationGroundMeters=round(min(separations) * np.cos(np.radians(31.285)), 3),
                legendAdditions=legend)


def main():
    cv2.setRNGSeed(27)
    doc = fitz.open(PDF)
    assert len(doc) == 1, "Review PDF pages before regenerating."
    page = doc[0]
    drawings, words = page.get_drawings(), page.get_text("words")
    source = re.sub(r"^\s*var\s+\w+\s*=\s*", "", DATA.read_text(encoding="utf-8-sig"))
    features = json.loads(source.rstrip("; \n"))["features"]
    by_code = defaultdict(list)
    for feature in features:
        by_code[feature["properties"]["code_id"]].append(feature)
    anchors = []
    for word in words:
        if word[0] >= 1300 and len(by_code.get(word[4], [])) == 1:
            anchors.append({
                "code": word[4], "pdf": center(fitz.Rect(word[:4])),
                "coordinates": by_code[word[4]][0]["geometry"]["coordinates"],
            })
    a = np.array([x["pdf"] for x in anchors])
    b = mercator([x["coordinates"] for x in anchors])
    origin = b.mean(axis=0)
    matrix, inliers = cv2.estimateAffine2D(
        a, b - origin, method=cv2.RANSAC, ransacReprojThreshold=7,
        maxIters=10000, confidence=0.999)
    assert matrix is not None and int(inliers.sum()) >= 12, "Insufficient consistent anchors."
    matrix[:, 2] += origin

    # Refine against mutually nearest drawn circles, excluding ambiguous neighbours.
    circles = np.array([center(d["rect"]) for d in drawings if circle(d) and d["rect"].x0 > 1300])
    survey = mercator([f["geometry"]["coordinates"] for f in features])
    tree = cKDTree(survey)
    for _ in range(12):
        transformed = apply(matrix, circles)
        distance, nearest = tree.query(transformed)
        _, reverse = cKDTree(transformed).query(survey)
        match = (distance < 4) & (reverse[nearest] == np.arange(len(circles)))
        target = survey[nearest[match]]
        origin = target.mean(axis=0)
        matrix = np.linalg.lstsq(
            np.c_[circles[match], np.ones(match.sum())], target - origin, rcond=None)[0].T
        matrix[:, 2] += origin
    transformed = apply(matrix, circles)
    distance, nearest = tree.query(transformed)
    _, reverse = cKDTree(transformed).query(survey)
    match = (distance < 4) & (reverse[nearest] == np.arange(len(circles)))
    ground_scale = np.cos(np.radians(31.285))
    anchor_error = np.linalg.norm(apply(matrix, a) - b, axis=1) * ground_scale
    accepted = inliers[:, 0].astype(bool)
    assert np.percentile(anchor_error[accepted], 95) < 9, "Registration drift: review anchors."
    assert match.sum() > 6000, "Too few matching survey circles."

    kept = [(d, kind(d)) for d in drawings if kind(d)]
    geometry_bounds = fitz.Rect()
    for d, _ in kept:
        geometry_bounds |= d["rect"]
    corners = apply(matrix, [geometry_bounds.tl, geometry_bounds.tr,
                             geometry_bounds.br, geometry_bounds.bl])
    minimum, maximum = corners.min(axis=0) - 35, corners.max(axis=0) + 35
    width, height = maximum - minimum
    transform = (matrix[0, 0], -matrix[1, 0], matrix[0, 1], -matrix[1, 1],
                 matrix[0, 2] - minimum[0], maximum[1] - matrix[1, 2])
    paths = []
    for d, category in kept:
        fill = "none" if d["fill"] is None else f"var(--{category})"
        stroke = "var(--outline)" if category == "outline" else f"var(--{category}-edge)"
        # Field markings remain quiet; building edges help the original geometry read clearly.
        weight = max(1.4, min(5, d["width"] or 1.4))
        paths.append(f'<path d="{path_data(d)}" fill="{fill}" stroke="{stroke}" '
                     f'stroke-width="{weight:.2f}" fill-rule="{"evenodd" if d["even_odd"] else "nonzero"}"/>')
    palettes = {
        "light": dict(background="#f5f7f4", building="#dce3e0", green="#d1e6d5",
                      water="#b5d9df", path="#ffffff", outline="#a4b5ac",
                      building_edge="#bacac1", green_edge="#c1d8c5",
                      water_edge="#9dc9d0", path_edge="#f5f7f4"),
        "dark": dict(background="#202328", building="#454b51", green="#303c38",
                     water="#2c4651", path="#292d32", outline="#697674",
                     building_edge="#606c6b", green_edge="#3e5147",
                     water_edge="#446571", path_edge="#353b40"),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for theme, palette in palettes.items():
        css = ";".join(f"--{key.replace('_', '-')}:{value}" for key, value in palette.items())
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}" '
               f'width="{width:.3f}" height="{height:.3f}" style="{css}">'
               '<title>同济大学四平路校区 · 校园调绘底图</title>'
               f'<rect width="100%" height="100%" fill="var(--background)"/>'
               f'<g transform="matrix({" ".join(f"{v:.8f}" for v in transform)})" '
               'stroke-linecap="round" stroke-linejoin="round">' + "".join(paths) + '</g></svg>')
        (OUT / f"campus-{theme}.svg").write_text(svg, encoding="utf-8")

    # Keep real building names from the source. Browser labels stay upright at each zoom.
    labels = []
    for word in words:
        if word[0] < 1300 or not re.match(r"^[A-D]\d{2}.+", word[4]):
            continue
        code, full_name = word[4][:3], word[4][3:]
        # Repeated plant codes such as D14D14 are not building names.
        if not re.search(r"[\u4e00-\u9fff]", full_name):
            continue
        name = re.split(r"[（(]", full_name)[0]
        point = apply(matrix, [center(fitz.Rect(word[:4]))])[0]
        labels.append(dict(code=code, name=name, fullName=full_name, position=latlng(*point),
                           major=bool(re.search("大礼堂|图书馆|体育馆|逸夫楼|游泳馆|教学北楼", name))))
    metadata = dict(
        bounds=[latlng(*minimum), latlng(*maximum)], labels=labels,
        source="植物地图电子版.pdf",
        sourceSha256=hashlib.sha256(PDF.read_bytes()).hexdigest(),
        surveySha256=hashlib.sha256(DATA.read_bytes()).hexdigest(),
        affinePdfToMercator=matrix.tolist(),
        calibration=dict(
            anchorCandidates=len(anchors), anchorInliers=int(accepted.sum()),
            anchorMedianGroundMeters=round(float(np.median(anchor_error[accepted])), 3),
            anchorP95GroundMeters=round(float(np.percentile(anchor_error[accepted], 95)), 3),
            mutualCircleMatches=int(match.sum()),
            circleMedianGroundMeters=round(float(np.median(distance[match]) * ground_scale), 3),
            circleP95GroundMeters=round(float(np.percentile(distance[match], 95) * ground_scale), 3),
            anchors=[dict(code=x["code"], pdf=x["pdf"], coordinates=x["coordinates"],
                          residualGroundMeters=round(float(error), 3), accepted=bool(ok))
                     for x, error, ok in zip(anchors, anchor_error, accepted)],
        ),
        geometryCounts=dict(Counter(category for _, category in kept)),
        supplement=supplement_northeast(page, drawings, matrix, by_code, tree),
    )
    (ROOT / "src/data/campus-map.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in metadata["calibration"].items() if k != "anchors"}, ensure_ascii=False))
    print("Base geometry:", metadata["geometryCounts"], "Building labels:", len(labels))
    print("Supplement:", metadata["supplement"]["count"], "points")
    print("SVG bytes:", [(f.name, f.stat().st_size) for f in OUT.glob("campus-*.svg")])


if __name__ == "__main__":
    main()
