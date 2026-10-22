"""Run the application's ten strict, sequential quality gates; stop on the first failure."""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(arguments: list[str]) -> None:
    environment = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    subprocess.run(arguments, cwd=ROOT, env=environment, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url")
    parser.add_argument("--job-id")
    parser.add_argument("--gitleaks", type=Path, default=ROOT / "artifacts/tooling/gitleaks/gitleaks.exe")
    args = parser.parse_args()
    interpreter = Path(sys.executable).resolve()
    if ROOT / ".venv" not in interpreter.parents:
        parser.error("Run with uv run python -m scripts.verify to use the installed project toolchain")
    uv = shutil.which("uv")
    if uv is None:
        parser.error("The uv executable is required")
    artifacts = ROOT / "artifacts/verification"
    artifacts.mkdir(parents=True, exist_ok=True)
    python = [str(interpreter), "-X", "utf8", "-B"]
    smoke = python + ["-m", "scripts.smoke"]
    if args.base_url:
        smoke += ["--base-url", args.base_url]
    if args.job_id:
        smoke += ["--job-id", args.job_id]
    gates = [
        (
            "Secrets (Gitleaks)",
            [
                [
                    str(args.gitleaks.resolve()),
                    "dir",
                    ".",
                    "--config",
                    ".gitleaks.toml",
                    "--no-banner",
                    "--redact=100",
                    "--report-format",
                    "json",
                    "--report-path",
                    str(artifacts / "secrets.json"),
                ]
            ],
        ),
        ("Lint", [python + ["-m", "ruff", "check", "app", "tests", "scripts"]]),
        ("Types", [python + ["-m", "basedpyright", "app"]]),
        (
            "Dead code",
            [
                python
                + ["-m", "vulture", "app", "--min-confidence", "100", "--ignore-decorators", "@app.*,@DBOS.*"]
            ],
        ),
        (
            "Tests and genuine coverage",
            [
                python
                + [
                    "-m",
                    "pytest",
                    "--cov=app",
                    "--cov-append",
                    "--cov-report=term-missing",
                    "--cov-report=json:artifacts/verification/coverage.json",
                    "--cov-fail-under=80",
                ]
            ],
        ),
        (
            "SAST and dependency audit",
            [
                python + ["-m", "bandit", "-r", "app", "-f", "json", "-o", str(artifacts / "bandit.json")],
                python
                + [
                    "-m",
                    "pip_audit",
                    "--progress-spinner",
                    "off",
                    "--format",
                    "json",
                    "--output",
                    str(artifacts / "dependency-audit.json"),
                    "--ignore-vuln",
                    "CVE-2026-81726",
                    "--timeout",
                    "60",
                ],
            ],
        ),
        ("Build", [[uv, "build"]]),
        ("Live runtime and persisted research", [smoke]),
        ("Evidence and AI governance", [python + ["-m", "pytest", "tests/test_governance.py"]]),
        ("Application memory, AST and blueprint integrity", []),
    ]
    report = []
    for number, (name, commands) in enumerate(gates, 1):
        print(f"Gate {number}/10: {name}", flush=True)
        try:
            for command in commands:
                run(command)
            if number == 10:
                for filename, ceiling in (
                    ("MEMORY.md", 2200),
                    ("USER.md", 1375),
                    (".agents/references/MEMORY.md", 2200),
                ):
                    assert len((ROOT / filename).read_text(encoding="utf-8")) < ceiling, filename
                manifest = json.loads((ROOT / ".agents/blueprint-manifest.json").read_text(encoding="utf-8"))
                assert manifest["operationalMode"] == "TARGET_APPLY", "Wrong operational mode"
                bridge = Path.home() / ".gemini/config/skills/codebase-graph/scripts/graph_bridge.py"
                graph = ROOT / "graphify-out/graph.json"
                run(
                    python
                    + [
                        str(bridge),
                        "--action",
                        "update" if graph.exists() else "init",
                        "--project",
                        str(ROOT),
                    ]
                )
                graph_data = json.loads(graph.read_text(encoding="utf-8"))
                assert any(
                    "app/" in str(node.get("source_file", "")).replace("\\", "/")
                    for node in graph_data["nodes"]
                ), "AST graph lacks application source evidence"
                run(python + [".agents/scripts/manifest_sync.py", "--verify"])
        except (subprocess.CalledProcessError, OSError, AssertionError, KeyError, ValueError) as error:
            report.append({"gate": number, "name": name, "status": "FAILED", "error": str(error)})
            print(f"FAILED gate {number}; fix the cause and restart at Gate 1: {error}", flush=True)
            (artifacts / "gates.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            return 1
        report.append({"gate": number, "name": name, "status": "PASSED"})
    (artifacts / "gates.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("PASS 10/10 consecutive gates", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
