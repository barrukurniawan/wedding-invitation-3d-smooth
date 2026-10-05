from pathlib import Path
import base64,re,sys
root=Path(__file__).resolve().parents[1]/'public'
def data(path,mime):return 'data:'+mime+';base64,'+base64.b64encode((root/path).read_bytes()).decode()
html=(root/'index.html').read_text().replace('assets/wedding-song-complete.m4a',data('assets/wedding-song-complete.m4a','audio/mp4'))
for asset,mime in [('assets/wedding-card.jpg','image/jpeg'),('assets/mempelai.gif','image/gif'),('assets/pianist.gif','image/gif'),('assets/pianist-idle.png','image/png'),('assets/singer.gif','image/gif'),('assets/singer-idle.png','image/png')]:
    html=html.replace(asset,data(asset,mime))
css=re.sub(r"@import url\([^;]+;",'',(root/'style.css').read_text())
css=css.replace('assets/nunito-extrabold.ttf',data('assets/nunito-extrabold.ttf','font/ttf'))
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>').replace('href="favicon.svg"','href="'+data('favicon.svg','image/svg+xml')+'"')
config=(root/'config.js').read_text()
for asset in ['assets/character-atlas.png','assets/woman-atlas.png']:
    config=config.replace(asset,data(asset,'image/png'))
for asset in ['assets/gallery-1.jpg','assets/gallery-2.jpg','assets/gallery-3.jpg']:
    config=config.replace(asset,data(asset,'image/jpeg'))
js=(root/'game.js').read_text().replace('assets/wedding-hosts.png',data('assets/wedding-hosts.png','image/png')).replace('assets/seated-guests.png',data('assets/seated-guests.png','image/png')).replace('assets/wedding-guests-v2.png',data('assets/wedding-guests-v2.png','image/png')).replace("assets/front-gate.svg",data('assets/front-gate.svg','image/svg+xml')).replace("map.src='assets/garden.png'", "map.src='"+data('assets/garden.png','image/png')+"'")
html=html.replace('<script src="config.js"></script><script src="game.js"></script>','<script>'+config+'</script><script>'+js+'</script>')
Path(sys.argv[1]).write_text(html)
print('Exported complete offline game with embedded map and all character frames.')
