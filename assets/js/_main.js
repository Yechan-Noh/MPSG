/* ==========================================================================
   Utilities
   ========================================================================== */

// Determine the expected state of the theme toggle ("dark" | "light" | "system")
const determineThemeSetting = () => {
  const themeSetting = localStorage.getItem("theme");
  return (themeSetting !== "dark" && themeSetting !== "light" && themeSetting !== "system")
    ? "system"
    : themeSetting;
};

// Determine the computed theme ("dark" | "light")
const determineComputedTheme = () => {
  const themeSetting = determineThemeSetting();
  if (themeSetting !== "system") return themeSetting;

  // Use matchMedia directly (userPref was undefined before)
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// detect OS/browser preference (fallback)
const browserPref =
  (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";

// Set the theme on page load or when explicitly called
const setTheme = (theme) => {
  const use_theme =
    theme ||
    localStorage.getItem("theme") ||
    $("html").attr("data-theme") ||
    browserPref;

  if (use_theme === "dark") {
    $("html").attr("data-theme", "dark");
    $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
  } else {
    $("html").removeAttr("data-theme");
    $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
  }
};

// Toggle the theme manually
const toggleTheme = () => {
  const current = $("html").attr("data-theme");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  setTheme(next);
};

/* ==========================================================================
   Plotly integration (safe with non-module scripts)
   ========================================================================== */

const plotlyBlocks = document.querySelectorAll("pre>code.language-plotly");
if (plotlyBlocks.length > 0) {
  document.addEventListener("readystatechange", () => {
    if (document.readyState !== "complete") return;

    import("./theme.js")
      .then(({ plotlyDarkLayout, plotlyLightLayout }) => {
        plotlyBlocks.forEach((elem) => {
          // If Plotly isn't loaded, skip gracefully
          if (typeof window.Plotly === "undefined") return;

          const jsonData = JSON.parse(elem.textContent);
          elem.parentElement.classList.add("hidden");

          const chartEl = document.createElement("div");
          elem.parentElement.after(chartEl);

          const theme = (determineComputedTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;
          if (jsonData.layout) {
            jsonData.layout.template = jsonData.layout.template
              ? { ...theme, ...jsonData.layout.template }
              : theme;
          } else {
            jsonData.layout = { template: theme };
          }

          window.Plotly.react(chartEl, jsonData.data, jsonData.layout);
        });
      })
      .catch((err) => {
        console.warn("Plotly theme module failed to load:", err);
        // Fallback rendering if Plotly is present
        plotlyBlocks.forEach((elem) => {
          if (typeof window.Plotly === "undefined") return;
          const jsonData = JSON.parse(elem.textContent);
          elem.parentElement.classList.add("hidden");
          const chartEl = document.createElement("div");
          elem.parentElement.after(chartEl);
          window.Plotly.react(chartEl, jsonData.data, jsonData.layout || {});
        });
      });
  });
}

// --- Minimal fallback for the hamburger (runs even if other code failed) ---
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('mpsg-nav-toggle');
  var nav = document.getElementById('mpsg-site-nav');
  if (!btn || !nav) return;

  // ensure button is clickable above other layers
  btn.style.pointerEvents = 'auto';

  function setExpanded(on) {
    document.body.classList.toggle('mpsg-nav-open', on);
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    setExpanded(!document.body.classList.contains('mpsg-nav-open'));
  });

  // close when clicking outside (mobile)
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('mpsg-nav-open')) return;
    var root = document.querySelector('[data-mpsg-masthead]');
    if (root && !root.contains(e.target)) setExpanded(false);
  });

  // close on escape
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setExpanded(false);
  });

  // close when resizing up to desktop
  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 961px)').matches) setExpanded(false);
  });
});
