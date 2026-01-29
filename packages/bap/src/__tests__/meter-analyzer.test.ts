/**
 * Comprehensive unit tests for Meter PDF Analyzer
 * Tests PDF extraction, API calls, regex fallback, and quality determination
 */

import { analyzeMeterPdf, determineMeterQuality, saveMeterPdf } from '../meter-analyzer';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock pdfjs-dist
jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Get the mocked pdfjs
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');

describe('Meter Analyzer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to create mock PDF document
  function createMockPdfDoc(pages: { text: string }[]) {
    return {
      numPages: pages.length,
      getPage: jest.fn().mockImplementation((pageNum: number) => {
        return Promise.resolve({
          getTextContent: jest.fn().mockResolvedValue({
            items: pages[pageNum - 1].text.split(' ').map(str => ({ str })),
          }),
        });
      }),
    };
  }

  describe('PDF Text Extraction', () => {
    it('should extract text from single page PDF', async () => {
      const mockDoc = createMockPdfDoc([{ text: 'Total Energy: 500 kWh' }]);
      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 500, "quality": "HIGH"}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf content'), 500);

      expect(result.success).toBe(true);
      expect(result.extractedCapacity).toBe(500);
    });

    it('should concatenate text from multi-page PDF', async () => {
      const mockDoc = createMockPdfDoc([
        { text: 'Page 1 content' },
        { text: 'Page 2 Total Energy: 750 kWh' },
        { text: 'Page 3 content' },
      ]);
      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 750, "quality": "HIGH"}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 750);

      expect(mockDoc.getPage).toHaveBeenCalledTimes(3);
    });

    it('should handle empty PDF (no items)', async () => {
      const mockDoc = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue({
          getTextContent: jest.fn().mockResolvedValue({ items: [] }),
        }),
      };
      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": null}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('empty pdf'), 500);

      // Should fall back to regex and find nothing
      expect(result.extractedCapacity).toBeNull();
    });

    it('should handle PDF extraction error gracefully', async () => {
      pdfjs.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('PDF parsing failed')),
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": null}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('corrupt pdf'), 500);

      // Should not throw, but return failed result
      expect(result.success).toBe(false);
    });
  });

  describe('OpenRouter API Integration', () => {
    beforeEach(() => {
      const mockDoc = createMockPdfDoc([{ text: 'Energy Supplied: 500 kWh' }]);
      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });
    });

    it('should successfully parse valid JSON response', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: '{"extractedCapacity": 500, "quality": "HIGH", "matchesDeclaration": true, "insights": "Found 500 kWh"}',
              },
            },
          ],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.success).toBe(true);
      expect(result.extractedCapacity).toBe(500);
    });

    it('should extract JSON from markdown wrapper', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: '```json\n{"extractedCapacity": 600, "quality": "MEDIUM"}\n```',
              },
            },
          ],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 600);

      expect(result.extractedCapacity).toBe(600);
    });

    it('should return error when no API key configured', async () => {
      process.env.OPENROUTER_API_KEY = '';

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OPENROUTER_API_KEY not set');
    });

    it('should fall back to regex when API times out', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ETIMEDOUT' });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      // Should use regex fallback and find "Energy Supplied: 500 kWh"
      expect(result.success).toBe(true);
      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex on 401 error', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex on 429 rate limit', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 429 } });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex on 500 server error', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex when response is malformed JSON', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'not valid json at all' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      // Regex should find the 500 from the PDF text
      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex when extractedCapacity is null', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": null}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.extractedCapacity).toBe(500);
    });

    it('should fall back to regex when extractedCapacity is zero', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 0}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.extractedCapacity).toBe(500);
    });
  });

  describe('Regex Fallback Patterns', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        data: { choices: [{ message: { content: '{}' } }] },
      });
    });

    const testCases = [
      { text: 'Total Energy Supplied to Grid: 500 kWh', expected: 500 },
      { text: 'Total Energy Supplied to Grid = 750', expected: 750 },
      { text: 'Energy Supplied: 1,234 kWh', expected: 1234 },
      { text: 'Energy Supplied = 2,500 kWh', expected: 2500 },
      { text: 'Total Generation: 300 kWh', expected: 300 },
      { text: 'Electricity Produced: 450 kWh', expected: 450 },
      { text: 'Production Capacity: 600 kWh', expected: 600 },
      { text: 'Monthly Production: 800 kWh', expected: 800 },
      { text: 'Net Energy Exported = 900', expected: 900 },
      { text: '350kWh generated this month', expected: 350 },
      { text: '999999 kWh', expected: 999999 },
    ];

    testCases.forEach(({ text, expected }) => {
      it(`should extract ${expected} from "${text}"`, async () => {
        const mockDoc = createMockPdfDoc([{ text }]);
        pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });

        const result = await analyzeMeterPdf(Buffer.from('pdf'), expected);

        expect(result.extractedCapacity).toBe(expected);
      });
    });

    const noMatchCases = [
      { text: 'The bill is $500', description: 'currency amount' },
      { text: '500 MW power plant', description: 'wrong unit (MW)' },
      { text: '', description: 'empty string' },
      { text: 'kWh 500', description: 'reversed order' },
      { text: '0 kWh', description: 'zero value' },
      { text: '1,234,567 kWh', description: 'value over 1 million' },
    ];

    noMatchCases.forEach(({ text, description }) => {
      it(`should return null for ${description}`, async () => {
        const mockDoc = createMockPdfDoc([{ text }]);
        pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });

        const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

        expect(result.extractedCapacity).toBeNull();
      });
    });
  });

  describe('determineMeterQuality', () => {
    it('should return HIGH when within 10% (exact match)', () => {
      expect(determineMeterQuality(500, 500)).toBe('HIGH');
    });

    it('should return HIGH when extracted is 90% of declared', () => {
      expect(determineMeterQuality(500, 450)).toBe('HIGH');
    });

    it('should return HIGH when extracted is 110% of declared', () => {
      expect(determineMeterQuality(500, 550)).toBe('HIGH');
    });

    it('should return MEDIUM when ratio is 0.89 (11% below)', () => {
      expect(determineMeterQuality(500, 445)).toBe('MEDIUM');
    });

    it('should return MEDIUM when exactly at 20% boundary (80%)', () => {
      expect(determineMeterQuality(500, 400)).toBe('MEDIUM');
    });

    it('should return MEDIUM when extracted is 120% of declared', () => {
      expect(determineMeterQuality(500, 600)).toBe('MEDIUM');
    });

    it('should return LOW when ratio is 0.79 (21% below)', () => {
      expect(determineMeterQuality(500, 395)).toBe('LOW');
    });

    it('should return LOW when extracted is null', () => {
      expect(determineMeterQuality(500, null)).toBe('LOW');
    });

    it('should return LOW when extracted is 0', () => {
      expect(determineMeterQuality(500, 0)).toBe('LOW');
    });

    it('should return LOW when ratio exceeds 1.2', () => {
      expect(determineMeterQuality(500, 605)).toBe('LOW');
    });

    it('should handle edge case where declared is 0', () => {
      // This would cause division by zero - should handle gracefully
      const result = determineMeterQuality(0, 500);
      expect(result).toBe('LOW');
    });
  });

  describe('Matches Declaration Detection', () => {
    beforeEach(() => {
      const mockDoc = createMockPdfDoc([{ text: 'Energy: 500 kWh' }]);
      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) });
    });

    it('should return true when extracted matches declared exactly', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 500}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.matchesDeclaration).toBe(true);
    });

    it('should return true when within 20% of declared', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 450}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.matchesDeclaration).toBe(true);
    });

    it('should return false when more than 20% different', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 300}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.matchesDeclaration).toBe(false);
    });

    it('should return false when declared is 0', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"extractedCapacity": 500}' } }],
        },
      });

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 0);

      expect(result.matchesDeclaration).toBe(false);
    });
  });

  describe('saveMeterPdf', () => {
    it('should create directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await saveMeterPdf('user-123', Buffer.from('pdf content'));

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
    });

    it('should write buffer to file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const buffer = Buffer.from('pdf content');

      await saveMeterPdf('user-123', buffer);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('user-123'),
        buffer
      );
    });

    it('should return correct path format', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await saveMeterPdf('user-456', Buffer.from('pdf'));

      expect(result).toMatch(/\/uploads\/meter-pdfs\/user-456_\d+\.pdf/);
    });

    it('should include timestamp in filename', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const before = Date.now();

      const result = await saveMeterPdf('user-789', Buffer.from('pdf'));

      const after = Date.now();
      const timestampMatch = result.match(/user-789_(\d+)\.pdf/);
      expect(timestampMatch).toBeTruthy();
      const timestamp = parseInt(timestampMatch![1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Error Handling', () => {
    it('should return error result on critical failure', async () => {
      pdfjs.getDocument.mockImplementation(() => {
        throw new Error('Critical error');
      });

      const result = await analyzeMeterPdf(Buffer.from('bad pdf'), 500);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include error message in result', async () => {
      process.env.OPENROUTER_API_KEY = '';

      const result = await analyzeMeterPdf(Buffer.from('pdf'), 500);

      expect(result.error).toBe('OPENROUTER_API_KEY not set');
      expect(result.insights).toContain('unavailable');
    });
  });
});
