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
    { no: 9,  name: "Linux와 컨테이너", file: "09-linux-container.html", desc: "Linux 운영, Docker, 이미지, 컨테이너 네트워크" },
    { no: 10, name: "Kubernetes", file: "10-kubernetes.html", desc: "Pod, 워크로드, Service, 스케줄링, 오토스케일링" },
    { no: 11, name: "CI/CD와 IaC", file: "11-cicd-iac.html", desc: "파이프라인, 배포 전략, GitOps, Terraform" },
    { no: 12, name: "AWS 기초와 IAM", file: "12-aws-iam.html", desc: "글로벌 인프라, 계정, IAM, STS, Organizations" },
    { no: 13, name: "AWS 네트워킹", file: "13-aws-network.html", desc: "VPC, 라우팅, ELB, Route 53, 하이브리드 연결" },
    { no: 14, name: "AWS 컴퓨팅", file: "14-aws-compute.html", desc: "EC2, EBS, Auto Scaling, ECR, ECS, EKS, Fargate" },
    { no: 15, name: "AWS 스토리지와 데이터베이스", file: "15-aws-data.html", desc: "S3, EFS, RDS, Aurora, DynamoDB, ElastiCache" },
    { no: 16, name: "AWS 엣지와 보안", file: "16-aws-edge-security.html", desc: "CloudFront, WAF, Shield, ACM, KMS, CloudTrail" },
    { no: 17, name: "AWS 서버리스와 메시징", file: "17-aws-serverless-messaging.html", desc: "Lambda, API Gateway, SQS, SNS, EventBridge, Kinesis" },
    { no: 18, name: "AWS 아키텍처와 운영", file: "18-aws-architecture-ops.html", desc: "고가용성, DR, 관측성, 장애 대응, 비용" }
  ];
  /* Two bundles of the stack, shown as small headings on cover/index maps.
     `from`/`to` are inclusive layer numbers in STACK. */
  var GROUPS = [
    { from: 1, to: 8,  label: "CS·백엔드" },
    { from: 9, to: 18, label: "인프라·AWS" }
  ];
  var DEPTH = {
    basic:    { label: "기초", level: 1 },
    core:     { label: "원리", level: 2 },
    practice: { label: "실무", level: 3 }
  };
  window.DECK_STACK = STACK;
  window.DECK_GROUPS = GROUPS;
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
  var INDEX_URL = "index.html";

  /* small-screen reading style: "page" (one slide at a time, tap to turn) or
     "scroll" (all slides as one long document). Stored per browser. */
  function storedRead() { try { return localStorage.getItem("deck-read") === "scroll" ? "scroll" : "page"; } catch (e) { return "page"; } }
  function storeRead(v) { try { localStorage.setItem("deck-read", v); } catch (e) {} }
  function hintSeen() { try { return localStorage.getItem("deck-taphint") === "1"; } catch (e) { return false; } }
  function storeHintSeen() { try { localStorage.setItem("deck-taphint", "1"); } catch (e) {} }

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
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    /* three-step stack, widest at the bottom like the stack map; middle = "you are here" */
    toc: '<svg class="ico-stack" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="16.5" width="17" height="3.5" rx="0.75"/><rect class="is-cur" x="3.5" y="10.75" width="13.5" height="3.5" rx="0.75"/><rect x="3.5" y="5" width="10" height="3.5" rx="0.75"/></svg>',
    caret: '<svg class="hud__caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14.5l5-5 5 5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
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
      var mini = map.classList.contains("stackmap--mini");
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
        /* group heading sits above the group's top layer (list is column-reverse,
           so it is appended right after that layer) */
        if (mini) return;
        GROUPS.forEach(function (g) {
          if (g.to !== layer.no) return;
          var gi = el("li", "stackmap__group");
          gi.setAttribute("aria-hidden", "true");
          gi.style.setProperty("--i", i);
          if (layer.no === STACK.length) gi.classList.add("is-top");
          else if (cur && cur > layer.no) gi.classList.add("is-below");
          gi.innerHTML = '<span class="stackmap__group-label">' + esc(g.label) + "</span>" +
            '<span class="stackmap__group-range">' + g.from + "–" + g.to + "장</span>";
          ol.appendChild(gi);
        });
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
    var chapterLabel = (chapterNo ? chapterNo + "장 " : "") + chapterTitle;
    hud.innerHTML =
      '<a class="hud__btn hud__toc" href="' + INDEX_URL + '" aria-label="전체 목차" title="전체 목차 (H)">' + ICON.toc + "</a>" +
      '<div class="hud__where"><button class="hud__chap" type="button" data-act="sheet" aria-haspopup="dialog" aria-expanded="false" aria-controls="deck-sheet" title="장 목록 (M)">' +
      '<span class="hud__chapter">' + (chapterNo
        ? '<span class="hud__chno">' + chapterNo + '장</span><span class="hud__chname"> ' + esc(chapterTitle) + "</span>"
        : '<span class="hud__chno">' + esc(chapterTitle) + "</span>") + "</span>" +
      '<span class="hud__section"></span>' + ICON.caret + "</button></div>" +
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

    var $chap = hud.querySelector(".hud__chap");

    /* tap feedback: a short flow-colored glow on the side that was tapped */
    var glowPrev = el("div", "tapglow tapglow--prev"), glowNext = el("div", "tapglow tapglow--next");
    glowPrev.setAttribute("aria-hidden", "true"); glowNext.setAttribute("aria-hidden", "true");
    doc.body.appendChild(glowPrev); doc.body.appendChild(glowNext);

    var current = -1;
    var overview = false;
    var scrollMode = false;   // small screen: reflowed layout (.is-scroll)
    var pageMode = false;     // small screen + "넘겨보기": one slide at a time (.is-page)

    /* sections of this chapter, for the chapter sheet */
    var sections = [{ name: "표지", no: "", start: 0 }];
    slides.forEach(function (s, i) {
      if (i === 0 || !s.hasAttribute("data-section")) return;
      var name = s.getAttribute("data-section");
      if (name === sections[sections.length - 1].name) return;
      var noEl = s.classList.contains("slide--divider") && s.querySelector(".divider__no");
      sections.push({ name: name, no: noEl ? noEl.textContent.trim() : "", start: i });
    });
    sections.forEach(function (sec, k) { sec.end = k + 1 < sections.length ? sections[k + 1].start - 1 : slides.length - 1; });

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
      var from = current;
      if (current >= 0) frames[current].classList.remove("is-active");
      current = i;
      var f = frames[current];
      f.classList.add("is-active");
      updateChrome();
      var h = "#" + (current + 1);
      if (location.hash !== h) {
        try { history.replaceState(null, "", h); } catch (e) { location.hash = h; }
      }
      if (pageMode) {
        f.scrollTop = 0;                       // each slide starts at its top
        f.classList.remove("is-enter-next", "is-enter-prev");
        if (from >= 0 && from !== current && !REDUCED.matches) {
          void f.offsetWidth;                  // restart the animation
          f.classList.add(current > from ? "is-enter-next" : "is-enter-prev");
        }
        return;
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

    /* pick the layout: stage (desktop), page (small screen, one slide at a time)
       or continuous scroll (small screen, reader's choice) */
    function setLayout(narrow, page) {
      if (narrow === scrollMode && page === pageMode) return;
      var wasNarrow = scrollMode;
      scrollMode = narrow;
      pageMode = narrow && page;
      if (narrow !== wasNarrow) wrapTables(narrow);
      root.classList.toggle("is-scroll", narrow);
      root.classList.toggle("is-page", pageMode);
      if (narrow && overview) setOverview(false);
      fit();
      updateModeToggle();
      if (current < 0) return;
      if (pageMode) {
        window.scrollTo(0, 0);
        frames[current].scrollTop = 0;
        maybeShowHint();
      } else if (narrow) {
        requestAnimationFrame(function () { frames[current].scrollIntoView({ block: "start" }); });
      }
    }
    function applyLayout() { setLayout(wantScrollMode(), storedRead() === "page"); }

    function toggleFullscreen() {
      if (!doc.fullscreenElement) { (root.requestFullscreen ? root.requestFullscreen() : Promise.reject()).catch(function () {}); }
      else if (doc.exitFullscreen) doc.exitFullscreen();
    }

    /* ---- chapter sheet: back to index, sections, all chapters, reading style.
       A bottom sheet on small screens, a panel above the HUD on the stage. */
    var sheet = el("div", "sheet");
    sheet.id = "deck-sheet";
    sheet.hidden = true;
    var secItems = sections.map(function (sec, k) {
      var range = sec.start === sec.end ? String(sec.start + 1) : (sec.start + 1) + "–" + (sec.end + 1);
      return '<li><button type="button" class="sheet__sec" data-go="' + sec.start + '" data-k="' + k + '">' +
        '<span class="sheet__sec-no">' + esc(sec.no) + "</span>" +
        '<span class="sheet__sec-name">' + esc(sec.name) + "</span>" +
        '<span class="sheet__sec-at" aria-label="슬라이드 ' + range + '">' + range + "</span></button></li>";
    }).join("");
    sheet.innerHTML =
      '<div class="sheet__scrim" data-close></div>' +
      '<div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="deck-sheet-title">' +
      '<div class="sheet__grip" aria-hidden="true"></div>' +
      '<div class="sheet__head"><h2 id="deck-sheet-title">' + esc(chapterLabel) + "</h2>" +
      '<button type="button" class="hud__btn sheet__close" data-close aria-label="닫기" title="닫기 (Esc)">' + ICON.close + "</button></div>" +
      '<div class="sheet__body">' +
      '<a class="sheet__home" href="' + INDEX_URL + '">' + ICON.toc + '<span class="sheet__home-text">전체 목차로</span><span class="sheet__home-sub">18개 장 학습 지도</span></a>' +
      '<div class="sheet__mode"><span class="sheet__mode-label" id="deck-sheet-mode">읽는 방식</span>' +
      '<div class="seg" role="group" aria-labelledby="deck-sheet-mode">' +
      '<button type="button" data-read="page" aria-pressed="false">넘겨보기</button>' +
      '<button type="button" data-read="scroll" aria-pressed="false">이어보기</button></div></div>' +
      '<h3 class="sheet__h">이 장의 구성</h3><ol class="sheet__secs">' + secItems + "</ol>" +
      '<h3 class="sheet__h">다른 장으로</h3>' +
      '<nav class="stackmap stackmap--sheet" data-links data-tag="지금"' + (chapterNo ? ' data-current="' + chapterNo + '"' : "") + ' aria-label="전체 장"></nav>' +
      "</div></div>";
    doc.body.appendChild(sheet);
    renderStackmaps(sheet);
    var sheetPanel = sheet.querySelector(".sheet__panel");
    var sheetBody = sheet.querySelector(".sheet__body");
    var sheetReturn = null;

    function updateModeToggle() {
      Array.prototype.forEach.call(sheet.querySelectorAll("[data-read]"), function (b) {
        b.setAttribute("aria-pressed", String((b.getAttribute("data-read") === "page") === pageMode));
      });
    }
    function sheetFocusables() {
      return Array.prototype.filter.call(sheetPanel.querySelectorAll("a[href], button:not([disabled])"), function (n) {
        return n.getClientRects().length > 0;
      });
    }
    function sheetOpen() { return !sheet.hidden; }
    function openSheet() {
      if (sheetOpen()) return;
      if (overview) setOverview(false);
      sheetReturn = doc.activeElement;
      var curK = 0;
      sections.forEach(function (sec, k) { if (current >= sec.start) curK = k; });
      Array.prototype.forEach.call(sheet.querySelectorAll(".sheet__sec"), function (b) {
        if (+b.getAttribute("data-k") === curK) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      });
      sheet.hidden = false;
      root.classList.add("is-sheet-open");
      deck.inert = true; hud.inert = true;
      $chap.setAttribute("aria-expanded", "true");
      sheetBody.scrollTop = 0;
      var cur = sheet.querySelector('.sheet__sec[aria-current]');
      if (cur && cur.offsetTop > sheetBody.clientHeight * 0.6) sheetBody.scrollTop = cur.offsetTop - sheetBody.clientHeight * 0.4;
      sheet.querySelector(".sheet__close").focus({ preventScroll: true });
    }
    function closeSheet(restore) {
      if (!sheetOpen()) return;
      sheet.hidden = true;
      root.classList.remove("is-sheet-open");
      deck.inert = false; hud.inert = false;
      $chap.setAttribute("aria-expanded", "false");
      if (restore !== false) {
        var r = sheetReturn && doc.contains(sheetReturn) && sheetReturn.getClientRects().length ? sheetReturn : $chap;
        r.focus({ preventScroll: true });
      }
      sheetReturn = null;
    }
    function toggleSheet() { if (sheetOpen()) closeSheet(); else openSheet(); }
    sheet.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { closeSheet(); return; }
      var g = e.target.closest("[data-go]");
      if (g) {
        closeSheet(false);
        pinned = -1;
        go(+g.getAttribute("data-go"));
        $chap.focus({ preventScroll: true });
        return;
      }
      var r = e.target.closest("[data-read]");
      if (r) {
        var v = r.getAttribute("data-read");
        storeRead(v);
        closeSheet();
        setLayout(scrollMode, v === "page");
      }
    });
    sheet.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey)) {
        e.preventDefault(); e.stopPropagation(); closeSheet(); return;
      }
      if (e.key === "Tab") {
        var f = sheetFocusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* keep focus inside while open (e.g. after a click on the scrim area) */
    doc.addEventListener("focusin", function (e) {
      if (sheetOpen() && !sheet.contains(e.target)) { var f = sheetFocusables(); if (f.length) f[0].focus(); }
    });

    /* ---- first visit in page mode: show where to tap, once ---------------- */
    var hint = null;
    function maybeShowHint() {
      if (!pageMode || hint || hintSeen()) return;
      hint = el("button", "taphint");
      hint.type = "button";
      hint.setAttribute("aria-label", "넘기는 방법 안내 닫기");
      hint.innerHTML =
        '<span class="taphint__zone taphint__zone--prev">' + ICON.prev + "<b>이전</b></span>" +
        '<span class="taphint__zone taphint__zone--next"><b>다음</b>' + ICON.next + "</span>" +
        '<span class="taphint__msg">화면 왼쪽을 누르면 이전, 오른쪽을 누르면 다음 슬라이드로 넘어갑니다. ' +
        "아래 막대의 장 이름을 누르면 목차와 읽는 방식을 고를 수 있습니다." +
        '<span class="taphint__ok">아무 곳이나 눌러 시작</span></span>';
      doc.body.appendChild(hint);
      function dismiss(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        storeHintSeen();
        if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      }
      hint.addEventListener("click", dismiss);
      hint.addEventListener("keydown", function (e) { if (e.key === "Escape") dismiss(e); });
    }

    /* events */
    hud.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "sheet") toggleSheet();
      else if (a === "prev") step(-1);
      else if (a === "next") step(1);
      else if (a === "overview") setOverview(!overview);
      else if (a === "theme") toggleTheme();
      else if (a === "fullscreen") toggleFullscreen();
    });
    edgePrev.addEventListener("click", function () { step(-1); });
    edgeNext.addEventListener("click", function () { step(1); });
    frames.forEach(function (f, i) {
      f.addEventListener("click", function () { if (overview) { go(i, { scroll: false }); setOverview(false); } });
      f.addEventListener("animationend", function () { f.classList.remove("is-enter-next", "is-enter-prev"); });
    });

    doc.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var k = e.key;
      var onControl = t && t.closest && t.closest("button, a, summary");
      if (sheetOpen()) return;                 // the sheet handles its own keys
      if (k === "h" || k === "H") { e.preventDefault(); location.href = INDEX_URL; return; }
      if (k === "m" || k === "M") { e.preventDefault(); openSheet(); return; }
      if (pageMode && (k === "ArrowDown" || k === "ArrowUp" || (k === " " && !onControl))) {
        /* page mode: the current slide is its own scroller */
        var fr = frames[current], down = k === "ArrowDown" || (k === " " && !e.shiftKey);
        var atEnd = down ? fr.scrollTop + fr.clientHeight >= fr.scrollHeight - 2 : fr.scrollTop <= 0;
        e.preventDefault();
        if (k === " " && atEnd) { step(down ? 1 : -1); return; }
        fr.scrollBy({ top: (k === " " ? fr.clientHeight * 0.85 : 64) * (down ? 1 : -1), behavior: REDUCED.matches ? "auto" : "smooth" });
        return;
      }
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
        applyLayout();
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
      if (!scrollMode || pageMode || pinned >= 0 || sheetOpen()) return;
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
      if (!scrollMode || pageMode || trackQueued) return;
      trackQueued = true;
      requestAnimationFrame(track);
    }, { passive: true });

    /* stage mode: swipe left / right on touch screens. Ignored when it starts
       inside something that scrolls sideways (tables, code, figures), in a
       form field, with two fingers, or while the page is pinch-zoomed. */
    function inHScroller(n) {
      for (; n && n.nodeType === 1 && n !== deck && !n.classList.contains("frame"); n = n.parentElement) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable) return true;
        if (n.scrollWidth > n.clientWidth + 1) {
          var ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
      }
      return false;
    }
    var sw = null;
    /* page mode taps: remember how the last touch went, so the click it
       produces can be ignored if it was really a drag, scroll or long press */
    var touch = null;   // { x, y, t, moved, multi }
    deck.addEventListener("touchstart", function (e) {
      sw = null;
      var p0 = e.touches[0];
      touch = { x: p0.clientX, y: p0.clientY, t: Date.now(), moved: false, multi: e.touches.length > 1, end: 0 };
      if ((scrollMode && !pageMode) || overview || e.touches.length !== 1) return;
      if (window.visualViewport && window.visualViewport.scale > 1.05) return;
      if (inHScroller(e.target)) return;
      sw = { x: p0.clientX, y: p0.clientY, t: Date.now() };
    }, { passive: true });
    deck.addEventListener("touchmove", function (e) {
      if (e.touches.length > 1) { sw = null; if (touch) touch.multi = true; }
      if (touch && !touch.moved) {
        var p = e.touches[0];
        if (Math.abs(p.clientX - touch.x) > 10 || Math.abs(p.clientY - touch.y) > 10) touch.moved = true;
      }
    }, { passive: true });
    deck.addEventListener("touchcancel", function () { sw = null; if (touch) touch.moved = true; }, { passive: true });
    deck.addEventListener("touchend", function (e) {
      if (touch) touch.end = Date.now();
      if (!sw) return;
      var p = e.changedTouches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y, dt = Date.now() - sw.t;
      sw = null;
      if (dt > 800 || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (touch) touch.swiped = true;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });

    /* page mode: tap the left third for the previous slide, the rest for the
       next (e-reader convention). Taps on anything interactive, inside
       sideways scrollers, with text selected, or that were drags / long
       presses are left alone. */
    var NO_TAP = "a, button, summary, details, input, textarea, select, label, [contenteditable], [tabindex]:not(.frame)";
    var glowTimer = 0;
    function glow(side) {
      var g = side < 0 ? glowPrev : glowNext;
      clearTimeout(glowTimer);
      glowPrev.classList.remove("is-on"); glowNext.classList.remove("is-on");
      void g.offsetWidth;
      g.classList.add("is-on");
      glowTimer = setTimeout(function () { g.classList.remove("is-on"); }, 150);
    }
    deck.addEventListener("click", function (e) {
      if (!pageMode || overview || e.defaultPrevented || e.button !== 0) return;
      var t = e.target;
      if (t.closest && t.closest(NO_TAP)) return;
      if (inHScroller(t)) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && String(sel).trim()) return;
      if (touch && Date.now() - touch.end < 700) {
        var held = touch.end - touch.t;
        if (touch.moved || touch.multi || touch.swiped || held > 450) return;
      }
      if (window.visualViewport && window.visualViewport.scale > 1.05) return;
      var d = e.clientX < root.clientWidth / 3 ? -1 : 1;
      var before = current;
      step(d);
      if (current !== before) glow(d);
    });

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
    applyLayout();
    go(hashIndex(), { force: true, scroll: false });
    if (pageMode) maybeShowHint();
    if (deepLink && !pageMode) pinned = current;   // deep link: keep it in view while fonts/layout settle
    function settle() {
      if (pinned >= 0 && scrollMode && !pageMode) { frames[pinned].scrollIntoView({ block: "start" }); go(pinned, { scroll: false }); }
    }
    if (scrollMode && !pageMode) requestAnimationFrame(function () { frames[current].scrollIntoView({ block: "start" }); });
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
