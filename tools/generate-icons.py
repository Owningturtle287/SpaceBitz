"""Draw matching PWA PNG icons (run from the repository root)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

for size in (192, 512):
    scale = 3
    n = size * scale
    icon = Image.new('RGB', (n, n), '#07152a')
    draw = ImageDraw.Draw(icon)
    for i in range(n // 2, 0, -4):
        tone = int(30 + 35 * (1 - i / (n / 2)))
        draw.ellipse((n / 2 - i, n / 2 - i, n / 2 + i, n / 2 + i), fill=(8, tone, tone + 25))
    p = lambda x: x * n / 512
    draw.ellipse((p(138), p(141), p(396), p(399)), fill='#73c8bd')
    draw.ellipse((p(168), p(163), p(332), p(285)), fill='#b2e8dd')
    draw.ellipse((p(188), p(270), p(380), p(389)), fill='#337e9b')
    draw.arc((p(37), p(176), p(475), p(342)), 2, 185, fill='#e7dfb9', width=int(p(19)))
    draw.arc((p(37), p(176), p(475), p(342)), 188, 357, fill='#eee8d0', width=int(p(19)))
    for x, y, r in [(75,176,27),(416,114,19)]:
        draw.polygon([(p(x),p(y-r)),(p(x+5),p(y-5)),(p(x+r),p(y)),
                      (p(x+5),p(y+5)),(p(x),p(y+r)),(p(x-5),p(y+5)),
                      (p(x-r),p(y)),(p(x-5),p(y-5))], fill='#f7d790')
    target = Path('icons') / f'icon-{size}.png'
    target.parent.mkdir(exist_ok=True)
    icon.resize((size, size), Image.Resampling.LANCZOS).save(target)
