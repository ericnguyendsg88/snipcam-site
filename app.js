// snipcam landing: the day deck, the AutoSnip demo, and the launch sign-up.
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Day deck: labelled like the app, opening on Today, neighbours easing
  // down to 92% from their bottom edge and fading to 78%.
  const deck = document.querySelector(".deck");
  if (deck) {
    const weekday = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toLocaleDateString(undefined, { weekday: "long" });
    };
    deck.querySelectorAll(".day").forEach((el) => {
      const n = Number(el.dataset.daysAgo);
      el.textContent = n === 0 ? "Today" : n === 1 ? "Yesterday" : weekday(n);
    });
    const cards = [...deck.querySelectorAll(".card")];
    const settle = () => {
      const mid = deck.getBoundingClientRect().left + deck.clientWidth / 2;
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const t = Math.min(Math.abs(r.left + r.width / 2 - mid) / (r.width + 26), 1);
        card.style.transform = `scale(${1 - 0.08 * t})`;
        card.style.opacity = String(1 - 0.22 * t);
      }
    };
    deck.addEventListener("scroll", () => requestAnimationFrame(settle), { passive: true });
    addEventListener("resize", settle);
    // Open on Today, the last card.
    requestAnimationFrame(() => {
      deck.scrollLeft = deck.scrollWidth;
      settle();
    });
  }

  // ── AutoSnip demo: pick a stretch, the glass window moves over the ruler,
  // and AutoSnip fills in snips from that stretch.
  const ruler = document.querySelector(".ruler");
  if (ruler) {
    const MONTHS = 24;
    // A made-up camera roll: busier summers and holidays.
    const counts = Array.from({ length: MONTHS }, (_, i) => {
      const month = (new Date().getMonth() - (MONTHS - 1 - i) + 24) % 12;
      const season = [2, 1, 2, 3, 4, 5, 8, 9, 6, 3, 4, 9][month];
      return season + ((i * 7) % 5);
    });
    const peak = Math.max(...counts);
    const windowEl = ruler.querySelector(".window");
    counts.forEach((c) => {
      const bar = document.createElement("span");
      bar.style.height = `${Math.max(8, (c / peak) * 100)}%`;
      ruler.insertBefore(bar, windowEl);
    });

    const monthDate = (i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (MONTHS - 1 - i));
      return d;
    };
    const fmt = (d, withYear) => d.toLocaleDateString(undefined, withYear ? { month: "short", year: "numeric" } : { month: "short" });
    document.querySelector(".ruler-start").textContent = fmt(monthDate(0), true);

    const label = document.querySelector(".range-label");
    const count = document.querySelector(".range-count");
    const snips = document.querySelector(".snips");
    const photos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `assets/moments/moment-${String(n).padStart(2, "0")}.jpg`);
    let range = [0, 0];

    const show = ([a, b]) => {
      range = [a, b];
      const pct = 100 / MONTHS;
      windowEl.style.left = `calc(${a * pct}% - 4px)`;
      windowEl.style.width = `calc(${(b - a + 1) * pct}% + 4px)`;
      const first = monthDate(a), last = monthDate(b);
      const sameYear = first.getFullYear() === last.getFullYear();
      label.textContent = a === b ? fmt(first, true) : `${fmt(first, !sameYear)} – ${fmt(last, true)}`;
      const videos = counts.slice(a, b + 1).reduce((s, c) => s + c, 0);
      count.textContent = `· ${videos} videos`;
      snips.innerHTML = "";
    };

    const presets = {
      month: () => [MONTHS - 1, MONTHS - 1],
      three: () => [MONTHS - 3, MONTHS - 1],
      yearago: () => [MONTHS - 13, MONTHS - 13],
      surprise: () => {
        const start = Math.floor(Math.random() * (MONTHS - 3));
        return [start, start + 2];
      },
    };
    const chips = [...document.querySelectorAll(".chip")];
    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        show(presets[chip.dataset.preset]());
      })
    );
    show(presets.surprise());

    let running = false;
    document.getElementById("autosnip-go").addEventListener("click", async () => {
      if (running) return;
      running = true;
      snips.innerHTML = "";
      // Snips drawn from the chosen stretch: a stable pick per range.
      const seed = range[0] * 31 + range[1];
      const picks = Array.from({ length: 6 }, (_, i) => photos[(seed + i * 3) % photos.length]);
      for (const src of picks) {
        const tile = document.createElement("div");
        tile.className = "snip";
        tile.innerHTML = `<img src="${src}" alt="">`;
        snips.appendChild(tile);
        requestAnimationFrame(() => tile.classList.add("in"));
        if (!reduceMotion) await new Promise((r) => setTimeout(r, 260));
      }
      running = false;
    });
  }

  // ── Launch sign-up. With an endpoint set on the form (data-endpoint), the
  // address is posted there; without one, the visitor's mail app opens a
  // ready-made message instead, so nothing is collected silently.
  document.querySelectorAll("form.notify").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = form.querySelector("input[type=email]");
      const email = input.value.trim();
      if (!input.checkValidity() || !email) {
        input.focus();
        input.reportValidity?.();
        return;
      }
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, source: "snipcam-landing" }),
          });
          if (!res.ok) throw new Error(String(res.status));
        } catch {
          alert("That didn’t go through. Please try again in a moment.");
          return;
        }
      } else {
        const subject = encodeURIComponent("Tell me when snipcam launches");
        const body = encodeURIComponent(`Please email me at ${email} when snipcam is on the App Store.`);
        location.href = `mailto:ericnguyendsg@gmail.com?subject=${subject}&body=${body}`;
      }
      form.classList.add("sent");
    });
  });

  // ── Sections rise in as they arrive.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("shown"); io.unobserve(e.target); }
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
