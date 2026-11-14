import { useEffect, useMemo, useRef } from 'react';

export interface LatLng { lat: number; lng: number }
interface Props {
  value: LatLng;
  radiusKm?: number;
  onChange: (p: LatLng) => void;
  height?: number;
}

const TEAL = '#0F766E';

/** Self-contained Leaflet + OpenStreetMap picker (free, no key, no deps). Drag the pin or tap to choose. */
function html(v: LatLng, radiusKm: number) {
  const d = JSON.stringify({ lat: v.lat || 12.9716, lng: v.lng || 77.5946, radiusKm, teal: TEAL, zoom: v.lat ? 15 : 11 });
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;background:#EAF2F1}
.pin{width:24px;height:24px;border-radius:50% 50% 50% 0;background:${TEAL};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)}
.hint{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:500;background:rgba(15,23,42,.78);color:#fff;font:12px/1.2 system-ui;padding:6px 10px;border-radius:999px}</style>
</head><body><div id="m"></div><div class="hint">Tap or drag the pin to set your base</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var D=${d};
function send(m){parent.postMessage(JSON.stringify(m),'*');}
var map=L.map('m',{attributionControl:true}).setView([D.lat,D.lng],D.zoom);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var icon=L.divIcon({className:'',html:'<div class="pin"></div>',iconSize:[24,24],iconAnchor:[12,24]});
var mk=L.marker([D.lat,D.lng],{icon:icon,draggable:true}).addTo(map);
var ring=null;
function ringUpd(ll){if(!D.radiusKm)return;if(ring)map.removeLayer(ring);
 ring=L.circle(ll,{radius:D.radiusKm*1000,color:D.teal,weight:1,fillColor:D.teal,fillOpacity:.08}).addTo(map);}
ringUpd([D.lat,D.lng]);
function set(ll){mk.setLatLng(ll);ringUpd(ll);send({type:'pick',lat:+ll.lat.toFixed(5),lng:+ll.lng.toFixed(5)});}
map.on('click',function(e){set(e.latlng);});
mk.on('dragend',function(){set(mk.getLatLng());});
window.addEventListener('message',function(e){try{var m=JSON.parse(e.data);
 if(m&&m.type==='set'){map.setView([m.lat,m.lng],15);mk.setLatLng([m.lat,m.lng]);ringUpd([m.lat,m.lng]);}}catch(x){}});
</script></body></html>`;
}

export function MapPicker({ value, radiusKm = 0, onChange, height = 240 }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  // Build the page once; push later coordinate/radius changes in via postMessage so the map doesn't reload.
  const srcDoc = useMemo(() => html(value, radiusKm), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (ref.current && e.source !== ref.current.contentWindow) return;
      try {
        const m = JSON.parse(typeof e.data === 'string' ? e.data : '{}') as { type: string; lat: number; lng: number };
        if (m.type === 'pick') onChange({ lat: m.lat, lng: m.lng });
      } catch { /* ignore */ }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onChange]);
  // When the parent sets coordinates (e.g. "Use my location" or city pick), move the pin.
  useEffect(() => {
    if (value.lat && value.lng) ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'set', lat: value.lat, lng: value.lng }), '*');
  }, [value.lat, value.lng]);
  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ height }}>
      <iframe ref={ref} srcDoc={srcDoc} title="Choose location on map" className="h-full w-full border-0" />
    </div>
  );
}
