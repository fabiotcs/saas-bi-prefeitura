'use client'

import { useEffect, useRef } from 'react'

interface Establishment {
  id: string
  name: string
  lat?: number | null
  lng?: number | null
  city: string
  state: string
  rating: number
  status: string
}

interface Props {
  establishments: Establishment[]
  selectedId?: string
  onSelect?: (id: string) => void
  height?: string
}

export default function EstablishmentMap({
  establishments,
  selectedId,
  onSelect,
  height = '400px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map())

  const withCoords = establishments.filter((e) => e.lat != null && e.lng != null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let map: import('leaflet').Map

    async function initMap() {
      const L = (await import('leaflet')).default

      // Fix default marker icon path for Next.js
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.remove()
        markersRef.current.clear()
      }

      // Center on Araçuaí/MG or first point
      const center: [number, number] =
        withCoords.length > 0
          ? [withCoords[0].lat!, withCoords[0].lng!]
          : [-16.8611, -42.0614] // Araçuaí, MG

      map = L.map(containerRef.current!).setView(center, withCoords.length > 1 ? 10 : 14)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      withCoords.forEach((est) => {
        const isSelected = est.id === selectedId
        const color = est.status === 'ACTIVE' ? '#1a56db' : '#9ca3af'
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:${isSelected ? '#dc2626' : color};
            width:${isSelected ? 14 : 10}px;
            height:${isSelected ? 14 : 10}px;
            border-radius:50%;
            border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            cursor:pointer;
          "></div>`,
          iconSize: [isSelected ? 14 : 10, isSelected ? 14 : 10],
          iconAnchor: [isSelected ? 7 : 5, isSelected ? 7 : 5],
        })

        const marker = L.marker([est.lat!, est.lng!], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:sans-serif;min-width:180px">
              <strong style="font-size:13px">${est.name}</strong><br/>
              <span style="font-size:11px;color:#6b7280">${est.city}, ${est.state}</span><br/>
              <span style="font-size:11px">⭐ ${est.rating.toFixed(1)} / 5.0</span>
            </div>`,
          )

        if (onSelect) {
          marker.on('click', () => onSelect(est.id))
        }

        markersRef.current.set(est.id, marker)
      })

      if (withCoords.length > 1) {
        const bounds = L.latLngBounds(withCoords.map((e) => [e.lat!, e.lng!]))
        map.fitBounds(bounds, { padding: [32, 32] })
      }
    }

    void initMap()

    // Captura o valor do ref no corpo do effect para uso seguro no cleanup
    const markersSnapshot = markersRef.current

    return () => {
      const map = mapRef.current
      if (map) {
        map.remove()
        mapRef.current = null
        markersSnapshot.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishments.length, selectedId])

  if (withCoords.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-xl border bg-muted flex items-center justify-center"
      >
        <p className="text-sm text-muted-foreground">
          Nenhum estabelecimento com coordenadas cadastradas.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </div>
  )
}
