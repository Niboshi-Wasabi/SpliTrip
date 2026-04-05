/**
 * Blocking theme bootstrap (must match SplitripThemeProvider defaults in src/app/providers.tsx).
 * SplitripThemeProvider のデフォルトと一致させること（storageKey theme, class on html, system, etc.）。
 */
(function () {
  var attribute = "class";
  var storageKey = "theme";
  var defaultTheme = "system";
  var forcedTheme = null;
  var themes = ["light", "dark"];
  var valueMap = null;
  var enableSystem = true;
  var enableColorScheme = true;

  var root = document.documentElement;
  var colorSchemes = ["light", "dark"];

  function applyColorScheme(name) {
    if (enableColorScheme && colorSchemes.indexOf(name) >= 0) {
      root.style.colorScheme = name;
    }
  }

  function applyResolved(resolvedName) {
    var attrs = Array.isArray(attribute) ? attribute : [attribute];
    for (var ai = 0; ai < attrs.length; ai++) {
      var attr = attrs[ai];
      var domValue = valueMap ? valueMap[resolvedName] : resolvedName;
      if (attr === "class") {
        for (var ti = 0; ti < themes.length; ti++) {
          root.classList.remove(themes[ti]);
        }
        if (domValue) root.classList.add(domValue);
      } else if (String(attr).indexOf("data-") === 0) {
        if (domValue) root.setAttribute(attr, domValue);
        else root.removeAttribute(attr);
      }
    }
    applyColorScheme(resolvedName);
  }

  function systemPref() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  if (forcedTheme) {
    applyResolved(forcedTheme);
    return;
  }
  try {
    var stored = localStorage.getItem(storageKey) || defaultTheme;
    var resolved =
      enableSystem && stored === "system" ? systemPref() : stored;
    applyResolved(resolved);
  } catch {
    /* ignore */
  }
})();
