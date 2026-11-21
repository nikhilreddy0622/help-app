import { colors } from '@help/ui-tokens';

export interface MapPoint { lat: number; lng: number }
export interface MapPin extends MapPoint { id?: string; title?: string; subtitle?: string }

export interface MapHtmlOptions {
  center: MapPoint;
  zoom?: number;
  radiusKm?: number;      // translucent circle around the centre (search area / service area)
  pins?: MapPin[];        // professionals; tapping one posts {type:'open', id}
  pickable?: boolean;     // tap / drag the main pin to choose a location
  interactive?: boolean;  // pan & zoom (false = static preview)
  hideCenter?: boolean;   // no centre marker (e.g. approximate-area preview)
  fitPins?: boolean;      // zoom to show all pins
}

/** Page origin for the WebView; OSM's tile policy rejects tile requests without a Referer. */
export const MAP_BASE_URL = 'https://www.helpbharath.com/';

/**
 * Self-contained Leaflet + OpenStreetMap page, themed to help.
 * Free, no API key. Used by the native WebView and the web iframe.
 * Posts {type:'pick',lat,lng} when the pin moves and {type:'open',id} when a professional pin is tapped.
 */
export function mapHtml(o: MapHtmlOptions): string {
  const data = {
    center: o.center,
    zoom: o.zoom ?? 13,
    radiusKm: o.radiusKm ?? 0,
    pins: o.pins ?? [],
    pickable: !!o.pickable,
    interactive: o.interactive !== false,
    hideCenter: !!o.hideCenter,
    fitPins: !!o.fitPins,
    teal: colors.teal700,
    navy: colors.navy,
  };
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<meta name="referrer" content="origin"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#EEF3F2}
  .leaflet-container{font-family:-apple-system,system-ui,Roboto,sans-serif}
  .leaflet-tile-pane{filter:saturate(.55) contrast(.96) brightness(1.03)}
  .pick{width:26px;height:26px;border-radius:50% 50% 50% 0;background:${data.teal};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35)}
  .me{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.18)}
  .pro{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${data.teal};color:#fff;font:700 12px system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)}
  .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 6px 20px rgba(15,23,42,.18)}
  .leaflet-popup-content{margin:10px 14px;min-width:150px}
  .t{font:600 14px system-ui;color:${data.navy}} .s{font:12px system-ui;color:#64748B;margin-top:2px}
  .go{margin-top:8px;display:inline-block;font:600 13px system-ui;color:${data.teal};cursor:pointer}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var D=${JSON.stringify(data).replace(/</g, '\\u003c')};
  function send(m){var s=JSON.stringify(m);
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);
    else if(window.parent)window.parent.postMessage(s,'*');}
  function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var map=L.map('map',{zoomControl:false,dragging:D.interactive,scrollWheelZoom:D.interactive,doubleClickZoom:D.interactive,
    touchZoom:D.interactive,boxZoom:false,keyboard:false,attributionControl:true}).setView([D.center.lat,D.center.lng],D.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  var ring=null;
  function ringUpdate(ll){ if(!D.radiusKm)return; if(ring)map.removeLayer(ring);
    ring=L.circle(ll,{radius:D.radiusKm*1000,color:D.teal,weight:1.5,fillColor:D.teal,fillOpacity:.08}).addTo(map); }
  ringUpdate([D.center.lat,D.center.lng]);
  var main=null;
  if(!D.hideCenter){
    var icon=D.pickable?L.divIcon({className:'',html:'<div class="pick"></div>',iconSize:[26,26],iconAnchor:[13,26]})
                       :L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]});
    main=L.marker([D.center.lat,D.center.lng],{icon:icon,draggable:D.pickable,zIndexOffset:1000}).addTo(map);
  }
  var bounds=[];
  (D.pins||[]).forEach(function(p){
    var initials=esc((p.title||'?').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase());
    var m=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:'<div class="pro">'+initials+'</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
    bounds.push([p.lat,p.lng]);
    if(p.id){
      m.bindPopup('<div class="t">'+esc(p.title)+'</div>'+(p.subtitle?'<div class="s">'+esc(p.subtitle)+'</div>':'')+'<div class="go" data-id="'+esc(p.id)+'">View profile ›</div>');
    }
  });
  document.addEventListener('click',function(e){var t=e.target; if(t&&t.classList&&t.classList.contains('go'))send({type:'open',id:t.getAttribute('data-id')});});
  if(D.fitPins&&bounds.length){ if(main)bounds.push([D.center.lat,D.center.lng]); map.fitBounds(bounds,{padding:[40,40],maxZoom:15}); }
  if(D.pickable&&main){
    function set(ll){main.setLatLng(ll);ringUpdate(ll);send({type:'pick',lat:ll.lat,lng:ll.lng});}
    map.on('click',function(e){set(e.latlng);});
    main.on('dragend',function(){set(main.getLatLng());});
  }
  send({type:'ready'});
</script></body></html>`;
}
