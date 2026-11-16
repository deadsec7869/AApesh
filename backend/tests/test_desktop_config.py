from pathlib import Path

from sqlalchemy.engine import make_url

from backend.app.core import config


def test_desktop_user_data_paths_keep_database_and_auth_files_outside_install(tmp_path, monkeypatch):
    monkeypatch.setenv("AAPESH_USER_DATA_DIR", str(tmp_path / "AAPESH Data"))

    database_url = make_url(config._default_database_url())
    assert Path(database_url.database).parent == tmp_path / "AAPESH Data"
    assert Path(config._user_data_file("oauth.json")).parent == tmp_path / "AAPESH Data"
    assert (tmp_path / "AAPESH Data").is_dir()
