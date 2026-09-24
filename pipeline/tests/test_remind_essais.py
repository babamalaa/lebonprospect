import datetime, json
import remind_essais as re_

UTC = datetime.timezone.utc
NOW = datetime.datetime(2026, 9, 24, 6, 0, tzinfo=UTC)
BASE = {"essai": True, "essai_source": "dashboard", "plan": "regional", "email": "x@example.com"}

def test_rappel_dans_la_fenetre():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z"}, NOW) is True

def test_pas_de_rappel_trop_tot():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-28T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_essai_fini():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-23T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_si_deja_rappele_ou_paye():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z", "essai_rappel_at": "2026-09-24T00:00:00Z"}, NOW) is False
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z", "premier_paiement_at": "2026-09-24T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_essai_stripe():
    """Les essais Stripe reçoivent déjà le rappel J-3 natif de Stripe."""
    assert re_.a_rappeler({**BASE, "essai_source": "stripe", "essai_fin": "2026-09-25T18:00:00Z"}, NOW) is False

def test_rappel_part_a_j5_avec_le_cron_de_5h():
    """Essai démarré à J0 14:00 UTC (fin J7 14:00), cron chaque jour à 05:00 UTC : le rappel part à J+5, une seule fois."""
    debut = datetime.datetime(2026, 9, 24, 14, 0, tzinfo=UTC)
    s = {**BASE, "essai_fin": (debut + datetime.timedelta(days=7)).isoformat()}
    jours = [j for j in range(1, 9)
             if re_.a_rappeler(s, datetime.datetime(2026, 9, 24, 5, 0, tzinfo=UTC) + datetime.timedelta(days=j))]
    assert jours[0] == 5          # premier jour éligible ; essai_rappel_at bloque les suivants

def test_render_rappel_lien_et_prix():
    h = re_.render_rappel({**BASE, "essai_fin": "2026-09-26T00:00:00Z", "societe": "AGENCEMENT <TEST>"})
    assert re_.LINKS["regional"] in h and "299" in h
    assert "26 septembre 2026" in h
    assert "&lt;TEST&gt;" in h and "<TEST>" not in h
    assert 'bgcolor="#ffffff"' in h
    h2 = re_.render_rappel({**BASE, "plan": "departemental", "essai_fin": "2026-09-26T00:00:00Z"})
    assert re_.LINKS["departemental"] in h2 and "149" in h2

def test_liens_directs_et_pas_liens_essai():
    """L'essai a déjà eu lieu : le rappel pointe vers les liens directs, pas vers un second essai Stripe."""
    assert re_.LINKS == {"departemental": "https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200",
                         "regional": "https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201"}

def test_copy_sans_tiret_cadratin():
    h = re_.render_rappel({**BASE, "essai_fin": "2026-09-26T00:00:00Z", "societe": "X"})
    assert "—" not in h

def test_send_transactional_part_de_onboarding(monkeypatch):
    seen = {}
    class FakeResp:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return b'{"id": "re_test"}'
    def fake_urlopen(req, timeout=None):
        seen["url"], seen["body"] = req.full_url, json.loads(req.data)
        return FakeResp()
    monkeypatch.setenv("RESEND_API_KEY", "cle-factice")
    monkeypatch.setattr(re_.urllib.request, "urlopen", fake_urlopen)
    assert re_.send_transactional("x@example.com", "Sujet", "<p>x</p>") == {"id": "re_test"}
    assert seen["url"] == "https://api.resend.com/emails"
    assert seen["body"]["from"] == "LeBonProspect <onboarding@lebonprospect.fr>"
    assert "alerte@" not in json.dumps(seen["body"])

def _fixer_maintenant(monkeypatch):
    class FDT(datetime.datetime):
        @classmethod
        def now(cls, tz=None): return NOW
    monkeypatch.setattr(re_.datetime, "datetime", FDT)

def test_main_dry_run(monkeypatch, capsys):
    subs = [{**BASE, "id": 1, "essai_fin": "2026-09-25T18:00:00Z"}, {**BASE, "id": 2, "email": "y@example.com", "essai_fin": "2026-10-10T00:00:00Z"}]
    updates = []
    monkeypatch.setattr(re_, "sql_exec", lambda q: subs if q.strip().startswith("select") else updates.append(q))
    monkeypatch.setattr(re_, "send_transactional", lambda *a, **k: (_ for _ in ()).throw(AssertionError("interdit")))
    _fixer_maintenant(monkeypatch)
    monkeypatch.setattr("sys.argv", ["remind_essais.py", "--dry-run"])
    re_.main()
    out = capsys.readouterr().out
    assert "DRY: rappel → x@example.com" in out and "y@example.com" not in out
    assert "BILAN rappels: 1" in out and updates == []

def test_main_reel_envoie_et_marque_le_rappel(monkeypatch, capsys):
    subs = [{**BASE, "id": 1, "essai_fin": "2026-09-25T18:00:00Z"},
            {**BASE, "id": 2, "email": "z@example.com", "essai_fin": "2026-09-26T00:00:00Z"}]
    updates, envois = [], []
    monkeypatch.setattr(re_, "sql_exec", lambda q: subs if q.strip().startswith("select") else updates.append(q))
    def fake_send(to, subject, body):
        if to == "z@example.com":
            raise RuntimeError("Resend indisponible")
        envois.append((to, subject))
    monkeypatch.setattr(re_, "send_transactional", fake_send)
    _fixer_maintenant(monkeypatch)
    monkeypatch.setattr("sys.argv", ["remind_essais.py"])
    re_.main()
    out, err = capsys.readouterr()
    assert envois == [("x@example.com", "Votre essai LeBonProspect se termine le 25 septembre 2026")]
    # seul l'envoi réussi est marqué : l'échec sera retenté au prochain cron
    assert updates == ["update subscribers set essai_rappel_at = now() where id = 1;"]
    assert "ERREUR rappel z@example.com" in err and "BILAN rappels: 1" in out
