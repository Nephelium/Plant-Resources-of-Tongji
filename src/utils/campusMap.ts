import L from "leaflet";
import metadata from "../data/campus-map.json";
import { ASSET_BASE } from "../env";

export function createCampusBasemap(
  map: L.Map,
  dark: boolean,
  onError: (failed: boolean) => void,
) {
  const pane = map.createPane("campusLabels");
  pane.style.zIndex = "450";
  pane.style.pointerEvents = "none";
  const url = (night: boolean) =>
    `${ASSET_BASE}maps/campus-${night ? "dark" : "light"}.svg`;
  const image = L.imageOverlay(url(dark), metadata.bounds as L.LatLngBoundsExpression, {
    pane: "tilePane",
    className: "campus-basemap",
    interactive: false,
    attribution: "校园调绘图 · 同济大学植物资源",
  });
  image.on("error", () => onError(true));
  image.on("load", () => onError(false));
  const labels = L.layerGroup();
  const group = L.layerGroup([image, labels]);
  const ordered = [...metadata.labels].sort((a, b) => Number(b.major) - Number(a.major));

  function refreshLabels() {
    labels.clearLayers();
    if (!map.hasLayer(group) || map.getZoom() < 14) return;
    const size = map.getSize();
    const mapRect = map.getContainer().getBoundingClientRect();
    const controls = map.getContainer().parentElement?.querySelectorAll<HTMLElement>(
      ".map-base-switch, .map-theme-switch, .map-actions, .leaflet-control",
    ) ?? [];
    const reserved = [...controls].map((control) => {
      const r = control.getBoundingClientRect();
      return L.bounds([r.left - mapRect.left - 6, r.top - mapRect.top - 6],
        [r.right - mapRect.left + 6, r.bottom - mapRect.top + 6]);
    });
    const placed: L.Bounds[] = [];
    for (const label of ordered) {
      if (!label.major && map.getZoom() < 15) continue;
      const position = label.position as L.LatLngTuple;
      const point = map.latLngToContainerPoint(position);
      const width = Math.min(236, label.name.length * 11 + 38);
      const rect = L.bounds([point.x - width / 2 - 3, point.y - 12],
        [point.x + width / 2 + 3, point.y + 12]);
      if (point.x < width / 2 + 8 || point.x > size.x - width / 2 - 8 ||
          point.y < 20 || point.y > size.y - 20 ||
          reserved.some((other) => rect.intersects(other)) ||
          placed.some((other) => rect.intersects(other))) continue;
      const text = document.createElement("span");
      const code = document.createElement("small");
      code.textContent = label.code;
      text.append(code, document.createTextNode(label.name));
      text.title = `${label.code} ${label.fullName}`;
      L.marker(position, {
        pane: "campusLabels",
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "campus-landmark",
          html: text,
          iconSize: [width, 22],
          iconAnchor: [width / 2, 11],
        }),
      }).addTo(labels);
      placed.push(rect);
    }
  }
  group.on("add", () => {
    map.on("zoomend moveend resize", refreshLabels);
    refreshLabels();
  });
  group.on("remove", () => {
    map.off("zoomend moveend resize", refreshLabels);
    labels.clearLayers();
  });
  return {
    layer: group,
    setTheme(night: boolean) {
      if (image.getElement()?.getAttribute("src") !== url(night)) image.setUrl(url(night));
    },
    retry(night: boolean) {
      image.setUrl(url(night));
    },
    dispose() {
      map.off("zoomend moveend resize", refreshLabels);
      group.remove();
      group.clearLayers();
      image.off();
    },
  };
}
