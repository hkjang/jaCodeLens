/**
 * 자동 언어 감지 서비스 (명세 3 준수)
 * 
 * 3단계 언어 감지:
 * 1차: 파일 확장자
 * 2차: 빌드 파일 (package.json, pom.xml 등)
 * 3차: 디렉토리 패턴 (src/main/java 등)
 */

import { 
  FileInfo, 
  LanguageMapping, 
  LanguageStats, 
  SupportedLanguage 
} from '../types';
import { LanguageRegistry } from './registry';

// 빌드 파일 → 언어 매핑 (명세 3.2)
const BUILD_FILE_MAPPINGS: Record<string, SupportedLanguage> = {
  'package.json': 'typescript',
  'tsconfig.json': 'typescript',
  'pom.xml': 'java',
  'build.gradle': 'java',
  'build.gradle.kts': 'java',
  'settings.gradle': 'java',
  'requirements.txt': 'python',
  'setup.py': 'python',
  'pyproject.toml': 'python',
  'Pipfile': 'python',
  'go.mod': 'go',
  'go.sum': 'go',
  'Cargo.toml': 'rust',
  '*.csproj': 'csharp',
  '*.sln': 'csharp',
  'CMakeLists.txt': 'cpp',
  'Makefile': 'cpp',
};

// 디렉토리 패턴 → 언어 매핑 (명세 3.3)
const DIRECTORY_PATTERNS: { pattern: RegExp; language: SupportedLanguage }[] = [
  { pattern: /src[/\\]main[/\\]java/, language: 'java' },
  { pattern: /src[/\\]test[/\\]java/, language: 'java' },
  { pattern: /src[/\\]main[/\\]kotlin/, language: 'java' }, // Kotlin도 Java로
  { pattern: /src[/\\]main[/\\]go/, language: 'go' },
  { pattern: /cmd[/\\]/, language: 'go' },
  { pattern: /pkg[/\\]/, language: 'go' },
  { pattern: /internal[/\\]/, language: 'go' },
  { pattern: /src[/\\]components/, language: 'typescript' },
  { pattern: /src[/\\]pages/, language: 'typescript' },
  { pattern: /app[/\\]/, language: 'typescript' }, // Next.js
  { pattern: /lib[/\\]/, language: 'typescript' },
];

// 프로젝트 단위 캐시 (명세 3.5)
const projectLanguageCache: Map<string, {
  languages: SupportedLanguage[];
  timestamp: number;
}> = new Map();

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

    // 3차: 디렉토리 패턴 기반 감지
    const dirLanguage = this.detectByDirectoryPattern(file.path);
    if (dirLanguage !== 'unknown') {
      return {
        filePath: file.path,
        language: dirLanguage,
        confidence: 0.7,
        detectedBy: 'content' // 디렉토리 패턴도 content로
      };
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
   * 빌드 파일 기반 프로젝트 언어 감지 (명세 3.2)
   */
  static detectByBuildFiles(files: FileInfo[]): SupportedLanguage[] {
    const detected = new Set<SupportedLanguage>();

    for (const file of files) {
      const fileName = file.path.split(/[/\\]/).pop() || '';
      
      // 정확히 일치하는 빌드 파일
      if (BUILD_FILE_MAPPINGS[fileName]) {
        detected.add(BUILD_FILE_MAPPINGS[fileName]);
        continue;
      }

      // 패턴 매칭 (*.csproj 등)
      for (const [pattern, lang] of Object.entries(BUILD_FILE_MAPPINGS)) {
        if (pattern.startsWith('*')) {
          const ext = pattern.slice(1);
          if (fileName.endsWith(ext)) {
            detected.add(lang);
          }
        }
      }
    }

    return Array.from(detected);
  }

  /**
   * 디렉토리 패턴 기반 언어 감지 (명세 3.3)
   */
  static detectByDirectoryPattern(filePath: string): SupportedLanguage {
    for (const { pattern, language } of DIRECTORY_PATTERNS) {
      if (pattern.test(filePath)) {
        return language;
      }
    }
    return 'unknown';
  }

  /**
   * 프로젝트 전체 언어 감지 (캐시 활용, 명세 3.5)
   */
  static detectProjectLanguages(
    projectId: string,
    files: FileInfo[],
    forceRefresh = false
  ): SupportedLanguage[] {
    // 캐시 확인 (10분 유효)
    const cached = projectLanguageCache.get(projectId);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < 600000) {
      return cached.languages;
    }

    // 빌드 파일 기반 감지
    const buildLanguages = this.detectByBuildFiles(files);
    
    // 파일 확장자 기반 감지
    const mappings = this.detectFiles(files);
    const extensionLanguages = new Set<SupportedLanguage>();
    for (const m of mappings) {
      if (m.language !== 'unknown') {
        extensionLanguages.add(m.language);
      }
    }

    // 결합 (빌드 파일 우선)
    const allLanguages = new Set([...buildLanguages, ...extensionLanguages]);
    const result = Array.from(allLanguages);

    // 캐시 저장
    projectLanguageCache.set(projectId, {
      languages: result,
      timestamp: Date.now(),
    });

    return result;
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
