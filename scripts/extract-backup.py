"""Extract an app backup to safe local files; never execute content in a backup."""
import base64, json, re, sys
from pathlib import Path
if len(sys.argv)!=3:
    raise SystemExit('Usage: python scripts/extract-backup.py backup.json output_directory')
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
if data.get('format')!='happy-birthday-backup-v1':
    raise SystemExit('Unsupported backup format')
root=Path(sys.argv[2]).resolve()
root.mkdir(parents=True,exist_ok=True)
(root/'content.json').write_text(json.dumps(data['draft']['content'],ensure_ascii=False,indent=2),encoding='utf-8')
for name,url in data.get('files',{}).items():
    if not re.fullmatch(r'media/[a-zA-Z0-9_-]+\.(jpg|png|webp|mp3|wav|ogg|m4a)',name):
        raise SystemExit('Unsafe path in backup')
    if not isinstance(url,str) or ';base64,' not in url:
        raise SystemExit('Invalid media data')
    target=root/name
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(base64.b64decode(url.split(';base64,',1)[1],validate=True))
print(f'Extracted content and {len(data.get("files",{}))} media files to {root}')
