import os
import shutil
import glob
import re

AUDIO_SRC = "docs/new v2/ElevenLabs (1)"
ALI_DEST = "public/audio/rewards/ali"
SAID_DEST = "public/audio/rewards/said"

os.makedirs(ALI_DEST, exist_ok=True)
os.makedirs(SAID_DEST, exist_ok=True)

files = glob.glob(os.path.join(AUDIO_SRC, "*.mp3"))

# Ali files
# Ali #1: starts with 'Али - '
# Ali #2..9: starts with 'Али {num} - '

for f in files:
    basename = os.path.basename(f)
    if basename.startswith("Али"):
        # Determine number
        m = re.match(r"^Али\s*(\d+)?\s*-", basename)
        if m:
            num = int(m.group(1)) if m.group(1) else 1
            dest_numbered = os.path.join(ALI_DEST, f"{num}.mp3")
            dest_orig = os.path.join(ALI_DEST, basename)
            shutil.copy2(f, dest_numbered)
            shutil.copy2(f, dest_orig)
            print(f"Ali #{num}: {basename} -> {dest_numbered}")
    elif basename.startswith("Саид"):
        m = re.match(r"^Саид\s*(\d+)?\s*-", basename)
        if m:
            num = int(m.group(1)) if m.group(1) else 1
            dest_numbered = os.path.join(SAID_DEST, f"{num}.mp3")
            dest_orig = os.path.join(SAID_DEST, basename)
            shutil.copy2(f, dest_numbered)
            shutil.copy2(f, dest_orig)
            print(f"Said #{num}: {basename} -> {dest_numbered}")
