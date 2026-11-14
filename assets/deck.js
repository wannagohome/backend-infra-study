/* ==========================================================================
   deck.js — zero-dependency slide engine for the 백엔드 & 인프라 study decks.
   Works from file:// (no modules, no fetch). Writer guide: _design/COMPONENTS.md
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Canonical learning stack (bottom → top). Edit here only. ---------- */
  var STACK = [
    { no: 1,  name: "컴퓨터 구조와 운영체제",   file: "01-os.html",                    desc: "CPU, 메모리, 프로세스와 스레드, 동기화, I/O" },
    { no: 2,  name: "네트워크",               file: "02-network.html",               desc: "TCP/IP, DNS, HTTP, TLS" },
    { no: 3,  name: "자료구조와 알고리즘",     file: "03-data-structures.html",       desc: "복잡도, 해시, 트리, 정렬, 그래프" },
    { no: 4,  name: "데이터베이스",           file: "04-database.html",              desc: "인덱스, 트랜잭션, 격리 수준, 복제" },
    { no: 5,  name: "Java와 JVM",            file: "05-java-jvm.html",              desc: "JVM, GC, 컬렉션, 동시성" },
    { no: 6,  name: "Spring과 JPA",          file: "06-spring-jpa.html",            desc: "DI, AOP, 트랜잭션, 영속성 컨텍스트" },
    { no: 7,  name: "웹 API 설계와 보안",      file: "07-api-security.html",          desc: "REST, 인증과 인가, 웹 취약점" },
    { no: 8,  name: "대규모 시스템 설계",      file: "08-system-design.html",         desc: "확장, 캐시, 메시지 큐, 분산 트랜잭션" },
    { no: 9,  name: "Linux, 컨테이너, 배포",   file: "09-linux-container-deploy.html", desc: "Linux, Docker, Kubernetes, CI/CD" },
    { no: 10, name: "AWS 핵심 서비스",         file: "10-aws-fundamentals.html",      desc: "IAM, VPC, EC2, ELB, S3, RDS" },
    { no: 11, name: "AWS 아키텍처와 운영",      file: "11-aws-architecture-ops.html",  desc: "고가용성, 관측성, 장애 대응, 비용" }
  ];
  var DEPTH = {
    basic:    { label: "기초", level: 1 },
    core:     { label: "원리", level: 2 },
    practice: { label: "실무", level: 3 }
  };
  window.DECK_STACK = STACK;
  window.DECK_DEPTH = DEPTH;

  var doc = document, root = doc.documentElement;
  /* Mode choice is by readability, not width alone: use the vertical scroll
     layout when the scaled 1600x900 stage would render body text (26px) below
     MIN_BODY_PX, or when the viewport is too short (phone landscape). */
  var MIN_BODY_PX = 14, MIN_STAGE_H = 560, HUD_H = 48;
  function wantScrollMode() {
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    var s = Math.min(w / 1600, (h - HUD_H) / 900);
    return h < MIN_STAGE_H || 26 * s < MIN_BODY_PX;
  }
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Theme (works on any page, incl. index) ---------------------------- */
  function storedTheme() { try { return localStorage.getItem("deck-theme"); } catch (e) { return null; } }
  function storeTheme(v) { try { localStorage.setItem("deck-theme", v); } catch (e) {} }
  var t0 = storedTheme();
  if (t0 === "light" || t0 === "dark") root.setAttribute("data-theme", t0);
  function toggleTheme() {
    var cur = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    storeTheme(next);
  }
  window.DECK_TOGGLE_THEME = toggleTheme;

  /* ---- Helpers ------------------------------------------------------------ */
  function el(tag, cls, html) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/></svg>',
    theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  function depthMarkup(key, withLabel) {
    var d = DEPTH[key];
    var attr = d ? ' data-depth="' + key + '"' : "";
    return '<span class="depth"' + attr + '><span class="depth__ticks" aria-hidden="true"><i></i><i></i><i></i></span>' +
      (withLabel !== false ? '<span class="depth__label">' + (d ? d.label : "") + "</span>" : "") + "</span>";
  }

  /* ---- Stack map renderer (cover, index, mini) -------------------------- */
  function renderStackmaps(scope) {
    var maps = (scope || doc).querySelectorAll(".stackmap");
    Array.prototype.forEach.call(maps, function (map) {
      if (map.querySelector(".stackmap__list")) return; // hand-written markup wins
      var cur = parseInt(map.getAttribute("data-current"), 10) || 0;
      var links = map.hasAttribute("data-links");
      var tag = map.getAttribute("data-tag") || "이 장";
      var ol = el("ol", "stackmap__list");
      STACK.forEach(function (layer, i) {
        var li = el("li", "stackmap__layer");
        li.style.setProperty("--i", i);
        if (cur) li.classList.add(layer.no < cur ? "is-below" : layer.no === cur ? "is-current" : "is-above");
        var inner = '<span class="stackmap__no">' + layer.no + '</span><span class="stackmap__name">' + esc(layer.name) + "</span>" +
          '<span class="stackmap__tag">' + esc(tag) + "</span>" +
          '<span class="stackmap__desc">' + esc(layer.desc) + "</span>";
        if (links) {
          li.innerHTML = '<a href="' + esc(layer.file) + '"' + (layer.no === cur ? ' aria-current="page"' : "") + ">" + inner + "</a>";
        } else {
          li.innerHTML = inner;
        }
        if (layer.no === cur) li.setAttribute("aria-current", "step");
        ol.appendChild(li);
      });
      if (!map.hasAttribute("aria-label") && !map.classList.contains("stackmap--mini")) {
        map.setAttribute("aria-label", "학습 스택" + (cur ? ": " + cur + "단계 " + STACK[cur - 1].name + " 위치" : ""));
      }
      if (map.classList.contains("stackmap--mini")) map.setAttribute("aria-hidden", "true");
      map.appendChild(ol);
    });
  }
  window.DECK_RENDER_STACKMAPS = renderStackmaps;

  /* ---- SVG marker defs (shared by every .dg diagram) -------------------- */
  function injectDefs() {
    if (doc.getElementById("dg-arr")) return;
    var ns = "http://www.w3.org/2000/svg";
    var svg = doc.createElementNS(ns, "svg");
    svg.setAttribute("class", "dg-defs");
    svg.setAttribute("aria-hidden", "true");
    function marker(id, cls, start) {
      var path = start ? "M10,0 L0,5 L10,10 z" : "M0,0 L10,5 L0,10 z";
      return '<marker id="' + id + '" viewBox="0 0 10 10" refX="' + (start ? 1 : 9) + '" refY="5" markerWidth="5" markerHeight="5" orient="auto" markerUnits="strokeWidth">' +
        '<path class="' + cls + '" d="' + path + '"/></marker>';
    }
    svg.innerHTML = "<defs>" +
      marker("dg-arr", "m-ink") + marker("dg-arr-flow", "m-flow") + marker("dg-arr-key", "m-key") +
      marker("dg-arr-start", "m-ink", true) + marker("dg-arr-flow-start", "m-flow", true) + "</defs>";
    doc.body.insertBefore(svg, doc.body.firstChild);
  }

  /* ---- Deck --------------------------------------------------------------- */
  function initDeck(deck) {
    var slides = Array.prototype.slice.call(deck.querySelectorAll(".slide"));
    if (!slides.length) return;

    var stage = el("div", "stage");
    var frames = [];
    var meta = [];
    var lastSection = "", lastDepth = "";
    slides.forEach(function (s, i) {
      var f = el("div", "frame");
      var clip = el("div", "frame-clip");
      s.parentNode.insertBefore(f, s);
      clip.appendChild(s);
      f.appendChild(clip);
      stage.appendChild(f);
      var isCover = s.classList.contains("slide--cover");
      if (s.hasAttribute("data-section")) lastSection = s.getAttribute("data-section");
      var depth = s.getAttribute("data-depth");
      if (depth) { if (depth !== "none") lastDepth = depth; }
      else depth = isCover ? "none" : lastDepth;
      var titleEl = s.querySelector("h1, h2, .slide__title");
      var title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, " ") : "";
      meta.push({ section: isCover ? "" : lastSection, depth: DEPTH[depth] ? depth : "", title: title });
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "슬라이드");
      s.setAttribute("aria-label", (i + 1) + " / " + slides.length + (title ? ": " + title : ""));
      s.id = s.id || "s" + (i + 1);
      var cap = el("div", "frame__cap", "<b>" + (i + 1) + "</b><span class=\"frame__title\">" + esc(title) + "</span>" +
        (meta[i].depth ? depthMarkup(meta[i].depth, false) : ""));
      cap.setAttribute("aria-hidden", "true");
      f.appendChild(cap);
      frames.push(f);
    });
    deck.appendChild(stage);

    var total = frames.length;
    var chapterNo = parseInt(deck.getAttribute("data-chapter"), 10) || 0;
    var chapterTitle = deck.getAttribute("data-chapter-title") ||
      (chapterNo && STACK[chapterNo - 1] ? STACK[chapterNo - 1].name : doc.title);

    /* HUD */
    var progress = el("div", "hud__progress", "<span></span>");
    var hud = el("nav", "hud");
    hud.setAttribute("aria-label", "슬라이드 탐색");
    hud.innerHTML =
      '<div class="hud__where"><span class="hud__chapter">' + (chapterNo ? chapterNo + "장 " : "") + esc(chapterTitle) + "</span>" +
      '<span class="hud__section"></span></div>' +
      '<span class="hud__depth"></span>' +
      '<span class="hud__count" aria-live="polite"></span>' +
      '<div class="hud__btns">' +
      '<button class="hud__btn" data-act="prev" aria-label="이전 슬라이드" title="이전 (←)">' + ICON.prev + "</button>" +
      '<button class="hud__btn" data-act="next" aria-label="다음 슬라이드" title="다음 (→)">' + ICON.next + "</button>" +
      '<button class="hud__btn" data-act="overview" aria-label="전체 보기" aria-pressed="false" title="전체 보기 (O)">' + ICON.grid + "</button>" +
      '<button class="hud__btn" data-act="theme" aria-label="밝기 테마 전환" title="테마 전환 (T)">' + ICON.theme + "</button>" +
      '<button class="hud__btn" data-act="fullscreen" aria-label="전체 화면" title="전체 화면 (F)">' + ICON.full + "</button>" +
      "</div>";
    var edgePrev = el("button", "edge edge--prev", ICON.prev);
    var edgeNext = el("button", "edge edge--next", ICON.next);
    edgePrev.setAttribute("aria-label", "이전 슬라이드"); edgePrev.tabIndex = -1;
    edgeNext.setAttribute("aria-label", "다음 슬라이드"); edgeNext.tabIndex = -1;
    doc.body.appendChild(progress);
    doc.body.appendChild(edgePrev);
    doc.body.appendChild(edgeNext);
    doc.body.appendChild(hud);

    var $section = hud.querySelector(".hud__section");
    var $depth = hud.querySelector(".hud__depth");
    var $count = hud.querySelector(".hud__count");
    var $bar = progress.firstChild;
    var $prev = hud.querySelector('[data-act="prev"]');
    var $next = hud.querySelector('[data-act="next"]');
    var $ov = hud.querySelector('[data-act="overview"]');

    var current = -1;
    var overview = false;
    var scrollMode = false;

    function hashIndex() {
      var m = /^#(\d+)$/.exec(location.hash);
      if (!m) return 0;
      return Math.min(total - 1, Math.max(0, parseInt(m[1], 10) - 1));
    }

    function updateChrome() {
      var m = meta[current];
      $section.textContent = m.section;
      $section.style.display = m.section ? "" : "none";
      $depth.innerHTML = m.depth ? depthMarkup(m.depth) : "";
      $depth.title = m.depth ? "깊이: " + DEPTH[m.depth].label : "";
      $count.innerHTML = "<b>" + (current + 1) + "</b> / " + total;
      $bar.style.width = ((current + 1) / total * 100) + "%";
      $prev.disabled = current === 0;
      $next.disabled = current === total - 1;
    }

    function go(i, opts) {
      opts = opts || {};
      i = Math.min(total - 1, Math.max(0, i));
      if (i === current && !opts.force) return;
      if (current >= 0) frames[current].classList.remove("is-active");
      current = i;
      frames[current].classList.add("is-active");
      updateChrome();
      var h = "#" + (current + 1);
      if (location.hash !== h) {
        try { history.replaceState(null, "", h); } catch (e) { location.hash = h; }
      }
      if (scrollMode && opts.scroll !== false) {
        frames[current].scrollIntoView({ behavior: REDUCED.matches ? "auto" : "smooth", block: "start" });
      }
      if (overview && opts.scroll !== false) {
        frames[current].scrollIntoView({ block: "nearest" });
      }
    }
    function step(d) { go(current + d); }

    /* scaling */
    function fit() {
      if (scrollMode || overview) { stage.style.transform = ""; return; }
      var w = deck.clientWidth, h = deck.clientHeight;
      var s = Math.min(w / 1600, h / 900);
      stage.style.transform = "scale(" + s + ") translate(-50%, -50%)";
    }
    function fitThumbs() {
      if (!overview) return;
      frames.forEach(function (f) {
        f.style.setProperty("--thumb-scale", (f.clientWidth / 1600).toFixed(4));
      });
    }

    function setOverview(on) {
      if (scrollMode) on = false;
      overview = on;
      root.classList.toggle("is-overview", on);
      $ov.setAttribute("aria-pressed", String(on));
      frames.forEach(function (f, i) {
        if (on) { f.tabIndex = 0; f.setAttribute("role", "button"); f.setAttribute("aria-label", (i + 1) + "번 슬라이드로 이동: " + meta[i].title); }
        else { f.removeAttribute("tabindex"); f.removeAttribute("role"); f.removeAttribute("aria-label"); }
      });
      fit();
      fitThumbs();
      if (on) { frames[current].scrollIntoView({ block: "center" }); frames[current].focus({ preventScroll: true }); }
    }

    /* scroll mode: tables scroll sideways inside their own box. A table can't be
       its own scroller without losing full width, so wrap it (scroll mode only;
       the stage-mode DOM stays untouched). */
    var tables = Array.prototype.slice.call(deck.querySelectorAll("table.compare"));
    function wrapTables(on) {
      tables.forEach(function (t) {
        var p = t.parentNode, wrapped = p.classList && p.classList.contains("compare-wrap");
        if (on && !wrapped) {
          var w = el("div", "compare-wrap");
          p.insertBefore(w, t); w.appendChild(t);
        } else if (!on && wrapped) {
          p.parentNode.insertBefore(t, p); p.parentNode.removeChild(p);
        }
      });
    }

    function setScrollMode(on) {
      scrollMode = on;
      wrapTables(on);
      root.classList.toggle("is-scroll", on);
      if (on && overview) setOverview(false);
      fit();
      if (on) requestAnimationFrame(function () { frames[current].scrollIntoView({ block: "start" }); });
    }

    function toggleFullscreen() {
      if (!doc.fullscreenElement) { (root.requestFullscreen ? root.requestFullscreen() : Promise.reject()).catch(function () {}); }
      else if (doc.exitFullscreen) doc.exitFullscreen();
    }

    /* events */
    hud.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "prev") step(-1);
      else if (a === "next") step(1);
      else if (a === "overview") setOverview(!overview);
      else if (a === "theme") toggleTheme();
      else if (a === "fullscreen") toggleFullscreen();
    });
    edgePrev.addEventListener("click", function () { step(-1); });
    edgeNext.addEventListener("click", function () { step(1); });
    frames.forEach(function (f, i) {
      f.addEventListener("click", function () { if (overview) { go(i, { scroll: false }); setOverview(false); } });
    });

    doc.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var k = e.key;
      var onControl = t && t.closest && t.closest("button, a, summary");
      if (overview) {
        if (k === "Escape" || k === "o" || k === "O") { e.preventDefault(); setOverview(false); return; }
        if (k === "Enter" && t && t.classList && t.classList.contains("frame")) { e.preventDefault(); go(frames.indexOf(t), { scroll: false }); setOverview(false); return; }
      }
      switch (k) {
        case "ArrowRight": case "PageDown":
          e.preventDefault(); step(1); break;
        case "ArrowLeft": case "PageUp":
          e.preventDefault(); step(-1); break;
        case "ArrowDown": case "ArrowUp":
          if (scrollMode) return;               // let the page scroll natively
          e.preventDefault(); step(k === "ArrowDown" ? 1 : -1); break;
        case " ":
          if (onControl || scrollMode) return;  // space activates focused controls / scrolls
          e.preventDefault(); step(e.shiftKey ? -1 : 1); break;
        case "Home": e.preventDefault(); go(0); break;
        case "End": e.preventDefault(); go(total - 1); break;
        case "o": case "O": e.preventDefault(); setOverview(!overview); break;
        case "t": case "T": e.preventDefault(); toggleTheme(); break;
        case "f": case "F": e.preventDefault(); toggleFullscreen(); break;
        default: return;
      }
      if (overview) frames[current].focus({ preventScroll: false });
    });

    window.addEventListener("hashchange", function () { pinned = -1; go(hashIndex()); });

    /* resize / rotation: re-pick the mode, then refit */
    var resizeQueued = false;
    function onResize() {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(function () {
        resizeQueued = false;
        var want = wantScrollMode();
        if (want !== scrollMode) setScrollMode(want);
        fit(); fitThumbs();
      });
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    /* scroll mode: the current slide is the last one whose top has passed a
       line 30% down the viewport (the last slide once the page bottom is hit) */
    var pinned = -1;      // deep-link target held until the reader interacts
    function unpin() { pinned = -1; }
    ["wheel", "touchstart", "mousedown", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, unpin, { passive: true, capture: true });
    });
    var trackQueued = false;
    function track() {
      trackQueued = false;
      if (!scrollMode || pinned >= 0) return;
      var line = root.clientHeight * 0.3, idx = 0;
      if (window.scrollY + root.clientHeight >= root.scrollHeight - 2) idx = total - 1;
      else {
        for (var i = 0; i < total; i++) {
          if (frames[i].getBoundingClientRect().top <= line) idx = i; else break;
        }
      }
      go(idx, { scroll: false });
    }
    window.addEventListener("scroll", function () {
      if (!scrollMode || trackQueued) return;
      trackQueued = true;
      requestAnimationFrame(track);
    }, { passive: true });

    /* stage mode: swipe left / right on touch screens. Ignored when it starts
       inside something that scrolls sideways (tables, code, figures), in a
       form field, with two fingers, or while the page is pinch-zoomed. */
    function inHScroller(n) {
      for (; n && n.nodeType === 1 && n !== deck; n = n.parentElement) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable) return true;
        if (n.scrollWidth > n.clientWidth + 1) {
          var ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
      }
      return false;
    }
    var sw = null;
    deck.addEventListener("touchstart", function (e) {
      sw = null;
      if (scrollMode || overview || e.touches.length !== 1) return;
      if (window.visualViewport && window.visualViewport.scale > 1.05) return;
      if (inHScroller(e.target)) return;
      sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }, { passive: true });
    deck.addEventListener("touchmove", function (e) { if (e.touches.length > 1) sw = null; }, { passive: true });
    deck.addEventListener("touchcancel", function () { sw = null; }, { passive: true });
    deck.addEventListener("touchend", function (e) {
      if (!sw) return;
      var p = e.changedTouches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y, dt = Date.now() - sw.t;
      sw = null;
      if (dt > 800 || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });

    /* scroll mode: give each diagram a minimum width so its smallest label
       stays >= ~10px on screen; the figure then scrolls sideways instead */
    Array.prototype.forEach.call(deck.querySelectorAll("svg.dg"), function (svg) {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (!vb || !vb.width) return;
      var minFs = Infinity;
      Array.prototype.forEach.call(svg.querySelectorAll("text"), function (t) {
        var fs = parseFloat(getComputedStyle(t).fontSize);
        if (fs && fs < minFs) minFs = fs;
      });
      if (!isFinite(minFs)) return;
      minFs = Math.max(minFs, 13);   // a stray tiny annotation must not blow the width up
      var minW = Math.round(Math.min(vb.width, vb.width * 10 / minFs));
      svg.style.setProperty("--dg-min-w", minW + "px");
    });

    /* print: show every answer */
    window.addEventListener("beforeprint", function () {
      Array.prototype.forEach.call(deck.querySelectorAll(".selfcheck details"), function (d) {
        if (!d.open) { d.open = true; d.setAttribute("data-print-opened", ""); }
      });
    });
    window.addEventListener("afterprint", function () {
      Array.prototype.forEach.call(deck.querySelectorAll("[data-print-opened]"), function (d) { d.open = false; d.removeAttribute("data-print-opened"); });
    });

    /* writer aid: flag slides whose content exceeds the 1600x900 stage */
    function checkOverflow() {
      if (scrollMode) return;
      slides.forEach(function (s, i) {
        var over = s.scrollHeight > s.clientHeight + 2 || s.scrollWidth > s.clientWidth + 2;
        s.classList.toggle("is-overflowing", over);
        if (over && window.console) console.warn("[deck] slide " + (i + 1) + " overflows the stage: " + meta[i].title);
      });
    }

    var deepLink = /^#\d+$/.test(location.hash);
    setScrollMode(wantScrollMode());
    go(hashIndex(), { force: true, scroll: false });
    if (deepLink) pinned = current;   // deep link: keep it in view while fonts/layout settle
    function settle() {
      if (pinned >= 0 && scrollMode) { frames[pinned].scrollIntoView({ block: "start" }); go(pinned, { scroll: false }); }
    }
    if (scrollMode) requestAnimationFrame(function () { frames[current].scrollIntoView({ block: "start" }); });
    fit();
    window.addEventListener("load", settle);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fit(); fitThumbs(); checkOverflow(); settle(); });
    else checkOverflow();
  }

  function boot() {
    injectDefs();
    renderStackmaps();
    var deck = doc.querySelector(".deck");
    if (deck) initDeck(deck);
    else {
      // non-deck pages (e.g. index.html): still offer 't' theme toggle
      doc.addEventListener("keydown", function (e) {
        if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) toggleTheme();
      });
    }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
