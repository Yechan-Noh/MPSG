/* ==========================================================================
   Theme Management
   ========================================================================== */

// Finds the user's saved theme setting from localStorage
function getThemeSetting() {
  const savedTheme = localStorage.getItem("theme");
  // Ensure the saved value is valid, otherwise default to 'system'
  if (["dark", "light", "system"].includes(savedTheme)) {
    return savedTheme;
  }
  return "system";
}

// Determines the final theme ('dark' or 'light') to apply
function calculateTheme() {
  const setting = getThemeSetting();
  if (setting !== "system") {
    return setting;
  }
  // If set to 'system', check the browser/OS preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// Applies the theme to the page
function applyTheme() {
  const theme = calculateTheme();
  const themeIcon = document.getElementById("theme-icon");

  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeIcon) {
      themeIcon.classList.remove("fa-sun");
      themeIcon.classList.add("fa-moon");
    }
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIcon) {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    }
  }
}

// Toggles and saves the theme when the user clicks the button
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  // Save the new preference and apply it
  localStorage.setItem("theme", nextTheme);
  applyTheme();
}

// Apply theme as soon as the page loads
applyTheme();


/* ==========================================================================
   Plotly Integration
   ========================================================================== */

const plotlyBlocks = document.querySelectorAll("pre > code.language-plotly");
if (plotlyBlocks.length > 0) {
  document.addEventListener("readystatechange", () => {
    if (document.readyState !== "complete") return;

    // Dynamically load Plotly themes
    import("./theme.js")
      .then(({ plotlyDarkLayout, plotlyLightLayout }) => {
        plotlyBlocks.forEach((elem) => {
          if (typeof window.Plotly === "undefined") return; // Skip if Plotly lib isn't loaded

          const jsonData = JSON.parse(elem.textContent);
          elem.parentElement.classList.add("hidden"); // Hide the original code block

          const chartEl = document.createElement("div");
          elem.parentElement.after(chartEl); // Insert a new div for the chart

          // Choose the correct Plotly theme based on the current website theme
          const theme = (calculateTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;

          // Safely merge the theme template with the chart's existing layout
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
        // Fallback rendering if the theme import fails
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