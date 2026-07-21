#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENV_PYTHON = ROOT / 'venv' / 'bin' / 'python'
PYTHON_BIN = VENV_PYTHON if VENV_PYTHON.exists() else Path(sys.executable)
RUN_SUMMARY_PATH = ROOT / 'last_data_refresh.json'


@dataclass(frozen=True)
class ScriptTask:
    key: str
    label: str
    script: str


@dataclass(frozen=True)
class StepResult:
    label: str
    status: str
    elapsed_seconds: float
    error: str | None = None


CORE_TASKS = [
    ScriptTask('bio', 'Refresh player bio', 'wba_bio_2025.py'),
    ScriptTask('gamelogs', 'Refresh merged 2025/2026 gamelogs', 'gamelog.py'),
    ScriptTask('guard-dvp', 'Refresh guard DVP', 'newguard.py'),
    ScriptTask('forward-dvp', 'Refresh forward DVP', 'newforward.py'),
    ScriptTask('center-dvp', 'Refresh center DVP', 'newcenter.py'),
]

LEGACY_TASKS = [
    ScriptTask('advanced', 'Refresh advanced team stats', 'advanced.py'),
    ScriptTask('player-stats', 'Refresh player per-game stats', 'wnba_player_stats_25.py'),
    ScriptTask('per-minute', 'Refresh per-minute stats', 'PerMin.py'),
    ScriptTask('props-cash', 'Refresh props.cash projections', 'props.cash_Projections.py'),
    ScriptTask('calc-projections', 'Refresh legacy calculated projections', 'calculate_projections.py'),
]

EXTRA_TASKS = [
    ScriptTask('team-rank', 'Refresh team rank export', 'WNBA_TEAMRANK.py'),
    ScriptTask('daily-lineups', 'Refresh daily lineups export', 'WNBA_Daily_Lineups.py'),
    ScriptTask('sports-odds', 'Refresh odds-enriched props export', 'sports_odds_data.py'),
]


def reset_prizepicks_snapshots() -> None:
    snapshot_dir = ROOT / 'downloaded_files'
    for name in ('prizepicks_standard.json', 'prizepicks_demon.json', 'prizepicks_goblin.json'):
        path = snapshot_dir / name
        if path.exists():
            path.write_text('{}', encoding='utf-8')


def sync_dvp_aliases() -> None:
    alias_pairs = [
        ('wnbaGUARDdvp.csv', 'wnba_guard_dvp.csv'),
        ('wnbaFORWARDdvp.csv', 'wnba_forward_dvp.csv'),
        ('wnbaCENTERdvp.csv', 'wnba_center_dvp.csv'),
    ]

    for source_name, alias_name in alias_pairs:
        source = ROOT / source_name
        alias = ROOT / alias_name
        if not source.exists():
            raise FileNotFoundError(f'Missing DVP source file: {source_name}')
        shutil.copy2(source, alias)


def run_python_script(task: ScriptTask) -> None:
    script_path = ROOT / task.script
    if not script_path.exists():
        raise FileNotFoundError(f'Missing script: {task.script}')

    subprocess.run(
        [str(PYTHON_BIN), str(script_path)],
        cwd=ROOT,
        check=True,
    )


def run_step(label: str, action) -> float:
    started = time.time()
    print(f'\n[run] {label}')
    action()
    elapsed = time.time() - started
    print(f'[ok]  {label} ({elapsed:.1f}s)')
    return elapsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Refresh the WNBA app data pipeline from one entry point.',
    )
    parser.add_argument(
        '--with-extras',
        action='store_true',
        help='Also refresh ancillary exports such as team rank, daily lineups, and sports odds.',
    )
    parser.add_argument(
        '--core-only',
        action='store_true',
        help='Refresh only the live app inputs used by the frontend/backend flow.',
    )
    parser.add_argument(
        '--continue-on-error',
        action='store_true',
        help='Keep running later steps after a failure and print a summary at the end.',
    )
    return parser.parse_args()


def build_plan(args: argparse.Namespace):
    plan = [(task.label, lambda task=task: run_python_script(task)) for task in CORE_TASKS]
    plan.append(('Sync DVP filename aliases', sync_dvp_aliases))
    plan.append(('Reset PrizePicks snapshots', reset_prizepicks_snapshots))

    if not args.core_only:
        plan.extend((task.label, lambda task=task: run_python_script(task)) for task in LEGACY_TASKS)

    if args.with_extras and not args.core_only:
        plan.extend((task.label, lambda task=task: run_python_script(task)) for task in EXTRA_TASKS)

    return plan


def write_run_summary(
    *,
    started_at: datetime,
    finished_at: datetime,
    python_bin: Path,
    args: argparse.Namespace,
    step_results: list[StepResult],
) -> None:
    summary = {
        'startedAt': started_at.isoformat(),
        'finishedAt': finished_at.isoformat(),
        'workspace': str(ROOT),
        'python': str(python_bin),
        'mode': {
            'coreOnly': args.core_only,
            'withExtras': args.with_extras,
            'continueOnError': args.continue_on_error,
        },
        'ok': all(step.status == 'ok' for step in step_results),
        'steps': [
            {
                'label': step.label,
                'status': step.status,
                'elapsedSeconds': round(step.elapsed_seconds, 2),
                'error': step.error,
            }
            for step in step_results
        ],
    }
    RUN_SUMMARY_PATH.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')


def print_step_summary(step_results: list[StepResult]) -> None:
    print('\nStep summary:')
    for step in step_results:
        suffix = f' - {step.error}' if step.error else ''
        print(f' - [{step.status}] {step.label} ({step.elapsed_seconds:.1f}s){suffix}')


def main() -> int:
    args = parse_args()
    plan = build_plan(args)
    failures = []
    step_results = []
    started_at = datetime.now(timezone.utc)
    total_started = time.time()

    print(f'Using Python: {PYTHON_BIN}')
    print(f'Workspace: {ROOT}')

    for label, action in plan:
        try:
            elapsed = run_step(label, action)
            step_results.append(StepResult(label=label, status='ok', elapsed_seconds=elapsed))
        except Exception as exc:
            failures.append((label, str(exc)))
            step_results.append(StepResult(label=label, status='fail', elapsed_seconds=0.0, error=str(exc)))
            print(f'[fail] {label}: {exc}')
            if not args.continue_on_error:
                break

    elapsed = time.time() - total_started
    finished_at = datetime.now(timezone.utc)
    write_run_summary(
        started_at=started_at,
        finished_at=finished_at,
        python_bin=PYTHON_BIN,
        args=args,
        step_results=step_results,
    )

    print(f'\nFinished in {elapsed:.1f}s')
    print_step_summary(step_results)
    print(f'Run summary written to: {RUN_SUMMARY_PATH.name}')

    if failures:
        print('Failures:')
        for label, message in failures:
            print(f' - {label}: {message}')
        return 1

    print('All selected data refresh steps completed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())