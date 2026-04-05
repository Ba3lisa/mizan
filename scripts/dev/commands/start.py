"""Dev server commands."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
from pathlib import Path

import typer

app = typer.Typer(help="Dev server commands.")

ROOT = Path(__file__).resolve().parents[3]
APP_DIR = ROOT / "app"


def _find_npm() -> str:
    """Return the path to npm (or npx)."""
    import shutil

    npm = shutil.which("npm")
    if npm:
        return npm
    raise typer.Exit(code=1)


@app.callback(invoke_without_command=True)
def start_callback(ctx: typer.Context) -> None:
    """Start the development servers (Convex + Next.js)."""
    if ctx.invoked_subcommand is not None:
        return

    typer.echo("🚀 Starting Mizan dev servers...")
    typer.echo(f"   App dir: {APP_DIR}")

    env = os.environ.copy()
    procs: list[subprocess.Popen[bytes]] = []

    try:
        # Start Convex dev in the background
        typer.echo("   → Starting Convex dev...")
        convex_proc = subprocess.Popen(
            ["npx", "convex", "dev"],
            cwd=str(APP_DIR),
            env=env,
        )
        procs.append(convex_proc)

        # Start Next.js dev server
        typer.echo("   → Starting Next.js dev server...")
        next_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(APP_DIR),
            env=env,
        )
        procs.append(next_proc)

        typer.echo("")
        typer.echo("   ✅ Dev servers running!")
        typer.echo("   Next.js:  http://localhost:3000")
        typer.echo("   Convex:   syncing in background")
        typer.echo("   Press Ctrl+C to stop all servers.")
        typer.echo("")

        # Wait for either process to exit
        while True:
            for p in procs:
                ret = p.poll()
                if ret is not None:
                    typer.echo(f"Process {p.args} exited with code {ret}")
                    raise KeyboardInterrupt
            import time
            time.sleep(0.5)

    except KeyboardInterrupt:
        typer.echo("\n   Stopping dev servers...")
        for p in procs:
            p.send_signal(signal.SIGTERM)
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        typer.echo("   ✅ All servers stopped.")


@app.command("stop")
def stop() -> None:
    """Stop all dev servers."""
    typer.echo("Stopping dev servers...")
    # Kill any running next dev or convex dev processes
    subprocess.run(["pkill", "-f", "next dev"], capture_output=True)
    subprocess.run(["pkill", "-f", "convex dev"], capture_output=True)
    typer.echo("✅ Dev servers stopped.")
