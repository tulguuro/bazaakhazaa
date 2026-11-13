"""Turn the source manuscript into matrix/data/readings.json.

The .docx holds two parts: 22 "life purpose" texts and the positive and
negative traits of the 22 energies. The manuscript is a retype of scanned
pages, so it also carries the typist's notes and one page that was entered
twice; both are skipped here.

Usage: python -I tools/extract_readings.py
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Энэ насны зорилго retype 1.docx'
TARGET = ROOT / 'matrix' / 'data' / 'readings.json'
# typing errors of the retype, checked against photos of the printed pages
CORRECTIONS = ROOT / 'print-corrections.json'
# the printed table of chakras and organs, transcribed from a photo
CHAKRAS = ROOT / 'chakra-organs.json'

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

PURPOSE_HEADING = re.compile(r'^(\d{1,2})\s*[–-]\s*Энэ насны зорилго, үүрэг даалгавар\s*(?:[–-]\s*(.*))?$')
PART_TWO = 'Эрчмийн эерэг, сөрөг шинж чанар'
ENERGY_NAMES = ['НЭГ', 'ХОЁР', 'ГУРАВ', 'ДӨРӨВ', 'ТАВ', 'ЗУРГАА', 'ДОЛОО', 'НАЙМ', 'ЕС', 'АРАВ',
                'АРВАН НЭГ', 'АРВАН ХОЁР', 'АРВАН ГУРАВ', 'АРВАН ДӨРӨВ', 'АРВАН ТАВ', 'АРВАН ЗУРГАА',
                'АРВАН ДОЛОО', 'АРВАН НАЙМ', 'АРВАН ЕС', 'ХОРЬ', 'ХОРИН НЭГ', 'ХОРИН ХОЁР']
ENERGY_NUMBER = {f'{name} ЭРЧИМ': i + 1 for i, name in enumerate(ENERGY_NAMES)}
# typist's notes and the marker of the page that was entered twice
NOTE_STARTS = ('Анхаарах зүйл:', 'Хуудсуудыг агуулгын дарааллаар', 'Дараах газруудыг дахин шалгаарай')
DUPLICATE_PAGE = '(Долоо эрчмийн үргэлжлэл'


def lines_of(docx):
    with zipfile.ZipFile(docx) as z:
        body = ET.fromstring(z.read('word/document.xml')).find(W + 'body')
    for p in body.iter(W + 'p'):
        text = ''
        for el in p.iter():
            if el.tag == W + 't':
                text += el.text or ''
            elif el.tag in (W + 'br', W + 'cr'):
                text += '\n'
            elif el.tag == W + 'tab':
                text += ' '
        for line in text.split('\n'):
            line = re.sub(r'\s+', ' ', line).strip()
            if line:
                yield line


def split_glued_heading(subtitle):
    """Purpose 10 has its body glued to the heading: "Урсгалын эрчимТанд ..."."""
    m = re.match(r'^(.{3,40}?[а-яөү])([А-ЯӨҮ].*)$', subtitle or '')
    if m and len(subtitle) > 60:
        return m.group(1), m.group(2)
    return subtitle, None


def parse(lines):
    purposes, energies = {}, {}
    part, current, field, skipping = 1, None, None, False
    for line in lines:
        if line.startswith(NOTE_STARTS):
            continue
        if line == PART_TWO:
            part, current = 2, None
            continue
        if part == 1:
            m = PURPOSE_HEADING.match(line)
            if m:
                subtitle, body = split_glued_heading((m.group(2) or '').strip(' "“”«»'))
                current = purposes.setdefault(int(m.group(1)), {'name': (subtitle or '').strip(' "“”«»'), 'text': []})
                if body:
                    current['text'].append(body)
            elif current is not None:
                current['text'].append(line)
            continue
        if line in ENERGY_NUMBER:
            current = energies.setdefault(ENERGY_NUMBER[line], {'positive': [], 'negative': []})
            field, skipping = None, False
        elif line.startswith(DUPLICATE_PAGE):
            skipping = True
        elif skipping or current is None:
            continue
        elif line.startswith('Эерэг тал нь:'):
            field = 'positive'
            current[field].append(line.split(':', 1)[1].strip())
        elif line.startswith('Сөрөг тал нь:'):
            field = 'negative'
            current[field].append(line.split(':', 1)[1].strip())
        elif field:
            current[field].append(line)
    return purposes, energies


def replace_once(paragraphs, old, new, where):
    """Every correction must match exactly one place, so a change to the .docx
    that moves or fixes the text stops the build instead of passing silently."""
    count = sum(p.count(old) for p in paragraphs)
    if count != 1:
        sys.exit(f'Correction for {where} matches {count} times: {old!r}')
    i = next(i for i, p in enumerate(paragraphs) if old in p)
    paragraphs[i] = paragraphs[i].replace(old, new)


def apply_corrections(purposes, energies):
    """Fix the retype's typing errors where the printed pages read differently."""
    if not CORRECTIONS.exists():
        return 0
    data = json.loads(CORRECTIONS.read_text(encoding='utf-8'))
    for c in data.get('purposes', []):
        replace_once(purposes[c['n']]['text'], c['from'], c['to'], f'purpose {c["n"]}')
    for c in data.get('energies', []):
        replace_once(energies[c['n']][c['side']], c['from'], c['to'], f'energy {c["n"]} {c["side"]}')
    return len(data.get('purposes', [])) + len(data.get('energies', []))


def main():
    purposes, energies = parse(lines_of(SOURCE))
    corrected = apply_corrections(purposes, energies)
    missing = [n for n in range(1, 23) if n not in purposes or not purposes[n]['text']]
    missing += [f'energy {n}' for n in range(1, 23) if n not in energies or not energies[n]['positive'] or not energies[n]['negative']]
    if missing:
        sys.exit(f'Missing sections: {missing}')
    data = {
        'source': SOURCE.name,
        'purposes': {str(n): {'name': purposes[n]['name'], 'text': purposes[n]['text']} for n in range(1, 23)},
        'energies': {str(n): energies[n] for n in range(1, 23)},
    }
    if CHAKRAS.exists():
        table = json.loads(CHAKRAS.read_text(encoding='utf-8'))
        data['chakras'] = {'title': table['title'], 'rows': table['chakras']}
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{TARGET.relative_to(ROOT)}: 22 purposes, 22 energies, {corrected} corrections from the printed pages')
    for n in range(1, 23):
        p, e = purposes[n], energies[n]
        print(f'  {n:2d}  purpose {sum(map(len, p["text"])):5d} chars in {len(p["text"])} par.  name={p["name"]!r:22}'
              f'  + {sum(map(len, e["positive"])):4d}  - {sum(map(len, e["negative"])):4d}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
