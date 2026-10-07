// Ali Modarresi — personal research website
// Minimal vanilla JS. Site is fully usable without it.
(function () {
  "use strict";

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("primary-nav");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.setAttribute("data-open", String(!open));
    });
    // Close on link click (mobile)
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        links.setAttribute("data-open", "false");
      });
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.getAttribute("data-open") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        links.setAttribute("data-open", "false");
        toggle.focus();
      }
    });
  }

  // ---- Mark current page in nav ----
  var here = window.location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var p = a.getAttribute("href") || "";
    // Normalize relative links
    var path = p.replace(/^(\.\.\/)+/, "/");
    if (path === "/" && (here === "/" || here === "")) {
      a.setAttribute("aria-current", "page");
    } else if (path !== "/" && here.indexOf(path) === 0) {
      a.setAttribute("aria-current", "page");
    }
  });

  // ---- Subtle hero motif node pulse (skipped under reduced-motion) ----
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    var svg = document.querySelector(".hero-art svg");
    if (svg && svg.querySelector) {
      // Randomise a single highlight node per session
      var nodes = svg.querySelectorAll("[data-node]");
      if (nodes.length) {
        var n = nodes[Math.floor(Math.random() * nodes.length)];
        n.classList.add("is-active");
      }
    }
  }
})();
