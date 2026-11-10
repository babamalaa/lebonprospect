"use client";

import { useEffect } from "react";

// Événement Purchase côté navigateur (pixel Meta). INACTIF tant que NEXT_PUBLIC_META_PIXEL_ID n'est pas défini.
// Même event_id que l'envoi serveur (API de conversions) : Meta dédoublonne.
export default function Purchase({ eventId, valeur, devise }) {
  useEffect(() => {
    const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixel || window.__lbpPurchase === eventId) return;
    window.__lbpPurchase = eventId;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", pixel);
    window.fbq("track", "Purchase", { value: valeur, currency: devise }, { eventID: eventId });
  }, [eventId, valeur, devise]);
  return null;
}
