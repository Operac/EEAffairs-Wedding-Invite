/* ═══════════════════════════════════════════
   TheEEAffair - site behaviour
   ═══════════════════════════════════════════ */

/* ── CONFIG - fill these in as they become available ── */
const CONFIG = {
  // Form backend - a Google Apps Script web app URL (see RSVP-SETUP.md).
  // Paste the SAME /exec URL into both fields; the script routes RSVPs and
  // Wishes into separate sheet tabs and emails the bride. Until set,
  // submissions save to this browser only and the confirmation still plays.
  RSVP_ENDPOINT: "https://script.google.com/macros/s/AKfycbzdpNKzRBr8BCzLBrfefAi6hlcA0Dl5KgQBOqd3qn1OyWKtJfMOvGKHSP44iLeqbx5w/exec",
  WISHES_ENDPOINT: "https://script.google.com/macros/s/AKfycbzdpNKzRBr8BCzLBrfefAi6hlcA0Dl5KgQBOqd3qn1OyWKtJfMOvGKHSP44iLeqbx5w/exec",
  // Shared album URL (Google Photos / Dropbox upload link). When set,
  // a QR code is generated and displayed automatically.
  ALBUM_URL: "https://drive.google.com/drive/folders/18MJf_2YCV_Ehnrs5JcUMGehYBQ-tZ6OL",
  // Live site URL for the photo QR code. Leave blank to auto-use the
  // current address; set it to the final domain once deployed if you like.
  SITE_URL: "https://eeaffairs.site",
  // Ceremony start - 2:00 PM West Africa Time.
  WEDDING_DATE: "2026-11-21T14:00:00+01:00",
  // Approximate venue coordinates (Ikorodu) - used only for the
  // "how far am I" estimate, never for navigation links.
  VENUE_LAT: 6.616,
  VENUE_LON: 3.508,
  // "always"  - the intro plays on every page load (default).
  // "session" - plays once per browser tab session.
  INTRO_MODE: "always",
};

/* ── Intro video overlay ─────────────────── */
(() => {
  const overlay = document.getElementById("intro-overlay");
  const envelopeVideo = document.getElementById("envelope-video");
  const threadVideo = document.getElementById("thread-video");
  const threadBgVideo = document.getElementById("thread-bg-video");
  const threadBgWrapper = document.getElementById("thread-bg-wrapper");
  const invitationCard = document.getElementById("invitation-card");
  const openBtn = document.getElementById("open-invitation-btn");
  const skipBtn = document.getElementById("intro-skip");

  const revealHero = () => document.body.classList.add("hero-in");
  if (!overlay || !envelopeVideo || !threadVideo) { revealHero(); return; }

  let isSeen = false;
  try { isSeen = !!localStorage.getItem("eeIntroSeen"); } catch (_) {}

  if (CONFIG.INTRO_MODE === "session" && isSeen) {
    overlay.remove();
    revealHero();
    return;
  }

  // Safety net: never keep the guest stuck behind a black screen for too long
  let failsafeTimeout = setTimeout(() => {
    finish();
  }, 35000); // 35s absolute safety net

  let state = "envelope"; // "envelope", "card", "thread", "done"
  let started = false;
  let finished = false;



  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(failsafeTimeout);
    try { localStorage.setItem("eeIntroSeen", "1"); } catch (_) {}
    overlay.classList.add("done");
    revealHero();
    setTimeout(() => overlay.remove(), 800);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", finish);
  }

  // Playback control
  const getActiveVideo = () => {
    if (state === "envelope") return envelopeVideo;
    if (state === "thread") return threadVideo;
    return null;
  };

  // Tap-to-begin fallback
  let tapBtn = null;
  const showTapButton = () => {
    if (tapBtn || started || finished || state === "card") return;
    tapBtn = document.createElement("button");
    tapBtn.id = "intro-begin";
    tapBtn.type = "button";
    tapBtn.textContent = "Tap to Begin";
    tapBtn.addEventListener("click", () => {
      const activeVid = getActiveVideo();
      if (activeVid) {
        activeVid.play().catch(finish);
        if (state === "envelope") {
          started = true;
          hideTapButton();
        }
      }
    });
    overlay.appendChild(tapBtn);
  };

  const hideTapButton = () => {
    if (tapBtn) { tapBtn.remove(); tapBtn = null; }
  };

  const tryPlay = () => {
    if (finished || state === "card") return;
    const activeVid = getActiveVideo();
    if (!activeVid) return;

    const p = activeVid.play();
    if (p && p.catch) {
      p.catch(() => {
        if (document.visibilityState === "visible") showTapButton();
      });
    }
  };

  // Visibility and focus listeners
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryPlay();
  });
  window.addEventListener("focus", tryPlay);

  // ENVELOPE PHASE
  envelopeVideo.addEventListener("playing", () => {
    started = true;
    hideTapButton();
    try { localStorage.setItem("eeIntroSeen", "1"); } catch (_) {}
  });

  envelopeVideo.addEventListener("ended", () => {
    showCard();
  });

  envelopeVideo.addEventListener("error", () => {
    showCard();
  });

  const showCard = () => {
    if (state !== "envelope") return;
    state = "card";
    hideTapButton();
    invitationCard.classList.add("visible");
  };

  // Handle open button click on invitation card
  openBtn.addEventListener("click", () => {
    if (state !== "card") return;
    invitationCard.classList.add("fade-out");
    envelopeVideo.classList.remove("active");
    
    // Transition to the gold-thread video
    state = "thread";
    threadVideo.classList.add("active");
    if (threadBgWrapper) {
      threadBgWrapper.classList.add("active");
    }

    // Attempt to play thread video
    threadVideo.play().then(() => {
      if (threadBgVideo) threadBgVideo.play().catch(() => {});
    }).catch(() => {
      finish();
    });
  });

  // THREAD PHASE
  threadVideo.addEventListener("ended", finish);
  threadVideo.addEventListener("error", finish);

  // Sync blurred background video copy for portrait viewports
  if (threadBgVideo) {
    const sync = () => {
      try {
        if (Math.abs(threadBgVideo.currentTime - threadVideo.currentTime) > 0.15) {
          threadBgVideo.currentTime = threadVideo.currentTime;
        }
      } catch (_) {}
    };
    threadVideo.addEventListener("play", () => { threadBgVideo.play().catch(() => {}); });
    threadVideo.addEventListener("playing", sync);
    threadVideo.addEventListener("seeked", sync);
    threadVideo.addEventListener("timeupdate", sync);
    threadVideo.addEventListener("pause", () => threadBgVideo.pause());
  }

  // Failsafe watchdog
  let visibleMs = 0;
  const watchdog = setInterval(() => {
    if (started || finished || state === "card") { 
      if (state === "card" || finished) {
        clearInterval(watchdog);
      }
      return; 
    }
    if (document.visibilityState === "visible") {
      visibleMs += 500;
      if (visibleMs >= 4000) showTapButton();
      if (visibleMs >= 10000) { 
        clearInterval(watchdog); 
        showCard(); 
      }
    }
  }, 500);

  // Start playing envelope video when ready
  envelopeVideo.addEventListener("canplay", tryPlay);
  tryPlay();
})();

/* ── Nav ─────────────────────────────────── */
(() => {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
})();

/* ── Countdown ───────────────────────────── */
(() => {
  const target = new Date(CONFIG.WEDDING_DATE).getTime();
  const el = {
    d: document.getElementById("cd-days"),
    h: document.getElementById("cd-hours"),
    m: document.getElementById("cd-mins"),
    s: document.getElementById("cd-secs"),
  };
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Flip-clock style: when a number changes, drop the new value in with a
  // slight vertical rotate. Seconds flip every tick, larger units rarely.
  const set = (node, val) => {
    const str = String(val);
    if (!node || node.textContent === str) return;
    node.textContent = str;
    if (reduce || !node.animate) return;
    node.animate(
      [
        { transform: "translateY(-0.45em) rotateX(55deg)", opacity: 0 },
        { transform: "translateY(0) rotateX(0deg)", opacity: 1 },
      ],
      { duration: 430, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  };
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff - mins * 60000) / 1000);
    set(el.d, days);
    set(el.h, pad(hours));
    set(el.m, pad(mins));
    set(el.s, pad(secs));
  };
  tick();
  setInterval(tick, 1000);
})();

/* ── Scroll reveals & gold rules ─────────── */
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add(
          entry.target.hasAttribute("data-rule") ? "drawn" : "revealed",
        );
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll("[data-reveal], [data-rule]").forEach((n) => io.observe(n));
})();

/* ── Soft parallax (transform-based, rAF-throttled) ─────── */
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const items = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    speed: parseFloat(el.getAttribute("data-parallax")) || 0.1,
  }));
  if (!items.length) return;

  let ticking = false;
  const apply = () => {
    const mid = window.innerHeight / 2;
    for (const { el, speed } of items) {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - mid) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
    ticking = false;
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  apply();
})();

/* ── Ambient gold petals ─────────────────── */
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "petals";
  layer.setAttribute("aria-hidden", "true");
  const rand = (min, max) => min + Math.random() * (max - min);
  for (let i = 0; i < 16; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    const size = rand(7, 14);
    p.style.left = `${rand(0, 100)}%`;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.animationDuration = `${rand(14, 28)}s`;
    p.style.animationDelay = `${-rand(0, 28)}s`; // negative → already mid-fall
    p.style.opacity = "1";
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
})();

/* ── Moments reel - flowing horizontal arc with dot navigation ──
   JS-driven so a dot can scrub the chosen photo back to centre, then
   the reel resumes its flow. Pauses on hover. */
(() => {
  const marquee = document.querySelector(".gallery__marquee");
  const track = document.getElementById("galleryTrack");
  const dotsWrap = document.getElementById("galleryDots");
  if (!marquee || !track) return;

  const originals = [...track.children];
  const N = originals.length;

  // Duplicate the set so the loop is seamless.
  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("tabindex");
    track.appendChild(clone);
  });

  // Arc layout - repeats every N items so the loop stays seamless.
  const amp = 54, rotK = 1.4;
  [...track.children].forEach((item, i) => {
    const p = i % N;
    const lift = -amp * Math.sin((Math.PI * p) / (N - 1));
    const rot = (p - (N - 1) / 2) * rotK;
    item.style.transform = `translateY(${lift.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
  });

  // One navigation dot per photo.
  const dots = [];
  for (let k = 0; k < N; k++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gallery__dot";
    b.setAttribute("aria-label", `Show photo ${k + 1}`);
    b.addEventListener("click", () => goTo(k));
    dotsWrap && dotsWrap.appendChild(b);
    dots.push(b);
  }

  let stride = 0, setWidth = 0, viewW = 0, itemW = 0;
  const measure = () => {
    const a = track.children[0].getBoundingClientRect();
    const b = track.children[1].getBoundingClientRect();
    itemW = a.width;
    stride = b.left - a.left;
    setWidth = stride * N;
    viewW = marquee.getBoundingClientRect().width;
  };

  let offset = 0;
  const SPEED = 34;          // px/sec flow
  const HOLD = 1500;         // ms hold after a dot jump
  let hovering = false, resumeAt = 0, tween = null;
  let last = performance.now();

  const norm = () => {
    if (!setWidth) return;
    while (offset <= -setWidth) offset += setWidth;
    while (offset > 0) offset -= setWidth;
  };
  const centerOffsetFor = (k) => {
    const xc = k * stride + itemW / 2;
    let target = viewW / 2 - xc;
    while (target > offset + setWidth / 2) target -= setWidth;
    while (target < offset - setWidth / 2) target += setWidth;
    return target;
  };
  const goTo = (k) => {
    if (!setWidth) measure();
    tween = { from: offset, to: centerOffsetFor(k), start: performance.now(), dur: 750 };
    track.dataset.target = tween.to.toFixed(1);
  };
  const activeIdx = () => {
    if (!stride) return 0;
    let k = Math.round((viewW / 2 - offset - itemW / 2) / stride);
    return ((k % N) + N) % N;
  };
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  let raf;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.dur);
      offset = tween.from + (tween.to - tween.from) * ease(t);
      if (t >= 1) { tween = null; resumeAt = now + HOLD; }
    } else if (!hovering && now >= resumeAt) {
      offset -= SPEED * dt;
    }
    norm();
    track.style.transform = `translateX(${offset.toFixed(2)}px)`;
    const a = activeIdx();
    dots.forEach((d, k) => d.classList.toggle("is-active", k === a));
    raf = requestAnimationFrame(frame);
  };

  const start = () => { measure(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
  marquee.addEventListener("mouseenter", () => { hovering = true; });
  marquee.addEventListener("mouseleave", () => { hovering = false; });
  window.addEventListener("resize", measure);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();

/* ── Wishes & Prayers: role gate → reveal the Padlet wall ──
   Honour-system gate so the wall stays with the aso ebi ladies,
   groomsmen, and family & friends. The Padlet only loads once a
   role is chosen (data-src → src). */
(() => {
  const gate = document.getElementById("wishesGate");
  const padlet = document.getElementById("wishesPadlet");
  if (!gate || !padlet) return;
  const iframe = padlet.querySelector("iframe");

  gate.querySelectorAll("[data-wishrole]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (iframe && iframe.dataset.src && !iframe.src) iframe.src = iframe.dataset.src;
      gate.hidden = true;
      padlet.hidden = false;
      padlet.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  // Close the wall → return to the role gate.
  const closeBtn = document.getElementById("wishesClose");
  closeBtn && closeBtn.addEventListener("click", () => {
    padlet.hidden = true;
    gate.hidden = false;
    gate.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();

/* ── RSVP ────────────────────────────────── */
(() => {
  const form = document.getElementById("rsvpForm");
  const yes = document.getElementById("rsvpYes");
  const no = document.getElementById("rsvpNo");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (CONFIG.RSVP_ENDPOINT) {
      // text/plain keeps this a CORS "simple request" (no preflight),
      // which Google Apps Script web apps accept. Fire-and-forget -
      // the confirmation slides in regardless.
      fetch(CONFIG.RSVP_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "rsvp", ...data, at: new Date().toISOString() }),
      }).catch(() => {});
    }
    try {
      const all = JSON.parse(localStorage.getItem("eeRsvps") || "[]");
      all.push({ ...data, at: new Date().toISOString() });
      localStorage.setItem("eeRsvps", JSON.stringify(all));
    } catch { /* storage unavailable - endpoint still receives it */ }

    const panel = form.closest(".rsvp__panel");
    if (panel) panel.classList.add("is-sending");
    form.classList.add("slide-out");

    // Let the paper plane fly before the confirmation lands. This is a
    // deliberate, one-shot confirmation, so it plays for everyone.
    setTimeout(() => {
      form.hidden = true;
      (data.attending === "yes" ? yes : no).hidden = false;
      if (panel) panel.classList.remove("is-sending");
    }, 1650);
  });
})();

/* ── Venue: how far am I? ────────────────── */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

(() => {
  const btn = document.getElementById("distanceBtn");
  const out = document.getElementById("venueDistance");

  btn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      out.textContent = "Location is not available in this browser. Use the map buttons above.";
      out.hidden = false;
      return;
    }
    btn.disabled = true;
    btn.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(
          pos.coords.latitude, pos.coords.longitude,
          CONFIG.VENUE_LAT, CONFIG.VENUE_LON,
        );
        let msg;
        if (km < 80) {
          msg = `You're roughly ${Math.round(km)} km from Jigiwura as the crow flies. On Lagos roads, plan generously, especially on a Saturday.`;
        } else if (km < 1500) {
          msg = `You're about ${Math.round(km)} km away, within flying or long-drive distance. See Travel & Stay below.`;
        } else {
          msg = `You're about ${Math.round(km).toLocaleString()} km from Lagos, time to look at flights! See Travel & Stay below.`;
        }
        out.textContent = msg;
        out.hidden = false;
        btn.hidden = true;
      },
      () => {
        out.textContent = "We couldn't get your location. No problem. The direction buttons above will use your live position automatically.";
        out.hidden = false;
        btn.disabled = false;
        btn.textContent = "📍 How far am I from the venue?";
      },
      { timeout: 12000, maximumAge: 300000 },
    );
  });
})();

/* ── Travel: nearest airports ────────────── */
(() => {
  const btn = document.getElementById("airportBtn");
  const results = document.getElementById("airportResults");
  const fallback = document.getElementById("airportFallback");
  const select = document.getElementById("citySelect");

  const FLIGHT_DATES = "on 2026-11-19 through 2026-11-22";
  const flightsUrl = (code) =>
    "https://www.google.com/travel/flights?q=" +
    encodeURIComponent(`Flights from ${code} to LOS ${FLIGHT_DATES}`);

  const row = (a, km) => {
    const div = document.createElement("div");
    div.className = "airport-row";
    const name = document.createElement("span");
    name.className = "airport-row__name";
    name.textContent = `${a[1]} (${a[0]})`;
    const small = document.createElement("small");
    small.textContent = a[2] + (km != null ? ` · ~${Math.round(km)} km from you` : "");
    name.appendChild(small);
    const link = document.createElement("a");
    link.href = flightsUrl(a[0]);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Flights to Lagos →";
    div.append(name, link);
    return div;
  };

  const showFallback = (message) => {
    results.innerHTML = "";
    if (message) {
      const p = document.createElement("p");
      p.className = "travel__status";
      p.textContent = message;
      results.appendChild(p);
      results.hidden = false;
    }
    fallback.hidden = false;
  };

  // Every airport (sorted by city) so a guest can pick any departure point -
  // even one they aren't currently in. A search box filters by city, airport
  // name, or code (so "Václav", "Prague", or "PRG" all find the same one).
  const search = document.getElementById("citySearch");
  const depAirports = AIRPORTS
    .filter((a) => a[0] !== "LOS")
    .slice()
    .sort((x, y) => x[2].localeCompare(y[2]));
  const renderOptions = (q) => {
    const query = (q || "").trim().toLowerCase();
    select.innerHTML = '<option value="">Select an airport…</option>';
    depAirports
      .filter((a) => !query || `${a[1]} ${a[2]} ${a[0]}`.toLowerCase().includes(query))
      .forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a[0];
        opt.textContent = `${a[2]} · ${a[1]} (${a[0]})`;
        select.appendChild(opt);
      });
  };
  renderOptions("");
  if (search) search.addEventListener("input", () => renderOptions(search.value));
  select.addEventListener("change", () => {
    const a = AIRPORTS.find((x) => x[0] === select.value);
    if (!a) return;
    results.innerHTML = "";
    results.appendChild(row(a, null));
    results.hidden = false;
  });

  btn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      showFallback("Location isn't available in this browser. Choose your departure city instead:");
      return;
    }
    btn.disabled = true;
    btn.textContent = "✈ Locating…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const ranked = AIRPORTS
          .filter((a) => a[0] !== "LOS")
          .map((a) => ({ a, km: haversineKm(latitude, longitude, a[3], a[4]) }))
          .sort((x, y) => x.km - y.km)
          .slice(0, 3);
        results.innerHTML = "";
        const intro = document.createElement("p");
        intro.className = "travel__status";
        intro.textContent = "Your nearest international airports:";
        results.appendChild(intro);
        ranked.forEach(({ a, km }) => results.appendChild(row(a, km)));
        results.hidden = false;
        fallback.hidden = false;
        btn.hidden = true;
      },
      () => {
        btn.hidden = true;
        showFallback("No location shared. No problem. Choose where you're flying from:");
      },
      { timeout: 12000, maximumAge: 600000 },
    );
  });
})();

/* ── Shots: QR code (→ upload form) + album link ───────── */
(() => {
  // The "View the shared album" link points at the Drive folder.
  const albumBtn = document.getElementById("albumBtn");
  if (albumBtn && CONFIG.ALBUM_URL) albumBtn.href = CONFIG.ALBUM_URL;

  // The QR opens the on-site upload form (this page, #shots) so scanning
  // at the reception lands a guest straight on the upload form.
  const slot = document.getElementById("qrSlot");
  if (!slot) return;
  // Build an absolute URL to upload.html. If SITE_URL is set (e.g.
  // "https://eeaffairs.site"), use it as the origin; otherwise derive the
  // current folder from the address bar. Strip any trailing file/slash so we
  // don't end up with a broken "https://upload.html".
  const base = CONFIG.SITE_URL
    ? CONFIG.SITE_URL.replace(/\/+$/, "")
    : (location.origin + location.pathname).replace(/\/[^/]*$/, "");
  const uploadUrl = base + "/upload.html";
  slot.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "QR code: scan to open the photo upload form";
  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=480x480&color=1E0E05&bgcolor=F5EDD6&data=" +
    encodeURIComponent(uploadUrl);
  slot.appendChild(img);
})();

/* ── Photo upload → Google Drive (via the Apps Script) ──────
   Each photo is read as base64 and posted on its own request
   (text/plain simple request, no preflight) so guests need no
   Google account. Fire-and-forget, so we show an optimistic
   confirmation. See RSVP-SETUP.md for the matching script. */
(() => {
  const form         = document.getElementById("photoForm");
  if (!form) return;
  const nameInput    = document.getElementById("photoName");
  const filesInput   = document.getElementById("photoFiles");
  const submitBtn    = document.getElementById("photoSubmit");
  const status       = document.getElementById("photoStatus");
  const successPanel = document.getElementById("shotsSuccess");
  const successCopy  = document.getElementById("shotsSuccessCopy");
  const uploadAgain  = document.getElementById("shotsUploadAgain");
  const dropZone     = document.getElementById("shotsDropZone");
  const chosenLabel  = document.getElementById("shotsChosenLabel");
  const endpoint     = CONFIG.RSVP_ENDPOINT;

  // Drop zone feedback
  filesInput.addEventListener("change", () => {
    const n = filesInput.files.length;
    if (n > 0) {
      chosenLabel.textContent = n === 1 ? "1 photo selected" : `${n} photos selected`;
      chosenLabel.classList.add("visible");
    } else {
      chosenLabel.classList.remove("visible");
    }
  });
  dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", ()  => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) {
      filesInput.files = e.dataTransfer.files;
      filesInput.dispatchEvent(new Event("change"));
    }
  });

  const setStatus = (msg) => { status.hidden = false; status.textContent = msg; };
  const readBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const showSuccess = (count, name) => {
    form.hidden = true;
    status.hidden = true;
    const who = name ? `, ${name}` : "";
    successCopy.textContent = count === 1
      ? `Your photo has been shared${who}. It will appear in the album shortly.`
      : `Your ${count} photos have been shared${who}. They'll appear in the album shortly.`;
    successPanel.classList.add("visible");
  };

  uploadAgain && uploadAgain.addEventListener("click", () => {
    successPanel.classList.remove("visible");
    form.hidden = false;
    form.reset();
    chosenLabel.classList.remove("visible");
    status.hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = [...filesInput.files];
    if (!files.length) return;
    if (!endpoint) { setStatus("Photo uploads aren't connected yet. Try the album link below."); return; }

    const name = nameInput ? nameInput.value.trim() : "";
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      submitBtn.textContent = `Uploading ${i + 1} of ${files.length}…`;
      setStatus(`Sending photo ${i + 1} of ${files.length}…`);
      try {
        const fileData = await readBase64(files[i]);
        await fetch(endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            type: "photo",
            name,
            fileName: files[i].name,
            mimeType: files[i].type || "image/jpeg",
            fileData,
            at: new Date().toISOString(),
          }),
        });
        ok++;
      } catch (_) { /* keep going with the rest */ }
    }
    submitBtn.disabled = false;
    submitBtn.textContent = label;
    if (ok > 0) {
      showSuccess(ok, name);
    } else {
      setStatus("Something went wrong. Please try again.");
    }
  });
})();
