/**
 * Unit tests for ShopeeAffiliateService - Signature Generation
 *
 * Based on Shopee Open API documentation:
 * Signature = SHA256(AppId + Timestamp + Payload + Secret)
 *
 * Test data from official example:
 * - AppId: 123456
 * - Secret: demo
 * - Timestamp: 1577836800 (2020-01-01 00:00:00 UTC+0)
 * - Payload: {"query":"{\nbrandOffer{\n    nodes{\n        commissionRate\n        offerName\n    }\n}\n}"}
 * - Expected Signature: dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412
 */

import crypto from 'crypto';

// ============================================
// Signature Generation Logic (to be moved to ShopeeAffiliateService)
// ============================================

/**
 * Generate SHA256 signature for Shopee API authentication
 * Format: SHA256(AppId + Timestamp + Payload + Secret)
 *
 * @param appId - Shopee App ID
 * @param timestamp - Unix timestamp in seconds
 * @param payload - JSON request body string
 * @param secret - Shopee App Secret
 * @returns Lowercase hexadecimal signature (64 chars)
 */
function generateSignature(
    appId: string,
    timestamp: number,
    payload: string,
    secret: string
): string {
    const signatureBase = `${appId}${timestamp}${payload}${secret}`;
    return crypto.createHash('sha256').update(signatureBase, 'utf8').digest('hex');
}

/**
 * Build Authorization header for Shopee API
 * Format: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={signature}
 */
function buildAuthHeader(
    appId: string,
    timestamp: number,
    payload: string,
    secret: string
): string {
    const signature = generateSignature(appId, timestamp, payload, secret);
    return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

// ============================================
// Tests
// ============================================

describe('ShopeeAffiliateService - Signature Generation', () => {
    // Official example from Shopee documentation
    const EXAMPLE_APP_ID = '123456';
    const EXAMPLE_SECRET = 'demo';
    const EXAMPLE_TIMESTAMP = 1577836800; // 2020-01-01 00:00:00 UTC+0
    const EXAMPLE_PAYLOAD = `{"query":"{\\nbrandOffer{\\n    nodes{\\n        commissionRate\\n        offerName\\n    }\\n}\\n}"}`;
    const EXPECTED_SIGNATURE =
        'dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412';

    describe('generateSignature()', () => {
        it('should generate correct signature matching Shopee documentation example', () => {
            const signature = generateSignature(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                EXAMPLE_PAYLOAD,
                EXAMPLE_SECRET
            );

            expect(signature).toBe(EXPECTED_SIGNATURE);
        });

        it('should return lowercase hexadecimal string', () => {
            const signature = generateSignature(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                EXAMPLE_PAYLOAD,
                EXAMPLE_SECRET
            );

            expect(signature).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should produce different signatures for different timestamps', () => {
            const sig1 = generateSignature(EXAMPLE_APP_ID, 1577836800, EXAMPLE_PAYLOAD, EXAMPLE_SECRET);
            const sig2 = generateSignature(EXAMPLE_APP_ID, 1577836801, EXAMPLE_PAYLOAD, EXAMPLE_SECRET);

            expect(sig1).not.toBe(sig2);
        });

        it('should produce different signatures for different payloads', () => {
            const payload1 = '{"query":"{ brandOffer { nodes { offerName } } }"}';
            const payload2 = '{"query":"{ productInfo { id } }"}';

            const sig1 = generateSignature(EXAMPLE_APP_ID, EXAMPLE_TIMESTAMP, payload1, EXAMPLE_SECRET);
            const sig2 = generateSignature(EXAMPLE_APP_ID, EXAMPLE_TIMESTAMP, payload2, EXAMPLE_SECRET);

            expect(sig1).not.toBe(sig2);
        });

        it('should handle empty payload', () => {
            const signature = generateSignature(EXAMPLE_APP_ID, EXAMPLE_TIMESTAMP, '', EXAMPLE_SECRET);

            expect(signature).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('buildAuthHeader()', () => {
        it('should build correct Authorization header format', () => {
            const header = buildAuthHeader(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                EXAMPLE_PAYLOAD,
                EXAMPLE_SECRET
            );

            expect(header).toBe(
                `SHA256 Credential=${EXAMPLE_APP_ID}, Timestamp=${EXAMPLE_TIMESTAMP}, Signature=${EXPECTED_SIGNATURE}`
            );
        });

        it('should start with "SHA256 Credential="', () => {
            const header = buildAuthHeader(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                EXAMPLE_PAYLOAD,
                EXAMPLE_SECRET
            );

            expect(header.startsWith('SHA256 Credential=')).toBe(true);
        });

        it('should contain Timestamp and Signature parts', () => {
            const header = buildAuthHeader(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                EXAMPLE_PAYLOAD,
                EXAMPLE_SECRET
            );

            expect(header).toContain(', Timestamp=');
            expect(header).toContain(', Signature=');
        });
    });

    describe('Edge cases', () => {
        it('should handle special characters in payload (escaped quotes)', () => {
            // Shopee doc mentions escaping double quotes for string conditions
            const payloadWithEscapes =
                '{"query":"{conversionReport(purchaseTimeStart: 1600621200, scrollId: \\"some characters\\"){...}}"}';

            const signature = generateSignature(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                payloadWithEscapes,
                EXAMPLE_SECRET
            );

            expect(signature).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should handle Unicode characters in payload', () => {
            const payloadWithUnicode = '{"query":"{ search(term: \\"eletrônicos\\") { id } }"}';

            const signature = generateSignature(
                EXAMPLE_APP_ID,
                EXAMPLE_TIMESTAMP,
                payloadWithUnicode,
                EXAMPLE_SECRET
            );

            expect(signature).toMatch(/^[a-f0-9]{64}$/);
        });
    });
});
