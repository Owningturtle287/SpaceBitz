"""Complete the game's pixel font without replacing its existing artwork.

Requires fonttools. New glyphs use the same 5x7 grid, 100-unit square cells,
700-unit cap height and 600-unit advance as the original custom SpaceBitz font.
Run from the repository root; existing glyph outlines and metrics are preserved.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from pixel_glyphs import EXTENSIONS as PATTERNS

path=Path(__file__).resolve().parents[1]/'assets/spacebitz-pixel.woff'
font=TTFont(path,recalcTimestamp=False)
cmap=font.getBestCmap()
order=list(font.getGlyphOrder())
for char,rows in PATTERNS.items():
 if ord(char) in cmap:
  continue
 name=f'pixel_{ord(char):04X}'
 pen=TTGlyphPen(None)
 for row,bits in enumerate(rows):
  for column,bit in enumerate(bits):
   if bit!='1':
    continue
   x,y=column*100,(6-row)*100
   pen.moveTo((x,y));pen.lineTo((x+100,y));pen.lineTo((x+100,y+100));pen.lineTo((x,y+100));pen.closePath()
 font['glyf'][name]=pen.glyph()
 font['hmtx'].metrics[name]=(600,0)
 order.append(name)
 for table in font['cmap'].tables:
  if table.isUnicode():table.cmap[ord(char)]=name
font.setGlyphOrder(order)
font['OS/2'].usFirstCharIndex=min(font.getBestCmap())
font['OS/2'].usLastCharIndex=max(font.getBestCmap())
font['OS/2'].recalcUnicodeRanges(font)
font.save(path)
print(f'Pixel font: {len(font.getBestCmap())} mapped characters')
