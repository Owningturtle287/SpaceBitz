"""Build SpaceBitz's original pixel lettering. Requires fonttools.

Runtime assets are checked in; this is only needed when changing the glyphs.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parent.parent
GLYPHS = {
    'A': '01110/11011/11011/11111/11011/11011/11011',
    'B': '11110/11011/11011/11110/11011/11011/11110',
    'C': '01111/11000/11000/11000/11000/11000/01111',
    'D': '11110/11011/11011/11011/11011/11011/11110',
    'E': '11111/11000/11000/11110/11000/11000/11111',
    'F': '11111/11000/11000/11110/11000/11000/11000',
    'G': '01111/11000/11000/11011/11011/11011/01111',
    'H': '11011/11011/11011/11111/11011/11011/11011',
    'I': '11111/00100/00100/00100/00100/00100/11111',
    'J': '00111/00011/00011/00011/11011/11011/01110',
    'K': '11011/11011/11110/11100/11110/11011/11011',
    'L': '11000/11000/11000/11000/11000/11000/11111',
    'M': '10001/11011/11111/10101/10101/10101/10101',
    'N': '11001/11101/11101/11011/11011/11011/11001',
    'O': '01110/11011/11011/11011/11011/11011/01110',
    'P': '11110/11011/11011/11110/11000/11000/11000',
    'Q': '01110/11011/11011/11011/11011/01110/00011',
    'R': '11110/11011/11011/11110/11100/11010/11011',
    'S': '01111/11000/11000/01110/00011/00011/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '11011/11011/11011/11011/11011/11011/01110',
    'V': '11011/11011/11011/11011/11011/01110/00100',
    'W': '10101/10101/10101/10101/11111/11011/10001',
    'X': '11011/11011/01110/00100/01110/11011/11011',
    'Y': '10001/11011/01110/00100/00100/00100/00100',
    'Z': '11111/00011/00110/00100/01100/11000/11111',
    '0': '01110/11011/11011/11011/11011/11011/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/11011/00011/00110/01100/11000/11111',
    '3': '11110/00011/00011/01110/00011/00011/11110',
    '4': '00011/00111/01111/11011/11111/00011/00011',
    '5': '11111/11000/11000/11110/00011/00011/11110',
    '6': '01110/11000/11000/11110/11011/11011/01110',
    '7': '11111/00011/00010/00110/00100/01100/01100',
    '8': '01110/11011/11011/01110/11011/11011/01110',
    '9': '01110/11011/11011/01111/00011/00011/01110',
    ' ': '00000/00000/00000/00000/00000/00000/00000',
    '.': '00000/00000/00000/00000/00000/00110/00110',
    ',': '00000/00000/00000/00000/00110/00110/00100',
    ':': '00000/00110/00110/00000/00110/00110/00000',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '/': '00001/00011/00010/00100/01000/11000/10000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    '%': '11001/11011/00010/00100/01000/11011/10011',
    '&': '01100/10010/10100/01000/10101/10010/01101',
    '?': '01110/11011/00011/00110/00100/00000/00100',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    "'": '00100/00100/00000/00000/00000/00000/00000',
    '(': '00010/00100/01000/01000/01000/00100/00010',
    ')': '01000/00100/00010/00010/00010/00100/01000',
}

def cells(pattern):
    return [(x, y) for y, row in enumerate(pattern.split('/')) for x, value in enumerate(row) if value == '1']

assets = ROOT / 'assets'
assets.mkdir(exist_ok=True)
font = FontBuilder(1000, isTTF=True)
order = ['.notdef'] + [f'pixel{ord(c)}' for c in GLYPHS]
font.setupGlyphOrder(order)
cmap = {ord(c): f'pixel{ord(c)}' for c in GLYPHS}
cmap.update({ord(c.lower()): f'pixel{ord(c)}' for c in GLYPHS if c.isalpha()})
font.setupCharacterMap(cmap)
glyphs = {}
for c, name in [('?', '.notdef')] + [(c, f'pixel{ord(c)}') for c in GLYPHS]:
    pen = TTGlyphPen(None)
    for x, y in cells(GLYPHS[c]):
        left, bottom = x * 100, (6 - y) * 100
        pen.moveTo((left, bottom)); pen.lineTo((left, bottom + 100))
        pen.lineTo((left + 100, bottom + 100)); pen.lineTo((left + 100, bottom)); pen.closePath()
    glyphs[name] = pen.glyph()
font.setupGlyf(glyphs)
font.setupHorizontalMetrics({name: (600, 0) for name in order})
font.setupHorizontalHeader(ascent=800, descent=-200)
font.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
font.setupNameTable({'familyName': 'SpaceBitz Pixel', 'styleName': 'Regular', 'uniqueFontIdentifier': 'SpaceBitzPixel-1', 'fullName': 'SpaceBitz Pixel', 'psName': 'SpaceBitzPixel', 'version': 'Version 1.0'})
font.setupPost(); font.setupMaxp(); font.font.flavor = 'woff'
font.save(assets / 'spacebitz-pixel.woff')

# A hand-built, stepped-color cartridge wordmark. No external font dependency.
paths = ['', '']
for i, c in enumerate('SPACEBITZ'):
    for x, y in cells(GLYPHS[c]):
        px, py = 8 + i * 24 + x * 4, 8 + y * 4
        paths[i >= 5] += f'M{px} {py}h4v4h-4z'
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 52" shape-rendering="crispEdges" role="img" aria-label="SpaceBitz">',
       '<defs><linearGradient id="ice" x2="0" y2="1"><stop stop-color="#f4f4d8" offset="0"/><stop stop-color="#f4f4d8" offset=".43"/><stop stop-color="#91e9db" offset=".43"/><stop stop-color="#91e9db" offset=".72"/><stop stop-color="#4da7bb" offset=".72"/></linearGradient><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fff0b5" offset="0"/><stop stop-color="#fff0b5" offset=".43"/><stop stop-color="#ffcb69" offset=".43"/><stop stop-color="#ffcb69" offset=".72"/><stop stop-color="#df8153" offset=".72"/></linearGradient></defs>']
for path, fill in zip(paths, ['ice', 'gold']):
    svg += [f'<path d="{path}" transform="translate(0 6)" stroke="#050d20" stroke-width="5" fill="#050d20"/>', f'<path d="{path}" transform="translate(0 4)" stroke="#274663" stroke-width="2" fill="#274663"/>', f'<path d="{path}" fill="url(#{fill})"/>']
svg += ['<path d="M10 46h132v2H10z" fill="#315571"/><path d="M148 46h38v2h-38z" fill="#70d5c8"/><path d="M192 46h26v2h-26z" fill="#ffcb69"/>', '</svg>']
(assets / 'spacebitz-title.svg').write_text('\n'.join(svg) + '\n')
