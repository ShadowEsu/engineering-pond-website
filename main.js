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

  /* ---------- Active section in the nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var linkById = {};
  navLinks.forEach(function (a) { linkById[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        var link = linkById[entry.target.id];
        if (link) { link.classList.add("is-active"); link.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(linkById).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) sectionObserver.observe(s);
    });
  }

  /* ---------- Hero entrance + pond surface ---------- */
  var hero = document.querySelector(".hero");
  requestAnimationFrame(function () { hero.classList.add("is-in"); });

  var canvas = document.querySelector(".hero-water");
  var hint = document.querySelector(".hero-hint");
  if (hint) hint.hidden = true;
  // The water starts after the page has loaded so it never competes with the first paint.
  function startWater() { if (canvas) initWater(canvas); }
  function whenIdle() {
    if ("requestIdleCallback" in window) requestIdleCallback(startWater, { timeout: 1500 });
    else setTimeout(startWater, 300);
  }
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });

  function initWater(cv) {
    var gl = cv.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return;

    var vsSrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fsSrc = [
      "precision mediump float;",
      "uniform vec2 uRes;uniform float uTime;uniform vec4 uRip[4];",
      "vec2 warp(vec2 p,float t){",
      "  p+=0.62*vec2(sin(p.y*0.85+t),cos(p.x*0.78-t*0.8));",
      "  p+=0.28*vec2(sin(p.y*1.9-t*1.3+1.7),cos(p.x*2.05+t*1.1+0.4));",
      "  return p;}",
      "float net(vec2 p){float v=abs(sin(p.x)+sin(p.y));return smoothstep(0.62,0.0,v)*0.55+smoothstep(0.14,0.0,v)*0.45;}",
      "void main(){",
      "  vec2 uv=gl_FragCoord.xy/uRes;",
      "  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;",
      "  vec2 disp=vec2(0.);float ring=0.;",
      "  for(int i=0;i<4;i++){",
      "    vec4 r=uRip[i];float age=uTime-r.z;",
      "    if(r.w>0.0&&age>0.0&&age<5.0){",
      "      vec2 rp=(r.xy*uRes-0.5*uRes)/uRes.y;vec2 d=p-rp;float dist=length(d);",
      "      float front=age*0.32;float k=dist-front;",
      "      float env=exp(-abs(k)*14.0)*exp(-age*0.9)*r.w;",
      "      float w=sin(k*46.0)*env;",
      "      disp+=d/(dist+0.001)*w*0.05;ring+=max(w,0.0);",
      "    }",
      "  }",
      "  p+=disp;",
      "  float t=uTime*0.32;",
      "  vec2 q=p*15.0;",
      "  float a=net(warp(q,t));float b=net(warp(q*1.42+3.1,t*1.25));",
      "  float c=a*0.55+b*0.35+a*b*0.9;",
      "  vec3 bottom=vec3(0.039,0.145,0.137);",
      "  vec3 top=vec3(0.090,0.290,0.271);",
      "  vec3 base=mix(bottom,top,smoothstep(0.0,1.0,uv.y));",
      "  vec3 light=vec3(0.66,0.86,0.81);",
      "  float side=mix(0.35,1.0,smoothstep(0.15,0.85,uv.x));",
      "  float depth=mix(0.35,1.0,uv.y);",
      "  vec3 col=base+light*c*0.34*side*depth+light*ring*0.10;",
      "  gl_FragColor=vec4(col,1.0);",
      "}"
    ].join("\n");

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    // let the driver compile off the main thread where it can, instead of blocking on the status query
    var parallel = gl.getExtension("KHR_parallel_shader_compile");
    if (parallel) {
      (function poll() {
        if (gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) setup();
        else requestAnimationFrame(poll);
      })();
    } else {
      setup();
    }

    function setup() {
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var uRes = gl.getUniformLocation(prog, "uRes");
      var uTime = gl.getUniformLocation(prog, "uTime");
      var uRip = gl.getUniformLocation(prog, "uRip");
      var ripples = new Float32Array(16);
      var ripIndex = 0;
      var start = performance.now();
      var running = false;
      var visible = true;
      var raf = 0;

      function now() { return (performance.now() - start) / 1000; }

      function resize() {
        // the surface is soft, so a reduced resolution keeps it cheap without visible loss
        var scale = window.innerWidth < 700 ? 0.35 : 0.5;
        var w = Math.max(1, Math.round(cv.clientWidth * scale));
        var h = Math.max(1, Math.round(cv.clientHeight * scale));
        if (cv.width !== w || cv.height !== h) {
          cv.width = w;
          cv.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(uRes, w, h);
      }

      function draw(time) {
        gl.uniform1f(uTime, time);
        gl.uniform4fv(uRip, ripples);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      var lastDraw = 0;
      function frame(ts) {
        // 30 fps is plenty for slow water and halves the GPU work
        if (ts - lastDraw >= 32) {
          lastDraw = ts;
          draw(now());
        }
        raf = running ? requestAnimationFrame(frame) : 0;
      }

      function setRunning(on) {
        on = on && visible && !document.hidden && !reduceMotion;
        if (on === running) return;
        running = on;
        if (on && !raf) raf = requestAnimationFrame(frame);
      }

      function addRipple(clientX, clientY, strength) {
        var rect = cv.getBoundingClientRect();
        var x = (clientX - rect.left) / rect.width;
        var y = 1 - (clientY - rect.top) / rect.height;
        var o = ripIndex * 4;
        ripples[o] = x; ripples[o + 1] = y; ripples[o + 2] = now(); ripples[o + 3] = strength;
        ripIndex = (ripIndex + 1) % 4;
      }

      resize();
      window.addEventListener("resize", function () {
        resize();
        if (!running) draw(reduceMotion ? 6 : now());
      });

      if (reduceMotion) {
        draw(6);
        cv.classList.add("is-ready");
        return;
      }

      // the one orchestrated moment: a drop lands under the title as the page opens
      var title = document.querySelector(".hero-title");
      setTimeout(function () {
        var r = title.getBoundingClientRect();
        addRipple(r.left + r.width * 0.55, r.top + r.height * 0.5, 1);
      }, 450);

      var lastMove = 0;
      hero.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var t = performance.now();
        if (t - lastMove < 380) return;
        lastMove = t;
        addRipple(e.clientX, e.clientY, 0.45);
      });
      hero.addEventListener("pointerdown", function (e) {
        if (e.target.closest("a, button")) return;
        addRipple(e.clientX, e.clientY, 1);
      });

      if (hint) {
        hint.textContent = window.matchMedia("(hover: hover)").matches
          ? "Move across the water to make ripples."
          : "Tap the water to make ripples.";
        hint.hidden = false;
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          setRunning(true);
        }).observe(hero);
      }
      document.addEventListener("visibilitychange", function () { setRunning(true); });

      draw(0);
      cv.classList.add("is-ready");
      setRunning(true);
    }
  }

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
