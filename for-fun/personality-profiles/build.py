#!/usr/bin/env python3
"""Build index.html: personality profiles from AA-PersonalityBench.

Reads data/aa-personalitybench.json (scores for every model) and profiles.json
(the written profile for each model on the page), fills template.html, writes index.html.
To add a model: append an entry to profiles.json, run this, republish index.html.
"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parents[1]
bench = json.loads((root / "data/aa-personalitybench.json").read_text())
profiles = json.loads((here / "profiles.json").read_text())

names = {m["name"] for m in bench["models"]}
for p in profiles:
    for n in [p["model"], *p.get("compare", []), *([p["previous"]] if p.get("previous") else [])]:
        if n not in names:
            raise SystemExit(f"{p['id']}: model not in bench data: {n}")

data = {
    "captured": bench["captured_at"][:10],
    "source": bench["source_url"],
    "indexes": [
        {
            "key": i["key"],
            "label": i["label"],
            "description": i["description"],
            "lower": i["key"] == "slop",
            "traits": [
                {"key": t["key"], "label": t["label"], "definition": t["definition"], "lower": t["lower_is_better"]}
                for t in i["traits"]
            ],
        }
        for i in bench["indexes"]
    ],
    "models": {
        m["name"]: {
            "i": {k: v for k, v in m["index_percentiles"].items() if v is not None},
            "t": {k: v["percentile"] for k, v in m["traits"].items()},
        }
        for m in bench["models"]
    },
}

html = (here / "template.html").read_text()
html = html.replace("/*__DATA__*/null", json.dumps(data, separators=(",", ":"), ensure_ascii=False))
html = html.replace("/*__PROFILES__*/null", json.dumps(profiles, ensure_ascii=False))
(here / "index.html").write_text(html)
print(f"wrote index.html: {len(profiles)} profile(s), {len(data['models'])} models in field")
