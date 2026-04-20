(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var siteHeader = document.querySelector(".site-header");
  function updateHeaderScrolled() {
    if (!siteHeader) return;
    siteHeader.classList.toggle("scrolled", window.scrollY > 24);
  }

  window.addEventListener("scroll", updateHeaderScrolled, { passive: true });
  updateHeaderScrolled();

  var navToggle = document.querySelector(".nav-toggle");
  var navDrawer = document.getElementById("nav-drawer");
  if (navToggle && navDrawer) {
    navToggle.addEventListener("click", function () {
      var open = navDrawer.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });
    navDrawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 767px)").matches) {
          navDrawer.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("nav-open");
        }
      });
    });
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    var reveals = document.querySelectorAll("[data-reveal]");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  var missionGoals = document.getElementById("mission-goals");
  if (missionGoals) {
    if (reduceMotion) {
      missionGoals.classList.add("is-visible");
    } else if ("IntersectionObserver" in window) {
      var gObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            missionGoals.classList.add("is-visible");
            gObs.unobserve(missionGoals);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
      );
      gObs.observe(missionGoals);
    } else {
      missionGoals.classList.add("is-visible");
    }
  }

  var tocLinks = document.querySelectorAll(".toc-link");
  var navLinks = document.querySelectorAll(".nav-link");
  var tocSections = document.querySelectorAll("#data, .page-main section[id]");
  var activeSectionId = "";

  function setActiveSectionNav(id) {
    var next = id || "";
    if (next === activeSectionId) return;
    activeSectionId = next;
    tocLinks.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      link.classList.toggle("is-active", next !== "" && href === "#" + next);
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      link.classList.toggle("is-active", next !== "" && href === "#" + next);
    });
  }

  function syncSectionNavFromScroll() {
    if (!tocSections.length) return;
    var y = window.scrollY + 120;
    var current = "";
    for (var i = 0; i < tocSections.length; i++) {
      var sec = tocSections[i];
      if (sec.offsetTop <= y) {
        current = sec.id;
      }
    }
    setActiveSectionNav(current);
  }

  if (tocSections.length && "IntersectionObserver" in window) {
    var navIo = new IntersectionObserver(
      function (entries) {
        var visible = entries.filter(function (e) {
          return e.isIntersecting;
        });
        if (!visible.length) {
          syncSectionNavFromScroll();
          return;
        }
        visible.sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });
        setActiveSectionNav(visible[0].target.id);
      },
      { root: null, rootMargin: "-14% 0px -52% 0px", threshold: [0, 0.02, 0.1] }
    );
    tocSections.forEach(function (sec) {
      navIo.observe(sec);
    });
    window.addEventListener("scroll", syncSectionNavFromScroll, { passive: true });
    window.requestAnimationFrame(syncSectionNavFromScroll);
  } else if (tocSections.length) {
    syncSectionNavFromScroll();
  }

  var parallaxImgs = document.querySelectorAll("#engineering .feature-visual img");
  if (!reduceMotion && parallaxImgs.length) {
    var pTick = 0;
    function parallax() {
      var vh = window.innerHeight;
      parallaxImgs.forEach(function (img) {
        var wrap = img.closest(".feature-visual");
        if (!wrap) return;
        var rect = wrap.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var progress = (center - vh / 2) / vh;
        var y = Math.max(-20, Math.min(20, progress * -28));
        img.style.transform = "translateY(" + y + "px)";
      });
    }
    function onParallaxScroll() {
      if (pTick) return;
      pTick = requestAnimationFrame(function () {
        pTick = 0;
        parallax();
      });
    }
    window.addEventListener("scroll", onParallaxScroll, { passive: true });
    window.addEventListener("resize", parallax);
    parallax();
  }

  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");
  var galleryItems = document.querySelectorAll(".gallery-lightbox-item");
  var lbIndex = 0;

  function openLightbox(index) {
    if (!lightbox || !lightboxImg || !galleryItems.length) return;
    lbIndex = (index + galleryItems.length) % galleryItems.length;
    var fig = galleryItems[lbIndex];
    var img = fig.querySelector("img");
    var capEl = fig.querySelector(".gallery-tile-caption");
    lightboxImg.src = img ? img.src : "";
    lightboxImg.alt = img ? img.alt : "";
    lightboxCaption.textContent = capEl ? capEl.textContent : (img ? img.alt : "");
    lightbox.removeAttribute("hidden");
    document.body.classList.add("lightbox-open");
    if (lightboxClose) {
      lightboxClose.focus();
    }
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute("hidden", "");
    lightboxImg.src = "";
    document.body.classList.remove("lightbox-open");
  }

  galleryItems.forEach(function (fig, i) {
    fig.addEventListener("click", function () {
      openLightbox(i);
    });
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(i);
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", function () {
      openLightbox(lbIndex - 1);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", function () {
      openLightbox(lbIndex + 1);
    });
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!lightbox || lightbox.hasAttribute("hidden")) return;
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      openLightbox(lbIndex - 1);
    } else if (e.key === "ArrowRight") {
      openLightbox(lbIndex + 1);
    }
  });
})();
