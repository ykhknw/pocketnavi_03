import React, { useEffect, useRef, useState } from 'react';
import { Building } from '../types';

// Leaflet型定義
interface LeafletMap {
  addLayer: (layer: LeafletMarker) => void;
  removeLayer: (layer: LeafletMarker) => void;
  setView: (latlng: [number, number], zoom: number) => void;
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
  on: (event: string, handler: () => void) => LeafletMarker;
}
import { Globe, Play, MapPin } from 'lucide-react';
import { t } from '../utils/translations';

interface MapProps {
  buildings: Building[];
  selectedBuilding: Building | null;
  onBuildingSelect: (building: Building) => void;
  currentLocation: { lat: number; lng: number } | null;
  language: 'ja' | 'en';
  startIndex?: number;
  onSearchAround?: (lat: number, lng: number) => void;
}

function MapComponent({ buildings, selectedBuilding, onBuildingSelect, currentLocation, language, startIndex, onSearchAround }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const isInitializingRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);



  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || isInitializingRef.current) return;
    
    isInitializingRef.current = true;

    const initMap = async () => {
      try {
        await loadLeaflet();
        
        const L = (window as any).L;
        if (!L) {
          console.error('Leaflet failed to load');
          isInitializingRef.current = false;
          return;
        }
        
        // Double check that container is not already initialized
        if (mapInstanceRef.current) {
          isInitializingRef.current = false;
          return;
        }
        
        const map = L.map(mapRef.current, {
          center: [35.6762, 139.6503],
          zoom: 12,
          zoomControl: false
        });
        
        // ズームコントロールを左下に配置
        L.control.zoom({
          position: 'bottomleft'
        }).addTo(map);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);
        
        mapInstanceRef.current = map;
        markersRef.current = [];
        setIsMapReady(true);
        isInitializingRef.current = false;
      } catch (error) {
        console.error('Failed to initialize map:', error);
        isInitializingRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          // Clear all markers first
          markersRef.current.forEach(marker => {
            if (marker && mapInstanceRef.current) {
              mapInstanceRef.current.removeLayer(marker);
            }
          });
          markersRef.current = [];
          
          // Remove map instance
        mapInstanceRef.current.remove();
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
        mapInstanceRef.current = null;
        isInitializingRef.current = false;
        setIsMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || isInitializingRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];

      // Add building markers - show only selected building when in detail view
      const buildingsToShow = selectedBuilding ? [selectedBuilding] : buildings;
      buildingsToShow.forEach((building, index) => {
        // Validate building coordinates
        if (!building || typeof building.lat !== 'number' || typeof building.lng !== 'number' ||
            isNaN(building.lat) || isNaN(building.lng) ||
            building.lat < -90 || building.lat > 90 ||
            building.lng < -180 || building.lng > 180) {
          console.warn('Invalid coordinates for building:', building?.title || 'Unknown');
          return;
        }

        try {
          const isSelected = selectedBuilding && selectedBuilding.id === building.id;
          const isDetailView = selectedBuilding !== null; // 建築物詳細表示時かどうか
          
          let customIcon;
          if (isDetailView) {
            // 建築物詳細表示時はleaflet-color-markersの赤いマーカーを使用
            customIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
          } else {
            // 建築物一覧表示時は数字付きの円形マーカーを使用
            customIcon = L.divIcon({
              html: `<div style="background-color: ${isSelected ? '#dc2626' : '#2563eb'}; color: white; border-radius: 50%; width: ${isSelected ? '40px' : '32px'}; height: ${isSelected ? '40px' : '32px'}; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? '16px' : '14px'}; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${(startIndex || 0) + index + 1}</div>`,
              className: 'custom-marker',
              iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
              iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16]
            });
          }

          const marker = L.marker([building.lat, building.lng], { 
            icon: customIcon,
            isMarker: true
          })
          .bindPopup(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
                <a href="/building/${building.slug || building.id}" style="color: #1e40af; text-decoration: none; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${language === 'ja' ? building.title : building.titleEn}</a>
              </h3>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
                ${building.architects.map(a => {
                  const architectName = language === 'ja' ? a.architectJa : a.architectEn;
                  const architectNames = architectName.split('　').filter(name => name.trim());
                  return architectNames.map(name => {
                    const trimmedName = name.trim();
                    if (a.slug) {
                      return `<a href="/architect/${a.slug}" style="background-color: #dbeafe; color: #2563eb; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 500; text-decoration: none; cursor: pointer;" onmouseover="this.style.backgroundColor='#bfdbfe'" onmouseout="this.style.backgroundColor='#dbeafe'">${trimmedName}</a>`;
                    } else {
                      return `<span style="background-color: #dbeafe; color: #2563eb; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 500;">${trimmedName}</span>`;
                    }
                  }).join('');
                }).join('')}
              </div>
            </div>
          `, {
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });

          mapInstanceRef.current.addLayer(marker);
          markersRef.current.push(marker);
        } catch (error) {
          console.error('Error creating marker for building:', building.title, error);
        }
      });

      // Add current location marker
      if (currentLocation && 
          typeof currentLocation.lat === 'number' && 
          typeof currentLocation.lng === 'number' &&
          !isNaN(currentLocation.lat) && !isNaN(currentLocation.lng) &&
          currentLocation.lat >= -90 && currentLocation.lat <= 90 &&
          currentLocation.lng >= -180 && currentLocation.lng <= 180) {
        try {
          const locationIcon = L.divIcon({
            html: `<div style="background-color: #ef4444; border-radius: 50%; width: 16px; height: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); animation: pulse 2s infinite;"></div>`,
            className: 'location-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const locationMarker = L.marker([currentLocation.lat, currentLocation.lng], { 
            icon: locationIcon,
            isLocationMarker: true
          })
          .bindPopup(`<div style="padding: 8px;"><strong>${language === 'ja' ? '現在地' : 'Current Location'}</strong></div>`, {
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });

          mapInstanceRef.current.addLayer(locationMarker);
          markersRef.current.push(locationMarker);
        } catch (error) {
          console.error('Error creating location marker:', error);
        }
      }

      // Fit map to show all markers with enhanced validation
      const validBuildings = buildings.filter(building => 
        building && 
        typeof building.lat === 'number' && 
        typeof building.lng === 'number' &&
        !isNaN(building.lat) && !isNaN(building.lng) &&
        building.lat >= -90 && building.lat <= 90 &&
        building.lng >= -180 && building.lng <= 180
      );

      if (validBuildings.length > 0) {
        try {
          // 建築物詳細表示時は選択された建築物を中心に表示
          if (selectedBuilding) {
            mapInstanceRef.current.setView([selectedBuilding.lat, selectedBuilding.lng], 15);
          } else {
            // 建築物一覧表示時は従来通り全マーカーを表示
            const bounds = L.latLngBounds();
            let hasValidBounds = false;
            
            validBuildings.forEach(building => {
              try {
                bounds.extend([building.lat, building.lng]);
                hasValidBounds = true;
              } catch (error) {
                console.warn('Error extending bounds for building:', building.title, error);
              }
            });
            
            if (currentLocation && 
                typeof currentLocation.lat === 'number' && 
                typeof currentLocation.lng === 'number' &&
                !isNaN(currentLocation.lat) && !isNaN(currentLocation.lng)) {
              try {
                bounds.extend([currentLocation.lat, currentLocation.lng]);
                hasValidBounds = true;
              } catch (error) {
                console.warn('Error extending bounds for current location:', error);
              }
            }
            
            if (hasValidBounds && bounds.isValid()) {
              // 建築物詳細ページと同じ適度なZOOMレベル（16）を最大値として設定
              mapInstanceRef.current.fitBounds(bounds, { 
                padding: [20, 20],
                maxZoom: 16
              });
            } else {
              // Fallback to first valid building
              mapInstanceRef.current.setView([validBuildings[0].lat, validBuildings[0].lng], 12);
            }
          }
        } catch (error) {
          console.error('Error fitting bounds:', error);
          // Final fallback to first valid building
          if (validBuildings.length > 0) {
            try {
              mapInstanceRef.current.setView([validBuildings[0].lat, validBuildings[0].lng], 12);
            } catch (fallbackError) {
              console.error('Error setting fallback view:', fallbackError);
              // Ultimate fallback to Tokyo
              mapInstanceRef.current.setView([35.6762, 139.6503], 12);
            }
          }
        }
      } else if (currentLocation && 
                 typeof currentLocation.lat === 'number' && 
                 typeof currentLocation.lng === 'number' &&
                 !isNaN(currentLocation.lat) && !isNaN(currentLocation.lng)) {
        // Only current location, no valid buildings
        try {
          mapInstanceRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
        } catch (error) {
          console.error('Error setting current location view:', error);
          mapInstanceRef.current.setView([35.6762, 139.6503], 12);
        }
      } else {
        // No valid buildings and no current location, use default view
        try {
          mapInstanceRef.current.setView([35.6762, 139.6503], 12);
        } catch (error) {
          console.error('Error setting default view:', error);
          mapInstanceRef.current.setView([35.6762, 139.6503], 12);
        }
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [buildings, selectedBuilding, currentLocation, isMapReady, language, startIndex]);

  const loadLeaflet = () => {
    return new Promise((resolve) => {
      if ((window as any).L) {
        resolve(null);
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(null);
      script.onerror = () => {
        console.error('Failed to load Leaflet');
        resolve(null);
      };
      document.head.appendChild(script);
    });
  };

  // ボタンの順序をデバッグ用にログ出力
  console.log('Map buttons order:', [
    { order: 1, text: t('searchAround', language) },
    { order: 2, text: t('getDirections', language) },
    { order: 3, text: t('viewOnGoogleMap', language) }
  ]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ zIndex: 1 }}>
      <div 
        ref={mapRef} 
        className="w-full h-96"
        style={{ minHeight: '400px' }}
      >
        {!isMapReady && (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-gray-500">{language === 'ja' ? '地図を読み込み中...' : 'Loading map...'}</div>
          </div>
        )}
      </div>
      
      {/* Action buttons for selected building */}
      {selectedBuilding && onSearchAround && (
        <div className="p-4 space-y-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            data-order="1"
            data-testid="search-around-button"
            onClick={() => onSearchAround(selectedBuilding.lat, selectedBuilding.lng)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 hover:border-green-300 rounded-lg transition-colors"
            style={{ order: 1 }}
          >
            <MapPin className="h-4 w-4" />
            {t('searchAround', language)}
          </button>
          <button
            data-order="2"
            data-testid="get-directions-button"
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedBuilding.lat},${selectedBuilding.lng}`, '_blank')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 hover:border-yellow-300 rounded-lg transition-colors"
            style={{ order: 2 }}
          >
            <Play className="h-4 w-4" />
            {t('getDirections', language)}
          </button>
          <button
            data-order="3"
            data-testid="view-google-maps-button"
            onClick={() => window.open(`https://www.google.com/maps?q=${selectedBuilding.lat},${selectedBuilding.lng}`, '_blank')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
            style={{ order: 3 }}
          >
            <Globe className="h-4 w-4" />
            {t('viewOnGoogleMap', language)}
          </button>
        </div>
      )}
    </div>
  );
}

// Props比較関数
const arePropsEqual = (prevProps: MapProps, nextProps: MapProps): boolean => {
  return (
    (prevProps.buildings?.length ?? 0) === (nextProps.buildings?.length ?? 0) &&
    (prevProps.buildings?.every((building, index) => 
      building.id === nextProps.buildings?.[index]?.id
    ) ?? true) &&
    prevProps.selectedBuilding?.id === nextProps.selectedBuilding?.id &&
    prevProps.currentLocation?.lat === nextProps.currentLocation?.lat &&
    prevProps.currentLocation?.lng === nextProps.currentLocation?.lng &&
    prevProps.language === nextProps.language &&
    prevProps.startIndex === nextProps.startIndex &&
    prevProps.onSearchAround === nextProps.onSearchAround
  );
};

export default React.memo(MapComponent, arePropsEqual);