// Sub-navigation for each hobby page: only the current hobby's own pages,
// shown as a horizontal row. Runs right after the (empty)
// <header data-menu> element.
(function () {
  const MENU = {
    coffee: [["Beans", "index.html"], ["Recipes", "recipes.html"], ["Equipment", "equipment.html"]],
    wine: [["Wines", "index.html"]],
    books: [["Read", "index.html"]],
    vinyls: [["Vinyls", "index.html"]]
  };

  const script = document.currentScript;
  const root = new URL("../", script.src).pathname; // e.g. "/hobbies/"
  const header = document.querySelector("header[data-menu]");
  const section = document.body.dataset.section;
  const pages = MENU[section];
  if (!header || !pages) return;

  const here = window.location.pathname.replace(/index\.html$/, "");
  const href = (page) => root + section + "/" + page;
  const isHere = (page) => href(page).replace(/index\.html$/, "") === here;

  const links = pages
    .map(([label, page]) => `<a href="${href(page)}"${isHere(page) ? ' class="active" aria-current="page"' : ""}>${label}</a>`)
    .join("");

  header.innerHTML = `<nav class="site-nav" aria-label="${section} pages">${links}</nav>`;
})();
