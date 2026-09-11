"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ClosersRoot() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      window.location.href = data.session ? "/closers/app" : "/closers/login";
    });
  }, []);

  return <div className="app-loading">Redirection…</div>;
}
