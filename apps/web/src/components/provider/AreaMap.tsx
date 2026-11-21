import { useMemo } from 'react';

/** Static OpenStreetMap preview of a professional's approximate area (~1 km circle). Exact address is never shown. */
export function AreaMap({ lat, lng, height = 180 }: { lat: number; lng: number; height?: number }) {
  const srcDoc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8"/><meta name="referrer" content="origin"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;background:#EEF3F2}.leaflet-tile-pane{filter:saturate(.6)}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>var m=L.map('m',{zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView([${lat},${lng}],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);
L.circle([${lat},${lng}],{radius:1000,color:'#0B7A6E',weight:2,fillColor:'#0B7A6E',fillOpacity:.12}).addTo(m);</script></body></html>`, [lat, lng]);
  return <iframe title="Approximate area on map" srcDoc={srcDoc} loading="lazy" className="block w-full border-0" style={{ height }} />;
}
