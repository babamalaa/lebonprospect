import datetime
import pytest
import send_digests as sd

UTC = datetime.timezone.utc
NOW = datetime.datetime(2026, 9, 24, 6, 0, tzinfo=UTC)
DASH = {"essai": True, "essai_source": "dashboard"}

def test_pas_essai():
    assert sd.essai_expire({"essai": False, "essai_source": "dashboard", "essai_fin": "2026-09-01T00:00:00Z"}, NOW) is False

def test_essai_paye_jamais_expire():
    assert sd.essai_expire({**DASH, "essai_fin": "2026-09-01T00:00:00Z", "premier_paiement_at": "2026-09-08T00:00:00Z"}, NOW) is False

def test_essai_en_cours():
    assert sd.essai_expire({**DASH, "essai_fin": "2026-09-30T00:00:00Z"}, NOW) is False

def test_essai_fini_depuis_moins_de_24h():
    assert sd.essai_expire({**DASH, "essai_fin": "2026-09-23T10:00:00Z"}, NOW) is False

def test_essai_fini_depuis_plus_de_24h():
    assert sd.essai_expire({**DASH, "essai_fin": "2026-09-22T10:00:00Z"}, NOW) is True

def test_essai_fin_naive_traitee_utc():
    assert sd.essai_expire({**DASH, "essai_fin": "2026-09-22 10:00:00"}, NOW) is True

def test_essai_sans_fin_jamais_expire():
    assert sd.essai_expire({**DASH, "essai_fin": None}, NOW) is False

@pytest.mark.parametrize("source", ["stripe", None])
def test_essai_stripe_jamais_coupe_par_le_cron(source):
    """La fin d'un essai Stripe est gérée par le webhook : un invoice.paid manqué ne doit pas couper un client payant."""
    assert sd.essai_expire({"essai": True, "essai_source": source, "essai_fin": "2026-09-01T00:00:00Z"}, NOW) is False

def _run_main(fixture, monkeypatch, argv):
    subs = fixture("subscribers.json")
    subs[0] = {**subs[0], **DASH, "essai_fin": "2026-09-01T00:00:00Z"}
    writes, sent = [], []
    def fake_sql(q):
        if "from subscribers" in q: return subs
        if "max(date_parution)" in q: return [{"d": "2026-09-23"}]
        writes.append(q); return []
    monkeypatch.setattr(sd, "sql_exec", fake_sql)
    monkeypatch.setattr(sd, "fetch_leads", lambda *a, **k: [{"acheteur_nom": "X", "ville": "V", "departement": "D"}])
    monkeypatch.setattr(sd, "time", type("T", (), {"sleep": staticmethod(lambda s: None)}))
    monkeypatch.setattr("sys.argv", argv)
    class FD(datetime.date):
        @classmethod
        def today(cls): return cls(2026, 9, 24)
    monkeypatch.setattr(sd.datetime, "date", FD)
    return subs, writes, sent

def test_main_dry_run_saute_essai_expire(fixture, monkeypatch, capsys):
    _, updates, _ = _run_main(fixture, monkeypatch, ["send_digests.py", "--dry-run"])
    monkeypatch.setattr(sd, "send_resend", lambda *a, **k: (_ for _ in ()).throw(AssertionError("interdit")))
    sd.main()
    out = capsys.readouterr().out
    assert "ESSAI EXPIRÉ: regional@example.com" in out
    assert "DRY: regional@example.com" not in out
    assert "1 essais expirés" in out
    assert updates == []   # dry-run : aucun update

def test_main_reel_met_en_pause_et_n_envoie_pas(fixture, monkeypatch, capsys):
    subs, writes, sent = _run_main(fixture, monkeypatch, ["send_digests.py"])
    monkeypatch.setattr(sd, "send_resend", lambda to, *a, **k: sent.append(to) or {"id": "re_test"})
    sd.main()
    out = capsys.readouterr().out
    pause = [q for q in writes if "statut = 'pause'" in q]
    assert pause == ["update subscribers set statut = 'pause', essai_expire_at = now() where id = 1;"]
    assert "regional@example.com" not in sent          # l'essai expiré ne reçoit rien
    assert "deja-servi@example.com" not in sent
    assert len(sent) == 3                               # abonnés 3, 4, 5
    assert "3 envoyés" in out and "1 essais expirés" in out
