"""Lossless frame packing for the supplied transparent PNG/GIF character assets."""
from pathlib import Path
from PIL import Image, ImageSequence
import json,sys
source=Path(sys.argv[1])
dest=Path(__file__).resolve().parents[1]/'dist/assets'
directions=['east','south-east','south','south-west','west','north-west','north','north-east']
atlas=Image.new('RGBA',(680,544))
for row,direction in enumerate(directions):
    idle=Image.open(source/f'idle-{direction}.png').convert('RGBA')
    assert idle.size==(48,48)
    atlas.paste(idle,(10,row*68+10))
    walk=Image.open(source/f'walking-{direction}.gif')
    assert walk.size==(68,68) and walk.n_frames==9
    for frame_index,frame in enumerate(ImageSequence.Iterator(walk)):
        assert frame.info.get('duration')==200
        atlas.paste(frame.convert('RGBA'),((frame_index+1)*68,row*68))
atlas.save(dest/'character-atlas.png')
print('Packed all 8 idle poses and 72 walking frames without resizing or repainting.')
