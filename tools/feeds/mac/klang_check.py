#!/usr/bin/env python3
"""Daily reminder on this Mac: is Klang's concert calendar still updating?

Run by launchd (see install.sh) every morning and evening. It checks, in order:
  1. the GitHub Actions workflow "Build and deploy" (pages.yml) is active — GitHub pauses scheduled
     workflows in repositories without activity for 60 days; if so it is re-enabled and started;
  2. the latest finished run succeeded (it fails when a venue's website could not be read);
  3. the published calendar (data/concerts.json) is less than 30 hours old;
  4. the published health report (data/feed-report.json) says "ok".
When something is wrong it shows a pop-up (and a Notification Center banner) with the reasons;
"Show details" opens the GitHub run page. Silent when everything is fine.

    python3 klang_check.py            normal check
    python3 klang_check.py --test     show a test pop-up (to confirm notifications work)
Log: ~/Library/Logs/klang-calendar-check.log. Standard library only (+ the GitHub CLI `gh`, optional).
"""
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

REPO = 'lyl0316/klang'
WORKFLOW = 'pages.yml'
SITE = 'https://lyl0316.github.io/klang/'
MAX_AGE_H = 30
LOG = os.path.expanduser('~/Library/Logs/klang-calendar-check.log')
os.environ['PATH'] = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:' + os.environ.get('PATH', '')


def log(msg):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(f'{datetime.now().isoformat(timespec="seconds")}  {msg}\n')


def fetch_json(url):
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'KlangMacCheck/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def gh(*args):
    exe = shutil.which('gh')
    if not exe:
        raise RuntimeError('GitHub CLI (gh) not found')
    out = subprocess.run([exe, *args], capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip() or f'gh {" ".join(args)} failed')
    return out.stdout


def osa(script):
    return subprocess.run(['osascript', '-e', script], capture_output=True, text=True).stdout.strip()


def q(s):
    return '"' + str(s).replace('\\', '\\\\').replace('"', '\\"') + '"'


def popup(title, lines, url=None):
    body = '\n'.join(f'• {x}' for x in lines[:8]) + (f'\n… and {len(lines) - 8} more' if len(lines) > 8 else '')
    osa(f'display notification {q(lines[0] if lines else title)} with title {q(title)} sound name "Basso"')
    buttons = '{"Later", "Show details"}' if url else '{"OK"}'
    answer = osa(f'display alert {q(title)} message {q(body)} as critical buttons {buttons} default button {2 if url else 1}')
    if url and 'Show details' in answer:
        subprocess.run(['open', url])


def check():
    problems, run_url = [], f'https://github.com/{REPO}/actions/workflows/{WORKFLOW}'
    # 1. workflow active?
    try:
        state = json.loads(gh('api', f'repos/{REPO}/actions/workflows/{WORKFLOW}')).get('state')
        if state and state != 'active':
            gh('workflow', 'enable', WORKFLOW, '-R', REPO)
            gh('workflow', 'run', WORKFLOW, '-R', REPO)
            problems.append(f'GitHub had paused the daily update ({state}). It has been switched back on and started now.')
    except Exception as e:  # noqa: BLE001
        log(f'workflow state: {e}')
    # 2. latest finished run
    try:
        runs = json.loads(gh('run', 'list', '-R', REPO, '--workflow', WORKFLOW, '-L', '10',
                             '--json', 'conclusion,status,event,createdAt,url'))
        done = [r for r in runs if r.get('status') == 'completed']
        if done:
            last = done[0]
            if last.get('conclusion') != 'success':
                run_url = last.get('url') or run_url
                problems.append(f'The last calendar update ({last.get("event")}, {last.get("createdAt", "")[:16].replace("T", " ")} UTC) ended as "{last.get("conclusion")}".')
    except Exception as e:  # noqa: BLE001
        log(f'run list: {e}')
    # 3. published feed age
    try:
        feed = fetch_json(SITE + 'data/concerts.json')
        gen = datetime.fromisoformat(str(feed.get('generatedAt')).replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - gen).total_seconds() / 3600
        if age > MAX_AGE_H:
            problems.append(f'The published calendar is {age:.0f} hours old (it should be updated every morning).')
    except Exception as e:  # noqa: BLE001
        problems.append(f'The published calendar could not be loaded ({type(e).__name__}).')
    # 4. published health report
    try:
        rep = fetch_json(SITE + 'data/feed-report.json')
        if rep.get('status') != 'ok':
            problems.extend(rep.get('problems') or ['The calendar check reported a problem.'])
    except Exception as e:  # noqa: BLE001
        log(f'report: {e}')
    # de-duplicate, keep order
    seen, out = set(), []
    for p in problems:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out, run_url


def main():
    if '--test' in sys.argv:
        popup('Klang calendar check (test)', ['This is how you will be reminded if the daily concert update fails.'], SITE)
        log('test pop-up shown')
        return 0
    problems, url = check()
    if problems:
        log('FAIL: ' + ' | '.join(problems))
        popup('Klang: the concert calendar update failed', problems, url)
        return 1
    log('ok')
    return 0


if __name__ == '__main__':
    sys.exit(main())
