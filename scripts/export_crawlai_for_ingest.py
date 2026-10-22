import sqlite3
import json
import os

db_path = r"D:\WORKSPACE\PROJECTS\CRAWLAIBWP\data\research.sqlite"
output_path = r"d:\WORKSPACE\PROJECTS\SANGHYANG-NEWS\data\crawlai_ingest_data.json"

os.makedirs(os.path.dirname(output_path), exist_ok=True)
conn = sqlite3.connect(db_path)
cur = conn.cursor()

latest_run_id = 'a50e51f7-94a5-4584-85a2-50f6d34328a7'

# 1. Fetch Run Report
cur.execute('SELECT report_json FROM runs WHERE id=?', (latest_run_id,))
report_row = cur.fetchone()
report = json.loads(report_row[0]) if report_row else {}

# 2. Fetch Entities
cur.execute('SELECT payload FROM entities WHERE run_id=?', (latest_run_id,))
entities = [json.loads(r[0]) for r in cur.fetchall()]

# 3. Fetch All Unique Evidence across runs
cur.execute('SELECT payload FROM evidence ORDER BY run_id DESC')
seen_hashes = set()
unique_evidence = []
for r in cur.fetchall():
    ev = json.loads(r[0])
    ch = ev.get('content_hash')
    if ch and ch not in seen_hashes:
        seen_hashes.add(ch)
        unique_evidence.append(ev)

# Sort evidence by published_at desc
def get_pub(ev):
    return ev.get('published_at') or '2020-01-01T00:00:00Z'

unique_evidence.sort(key=get_pub, reverse=True)

data = {
    "run_id": latest_run_id,
    "summary": report.get("summary", ""),
    "findings": report.get("findings", []),
    "comparisons": report.get("comparisons", []),
    "entities": entities,
    "evidence": unique_evidence,
    "stats": {
        "entities_count": len(entities),
        "evidence_count": len(unique_evidence),
        "findings_count": len(report.get("findings", [])),
        "comparisons_count": len(report.get("comparisons", []))
    }
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported successfully to {output_path}")
print(f"Entities: {len(entities)}, Evidence: {len(unique_evidence)}, Findings: {len(report.get('findings', []))}, Comparisons: {len(report.get('comparisons', []))}")

