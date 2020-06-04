function onLoad() {
  var menu = document.getElementById("buildsMenu");
  for (var index in builds) {
    menu.innerHTML += "<div onclick=\"openBuild(" + builds[index].id + ")\"> &gt; " + builds[index].name + "</div>";
  }
}

function openBuild(buildId) {
  var buildDetails = document.getElementById("buildDetails");
  var build = builds.find(x => x.id == buildId);

  buildDetails.innerHTML = "<div class=\"build-details-name\">" + build.name + "</div>";
  buildDetails.innerHTML += "<div class=\"build-details-date\">Последнее обновление: " + new Date(build.lastUpdate).toLocaleDateString(); + "</div>";

  var buildDetailsPartsDiv = document.createElement("div");
  buildDetailsPartsDiv.classList.add("build-details-parts");
  for (var index in build.parts) {
    buildDetailsPartsDiv.innerHTML += "<div>" + (parseInt(index) + parseInt(1)) + ") " + (build.parts[index].count > 1 ? ("x" + build.parts[index].count) : ("")) + " <a href=\"" + build.parts[index].link + "\" target=\"_blank\">" + build.parts[index].name + "</a> - " + build.parts[index].price + "р" + (build.parts[index].count > 1 ? (" (" + build.parts[index].count * build.parts[index].price + "р)") : ("")) + "</div>";
  }
  buildDetails.appendChild(buildDetailsPartsDiv);
}