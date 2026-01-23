/**
 * Meter PDF Analyzer using DeepSeek LLM
 * Extracts production capacity from utility meter reading PDFs
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// DeepSeek configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

export interface MeterAnalysisResult {
    success: boolean;
    extractedCapacity: number | null;  // kWh per month
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
    matchesDeclaration: boolean;
    insights: string;
    error?: string;
}

/**
 * Extract text from PDF buffer (simplified - uses base64 encoding for LLM)
 */
function pdfToText(pdfBuffer: Buffer): string {
    // For a production system, use a PDF parsing library like pdf-parse
    // For now, we'll send the base64 content to DeepSeek for analysis
    return pdfBuffer.toString('base64');
}

/**
 * Analyze meter PDF using DeepSeek LLM
 */
export async function analyzeMeterPdf(
    pdfBuffer: Buffer,
    declaredCapacity: number
): Promise<MeterAnalysisResult> {
    if (!DEEPSEEK_API_KEY) {
        console.warn('[MeterAnalyzer] No DeepSeek API key configured');
        return {
            success: false,
            extractedCapacity: null,
            quality: 'LOW',
            matchesDeclaration: false,
            insights: 'Meter analysis unavailable - API key not configured',
            error: 'DEEPSEEK_API_KEY not set'
        };
    }

    try {
        // For production: use pdf-parse to extract text first
        // const pdfText = await extractPdfText(pdfBuffer);

        const prompt = `You are analyzing an electricity meter reading document. 
        
The user has declared a monthly production capacity of ${declaredCapacity} kWh.

Please analyze this document and:
1. Extract the monthly electricity production/generation amount (in kWh)
2. Determine if it matches the user's declaration
3. Rate the data quality (HIGH/MEDIUM/LOW based on document clarity)

Respond in JSON format:
{
  "extractedCapacity": <number or null if not found>,
  "matchesDeclaration": <true if within 20% of declared, false otherwise>,
  "quality": "<HIGH|MEDIUM|LOW>",
  "insights": "<brief summary of findings>"
}

Document content (base64 encoded PDF):
${pdfToText(pdfBuffer).substring(0, 5000)}...`;

        const response = await axios.post(
            `${DEEPSEEK_BASE_URL}/v1/chat/completions`,
            {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at analyzing utility meter documents and extracting electricity production data.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const content = response.data.choices[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                extractedCapacity: parsed.extractedCapacity || null,
                quality: parsed.quality || 'MEDIUM',
                matchesDeclaration: parsed.matchesDeclaration || false,
                insights: parsed.insights || 'Analysis complete'
            };
        }

        return {
            success: true,
            extractedCapacity: null,
            quality: 'LOW',
            matchesDeclaration: false,
            insights: 'Could not parse meter data from document'
        };

    } catch (error) {
        console.error('[MeterAnalyzer] Error analyzing PDF:', error);
        return {
            success: false,
            extractedCapacity: null,
            quality: 'LOW',
            matchesDeclaration: false,
            insights: 'Error analyzing document',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Determine quality score based on how well extracted data matches declaration
 */
export function determineMeterQuality(
    declaredCapacity: number,
    extractedCapacity: number | null
): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!extractedCapacity) return 'LOW';

    const ratio = extractedCapacity / declaredCapacity;

    // Within 10% = HIGH quality match
    if (ratio >= 0.9 && ratio <= 1.1) return 'HIGH';

    // Within 20% = MEDIUM quality match
    if (ratio >= 0.8 && ratio <= 1.2) return 'MEDIUM';

    // Outside 20% = LOW quality (mismatch)
    return 'LOW';
}

/**
 * Save uploaded PDF to storage
 */
export async function saveMeterPdf(
    userId: string,
    pdfBuffer: Buffer
): Promise<string> {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'meter-pdfs');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${userId}_${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, pdfBuffer);

    return `/uploads/meter-pdfs/${filename}`;
}
