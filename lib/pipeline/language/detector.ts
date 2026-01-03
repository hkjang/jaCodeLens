/**
 * 자동 언어 감지 서비스
 * 
 * 파일 확장자 및 shebang을 기반으로 언어를 자동 감지합니다.
 */

import { 
  FileInfo, 
  LanguageMapping, 
  LanguageStats, 
  SupportedLanguage 
} from '../types';
import { LanguageRegistry } from './registry';

export class LanguageDetector {
  /**
   * 단일 파일의 언어 감지
   */
  static detectFile(file: FileInfo): LanguageMapping {
    // 1차: 확장자 기반 감지
    const extLanguage = LanguageRegistry.getLanguageByExtension(file.extension);
    
    if (extLanguage !== 'unknown') {
      return {
        filePath: file.path,
        language: extLanguage,
        confidence: 0.9,
        detectedBy: 'extension'
      };
    }

    // 2차: Shebang 기반 감지 (콘텐츠가 있는 경우)
    if (file.content) {
      const firstLine = file.content.split('\n')[0] || '';
      const shebangLanguage = LanguageRegistry.getLanguageByShebang(firstLine);
      
      if (shebangLanguage) {
        return {
          filePath: file.path,
          language: shebangLanguage,
          confidence: 0.85,
          detectedBy: 'shebang'
        };
      }
    }

    // 미감지
    return {
      filePath: file.path,
      language: 'unknown',
      confidence: 0,
      detectedBy: 'extension'
    };
  }

  /**
   * 여러 파일의 언어 감지
   */
  static detectFiles(files: FileInfo[]): LanguageMapping[] {
    return files
      .filter(file => !this.shouldExclude(file))
      .map(file => this.detectFile(file));
  }

  /**
   * 언어별 통계 계산
   */
  static calculateStats(
    files: FileInfo[], 
    mappings: LanguageMapping[]
  ): LanguageStats[] {
    const stats: Map<SupportedLanguage, { fileCount: number; lineCount: number }> = new Map();

    // 파일-매핑 매칭을 위한 맵 생성
    const mappingByPath = new Map(mappings.map(m => [m.filePath, m]));

    for (const file of files) {
      const mapping = mappingByPath.get(file.path);
      if (!mapping || mapping.language === 'unknown') continue;

      const lang = mapping.language;
      const current = stats.get(lang) || { fileCount: 0, lineCount: 0 };
      
      current.fileCount++;
      if (file.content) {
        current.lineCount += file.content.split('\n').length;
      }
      
      stats.set(lang, current);
    }

    // 퍼센트 계산
    const totalFiles = Array.from(stats.values()).reduce((sum, s) => sum + s.fileCount, 0);
    
    const result: LanguageStats[] = [];
    for (const [language, { fileCount, lineCount }] of stats) {
      result.push({
        language,
        fileCount,
        lineCount,
        percentage: totalFiles > 0 ? (fileCount / totalFiles) * 100 : 0
      });
    }

    // 파일 수 내림차순 정렬
    return result.sort((a, b) => b.fileCount - a.fileCount);
  }

  /**
   * 제외 대상 파일인지 확인
   */
  private static shouldExclude(file: FileInfo): boolean {
    // 확장자 제외
    if (LanguageRegistry.isExcludedExtension(file.extension)) {
      return true;
    }

    // 디렉토리 제외
    const pathParts = file.path.split(/[/\\]/);
    for (const part of pathParts) {
      if (LanguageRegistry.isExcludedDirectory(part)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 프로젝트 주요 언어 탐지
   */
  static detectPrimaryLanguage(stats: LanguageStats[]): SupportedLanguage | null {
    if (stats.length === 0) return null;
    return stats[0].language;
  }

  /**
   * 복합 프로젝트 여부 확인
   * 여러 언어가 의미있는 비율로 사용되는 경우 true
   */
  static isMultiLanguageProject(stats: LanguageStats[], threshold = 10): boolean {
    const significantLanguages = stats.filter(s => s.percentage >= threshold);
    return significantLanguages.length > 1;
  }
}
