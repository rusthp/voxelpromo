import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Service for validating Brazilian documents (CPF and CNPJ)
 * - CPF: Mathematical validation (dígitos verificadores)
 * - CNPJ: Mathematical validation + BrasilAPI lookup for company data
 */
export class DocumentValidatorService {
    private static BRASIL_API_URL = 'https://brasilapi.com.br/api';

    /**
     * Validate CPF using check digits algorithm
     */
    static validateCPF(cpf: string): boolean {
        // Remove non-numeric characters
        const cleaned = cpf.replace(/\D/g, '');

        if (cleaned.length !== 11) return false;

        // Check for known invalid patterns (all same digits)
        if (/^(\d)\1{10}$/.test(cleaned)) return false;

        // Validate first check digit
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned[i]) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned[9])) return false;

        // Validate second check digit
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleaned[i]) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned[10])) return false;

        return true;
    }

    /**
     * Validate CNPJ using check digits algorithm
     */
    static validateCNPJ(cnpj: string): boolean {
        const cleaned = cnpj.replace(/\D/g, '');

        if (cleaned.length !== 14) return false;

        // Check for known invalid patterns
        if (/^(\d)\1{13}$/.test(cleaned)) return false;

        // First check digit
        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cleaned[i]) * weights1[i];
        }
        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        if (digit1 !== parseInt(cleaned[12])) return false;

        // Second check digit
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cleaned[i]) * weights2[i];
        }
        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;
        if (digit2 !== parseInt(cleaned[13])) return false;

        return true;
    }

    /**
     * Lookup CNPJ data from BrasilAPI (free, no key required)
     * Returns company name and status if found
     */
    static async lookupCNPJ(cnpj: string): Promise<{
        valid: boolean;
        razaoSocial?: string;
        nomeFantasia?: string;
        situacao?: string;
        error?: string;
    }> {
        const cleaned = cnpj.replace(/\D/g, '');

        // First validate mathematically
        if (!this.validateCNPJ(cleaned)) {
            return { valid: false, error: 'CNPJ inválido (dígitos verificadores incorretos)' };
        }

        try {
            const response = await axios.get(`${this.BRASIL_API_URL}/cnpj/v1/${cleaned}`, {
                timeout: 10000,
            });

            const data = response.data;
            return {
                valid: true,
                razaoSocial: data.razao_social,
                nomeFantasia: data.nome_fantasia,
                situacao: data.descricao_situacao_cadastral,
            };
        } catch (error: any) {
            if (error.response?.status === 404) {
                return { valid: false, error: 'CNPJ não encontrado na Receita Federal' };
            }
            logger.error('BrasilAPI CNPJ lookup error:', error.message);
            // If API fails, still allow if math validation passed
            return { valid: true, error: 'Não foi possível consultar a Receita Federal' };
        }
    }

    /**
     * Format CPF to display format (000.000.000-00)
     */
    static formatCPF(cpf: string): string {
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Format CNPJ to display format (00.000.000/0000-00)
     */
    static formatCNPJ(cnpj: string): string {
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
}
