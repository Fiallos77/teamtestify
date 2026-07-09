(function () {
  "use strict";

  // Must capture synchronously — `document.currentScript` is only valid
  // while this script is the one actively executing, not inside callbacks
  // that fire later (e.g. the DOMContentLoaded listener below).
  var scriptEl = document.currentScript;
  var origin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : window.location.origin;

  function mountWidget(container) {
    var widgetId = container.getAttribute("data-testimonial-widget");
    if (!widgetId) return;

    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(widgetId);
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.style.height = "0px";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Testimonials");

    window.addEventListener("message", function (event) {
      var data = event.data;
      if (
        data &&
        data.source === "testimonial-widget-resize" &&
        data.widgetId === widgetId
      ) {
        iframe.style.height = data.height + "px";
      }
    });

    container.appendChild(iframe);
  }

  function init() {
    document.querySelectorAll("[data-testimonial-widget]").forEach(mountWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
