import { colors } from '@help/ui-tokens';

export interface MapPoint { lat: number; lng: number }
export interface MapPin extends MapPoint { title?: string }

export interface MapHtmlOptions {
  center: MapPoint;
  zoom?: number;
  radiusKm?: number;      // draws a translucent service-area circle
  pins?: MapPin[];        // extra read-only markers
  pickable?: boolean;     // tap / drag the main pin to choose a location
  interactive?: boolean;  // pan & zoom (false = static preview)
}

/**
 * Self-contained Leaflet + OpenStreetMap page, themed to help.
 * Free, no API key, no billing. Used by the native WebView and the web iframe.
 * It posts {type:'pick',lat,lng} to the host when the pin moves.
 */
export function mapHtml(o: MapHtmlOptions): string {
  const teal = colors.teal700;
  const data = {
    center: o.center,
    zoom: o.zoom ?? 13,
    radiusKm: o.radiusKm ?? 0,
    pins: o.pins ?? [],
    pickable: !!o.pickable,
    interactive: o.interactive !== false,
    teal,
  };
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#EAF2F1}
  .leaflet-container{font-family:-apple-system,system-ui,sans-serif}
  .pin{width:22px;height:22px;border-radius:50% 50% 50% 0;background:${teal};
       transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var D=${JSON.stringify(data)};
  function send(m){var s=JSON.stringify(m);
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);
    else if(window.parent)window.parent.postMessage(s,'*');}
  var map=L.map('map',{zoomControl:D.interactive,dragging:D.interactive,
    scrollWheelZoom:D.interactive,doubleClickZoom:D.interactive,
    touchZoom:D.interactive,boxZoom:false,keyboard:false,attributionControl:true})
    .setView([D.center.lat,D.center.lng],D.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  var icon=L.divIcon({className:'',html:'<div class="pin"></div>',iconSize:[22,22],iconAnchor:[11,22]});
  var main=L.marker([D.center.lat,D.center.lng],{icon:icon,draggable:D.pickable}).addTo(map);
  var ring=null;
  function ringUpdate(ll){ if(!D.radiusKm)return;
    if(ring)map.removeLayer(ring);
    ring=L.circle(ll,{radius:D.radiusKm*1000,color:D.teal,weight:1,
      fillColor:D.teal,fillOpacity:.08}).addTo(map); }
  ringUpdate([D.center.lat,D.center.lng]);
  (D.pins||[]).forEach(function(p){L.marker([p.lat,p.lng],{icon:icon})
    .addTo(map).bindPopup(p.title||'');});
  if(D.pickable){
    function set(ll){main.setLatLng(ll);ringUpdate(ll);send({type:'pick',lat:ll.lat,lng:ll.lng});}
    map.on('click',function(e){set(e.latlng);});
    main.on('dragend',function(){set(main.getLatLng());});
  }
  send({type:'ready'});
</script></body></html>`;
}
