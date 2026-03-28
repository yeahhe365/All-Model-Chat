import { describe, it, expect } from 'vitest';
import {
    isMiniMaxModel,
    isOpenAICompatModel,
    getOpenAICompatBaseUrl,
    MINIMAX_BASE_URL,
    MINIMAX_MODELS,
} from '../constants/providerConstants';

describe('providerConstants', () => {
    describe('MINIMAX_MODELS', () => {
        it('should contain M2.7 and M2.7-highspeed models', () => {
            const modelIds = MINIMAX_MODELS.map(m => m.id);
            expect(modelIds).toContain('MiniMax-M2.7');
            expect(modelIds).toContain('MiniMax-M2.7-highspeed');
        });

        it('should have proper display names', () => {
            const m27 = MINIMAX_MODELS.find(m => m.id === 'MiniMax-M2.7');
            expect(m27?.name).toBe('MiniMax M2.7');
            const m27hs = MINIMAX_MODELS.find(m => m.id === 'MiniMax-M2.7-highspeed');
            expect(m27hs?.name).toBe('MiniMax M2.7 Highspeed');
        });

        it('should be pinned by default', () => {
            for (const model of MINIMAX_MODELS) {
                expect(model.isPinned).toBe(true);
            }
        });
    });

    describe('isMiniMaxModel', () => {
        it('should return true for MiniMax model IDs', () => {
            expect(isMiniMaxModel('MiniMax-M2.7')).toBe(true);
            expect(isMiniMaxModel('MiniMax-M2.7-highspeed')).toBe(true);
        });

        it('should return false for Gemini model IDs', () => {
            expect(isMiniMaxModel('gemini-3-flash-preview')).toBe(false);
            expect(isMiniMaxModel('gemini-2.5-pro')).toBe(false);
            expect(isMiniMaxModel('gemma-3-27b-it')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isMiniMaxModel('')).toBe(false);
        });

        it('should be case sensitive', () => {
            expect(isMiniMaxModel('minimax-M2.7')).toBe(false);
            expect(isMiniMaxModel('MINIMAX-M2.7')).toBe(false);
        });
    });

    describe('isOpenAICompatModel', () => {
        it('should return true for MiniMax models', () => {
            expect(isOpenAICompatModel('MiniMax-M2.7')).toBe(true);
            expect(isOpenAICompatModel('MiniMax-M2.7-highspeed')).toBe(true);
        });

        it('should return false for Gemini models', () => {
            expect(isOpenAICompatModel('gemini-3-flash-preview')).toBe(false);
            expect(isOpenAICompatModel('gemini-2.5-pro')).toBe(false);
        });
    });

    describe('getOpenAICompatBaseUrl', () => {
        it('should return MiniMax base URL for MiniMax models', () => {
            expect(getOpenAICompatBaseUrl('MiniMax-M2.7')).toBe(MINIMAX_BASE_URL);
            expect(getOpenAICompatBaseUrl('MiniMax-M2.7-highspeed')).toBe(MINIMAX_BASE_URL);
        });

        it('should return empty string for non-MiniMax models', () => {
            expect(getOpenAICompatBaseUrl('gemini-3-flash-preview')).toBe('');
        });
    });

    describe('MINIMAX_BASE_URL', () => {
        it('should point to MiniMax API', () => {
            expect(MINIMAX_BASE_URL).toBe('https://api.minimax.io/v1');
        });
    });
});
