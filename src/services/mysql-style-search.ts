import { supabase } from '../lib/supabase';
import { SearchFilters } from '../types';

/**
 * MySQLシステムと同様の検索機能を提供するサービス
 * キーワード分割、AND検索、テーブル結合を実装
 */
export class MySQLStyleSearchService {
  /**
   * 検索クエリをキーワードに分割
   * 全角スペースを半角スペースに変換して分割
   */
  private splitKeywords(searchQuery: string): string[] {
    // 全角スペースを半角スペースに変換
    const temp = searchQuery.replace(/　/g, ' ');
    // 半角スペースで分割し、空文字列を除外
    return temp.split(' ').filter(keyword => keyword.trim() !== '');
  }

  /**
   * キーワードに基づいて建築物IDを検索
   * 各キーワードは8つのフィールドでOR検索
   * キーワード間はAND条件
   */
  private async searchBuildingIdsByKeywords(keywords: string[]): Promise<number[]> {
    if (keywords.length === 0) {
      return [];
    }

    console.log('🔍 キーワードによる建築物ID検索開始:', keywords);

    // 各キーワードに対して建築物IDを取得
    const buildingIdSets: Set<number>[] = [];

    for (const keyword of keywords) {
      console.log(`🔍 キーワード "${keyword}" で検索中...`);

      // 建築物テーブルから検索（ページネーションを使用して制限を回避）
      const allBuildingIds = new Set<number>();
      
      // 各フィールドをページネーションで検索
      const searchFields = [
        { field: 'title', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('title', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'titleEn', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('titleEn', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'buildingTypes', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('buildingTypes', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'buildingTypesEn', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('buildingTypesEn', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'location', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('location', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'locationEn_from_datasheetChunkEn', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('locationEn_from_datasheetChunkEn', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'prefectures', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('prefectures', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'prefecturesEn', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('prefecturesEn', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'areas', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('areas', `%${keyword}%`).range(offset, offset + 999) },
        { field: 'areasEn', condition: (offset: number) => supabase.from('buildings_table_2').select('building_id').ilike('areasEn', `%${keyword}%`).range(offset, offset + 999) }
      ];
      
      // 各フィールドをページネーションで検索
      for (const { field, condition } of searchFields) {
        let offset = 0;
        let hasMore = true;
        let totalCount = 0;
        
        while (hasMore) {
          const { data, error } = await condition(offset);
          
          if (error) {
            console.error(`❌ ${field}フィールド検索エラー:`, error);
            break;
          }
          
          if (data && data.length > 0) {
            const beforeCount = allBuildingIds.size;
            data.forEach(building => allBuildingIds.add(building.building_id));
            const afterCount = allBuildingIds.size;
            totalCount += data.length;
            
            console.log(`  - ${field} (offset ${offset}): ${data.length}件 (新規: ${afterCount - beforeCount}件)`);
            
            // 1000件未満の場合は終了
            if (data.length < 1000) {
              hasMore = false;
            } else {
              offset += 1000;
            }
          } else {
            hasMore = false;
          }
        }
        
        console.log(`  - ${field} 合計: ${totalCount}件`);
      }
      
      const buildingsData = Array.from(allBuildingIds).map(id => ({ building_id: id }));
      const buildingsError = null;

      if (buildingsError) {
        console.error('❌ 建築物テーブル検索エラー:', buildingsError);
        continue;
      }

      console.log(`🔍 建築物テーブル検索結果: ${buildingsData?.length || 0}件`);

      // 建築家名から検索（複数ステップで外部キー関係を辿る）
      // デバッグ用: 建築家テーブルの検索を一時的に無効化
      const architectBuildingIds = []; // await this.searchInArchitectTables(keyword);
      console.log(`🔍 建築家テーブル検索結果: ${architectBuildingIds.length}件 (無効化中)`);

      // 建築物IDを収集
      const buildingIds = new Set<number>();
      
      // 建築物テーブルからの結果
      if (buildingsData) {
        buildingsData.forEach(building => {
          buildingIds.add(building.building_id);
        });
      }

      // 建築家テーブルからの結果
      architectBuildingIds.forEach(buildingId => {
        buildingIds.add(buildingId);
      });

      console.log(`🔍 キーワード "${keyword}" の結果: ${buildingIds.size}件`);
      console.log(`  - 建築物テーブル: ${buildingsData?.length || 0}件`);
      console.log(`  - 建築家テーブル: ${architectBuildingIds.length}件`);
      console.log(`  - 重複除去後: ${buildingIds.size}件`);
      buildingIdSets.push(buildingIds);
    }

    // すべてのキーワードの結果の積集合を取得（AND条件）
    let resultIds = buildingIdSets[0] || new Set<number>();
    for (let i = 1; i < buildingIdSets.length; i++) {
      resultIds = new Set([...resultIds].filter(id => buildingIdSets[i].has(id)));
    }

    const finalIds = Array.from(resultIds);
    console.log(`🔍 最終的な建築物ID: ${finalIds.length}件`);
    
    return finalIds;
  }

  /**
   * 建築家テーブルから検索（複数ステップで外部キー関係を辿る）
   */
  private async searchInArchitectTables(keyword: string): Promise<number[]> {
    try {
      // ステップ1: individual_architectsテーブルから名前で検索
      const { data: individualArchitects, error: individualError } = await supabase
        .from('individual_architects')
        .select('individual_architect_id')
        .or(`name_ja.ilike.%${keyword}%,name_en.ilike.%${keyword}%`)
        .limit(10000); // 制限を大幅に増加
      
      if (individualError) {
        console.error('❌ individual_architects検索エラー:', individualError);
        return [];
      }
      
      if (!individualArchitects || individualArchitects.length === 0) {
        console.log('👨‍💼 該当する建築家が見つかりませんでした');
        return [];
      }
      
      const individualArchitectIds = individualArchitects.map(ia => ia.individual_architect_id);
      console.log(`👨‍💼 該当する建築家ID: ${individualArchitectIds.length}件`);
      
      // ステップ2: architect_compositionsテーブルからarchitect_idを取得
      const { data: compositions, error: compositionsError } = await supabase
        .from('architect_compositions')
        .select('architect_id')
        .in('individual_architect_id', individualArchitectIds)
        .limit(10000); // 制限を大幅に増加
      
      if (compositionsError) {
        console.error('❌ architect_compositions検索エラー:', compositionsError);
        return [];
      }
      
      if (!compositions || compositions.length === 0) {
        console.log('👥 該当する建築家構成が見つかりませんでした');
        return [];
      }
      
      const architectIds = compositions.map(ac => ac.architect_id);
      console.log(`👥 該当する建築家ID: ${architectIds.length}件`);
      
      // ステップ3: building_architectsテーブルからbuilding_idを取得
      const { data: buildingArchitects, error: buildingArchitectsError } = await supabase
        .from('building_architects')
        .select('building_id')
        .in('architect_id', architectIds)
        .limit(10000); // 制限を大幅に増加
      
      if (buildingArchitectsError) {
        console.error('❌ building_architects検索エラー:', buildingArchitectsError);
        return [];
      }
      
      if (!buildingArchitects || buildingArchitects.length === 0) {
        console.log('🏢 該当する建物が見つかりませんでした');
        return [];
      }
      
      const buildingIds = buildingArchitects.map(ba => ba.building_id);
      console.log(`🏢 該当する建物ID: ${buildingIds.length}件`);
      
      return buildingIds;
      
    } catch (error) {
      console.error('❌ 建築家テーブル検索エラー:', error);
      return [];
    }
  }

  /**
   * 指定された建物IDの建築家情報を取得
   */
  private async getArchitectDataForBuildings(buildingIds: number[]): Promise<Record<number, any[]>> {
    try {
      if (buildingIds.length === 0) {
        return {};
      }

      // 建築家情報を段階的に取得
      const { data: buildingArchitects, error: baError } = await supabase
        .from('building_architects')
        .select('building_id, architect_id, architect_order')
        .in('building_id', buildingIds)
        .order('building_id, architect_order');

      if (baError) {
        console.error('❌ building_architects取得エラー:', baError);
        return {};
      }

      if (!buildingArchitects || buildingArchitects.length === 0) {
        return {};
      }

      const architectIds = [...new Set(buildingArchitects.map(ba => ba.architect_id))];
      
      const { data: compositions, error: compError } = await supabase
        .from('architect_compositions')
        .select('architect_id, individual_architect_id, order_index')
        .in('architect_id', architectIds)
        .order('architect_id, order_index');

      if (compError) {
        console.error('❌ architect_compositions取得エラー:', compError);
        return {};
      }

      if (!compositions || compositions.length === 0) {
        return {};
      }

      const individualArchitectIds = [...new Set(compositions.map(ac => ac.individual_architect_id))];
      
      const { data: individualArchitects, error: iaError } = await supabase
        .from('individual_architects')
        .select('individual_architect_id, name_ja, name_en')
        .in('individual_architect_id', individualArchitectIds);

      if (iaError) {
        console.error('❌ individual_architects取得エラー:', iaError);
        return {};
      }

      // データを結合して整理
      const architectMap = new Map(individualArchitects?.map(ia => [ia.individual_architect_id, ia]) || []);
      const compositionMap = new Map<string, any[]>();
      
      compositions?.forEach(comp => {
        const key = comp.architect_id.toString();
        if (!compositionMap.has(key)) {
          compositionMap.set(key, []);
        }
        compositionMap.get(key)!.push({
          ...comp,
          individual_architects: architectMap.get(comp.individual_architect_id)
        });
      });

      const result: Record<number, any[]> = {};
      
      buildingArchitects?.forEach(ba => {
        if (!result[ba.building_id]) {
          result[ba.building_id] = [];
        }
        
        const compositions = compositionMap.get(ba.architect_id.toString()) || [];
        result[ba.building_id].push({
          ...ba,
          architect_compositions: compositions
        });
      });

      return result;
      
    } catch (error) {
      console.error('❌ 建築家データ取得エラー:', error);
      return {};
    }
  }

  /**
   * 建築物を検索（MySQLシステムと同様のロジック）
   */
  async searchBuildings(
    filters: SearchFilters,
    language: 'ja' | 'en' = 'ja',
    page: number = 1,
    limit: number = 20
  ) {
    try {
      console.log('🔍 MySQLスタイル検索開始:', { filters, language, page, limit });

      // キーワード分割
      const keywords = this.splitKeywords(filters.query || '');
      console.log('🔍 分割されたキーワード:', keywords);

      // キーワード検索で建築物IDを取得
      const buildingIds = await this.searchBuildingIdsByKeywords(keywords);
      
      if (buildingIds.length === 0) {
        console.log('🔍 検索結果なし');
        return {
          data: [],
          count: 0,
          page,
          totalPages: 0
        };
      }

      // 検索結果全体をbuilding_idの降順でソート
      const sortedBuildingIds = buildingIds.sort((a, b) => b - a);
      console.log(`🔍 検索結果全体をソート: ${sortedBuildingIds.length}件`);

      // ページネーション適用
      const offset = (page - 1) * limit;
      const paginatedIds = sortedBuildingIds.slice(offset, offset + limit);

      console.log(`🔍 ページネーション適用: ${paginatedIds.length}件 (${offset + 1}-${offset + paginatedIds.length} / ${sortedBuildingIds.length})`);

      // 建築物データを取得（建築家情報は別途取得）
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings_table_2')
        .select('*')
        .in('building_id', paginatedIds)
        .order('building_id', { ascending: false });

      if (buildingsError) {
        console.error('❌ 建築物データ取得エラー:', buildingsError);
        throw buildingsError;
      }

      // 建築家情報を別途取得
      const architectData = await this.getArchitectDataForBuildings(paginatedIds);
      
      // データを変換（MySQLシステムの形式に合わせる）
      const transformedData = buildingsData?.map(building => {
        const buildingArchitects = architectData[building.building_id] || [];
        
        // 建築家名を結合
        const architectJa = buildingArchitects
          .sort((a, b) => a.architect_order - b.architect_order)
          .map(ba => 
            ba.architect_compositions
              ?.sort((a, b) => a.order_index - b.order_index)
              .map(ac => ac.individual_architects?.name_ja)
              .filter(Boolean)
              .join(' / ')
          )
          .filter(Boolean)
          .join(' / ') || '';

        const architectEn = buildingArchitects
          .sort((a, b) => a.architect_order - b.architect_order)
          .map(ba => 
            ba.architect_compositions
              ?.sort((a, b) => a.order_index - b.order_index)
              .map(ac => ac.individual_architects?.name_en)
              .filter(Boolean)
              .join(' / ')
          )
          .filter(Boolean)
          .join(' / ') || '';

        return {
          id: building.building_id,
          building_id: building.building_id,
          title: building.title,
          titleEn: building.titleEn,
          uid: building.uid,
          slug: building.slug || building.uid || building.building_id.toString(), // データベースのslugを優先、なければuid、最後にbuilding_id
          buildingTypes: building.buildingTypes,
          buildingTypesEn: building.buildingTypesEn,
          location: building.location,
          locationEn_from_datasheetChunkEn: building.locationEn_from_datasheetChunkEn,
          completionYears: building.completionYears,
          lat: building.lat,
          lng: building.lng,
          thumbnailUrl: building.thumbnailUrl,
          youtubeUrl: building.youtubeUrl,
          architectJa,
          architectEn
        };
      }) || [];

      console.log('✅ MySQLスタイル検索完了:', {
        resultCount: transformedData.length,
        totalCount: buildingIds.length,
        page,
        totalPages: Math.ceil(buildingIds.length / limit)
      });

      return {
        data: transformedData,
        count: buildingIds.length,
        page,
        totalPages: Math.ceil(buildingIds.length / limit)
      };

    } catch (error) {
      console.error('❌ MySQLスタイル検索エラー:', error);
      throw error;
    }
  }
}
