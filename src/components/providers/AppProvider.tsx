import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContextType } from '../../types/app';
import { Building } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { useAppActions } from '../../hooks/useAppActions';
import { useAppHandlers } from '../../hooks/useAppHandlers';
import { useAppEffects } from '../../hooks/useAppEffects';
import { usePopularSearches } from '../../hooks/usePopularSearches';


// React Queryクライアントの設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間は新鮮とみなす
      gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
      retry: 1, // リトライ回数を1回に制限
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    },
  },
});

const AppContext = createContext<AppContextType | null>(null);

function AppProviderContent({ children }: { children: React.ReactNode }) {
  // 状態管理
  const state = useAppState();
  
  // アクション管理
  const actions = useAppActions();
  
  // イベントハンドラー
  const handlers = useAppHandlers();
  
  // 副作用管理
  const effects = useAppEffects();
  
  // 動的人気検索
  const { popularSearches, loading: popularSearchesLoading, error: popularSearchesError } = usePopularSearches(7);
  
  // Supabase建物データの取得
  const buildingsData = effects.useSupabaseBuildingsEffect(
    state.filters,
    state.currentPage,
    state.itemsPerPage,
    effects.useApi,
    effects.language
  );


  
  // URL同期効果（location.search の変化に反応して実行）
  const syncURLToState = effects.useURLSyncEffect(
    state.location,
    new URLSearchParams(state.location.search),
    state.setFilters,
    state.setCurrentPage,
    state.isUpdatingFromURL
  );
  useEffect(() => {
    syncURLToState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.location.search]);
  
  // URL更新効果（filters/page の変化に反応して実行）
  const updateURL = effects.useURLUpdateEffect(
    state.filters,
    state.currentPage,
    actions.updateURLWithFilters,
    state.isUpdatingFromURL
  );
  useEffect(() => {
    const cleanup = updateURL();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters, state.currentPage]);
  
  // 位置情報効果（現在地が更新されたら反映）
  const updateLocation = effects.useGeolocationEffect(
    effects.geoLocation,
    state.setFilters
  );
  useEffect(() => {
    updateLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effects.geoLocation]);
  
  // フィルター変更効果（依存の変化で実行）
  const handleFilterChange = effects.useFilterChangeEffect(
    effects.useApi,
    buildingsData.buildings || [], // 安全なアクセスを追加
    state.filters,
    effects.setFilteredBuildings,
    state.setCurrentPage,
    state.searchHistory,
    state.setSearchHistory,
    state.prevFiltersRef,
    effects.language
  );
  useEffect(() => {
    handleFilterChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effects.useApi, buildingsData.buildings, state.filters, effects.language]);
  
  // ページネーション計算
  const totalItemsForPagination = effects.useApi 
    ? buildingsData.totalBuildings  // API使用時はAPI結果数
    : effects.filteredBuildings.length;  // モックデータの結果数

  const pagination = actions.calculatePagination(
    totalItemsForPagination,
    state.itemsPerPage,
    state.currentPage
  );
  
  console.log('🔍 ページネーション計算詳細:', {
    useApi: effects.useApi,
    buildingsDataTotal: buildingsData.totalBuildings,
    filteredBuildingsLength: effects.filteredBuildings.length,
    totalItemsForPagination,
    itemsPerPage: state.itemsPerPage,
    currentPage: state.currentPage,
    calculatedPagination: pagination,
    totalPages: pagination.totalPages,
    startIndex: pagination.startIndex
  });




  
  // デバッグログ
  console.log('ページネーション計算:', {
    useApi: effects.useApi,
    totalBuildings: buildingsData.totalBuildings,
    filteredBuildingsLength: effects.filteredBuildings.length,
    itemsPerPage: state.itemsPerPage,
    currentPage: state.currentPage,
    totalPages: pagination.totalPages,
    startIndex: pagination.startIndex,
    hasArchitectFilter: state.filters.architects && state.filters.architects.length > 0,
    architects: state.filters.architects,
  });
  
  // フィルター状態の詳細ログ
  console.log('🔍 現在のフィルター状態:', {
    completionYear: state.filters.completionYear,
    completionYearType: typeof state.filters.completionYear,
    isNumber: typeof state.filters.completionYear === 'number',
    isNaN: typeof state.filters.completionYear === 'number' ? isNaN(state.filters.completionYear) : 'N/A',
    allFilters: state.filters
  });
  
  // 現在の建物リスト
  const currentBuildings = effects.useApi 
    ? (buildingsData.buildings || []) // API使用時はbuildings（既にページング済み）
    : effects.filteredBuildings.slice(pagination.startIndex, pagination.startIndex + state.itemsPerPage);

  // ハンドラー関数のラッパー（useCallbackで最適化）
  const handleBuildingSelect = useCallback((building: Building | null) => 
    handlers.handleBuildingSelect(building, state.setSelectedBuilding, state.setShowDetail),
    [handlers.handleBuildingSelect, state.setSelectedBuilding, state.setShowDetail]
  );
    
  const handleLike = useCallback((buildingId: number) => 
    handlers.handleLike(buildingId, state.likedBuildings, state.setLikedBuildings, buildingsData.buildings || []),
    [handlers.handleLike, state.likedBuildings, state.setLikedBuildings, buildingsData.buildings]
  );
    
  const handlePhotoLike = useCallback((photoId: number) => 
    handlers.handlePhotoLike(photoId),
    [handlers.handlePhotoLike]
  );
    
  const handleLogin = useCallback((email: string, password: string) => 
    handlers.handleLogin(email, password, state.setIsAuthenticated, state.setCurrentUser, state.setShowLoginModal),
    [handlers.handleLogin, state.setIsAuthenticated, state.setCurrentUser, state.setShowLoginModal]
  );
    
  const handleRegister = useCallback((email: string, password: string, name: string) => 
    handlers.handleRegister(email, password, name, state.setIsAuthenticated, state.setCurrentUser, state.setShowLoginModal),
    [handlers.handleRegister, state.setIsAuthenticated, state.setCurrentUser, state.setShowLoginModal]
  );
    
  const handleLogout = useCallback(() => 
    handlers.handleLogout(state.setIsAuthenticated, state.setCurrentUser),
    [handlers.handleLogout, state.setIsAuthenticated, state.setCurrentUser]
  );
    
  const handleAddBuilding = useCallback((buildingData: Partial<Building>) => 
    handlers.handleAddBuilding(buildingData),
    [handlers.handleAddBuilding]
  );
    
  const handleUpdateBuilding = useCallback((id: number, buildingData: Partial<Building>) => 
    handlers.handleUpdateBuilding(id, buildingData),
    [handlers.handleUpdateBuilding]
  );
    
  const handleDeleteBuilding = useCallback((id: number) => 
    handlers.handleDeleteBuilding(id),
    [handlers.handleDeleteBuilding]
  );
    
  const handleSearchFromHistory = useCallback((query: string) => 
    handlers.handleSearchFromHistory(query, state.setFilters, state.setCurrentPage),
    [handlers.handleSearchFromHistory, state.setFilters, state.setCurrentPage]
  );
    
  const handleLikedBuildingClick = useCallback((buildingId: number) => 
    handlers.handleLikedBuildingClick(buildingId, state.likedBuildings, state.setLikedBuildings, buildingsData.buildings),
    [handlers.handleLikedBuildingClick, state.likedBuildings, state.setLikedBuildings, buildingsData.buildings]
  );
    
  const handleRemoveLikedBuilding = useCallback((buildingId: number) => 
    handlers.handleRemoveLikedBuilding(buildingId, state.setLikedBuildings),
    [handlers.handleRemoveLikedBuilding, state.setLikedBuildings]
  );
    
  const handleSearchAround = useCallback((lat: number, lng: number) => 
    handlers.handleSearchAround(lat, lng, state.setFilters, state.setCurrentPage),
    [handlers.handleSearchAround, state.setFilters, state.setCurrentPage]
  );
    
  const handlePageChange = useCallback((page: number) => 
    handlers.handlePageChange(page, state.setCurrentPage, state.setFilters, state.location),
    [handlers.handlePageChange, state.setCurrentPage, state.setFilters, state.location]
  );

  // 検索開始時のコールバック（建築物詳細をクリア、ページ番号をリセット）
  const handleSearchStart = useCallback(() => {
    console.log('🔍 検索開始: 建築物詳細をクリア、ページ番号をリセット');
    state.setSelectedBuilding(null);
    state.setShowDetail(false);
    state.setCurrentPage(1); // 検索時にページ番号を1にリセット
  }, [state.setSelectedBuilding, state.setShowDetail, state.setCurrentPage]);

  // 検索履歴削除ハンドラー
  const handleRemoveRecentSearch = useCallback((index: number) => {
    console.log('🗑️ 検索履歴削除:', index);
    state.setSearchHistory(prev => prev.filter((_, i) => i !== index));
  }, [state.setSearchHistory]);

  // フィルターが変更されたときに詳細検索を自動的に開く（一時的に無効化）
  // useEffect(() => {
  //   const hasActiveFilters = 
  //     state.filters.query ||
  //     (state.filters.architects?.length || 0) > 0 ||
  //     state.filters.buildingTypes.length > 0 ||
  //     state.filters.prefectures.length > 0 ||
  //     state.filters.areas.length > 0 ||
  //     state.filters.hasPhotos ||
  //     state.filters.hasVideos ||
  //     (typeof state.filters.completionYear === 'number' && !isNaN(state.filters.completionYear));
    
  //   if (hasActiveFilters && !state.showAdvancedSearch) {
  //     // 自動的に詳細検索を開く機能は一時的に無効化
  //   }
  // }, [state.filters, state.showAdvancedSearch]);

  const contextValue: AppContextType = {
    // 状態
    selectedBuilding: state.selectedBuilding,
    showDetail: state.showDetail,
    showAdminPanel: state.showAdminPanel,
    showDataMigration: state.showDataMigration,
    isAuthenticated: state.isAuthenticated,
    currentUser: state.currentUser,
    likedBuildings: state.likedBuildings,
    searchHistory: state.searchHistory,
    showLoginModal: state.showLoginModal,
    showAdvancedSearch: state.showAdvancedSearch,
    currentPage: state.currentPage,
    filters: state.filters,
    
    // アクション
    setSelectedBuilding: state.setSelectedBuilding,
    setShowDetail: state.setShowDetail,
    setShowAdminPanel: state.setShowAdminPanel,
    setShowDataMigration: state.setShowDataMigration,
    setIsAuthenticated: state.setIsAuthenticated,
    setCurrentUser: state.setCurrentUser,
    setLikedBuildings: state.setLikedBuildings,
    setSearchHistory: state.setSearchHistory,
    setShowLoginModal: state.setShowLoginModal,
    setShowAdvancedSearch: state.setShowAdvancedSearch,
    setCurrentPage: state.setCurrentPage,
    setFilters: state.setFilters,
    updateSearchHistory: actions.updateSearchHistory,
    
    // ハンドラー
    handleBuildingSelect,
    handleLike,
    handlePhotoLike,
    handleLogin,
    handleRegister,
    handleLogout,
    handleAddBuilding,
    handleUpdateBuilding,
    handleDeleteBuilding,
    handleSearchFromHistory,
    handleLikedBuildingClick,
    handleRemoveLikedBuilding,
    handleSearchAround,
    handlePageChange,
    handleSearchStart,
    handleRemoveRecentSearch,
    
    // その他の状態
    language: effects.language,
    toggleLanguage: effects.toggleLanguage,
    getCurrentLocation: effects.getCurrentLocation,
    locationLoading: effects.locationLoading,
    locationError: effects.locationError,
    buildingsLoading: buildingsData.buildingsLoading,
    buildingsError: buildingsData.buildingsError,
    buildings: buildingsData.buildings,
    filteredBuildings: effects.filteredBuildings,
    currentBuildings,
    totalBuildings: buildingsData.totalBuildings,
    totalPages: pagination.totalPages,
    startIndex: pagination.startIndex,
    itemsPerPage: state.itemsPerPage,
    useApi: effects.useApi,
    apiStatus: effects.apiStatus,
    isSupabaseConnected: effects.isSupabaseConnected,
    popularSearches: popularSearches,
    popularSearchesLoading: popularSearchesLoading,
    popularSearchesError: popularSearchesError,
    getPaginationRange: () => actions.getPaginationRange(state.currentPage, pagination.totalPages),
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviderContent>
        {children}
      </AppProviderContent>
    </QueryClientProvider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
} 