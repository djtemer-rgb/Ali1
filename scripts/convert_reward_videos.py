import os
import subprocess
import json

VIDEOS = [
    ("ali_boxing.mp4", "ali_boxing_loop.webm"),
    ("ali_chess.mp4", "ali_chess_loop.webm"),
    ("ali_football.mp4", "ali_football_loop.webm"),
    ("said_superhero.mp4", "said_superhero_loop.webm"),
    ("said_football.mp4", "said_football_loop.webm"),
    ("said_stage.mp4", "said_stage_loop.webm"),
]

INPUT_DIR = "docs/new v2/video/Movies"
OUTPUT_DIR = "public/videos/rewards"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_video_info(file_path):
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    video_stream = next(s for s in data["streams"] if s["codec_type"] == "video")
    duration = float(data["format"]["duration"])
    width = int(video_stream["width"])
    height = int(video_stream["height"])
    return duration, width, height

for in_name, out_name in VIDEOS:
    in_path = os.path.join(INPUT_DIR, in_name)
    out_path = os.path.join(OUTPUT_DIR, out_name)
    
    duration, width, height = get_video_info(in_path)
    print(f"Processing {in_name}: {width}x{height}, duration={duration:.2f}s")
    
    # 1:1 Center crop
    crop_size = min(width, height)
    crop_x = (width - crop_size) // 2
    crop_y = (height - crop_size) // 2
    
    # Crossfade duration
    xfade_dur = 0.5
    p1_end = duration
    p1_start = xfade_dur
    p2_end = xfade_dur
    p2_start = 0.0
    
    p1_len = p1_end - p1_start
    offset = p1_len - xfade_dur
    
    # We crop to crop_size, scale to 720x720 if needed (it is 720x720 already), split and crossfade
    filter_complex = (
        f"[0:v]crop={crop_size}:{crop_size}:{crop_x}:{crop_y},scale=720:720:flags=lanczos[cropped];"
        f"[cropped]split=2[v1][v2];"
        f"[v1]trim=start={p1_start}:end={p1_end},setpts=PTS-STARTPTS[p1];"
        f"[v2]trim=start={p2_start}:end={p2_end},setpts=PTS-STARTPTS[p2];"
        f"[p1][p2]xfade=transition=fade:duration={xfade_dur}:offset={offset:.3f},format=yuv420p[outv]"
    )
    
    cmd = [
        "ffmpeg", "-y", "-i", in_path,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-an",
        "-c:v", "libvpx-vp9",
        "-crf", "30",
        "-b:v", "0",
        "-speed", "1",
        "-tile-columns", "2",
        "-threads", "4",
        out_path
    ]
    
    subprocess.run(cmd, check=True)
    out_size = os.path.getsize(out_path)
    out_dur, out_w, out_h = get_video_info(out_path)
    print(f"Created {out_name}: {out_w}x{out_h}, {out_dur:.2f}s, size={out_size / 1024:.1f} KB ({out_size / (1024*1024):.2f} MB)")
