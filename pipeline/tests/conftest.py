import json, os, pytest

FIX = os.path.join(os.path.dirname(__file__), "fixtures")

def load_fixture(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def fixture():
    return load_fixture

@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Tout appel réseau dans un test est une erreur."""
    import urllib.request
    def boom(*a, **k):
        raise RuntimeError("Appel réseau interdit dans les tests")
    monkeypatch.setattr(urllib.request, "urlopen", boom)
