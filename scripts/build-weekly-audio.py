#!/usr/bin/env python3
"""Rebuild the seven weekly MP3s from the user's original taize.mp3.

Requires ffmpeg on PATH; no Python packages. Run from the repository root:
python3 scripts/build-weekly-audio.py /path/to/taize.mp3
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
from pathlib import Path

STARTS = [1.27465,214.347,534.794,752.525,1040.83,1248.67,1449.3,1730.01,1937.71,
          2233.78,2421.24,2676.58,2960.78,3152.03,3371.33,3595.63,3785.66,4018.9,4218.26]
ENDS = [202.514,523.83,742.643,1030.35,1236.95,1436.57,1717.78,1926.14,2219.68,
        2409.16,2664.15,2949.5,3141.13,3356.86,3583.37,3772.92,4005.69,4205.75,4389.22]
GROUPS = {
    "sunday": [1,2,14], "monday": [3,8,2], "tuesday": [4,5,11],
    "wednesday": [6,9,11], "thursday": [7,10,12], "friday": [9,15,17],
    "saturday": [13,16,18,19],
}
RATE = 44100
TARGET_LUFS = -20


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def measure(source, index):
    start, end = STARTS[index], ENDS[index]
    result = run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(start),
                  "-t", str(end-start), "-i", str(source),
                  "-af", "ebur128=peak=true", "-f", "null", "-"])
    summary = result.stderr.rsplit("Summary:", 1)[1]
    loudness = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary)[1])
    peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)[1])
    # Static gain preserves the original dynamics; cap true peak at -1 dBFS.
    gain = min(TARGET_LUFS-loudness, -1-peak)
    return {"track": index+1, "start": start, "end": end,
            "input_lufs": loudness, "input_true_peak_dbfs": peak,
            "gain_db": round(gain, 3)}


def render(source, output, day, ids, measured):
    durations = [ENDS[i-1]-STARTS[i-1] for i in ids]
    pause = (720-sum(durations))/(len(ids)-1)
    assert 0 < pause < 4, (day, pause)
    filters, sequence = [], []
    for n, track in enumerate(ids):
        data = measured[track-1]
        duration = durations[n]
        fade_out = 6 if n == len(ids)-1 else 1.2
        filters.append(
            f"[0:a]atrim=start={data['start']}:end={data['end']},"
            f"asetpts=PTS-STARTPTS,volume={data['gain_db']}dB,"
            f"afade=t=in:st=0:d=1.2,afade=t=out:st={duration-fade_out}:d={fade_out}[a{n}]"
        )
        sequence.append(f"[a{n}]")
        if n < len(ids)-1:
            filters.append(f"anullsrc=r={RATE}:cl=stereo:d={pause},asetpts=PTS-STARTPTS[s{n}]")
            sequence.append(f"[s{n}]")
    filters.append("".join(sequence) + f"concat=n={len(sequence)}:v=0:a=1,"
                   f"apad=whole_len={RATE*720},atrim=end_sample={RATE*720}[out]")
    target = output / f"taize-{day}.mp3"
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(source),
         "-filter_complex", ";".join(filters), "-map", "[out]", "-c:a", "libmp3lame",
         "-b:a", "128k", "-ar", str(RATE), "-ac", "2", "-write_xing", "1",
         "-map_metadata", "-1", "-metadata", f"title=Taize - {day}",
         "-y", str(target)])
    print(f"Rendered {day}: 720s; {len(ids)} full takes; {pause:.2f}s between takes", flush=True)
    return {"day": day, "tracks": ids, "pause_seconds": round(pause,6),
            "decoded_samples": RATE*720, "bytes": target.stat().st_size,
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = root / "public/audio"
    output.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        measured = list(pool.map(lambda i: measure(args.source,i), range(19)))
        print("Measured loudness for all 19 source takes", flush=True)
        jobs = [pool.submit(render,args.source,output,day,ids,measured) for day,ids in GROUPS.items()]
        results = [job.result() for job in jobs]
    manifest = {"source_sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
                "sample_rate": RATE, "duration_seconds": 720, "bitrate_kbps": 128,
                "target_lufs": TARGET_LUFS, "source_tracks": measured, "days": results,
                "editing": "Complete takes at quiet boundaries; brief pauses, static loudness gain and fades. No speed changes."}
    docs = root / "docs"
    docs.mkdir(exist_ok=True)
    (docs/"weekly-audio.json").write_text(json.dumps(manifest,indent=2)+"\n")


if __name__ == "__main__":
    main()
