from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def test_refresh_workflow_exists_and_runs_on_schedule():
    workflow_path = ROOT / '.github' / 'workflows' / 'refresh-data.yml'
    assert workflow_path.exists(), 'Expected a GitHub Actions workflow for data refresh'

    workflow_text = workflow_path.read_text(encoding='utf-8')
    assert 'workflow_dispatch' in workflow_text
    assert 'schedule' in workflow_text
    assert 'update_all_data.py' in workflow_text


def test_gamelog_can_use_github_secret_credentials():
    gamelog_path = ROOT / 'gamelog.py'
    gamelog_text = gamelog_path.read_text(encoding='utf-8')
    assert 'GOOGLE_SERVICE_ACCOUNT_JSON' in gamelog_text
    assert 'Credentials2.json' in gamelog_text
