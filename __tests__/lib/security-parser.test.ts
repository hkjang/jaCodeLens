import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityParser } from '../../lib/pipeline/parsers/security-parser';

describe('SecurityParser', () => {
  let parser: SecurityParser;

  beforeEach(() => {
    parser = new SecurityParser();
  });

  describe('constructor', () => {
    it('should initialize with default rules', () => {
      const rules = parser.getRules();
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('parseFile', () => {
    it('should return empty array for file without security issues', () => {
      const file = {
        path: '/test/clean.ts',
        content: 'const greeting = "Hello World";\nconsole.log(greeting);',
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations).toEqual([]);
    });

    it('should detect hardcoded AWS access key', () => {
      const file = {
        path: '/test/config.ts',
        content: 'const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";',
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('SEC001');
      expect(violations[0].severity).toBe('CRITICAL');
    });

    it('should detect hardcoded password', () => {
      const file = {
        path: '/test/auth.ts',
        content: 'const password = "mysecretpassword123";',
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.ruleId === 'SEC003')).toBe(true);
    });

    it('should detect eval usage', () => {
      const file = {
        path: '/test/unsafe.ts',
        content: 'const result = eval(userInput);',
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.ruleId === 'SEC030')).toBe(true);
      expect(violations.some(v => v.severity === 'CRITICAL')).toBe(true);
    });

    it('should detect new Function usage', () => {
      const file = {
        path: '/test/dynamic.ts',
        content: 'const fn = new Function("return " + code);',
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.ruleId === 'SEC031')).toBe(true);
    });

    it('should detect dangerouslySetInnerHTML', () => {
      const file = {
        path: '/test/component.tsx',
        content: '<div dangerouslySetInnerHTML={{ __html: content }} />',
        language: 'typescriptreact',
      };

      const violations = parser.parseFile(file);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.ruleId === 'SEC021')).toBe(true);
    });

    it('should return empty array for undefined content', () => {
      const file = {
        path: '/test/empty.ts',
        content: undefined as unknown as string,
        language: 'typescript',
      };

      const violations = parser.parseFile(file);
      expect(violations).toEqual([]);
    });
  });

  describe('parseFiles', () => {
    it('should analyze multiple files', () => {
      const files = [
        {
          path: '/test/clean.ts',
          content: 'const x = 1;',
          language: 'typescript',
        },
        {
          path: '/test/unsafe.ts',
          content: 'eval("alert(1)");',
          language: 'typescript',
        },
      ];

      const violations = parser.parseFiles(files);
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('getStatsBySeverity', () => {
    it('should count violations by severity', () => {
      const violations = [
        { severity: 'CRITICAL' as const },
        { severity: 'CRITICAL' as const },
        { severity: 'HIGH' as const },
        { severity: 'MEDIUM' as const },
      ] as any[];

      const stats = parser.getStatsBySeverity(violations);
      expect(stats.CRITICAL).toBe(2);
      expect(stats.HIGH).toBe(1);
      expect(stats.MEDIUM).toBe(1);
      expect(stats.LOW).toBe(0);
      expect(stats.INFO).toBe(0);
    });
  });
});
