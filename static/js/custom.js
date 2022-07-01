(function () {
  function addAnchor (heading) {
    var anchor = document.createElement("a")
    heading.classList.add("has-anchor")
    anchor.classList.add("heading-anchor")
    anchor.setAttribute("href", "#" + heading.id)
    heading.prepend(anchor)
  }

  function addAnchors (evt) {
    var headings = document.querySelectorAll("h1[id], h2[id], h3[id]")
    headings.forEach(addAnchor)
  }

  window.addEventListener("load", addAnchors)
})();
