"""
OnboardEase AI Task Builder — FastAPI Backend
Provides endpoints for LangGraph-powered onboarding task generation.
"""

import asyncio
import json
import logging
import os
import shutil
import tempfile
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

import ptyprocess

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agent import OnboardingAgent
from models import GenerateRequest, RefineRequest, GenerateResponse, RefineResponse
from mongo_routes import router as data_router
from mongo_seed import seed_if_empty

# ─── Logging ─────────────────────────────────────────────────────────────────
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}',
    handlers=[
        logging.FileHandler("logs/agent_api.json"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# ─── App Setup ────────────────────────────────────────────────────────────────
agent: OnboardingAgent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    # ── Database ──────────────────────────────────────────────────────────────
    logger.info("Seeding MongoDB with initial data if empty...")
    seed_if_empty()
    logger.info("MongoDB ready.")
    # ── AI Agent ──────────────────────────────────────────────────────────────
    logger.info("Initializing OnboardingAgent and LangGraph workflows...")
    agent = OnboardingAgent()
    logger.info("OnboardingAgent ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="OnboardEase AI Task Builder",
    description="LangGraph-powered onboarding task generation API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount persistent data API routes ──────────────────────────────────────────
app.include_router(data_router)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status":    "ok",
        "service":   "onboardease-agent",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_tasks(request: GenerateRequest):
    """
    Generate a set of onboarding tasks using the LangGraph agent.
    Takes employee info, optional resume, and a concept prompt.
    Returns structured tasks matching the OnboardEase Task interface.
    """
    logger.info(f"Generating tasks for employee: {request.person_info.name} | Prompt: {request.prompt[:80]}")

    try:
        tasks, message = await agent.generate_tasks(
            person_info=request.person_info.model_dump(),
            prompt=request.prompt,
            assigned_by=request.assigned_by,
            assigned_by_name=request.assigned_by_name,
        )

        logger.info(f"Generated {len(tasks)} tasks for {request.person_info.name}")
        return GenerateResponse(
            tasks=tasks,
            message=message,
            total=len(tasks),
        )

    except Exception as e:
        logger.error(f"Task generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task generation failed: {str(e)}")


@app.post("/api/refine", response_model=RefineResponse)
async def refine_tasks(request: RefineRequest):
    """
    Refine an existing task list based on user instructions.
    Supports editing, adding, removing tasks, and changing any field.
    """
    logger.info(f"Refining {len(request.current_tasks)} tasks | Instruction: {request.instruction[:80]}")

    try:
        tasks, message, changes = await agent.refine_tasks(
            current_tasks=request.current_tasks,
            instruction=request.instruction,
            person_info=request.person_info.model_dump(),
            assigned_by=request.assigned_by,
            assigned_by_name=request.assigned_by_name,
        )

        logger.info(f"Refined to {len(tasks)} tasks. Changes: {changes[:100]}")
        return RefineResponse(
            tasks=tasks,
            message=message,
            total=len(tasks),
            changes_summary=changes,
        )

    except Exception as e:
        logger.error(f"Task refinement failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task refinement failed: {str(e)}")


@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Extract text content from an uploaded resume file.
    Supports .txt, .pdf (text extraction), .doc/.docx content.
    """
    logger.info(f"Parsing resume: {file.filename}")

    try:
        content = await file.read()
        filename = file.filename or "resume"

        # Try PDF extraction
        if filename.lower().endswith(".pdf"):
            try:
                import PyPDF2
                import io
                reader = PyPDF2.PdfReader(io.BytesIO(content))
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
                if text.strip():
                    return {"resume_content": text.strip(), "filename": filename, "method": "pdf"}
            except Exception:
                pass

        # Fallback: decode as text
        try:
            text = content.decode("utf-8", errors="ignore")
            # Strip null bytes and control chars
            text = "".join(c for c in text if c.isprintable() or c in "\n\t ")
            return {"resume_content": text.strip(), "filename": filename, "method": "text"}
        except Exception:
            return {"resume_content": "", "filename": filename, "method": "none"}

    except Exception as e:
        logger.error(f"Resume parse failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


# ─── WebSocket Terminal ───────────────────────────────────────────────────────

@app.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    """
    Real bash terminal via WebSocket.
    Accepts JSON: { type: 'execute', files: [{path, content}], command: str }
    Streams back:  { type: 'stdout'|'stderr'|'done'|'error', data: str, code?: int }
    """
    await websocket.accept()
    workspace = tempfile.mkdtemp(prefix="playground-")
    logger.info(f"Terminal session opened — workspace: {workspace}")

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") != "execute":
                continue

            # ── Write files to isolated workspace ──────────────────────────
            for file_info in msg.get("files", []):
                rel_path = file_info.get("path", "").lstrip("/")
                if not rel_path:
                    continue
                abs_path = os.path.join(workspace, rel_path)
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                with open(abs_path, "w", encoding="utf-8") as fh:
                    fh.write(file_info.get("content", ""))

            command = msg.get("command", "").strip()
            if not command:
                continue

            await websocket.send_text(json.dumps({"type": "stdout", "data": f"$ {command}\r\n"}))

            # ── Run command ─────────────────────────────────────────────────
            try:
                proc = await asyncio.create_subprocess_shell(
                    command,
                    cwd=workspace,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env={**os.environ, "TERM": "xterm-256color", "HOME": workspace},
                )

                async def relay(stream, stream_type: str):
                    while True:
                        chunk = await stream.read(512)
                        if not chunk:
                            break
                        await websocket.send_text(json.dumps({
                            "type": stream_type,
                            "data": chunk.decode("utf-8", errors="replace"),
                        }))

                await asyncio.gather(
                    relay(proc.stdout, "stdout"),
                    relay(proc.stderr, "stderr"),
                )
                code = await proc.wait()
                await websocket.send_text(json.dumps({"type": "done", "code": code}))

            except Exception as exec_err:
                await websocket.send_text(json.dumps({"type": "error", "data": str(exec_err)}))

    except WebSocketDisconnect:
        logger.info(f"Terminal session closed — workspace: {workspace}")
    except Exception as e:
        logger.error(f"Terminal error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "data": str(e)}))
        except Exception:
            pass
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


# ─── xterm.js PTY Terminal ────────────────────────────────────────────────────

def _write_files(workspace: str, files: list):
    """Write playground files into the isolated workspace directory."""
    for f in files:
        rel = f.get("path", "").lstrip("/")
        if not rel:
            continue
        abs_p = os.path.join(workspace, rel)
        os.makedirs(os.path.dirname(abs_p) or workspace, exist_ok=True)
        with open(abs_p, "w", encoding="utf-8") as fh:
            fh.write(f.get("content", ""))


@app.websocket("/ws/pty")
async def pty_terminal(websocket: WebSocket):
    """
    Full PTY bash session for xterm.js.

    Protocol (TEXT frames = control, BINARY frames = PTY I/O):
      Client → Server TEXT:
        { type: 'init',   files: [{path, content}] }   ← first message, write files
        { type: 'sync',   files: [{path, content}], command?: str } ← update files + optionally type command
        { type: 'resize', cols: int, rows: int }         ← terminal resize
      Server → Client TEXT:
        { type: 'ready' }                                ← sent after init
      Client → Server BINARY:  raw PTY input (keystrokes)
      Server → Client BINARY:  raw PTY output (rendered terminal data)
    """
    await websocket.accept()
    workspace = tempfile.mkdtemp(prefix="pty-")
    logger.info(f"PTY session opened — workspace: {workspace}")

    proc: ptyprocess.PtyProcess | None = None
    loop = asyncio.get_event_loop()

    try:
        # ── Wait for init ──────────────────────────────────────────────────
        raw = await websocket.receive_text()
        init = json.loads(raw)
        _write_files(workspace, init.get("files", []))

        # ── Spawn bash in PTY ──────────────────────────────────────────────
        env = {
            "TERM":  "xterm-256color",
            "HOME":  workspace,
            "LANG":  "en_US.UTF-8",
            "PATH":  os.environ.get("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"),
            "PS1":   "\\[\\033[01;32m\\]playground\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ",
        }
        proc = ptyprocess.PtyProcess.spawn(
            ["/bin/bash"],
            cwd=workspace,
            env=env,
            dimensions=(24, 200),
        )
        await websocket.send_text(json.dumps({"type": "ready"}))

        # ── Relay PTY stdout → WebSocket (BINARY) ─────────────────────────
        async def pty_reader():
            while proc.isalive():
                try:
                    data = await loop.run_in_executor(None, proc.read, 4096)
                    if data:
                        await websocket.send_bytes(data)
                except EOFError:
                    break
                except Exception:
                    break

        # ── Relay WebSocket → PTY (TEXT=control, BINARY=keystrokes) ───────
        async def ws_reader():
            while True:
                msg = await websocket.receive()
                if "bytes" in msg and msg["bytes"]:
                    if proc.isalive():
                        proc.write(msg["bytes"])
                elif "text" in msg and msg["text"]:
                    ctrl = json.loads(msg["text"])
                    if ctrl.get("type") == "resize":
                        proc.setwinsize(ctrl.get("rows", 24), ctrl.get("cols", 200))
                    elif ctrl.get("type") == "sync":
                        _write_files(workspace, ctrl.get("files", []))
                        cmd = ctrl.get("command")
                        if cmd and proc.isalive():
                            proc.write((cmd + "\r").encode())

        await asyncio.gather(pty_reader(), ws_reader())

    except WebSocketDisconnect:
        logger.info(f"PTY session closed — workspace: {workspace}")
    except Exception as e:
        logger.error(f"PTY error: {e}")
    finally:
        if proc and proc.isalive():
            proc.terminate(force=True)
        shutil.rmtree(workspace, ignore_errors=True)


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 3016))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
