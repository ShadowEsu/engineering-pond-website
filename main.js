(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header: glass state + reading meter ---------- */
  var header = document.querySelector(".site-header");
  var meterFill = document.querySelector(".scroll-meter-fill");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 24);
      var max = doc.scrollHeight - window.innerHeight;
      if (meterFill) meterFill.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function setNav(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    navToggle.querySelector(".nav-toggle-label").textContent = open ? "Close" : "Menu";
  }
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        navToggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !header.contains(e.target)) setNav(false);
    });
  }

  /* ---------- Hero entrance ---------- */
  var hero = document.querySelector(".hero");
  if (hero) requestAnimationFrame(function () { hero.classList.add("is-in"); });

  /* ---------- Tab list with media (home: systems) ---------- */
  Array.prototype.slice.call(document.querySelectorAll("[data-tabs]")).forEach(function (tabs) {
    var items = Array.prototype.slice.call(tabs.querySelectorAll(".tab"));
    items.forEach(function (item) {
      item.querySelector(".tab-btn").addEventListener("click", function () {
        items.forEach(function (other) {
          var on = other === item;
          other.classList.toggle("is-active", on);
          other.querySelector(".tab-btn").setAttribute("aria-expanded", String(on));
        });
      });
    });
  });

  /* ---------- Photos turn to colour once they are scrolled into view, and stay in colour ---------- */
  var colourImgs = Array.prototype.slice.call(document.querySelectorAll(".photo img, .media-img, .card-photo img, .shot-btn img, .notes-img img"));
  function colourIn(img) {
    img.classList.add("is-colour");
    var water = img.closest("[data-water]");
    if (water) water.dispatchEvent(new CustomEvent("colour"));
  }
  if (reduceMotion || !("IntersectionObserver" in window)) {
    colourImgs.forEach(colourIn);
  } else {
    var colourObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        colourObserver.unobserve(entry.target);
        colourIn(entry.target);
      });
    }, { threshold: 0.4 });
    colourImgs.forEach(function (img) { colourObserver.observe(img); });
  }

  /* ---------- Water: ripples refract the photographs (black and white, then colour once seen) ---------- */
  // Each [data-water] section has an <img> (the still frame, and the no-WebGL / reduced-motion view)
  // and a <canvas> that redraws the same photo through a moving water surface.
  var waterSections = Array.prototype.slice.call(document.querySelectorAll("[data-water]"));
  var hint = document.querySelector(".hero-hint");

  var FS = [
    "precision mediump float;",
    "uniform sampler2D uTex;uniform vec2 uRes;uniform vec2 uScale;uniform vec2 uOff;uniform float uTime;uniform vec4 uRip[4];uniform float uCol;",
    "void main(){",
    "  vec2 frag=gl_FragCoord.xy;",
    "  vec2 uv=vec2(frag.x,uRes.y-frag.y)/uRes;",
    "  vec2 p=vec2(frag.x,uRes.y-frag.y)/uRes.y;",
    "  vec2 disp=vec2(0.);float ring=0.;",
    "  for(int i=0;i<4;i++){",
    "    vec4 r=uRip[i];float age=uTime-r.z;",
    "    if(r.w>0.0&&age>0.0&&age<5.0){",
    "      vec2 rp=r.xy*vec2(uRes.x/uRes.y,1.0);vec2 d=p-rp;float dist=length(d);",
    "      float k=dist-age*0.34;",
    "      float w=sin(k*42.0)*exp(-abs(k)*12.0)*exp(-age*0.9)*r.w;",
    "      disp+=d/(dist+0.001)*w*0.012;ring+=w;",
    "    }",
    "  }",
    "  float t=uTime*0.5;",
    "  disp+=vec2(sin(p.y*7.0+t)+0.5*sin(p.y*13.0-t*1.3),cos(p.x*6.0-t*0.9)+0.5*cos(p.x*11.0+t*1.1))*0.0016;",
    "  vec2 tuv=(uv+disp*vec2(uRes.y/uRes.x,1.0))*uScale+uOff;",
    "  vec3 c=texture2D(uTex,clamp(tuv,0.001,0.999)).rgb;",
    "  float l=dot(c,vec3(0.2126,0.7152,0.0722));",
    "  gl_FragColor=vec4(mix(vec3(l),c,uCol)+ring*0.06,1.0);",
    "}"
  ].join("\n");
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  function initWater(section) {
    var img = section.querySelector(".media-img");
    var cv = section.querySelector(".media-water");
    if (!img || !cv) return;
    var gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) return;

    function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);

    // let the driver compile off the main thread where it can
    var parallel = gl.getExtension("KHR_parallel_shader_compile");
    (function waitForProgram() {
      if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
        requestAnimationFrame(waitForProgram);
        return;
      }
      if (img.complete && img.naturalWidth) setup();
      else img.addEventListener("load", setup, { once: true });
    })();

    function setup() {
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      } catch (err) {
        return; // the still photo stays in place
      }

      var uRes = gl.getUniformLocation(prog, "uRes");
      var uScale = gl.getUniformLocation(prog, "uScale");
      var uOff = gl.getUniformLocation(prog, "uOff");
      var uTime = gl.getUniformLocation(prog, "uTime");
      var uRip = gl.getUniformLocation(prog, "uRip");
      var uCol = gl.getUniformLocation(prog, "uCol");
      // colour fades in over 0.8 s once the photo has been seen (see "Photos turn to colour" above)
      var colFrom = img.classList.contains("is-colour") ? -1 : Infinity;
      section.addEventListener("colour", function () { if (colFrom === Infinity) colFrom = now(); });
      var ripples = new Float32Array(16);
      var ripIndex = 0;
      var start = performance.now();
      var running = false;
      var visible = false;
      var raf = 0;
      var lastDraw = 0;
      var posY = parseFloat(getComputedStyle(img).objectPosition.split(" ")[1]) / 100;
      if (isNaN(posY)) posY = 0.5;

      function now() { return (performance.now() - start) / 1000; }

      function resize() {
        var cssW = cv.clientWidth, cssH = cv.clientHeight;
        var scale = Math.min(window.devicePixelRatio || 1, 1.5);
        if (cssW * cssH * scale * scale > 2200000) scale = Math.sqrt(2200000 / (cssW * cssH));
        var w = Math.max(1, Math.round(cssW * scale));
        var h = Math.max(1, Math.round(cssH * scale));
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
        // object-fit: cover, matching the <img> underneath
        var ca = w / h, ia = img.naturalWidth / img.naturalHeight;
        var sx = ca > ia ? 1 : ca / ia;
        var sy = ca > ia ? ia / ca : 1;
        gl.uniform2f(uScale, sx, sy);
        gl.uniform2f(uOff, (1 - sx) * 0.5, (1 - sy) * posY);
      }

      function draw() {
        var t = now();
        var k = Math.min(1, Math.max(0, (t - colFrom) / 0.8));
        gl.uniform1f(uCol, k * k * (3 - 2 * k));
        gl.uniform1f(uTime, t);
        gl.uniform4fv(uRip, ripples);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      function frame(ts) {
        if (ts - lastDraw >= 32) { lastDraw = ts; draw(); } // 30 fps is plenty for slow water
        raf = running ? requestAnimationFrame(frame) : 0;
      }

      function update() {
        var on = visible && !document.hidden;
        if (on === running) return;
        running = on;
        if (on && !raf) raf = requestAnimationFrame(frame);
      }

      function addRipple(clientX, clientY, strength) {
        var rect = cv.getBoundingClientRect();
        var o = ripIndex * 4;
        ripples[o] = (clientX - rect.left) / rect.width;
        ripples[o + 1] = (clientY - rect.top) / rect.height;
        ripples[o + 2] = now();
        ripples[o + 3] = strength;
        ripIndex = (ripIndex + 1) % 4;
      }

      resize();
      window.addEventListener("resize", resize);

      var lastMove = 0;
      section.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var t = performance.now();
        if (t - lastMove < 380) return;
        lastMove = t;
        addRipple(e.clientX, e.clientY, 0.5);
      });
      section.addEventListener("pointerdown", function (e) {
        if (e.target.closest("a, button")) return;
        addRipple(e.clientX, e.clientY, 1);
      });

      if (section.getAttribute("data-water") === "hero") {
        // the one orchestrated moment: a drop lands on the photo as the page opens
        var r = cv.getBoundingClientRect();
        addRipple(r.left + r.width * 0.6, r.top + r.height * 0.45, 1);
        if (hint) {
          hint.textContent = window.matchMedia("(hover: hover)").matches
            ? "Move the pointer across the photo to make ripples."
            : "Tap the photo to make ripples.";
          hint.hidden = false;
        }
      }

      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        update();
      }).observe(section);
      document.addEventListener("visibilitychange", update);

      draw();
      cv.classList.add("is-ready");
    }
  }

  // Water starts after load (never competing with the first paint), and each section only when it comes near.
  function startWater() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        initWater(entry.target);
      });
    }, { rootMargin: "300px 0px" });
    waterSections.forEach(function (s) { io.observe(s); });
  }
  function whenIdle() {
    if ("requestIdleCallback" in window) requestIdleCallback(startWater, { timeout: 1500 });
    else setTimeout(startWater, 300);
  }
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });

  /* ---------- Milestones water line ---------- */
  var timeline = document.querySelector(".timeline");
  if (timeline) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      timeline.classList.add("is-filled");
    } else {
      var tlObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          timeline.classList.add("is-filled");
          tlObserver.disconnect();
        }
      }, { threshold: 0.35 });
      tlObserver.observe(timeline);
    }
  }

  /* ---------- Gallery filters ---------- */
  var filters = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var shots = Array.prototype.slice.call(document.querySelectorAll(".shot"));
  var galleryStatus = document.getElementById("gallery-status");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var count = 0;
      shots.forEach(function (li) {
        var show = cat === "all" || li.getAttribute("data-cat") === cat;
        li.hidden = !show;
        if (show) count++;
      });
      if (galleryStatus) galleryStatus.textContent = "Showing " + count + " of " + shots.length + " photos";
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCaption = document.getElementById("lb-caption");
  var lbCount = document.getElementById("lb-count");
  var current = [];
  var lbIndex = 0;

  function visibleButtons() {
    return shots.filter(function (li) { return !li.hidden; }).map(function (li) { return li.querySelector(".shot-btn"); });
  }

  function show(i) {
    var n = current.length;
    lbIndex = (i + n) % n;
    var btn = current[lbIndex];
    lightbox.classList.add("is-swapping");
    var next = new Image();
    next.onload = next.onerror = function () {
      lbImg.src = next.src;
      lbImg.alt = btn.getAttribute("data-alt") || "";
      lightbox.classList.remove("is-swapping");
    };
    next.src = btn.getAttribute("data-full");
    lbCaption.textContent = btn.querySelector(".shot-cap").textContent;
    lbCount.textContent = lbIndex + 1 + " / " + n;
  }

  if (lightbox && typeof lightbox.showModal === "function") {
    shots.forEach(function (li) {
      var btn = li.querySelector(".shot-btn");
      btn.setAttribute("aria-label", "Open photo: " + btn.querySelector(".shot-cap").textContent);
      btn.addEventListener("click", function () {
        current = visibleButtons();
        show(current.indexOf(btn));
        lightbox.showModal();
      });
    });
    document.getElementById("lb-close").addEventListener("click", function () { lightbox.close(); });
    document.getElementById("lb-prev").addEventListener("click", function () { show(lbIndex - 1); });
    document.getElementById("lb-next").addEventListener("click", function () { show(lbIndex + 1); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(lbIndex - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(lbIndex + 1); }
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lb-figure")) lightbox.close();
    });
    var touchX = null;
    lightbox.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  } else {
    // very old browsers: open the full image directly
    shots.forEach(function (li) {
      var btn = li.querySelector(".shot-btn");
      btn.addEventListener("click", function () { window.open(btn.getAttribute("data-full"), "_blank", "noopener"); });
    });
  }

  /* ---------- Copy citation ---------- */
  var copyBtn = document.getElementById("copy-cite");
  var citeStatus = document.getElementById("cite-status");
  var citeText = document.getElementById("cite-text");
  if (copyBtn && citeText) {
    copyBtn.addEventListener("click", function () {
      var text = citeText.textContent.replace(/\s+/g, " ").trim() +
        " Retrieved from https://shadowesu.github.io/dvcpondresearch/";
      function done(ok) {
        citeStatus.textContent = ok ? "Citation copied" : "Copy failed. Select the text and copy it manually.";
        setTimeout(function () { citeStatus.textContent = ""; }, 4000);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }
})();
