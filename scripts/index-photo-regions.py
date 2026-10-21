"""Index photographic panels in legacy montages without editing source images."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
from collections import Counter

root = Path(__file__).resolve().parents[1]
files = json.loads((root / "src/data/plant-images.json").read_text(encoding="utf-8"))
indexed = {}
def groups(values):
    positions = np.flatnonzero(values)
    if not len(positions): return []
    breaks = np.where(np.diff(positions) > 1)[0] + 1
    runs = [(int(g[0]), int(g[-1]) + 1) for g in np.split(positions, breaks)]
    merged = []
    for start,end in runs:
        if merged and start - merged[-1][1] <= 3:
            merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start,end))
    return merged
def panels(rgb, box, depth=0):
    x0,y0,x1,y1 = box
    tile = rgb[y0:y1,x0:x1]
    h,w = tile.shape[:2]
    if depth > 12 or min(w,h) < 60: return [box]
    white = np.min(tile,axis=2) >= 247
    # Flat white gutters span the full row/column, unlike leaf highlights or labels.
    for axis,length,other in [(1,h,w),(0,w,h)]:
        runs = groups(np.mean(white,axis=axis) >= .994)
        cuts = [(a,b) for a,b in runs
                if a >= max(24,length*.045) and length-b >= max(24,length*.045)
                and b-a >= 1 and b-a <= max(12,other*.028)]
        if not cuts: continue
        # Only accept cuts leaving enough image content on every side.
        boundaries = [0] + [v for pair in cuts for v in pair] + [length]
        sections = [(boundaries[i],boundaries[i+1]) for i in range(0,len(boundaries)-1,2)]
        if any(b-a < max(24,other*.13) for a,b in sections): continue
        result=[]
        for a,b in sections:
            child=(x0,y0+a,x1,y0+b) if axis==1 else (x0+a,y0,x0+b,y1)
            result.extend(panels(rgb,child,depth+1))
        return result
    return [box]

for name,filename in files.items():
    source=root/"public/legacy/images/plants"/filename
    with Image.open(source) as im:
        width,height=im.size
        # Keep vertical resolution: downscaling tall montages can erase thin seams.
        im = im.resize((min(800,width),height),Image.Resampling.NEAREST)
        rgb=np.asarray(im.convert("RGB"))
    h,w=rgb.shape[:2]
    regions=panels(rgb,(0,0,w,h))
    # Trim only the original outer white frame (at most 2.5% per side).
    boxes=[]
    for x0,y0,x1,y1 in regions:
        for side in ["left","right","top","bottom"]:
            limit=int((x1-x0 if side in ["left","right"] else y1-y0)*.025)
            for _ in range(limit):
                if side=="left": line=rgb[y0:y1,x0]
                elif side=="right": line=rgb[y0:y1,x1-1]
                elif side=="top": line=rgb[y0,x0:x1]
                else: line=rgb[y1-1,x0:x1]
                if (np.min(line,axis=1)>=247).mean()<.994: break
                if side=="left": x0+=1
                elif side=="right": x1-=1
                elif side=="top": y0+=1
                else: y1-=1
        boxes.append([round(x0*width/w),round(y0*height/h),round((x1-x0)*width/w),round((y1-y0)*height/h)])
    indexed[name]={"width":width,"height":height,"regions":boxes}
(root/"src/data/plant-photo-regions.json").write_text(json.dumps(indexed,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
print(json.dumps({"plants":len(indexed),"photos":sum(len(x["regions"]) for x in indexed.values()),"counts":dict(Counter(len(x["regions"]) for x in indexed.values()))},ensure_ascii=False))
for name in ["芭蕉","水杉","玉兰","八角金盘","银杏","鸡爪槭"]:
    print(name,indexed[name])
