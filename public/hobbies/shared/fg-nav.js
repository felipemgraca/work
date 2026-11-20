// Injects the main felipegraca.com navbar above every hobby page so they feel part of the site.
(function () {
  var script = document.currentScript;
  var site = new URL("../../", script.src).pathname; // "/"
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("fg-nav.css", script.src).href;
  document.head.appendChild(link);
  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@600;800&display=swap";
  document.head.appendChild(font);

  var header = document.createElement("header");
  header.className = "fg-header";
  header.innerHTML =
    '<div class="fg-inner">' +
    '<a class="fg-wordmark" href="' + site + '" aria-label="Felipe Graca, home">Felipe Graca</a>' +
    '<nav class="fg-nav" aria-label="Primary"><ul>' +
    '<li class="fg-has-menu"><button type="button" class="fg-link" id="fg-tree-toggle" aria-haspopup="true" aria-expanded="false">Knowledge Tree <span aria-hidden="true">▾</span></button>' +
    '<ul class="fg-menu" id="fg-tree-menu" hidden>' +
    '<li><a href="' + site + 'knowledge-tree/fruits/">Fruits (Essays)</a></li>' +
    '<li><a href="' + site + 'knowledge-tree/branches/">Branches (Notes Graph)</a></li>' +
    '<li><a href="' + site + 'knowledge-tree/roots/">Roots (References)</a></li></ul></li>' +
    '<li><a class="fg-link" href="' + site + 'resume/">Resume</a></li>' +
    '<li class="fg-has-menu"><button type="button" class="fg-link" id="fg-about-toggle" aria-haspopup="true" aria-expanded="false" aria-current="page">About Me <span aria-hidden="true">\u25be</span></button>' +
    '<ul class="fg-menu" id="fg-about-menu" hidden>' +
    '<li><a href="' + site + 'my-story/">My Story</a></li>' +
    '<li><a href="' + site + 'hobbies/" style="color:#a88bfa">Hobbies</a></li></ul></li>' +
    '</ul></nav></div>';
  document.body.insertBefore(header, document.body.firstChild);

  var groups = Array.prototype.map.call(header.querySelectorAll(".fg-has-menu"), function (li) {
    var btn = li.querySelector("button");
    var menu = li.querySelector(".fg-menu");
    var set = function (open) { btn.setAttribute("aria-expanded", String(open)); menu.hidden = !open; };
    var canHover = window.matchMedia("(hover: hover)").matches;
    btn.addEventListener("click", function () { set(canHover ? true : menu.hidden); });
    if (canHover) {
      li.addEventListener("mouseenter", function () { set(true); });
      li.addEventListener("mouseleave", function () { set(false); });
    }
    return { li: li, btn: btn, set: set };
  });
  document.addEventListener("click", function (e) { groups.forEach(function (g) { if (!g.li.contains(e.target)) g.set(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") groups.forEach(function (g) { g.set(false); }); });
})();
