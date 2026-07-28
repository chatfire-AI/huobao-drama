"""Huobao asynchronous HTTP bridge for the LTXV 0.9.7 notebook runtime.

Supports both Colab and Kaggle. Execute this file in the same notebook kernel
after the environment cell has defined ``generate_video`` and
``clear_gpu_memory``.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import os
import queue
import random
import re
import secrets
import shutil
import stat
import subprocess
import threading
import time
import traceback
import uuid
from pathlib import Path
from typing import Any

import requests
import torch
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image


RUNTIME_ROOT = Path("/kaggle/working") if Path("/kaggle/working").exists() else Path("/content")
BRIDGE_ROOT = RUNTIME_ROOT / "huobao_bridge"
INPUT_ROOT = BRIDGE_ROOT / "input"
OUTPUT_ROOT = BRIDGE_ROOT / "files"
INPUT_ROOT.mkdir(parents=True, exist_ok=True)
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

BRIDGE_TOKEN = os.environ.get("HUOBAO_BRIDGE_TOKEN") or secrets.token_urlsafe(32)
os.environ["HUOBAO_BRIDGE_TOKEN"] = BRIDGE_TOKEN

PUBLIC_BASE_URL = ""
TASKS: dict[str, dict[str, Any]] = {}
TASK_QUEUE: queue.Queue[str] = queue.Queue()
TASK_LOCK = threading.Lock()
MAX_IMAGE_BYTES = 20 * 1024 * 1024
ALLOWED_MODELS = {"ltxv-0.9.7-13b-distilled-q6_k"}


class GenerationRequest(BaseModel):
    model: str = "ltxv-0.9.7-13b-distilled-q6_k"
    prompt: str = Field(min_length=1, max_length=12000)
    negative_prompt: str = Field(default="low quality, worst quality", max_length=6000)
    reference_mode: str = "single"
    image: str | None = None
    first_frame: str | None = None
    last_frame: str | None = None
    reference_images: list[str] = Field(default_factory=list)
    width: int = 576
    height: int = 1024
    resolution: str = "576x1024"
    aspect_ratio: str = "9:16"
    fps: int = 24
    frames: int = 121
    duration: float = 5.0
    seed: int = 0
    upscale_video: bool = False
    motion_level: int | None = None
    camera_motion: str | None = None


def _require_token(authorization: str | None = Header(default=None)) -> None:
    expected = f"Bearer {BRIDGE_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Invalid bridge token")


def _validate_request(payload: GenerationRequest) -> None:
    if payload.model.lower() not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {payload.model}")
    if payload.width % 32 or payload.height % 32:
        raise HTTPException(status_code=400, detail="Width and height must be divisible by 32")
    if not (256 <= payload.width <= 1280 and 256 <= payload.height <= 1280):
        raise HTTPException(status_code=400, detail="Resolution must stay between 256 and 1280 per edge")
    if not (8 <= payload.fps <= 30):
        raise HTTPException(status_code=400, detail="FPS must stay between 8 and 30")
    if payload.frames < 9 or payload.frames > 257 or (payload.frames - 1) % 8:
        raise HTTPException(status_code=400, detail="Frames must satisfy 8n+1 and stay between 9 and 257")
    if payload.upscale_video and payload.frames > 25:
        raise HTTPException(
            status_code=400,
            detail="Single-GPU safety limit: built-in LTXV upscale supports at most 25 frames",
        )
    if not (payload.image or payload.first_frame):
        raise HTTPException(status_code=400, detail="An image or first_frame is required")


def _download_image(source: str) -> bytes:
    if source.startswith("data:image/"):
        try:
            _, encoded = source.split(",", 1)
            data = base64.b64decode(encoded, validate=True)
        except Exception as exc:
            raise ValueError("Invalid image data URL") from exc
    elif source.startswith(("https://", "http://")):
        response = requests.get(source, timeout=60)
        response.raise_for_status()
        data = response.content
    else:
        raise ValueError("Image must be a data URL or HTTP(S) URL")

    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Input image exceeds 20 MiB")
    return data


def _prepare_image(task_id: str, payload: GenerationRequest) -> Path:
    source = payload.first_frame or payload.image
    if not source:
        raise ValueError("Missing first frame")

    raw = _download_image(source)
    destination = INPUT_ROOT / f"{task_id}.png"
    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert("RGB")
        if image.size != (payload.width, payload.height):
            image = image.resize((payload.width, payload.height), Image.Resampling.LANCZOS)
        image.save(destination, "PNG", optimize=True)
    return destination


def _signed_filename(task_id: str) -> str:
    signature = hmac.new(
        BRIDGE_TOKEN.encode("utf-8"),
        task_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:24]
    return f"{task_id}-{signature}.mp4"


def _public_video_url(task_id: str) -> str:
    filename = _signed_filename(task_id)
    if not PUBLIC_BASE_URL:
        return f"/files/{filename}"
    return f"{PUBLIC_BASE_URL.rstrip('/')}/files/{filename}"


def _task_view(task: dict[str, Any]) -> dict[str, Any]:
    view = {
        "id": task["id"],
        "status": task["status"],
        "created_at": task["created_at"],
        "started_at": task.get("started_at"),
        "completed_at": task.get("completed_at"),
        "error": task.get("error"),
        "queue_size": TASK_QUEUE.qsize(),
    }
    if task["status"] == "completed":
        view["video_url"] = _public_video_url(task["id"])
    return view


def _run_generation(task_id: str) -> None:
    if "generate_video" not in globals():
        raise RuntimeError("generate_video is unavailable; run the LTXV Prepare Environment cell first")

    task = TASKS[task_id]
    payload = GenerationRequest(**task["request"])
    image_path = _prepare_image(task_id, payload)
    seed = payload.seed if payload.seed > 0 else random.randint(1, 2**31 - 1)

    original_display_video = globals().get("display_video")
    globals()["display_video"] = lambda _path: None
    try:
        generate_video(
            image_path=str(image_path),
            positive_prompt=payload.prompt,
            negative_prompt=payload.negative_prompt,
            width=payload.width,
            height=payload.height,
            seed=seed,
            steps=20,
            cfg_scale=2.5,
            sampler_name="euler_ancestral",
            length=payload.frames,
            fps=payload.fps,
            upscale_video=payload.upscale_video,
        )

        generated = RUNTIME_ROOT / ("upscaled.mp4" if payload.upscale_video else "output.mp4")
        if not generated.exists() or generated.stat().st_size == 0:
            raise RuntimeError(f"LTXV did not create {generated}")

        destination = OUTPUT_ROOT / _signed_filename(task_id)
        shutil.copy2(generated, destination)
        task["seed"] = seed
        task["output_path"] = str(destination)
    finally:
        if original_display_video is not None:
            globals()["display_video"] = original_display_video
        else:
            globals().pop("display_video", None)
        if "clear_gpu_memory" in globals():
            clear_gpu_memory()


def _worker() -> None:
    while True:
        task_id = TASK_QUEUE.get()
        task = TASKS.get(task_id)
        if not task:
            TASK_QUEUE.task_done()
            continue

        task["status"] = "processing"
        task["started_at"] = time.time()
        try:
            _run_generation(task_id)
            task["status"] = "completed"
        except Exception as exc:
            task["status"] = "failed"
            task["error"] = str(exc)
            task["traceback"] = traceback.format_exc(limit=20)
        finally:
            task["completed_at"] = time.time()
            TASK_QUEUE.task_done()


app = FastAPI(title="Huobao Remote LTXV Bridge", version="1.1.0")


@app.get("/health")
def health(_: None = Depends(_require_token)) -> dict[str, Any]:
    return {
        "ok": True,
        "model_ready": "generate_video" in globals(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "queue_size": TASK_QUEUE.qsize(),
        "active_tasks": sum(1 for task in TASKS.values() if task["status"] == "processing"),
        "defaults": {
            "resolution": "576x1024",
            "fps": 24,
            "frames": 121,
            "upscale_video": False,
        },
    }


@app.post("/v1/video/generations")
def create_generation(
    payload: GenerationRequest,
    _: None = Depends(_require_token),
) -> dict[str, Any]:
    _validate_request(payload)
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "status": "pending",
        "request": payload.model_dump(),
        "created_at": time.time(),
        "error": None,
    }
    with TASK_LOCK:
        TASKS[task_id] = task
        TASK_QUEUE.put(task_id)
    return _task_view(task)


@app.get("/v1/video/generations/{task_id}")
def get_generation(task_id: str, _: None = Depends(_require_token)) -> dict[str, Any]:
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_view(task)


@app.get("/files/{filename}")
def download_generation(filename: str) -> FileResponse:
    if not re.fullmatch(r"[0-9a-f-]{36}-[0-9a-f]{24}\.mp4", filename):
        raise HTTPException(status_code=404, detail="File not found")
    path = OUTPUT_ROOT / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="video/mp4", filename=filename)


def _install_cloudflared() -> Path:
    path = BRIDGE_ROOT / "bin" / "cloudflared"
    if path.exists():
        return path

    path.parent.mkdir(parents=True, exist_ok=True)
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    path.write_bytes(response.content)
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


def _start_api_server() -> None:
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, name="huobao-api", daemon=True)
    thread.start()

    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            response = requests.get(
                "http://127.0.0.1:8000/health",
                headers={"Authorization": f"Bearer {BRIDGE_TOKEN}"},
                timeout=1,
            )
            if response.ok:
                return
        except requests.RequestException:
            pass
        time.sleep(0.25)
    raise RuntimeError("Huobao bridge API did not start")


def _start_quick_tunnel() -> str:
    cloudflared = _install_cloudflared()
    process = subprocess.Popen(
        [str(cloudflared), "tunnel", "--url", "http://127.0.0.1:8000", "--no-autoupdate"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    deadline = time.time() + 40
    while time.time() < deadline:
        line = process.stdout.readline() if process.stdout else ""
        match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if match:
            return match.group(0)
        if process.poll() is not None:
            raise RuntimeError(f"cloudflared exited with code {process.returncode}")
    process.terminate()
    raise RuntimeError("Timed out while creating Cloudflare quick tunnel")


if not globals().get("HUOBAO_BRIDGE_STARTED"):
    if "generate_video" not in globals():
        raise RuntimeError("Run the LTXV Prepare Environment cell before starting the bridge")

    worker_thread = threading.Thread(target=_worker, name="huobao-ltxv-worker", daemon=True)
    worker_thread.start()
    _start_api_server()
    PUBLIC_BASE_URL = _start_quick_tunnel()
    globals()["HUOBAO_BRIDGE_STARTED"] = True
    globals()["HUOBAO_BRIDGE_PUBLIC_URL"] = PUBLIC_BASE_URL
else:
    PUBLIC_BASE_URL = globals().get("HUOBAO_BRIDGE_PUBLIC_URL", "")

print("Huobao remote LTXV bridge is ready.")
print(f"Runtime:   {'Kaggle' if str(RUNTIME_ROOT).startswith('/kaggle') else 'Colab'}")
print(f"Base URL: {PUBLIC_BASE_URL}")
print(f"API Key:  {BRIDGE_TOKEN}")
print("Model:    ltxv-0.9.7-13b-distilled-q6_k")
print("Defaults: 576x1024, 24 fps, 121 frames, upscale off")
