import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Building, SearchFilters, User, LikedBuilding, SearchHistory } from '../types';

export function useAppState() {
  const location = useLocation();
  
  // 基本状態
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDataMigration, setShowDataMigration] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [likedBuildings, setLikedBuildings] = useState<LikedBuilding[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // 人気検索（動的に取得するため空配列で初期化）
  const [popularSearches, setPopularSearches] = useState<SearchHistory[]>([]);
  
  // ページネーション設定
  const itemsPerPage = 10;
  
  // URLから初期状態を読み込む
  const searchParams = new URLSearchParams(location.search);
  const { filters: initialFilters, currentPage: initialPage } = parseFiltersFromURL(searchParams);
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  
  // フィルターの変更を追跡するためのref
  const prevFiltersRef = useRef<SearchFilters>(filters);
  
  // URLが変更されたときに状態を更新
  const isUpdatingFromURL = useRef(false);
  
  return {
    // 基本状態
    selectedBuilding,
    setSelectedBuilding,
    showDetail,
    setShowDetail,
    showAdminPanel,
    setShowAdminPanel,
    showDataMigration,
    setShowDataMigration,
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    setCurrentUser,
    likedBuildings,
    setLikedBuildings,
    searchHistory,
    setSearchHistory,
    showLoginModal,
    setShowLoginModal,
    showAdvancedSearch,
    setShowAdvancedSearch: (value: boolean) => setShowAdvancedSearch(value),
    
    // 検索・フィルター状態
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    
    // その他の状態
    popularSearches,
    itemsPerPage,
    isUpdatingFromURL,
    prevFiltersRef,
    location,
    searchParams
  };
}

// URLからフィルターとページ情報を解析する関数
function parseFiltersFromURL(searchParams: URLSearchParams): { filters: SearchFilters; currentPage: number } {
  const query = searchParams.get('q') || '';
  const radius = parseInt(searchParams.get('radius') || '5', 10);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const lat = latStr !== null ? parseFloat(latStr) : null;
  const lng = lngStr !== null ? parseFloat(lngStr) : null;

  const filters: SearchFilters = {
    query,
    radius,
    architects: searchParams.get('architects')?.split(',').filter(Boolean) || [],
    buildingTypes: searchParams.get('buildingTypes')?.split(',').filter(Boolean) || [],
    prefectures: searchParams.get('prefectures')?.split(',').filter(Boolean) || [],
    areas: searchParams.get('areas')?.split(',').filter(Boolean) || [],
    hasPhotos: searchParams.get('hasPhotos') === 'true',
    hasVideos: searchParams.get('hasVideos') === 'true',
    currentLocation: lat !== null && !Number.isNaN(lat) && lng !== null && !Number.isNaN(lng)
      ? { lat, lng }
      : null
  };

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  return { filters, currentPage };
}