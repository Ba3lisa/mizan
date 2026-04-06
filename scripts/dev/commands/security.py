"""Security scanning commands."""

import subprocess
import sys
from pathlib import Path

import typer
from rich.console import Console

app = typer.Typer(help="Security scanning commands.")
console = Console()
ROOT = Path(__file__).resolve().parents[3]
APP_DIR = ROOT / "app"


@app.callback(invoke_without_command=True)
def security_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        scan()


@app.command()
def scan() -> None:
    """Run all security checks."""
    console.print("[bold]Running security scan...[/bold]")

    # npm audit
    console.print("\n[cyan]1. npm audit[/cyan]")
    subprocess.run(["npm", "audit", "--audit-level=high"], cwd=str(APP_DIR))

    # Check for secrets
    console.print("\n[cyan]2. Secret scan[/cyan]")
    result = subprocess.run(
        [
            "grep",
            "-rn",
            "-E",
            r"cfat_[A-Za-z0-9]{10,}|dop_v1_[a-f0-9]{10,}|sk-ant-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{30,}",
            str(APP_DIR / "src"),
            str(APP_DIR / "convex"),
            str(ROOT / ".github"),
        ],
        capture_output=True,
        text=True,
    )
    if result.stdout:
        console.print(f"[red]Secrets found![/red]\n{result.stdout}")
    else:
        console.print("[green]No secrets found.[/green]")

    # Check for unsafe patterns
    console.print("\n[cyan]3. Unsafe code patterns[/cyan]")
    patterns = {
        "eval(": "Code injection risk",
        "innerHTML": "XSS risk (verify no user input)",
        "exec(": "Command injection risk",
        "__proto__": "Prototype pollution",
    }
    for pattern, risk in patterns.items():
        result = subprocess.run(
            [
                "grep",
                "-rn",
                pattern,
                str(APP_DIR / "src"),
                str(APP_DIR / "convex"),
            ],
            capture_output=True,
            text=True,
        )
        matches = [
            line
            for line in result.stdout.strip().split("\n")
            if line and "node_modules" not in line
        ]
        if matches:
            console.print(f"  [yellow]{pattern}[/yellow] -- {risk}")
            for m in matches[:3]:
                console.print(f"    {m}")


@app.command()
def audit() -> None:
    """Run npm audit with details."""
    subprocess.run(["npm", "audit"], cwd=str(APP_DIR))


@app.command()
def deps() -> None:
    """Check for outdated dependencies."""
    subprocess.run(["npm", "outdated"], cwd=str(APP_DIR))
