/**
 * 언어 레지스트리
 * 
 * 지원 언어 및 확장자 매핑을 관리합니다.
 */

import { SupportedLanguage } from '../types';

// 확장자 → 언어 매핑
const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  // TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  
  // JavaScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  
  // Java
  '.java': 'java',
  
  // Go
  '.go': 'go',
  
  // C#
  '.cs': 'csharp',
  
  // Rust
  '.rs': 'rust',
  
  // C/C++
  '.c': 'cpp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
};

// Shebang 패턴 → 언어 매핑
const SHEBANG_PATTERNS: Array<{ pattern: RegExp; language: SupportedLanguage }> = [
  { pattern: /^#!.*\bpython[23]?\b/, language: 'python' },
  { pattern: /^#!.*\bnode\b/, language: 'javascript' },
  { pattern: /^#!.*\bdeno\b/, language: 'typescript' },
  { pattern: /^#!.*\bbun\b/, language: 'typescript' },
];

// 언어별 파서 정보
interface ParserInfo {
  name: string;
  supportsAST: boolean;
  treeSitterGrammar?: string;
  nativeParser?: string;
}

const PARSER_INFO: Record<SupportedLanguage, ParserInfo> = {
  typescript: {
    name: 'TypeScript Parser',
    supportsAST: true,
    nativeParser: 'ts.createSourceFile'
  },
  javascript: {
    name: 'JavaScript Parser',
    supportsAST: true,
    nativeParser: 'ts.createSourceFile'  // TS can parse JS
  },
  python: {
    name: 'Python Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-python'
  },
  java: {
    name: 'Java Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-java'
  },
  go: {
    name: 'Go Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-go'
  },
  csharp: {
    name: 'C# Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-c-sharp'
  },
  rust: {
    name: 'Rust Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-rust'
  },
  cpp: {
    name: 'C++ Parser',
    supportsAST: true,
    treeSitterGrammar: 'tree-sitter-cpp'
  },
  unknown: {
    name: 'Unknown',
    supportsAST: false
  }
};

// 분석 제외 확장자
const EXCLUDED_EXTENSIONS = new Set([
  // Binary files
  '.exe', '.dll', '.so', '.dylib', '.bin',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z',
  // Media
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  // Lock files
  '.lock',
  // Map files
  '.map',
]);

// 분석 제외 디렉토리
const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'vendor',
  'coverage',
  '.nyc_output',
]);

export class LanguageRegistry {
  /**
   * 파일 확장자로 언어 감지
   */
  static getLanguageByExtension(extension: string): SupportedLanguage {
    const normalized = extension.toLowerCase();
    return EXTENSION_MAP[normalized] || 'unknown';
  }

  /**
   * Shebang으로 언어 감지
   */
  static getLanguageByShebang(firstLine: string): SupportedLanguage | null {
    for (const { pattern, language } of SHEBANG_PATTERNS) {
      if (pattern.test(firstLine)) {
        return language;
      }
    }
    return null;
  }

  /**
   * 지원 여부 확인
   */
  static isSupported(language: SupportedLanguage): boolean {
    return language !== 'unknown' && PARSER_INFO[language]?.supportsAST === true;
  }

  /**
   * 파서 정보 조회
   */
  static getParserInfo(language: SupportedLanguage): ParserInfo | null {
    return PARSER_INFO[language] || null;
  }

  /**
   * 분석 제외 확장자인지 확인
   */
  static isExcludedExtension(extension: string): boolean {
    return EXCLUDED_EXTENSIONS.has(extension.toLowerCase());
  }

  /**
   * 분석 제외 디렉토리인지 확인
   */
  static isExcludedDirectory(dirName: string): boolean {
    return EXCLUDED_DIRECTORIES.has(dirName);
  }

  /**
   * 지원되는 모든 확장자 목록
   */
  static getSupportedExtensions(): string[] {
    return Object.keys(EXTENSION_MAP);
  }

  /**
   * 지원되는 모든 언어 목록
   */
  static getSupportedLanguages(): SupportedLanguage[] {
    return ['typescript', 'javascript', 'python', 'java', 'go', 'csharp', 'rust', 'cpp'];
  }
}
