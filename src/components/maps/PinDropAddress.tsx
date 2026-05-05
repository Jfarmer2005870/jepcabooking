import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Crosshair } from "lucide-react";

// Fix default marker icons (Vite/webpack don't bundle Leaflet's images by default)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  initialCoords?: { lat: number; lng: number };
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // USA center

function Recenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 16, { duration: 0.6 });
  }, [coords, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PinDropAddress({ value, onChange, initialCoords }: Props) {
  const [coords, setCoords] = useState<[number, number] | null>(
    initialCoords ? [initialCoords.lat, initialCoords.lng] : null
  );
  const [searching, setSearching] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<number | null>(null);

  const reverseGeocode = async (lat: number, lng: number) => {
    setReverse(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      const addr = data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onChange(addr, { lat, lng });
    } catch {
      onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, { lat, lng });
    } finally {
      setReverse(false);
    }
  };

  const handlePick = (lat: number, lng: number) => {
    setCoords([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoords([lat, lng]);
        onChange(data[0].display_name, { lat, lng });
      }
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      () => {}
    );
  };

  // Debounced search as user types in the search field
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = window.setTimeout(() => runSearch(query), 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Search address or place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch(query);
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={useMyLocation} title="Use my location">
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>
      <div className="h-64 w-full overflow-hidden rounded-md border">
        <MapContainer
          center={coords || DEFAULT_CENTER}
          zoom={coords ? 16 : 4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <Recenter coords={coords} />
          {coords && (
            <Marker
              position={coords}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const { lat, lng } = m.getLatLng();
                  handlePick(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="flex-1 break-words">
          {searching || reverse ? (
            <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Locating…</span>
          ) : value ? value : "Tap the map or search to drop a pin"}
        </span>
      </div>
    </div>
  );
}
