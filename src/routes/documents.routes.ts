import { Router, Request, Response } from 'express';
import { DocumentValidatorService } from '../services/DocumentValidatorService';

const router = Router();

/**
 * POST /api/documents/validate-cpf
 * Validate a CPF number (mathematical validation only)
 */
router.post('/validate-cpf', (req: Request, res: Response) => {
    const { cpf } = req.body;

    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }

    const isValid = DocumentValidatorService.validateCPF(cpf);
    const formatted = DocumentValidatorService.formatCPF(cpf);

    return res.json({
        valid: isValid,
        formatted: isValid ? formatted : null,
        message: isValid ? 'CPF válido' : 'CPF inválido (dígitos verificadores incorretos)',
    });
});

/**
 * POST /api/documents/validate-cnpj
 * Validate a CNPJ and lookup company data from BrasilAPI
 */
router.post('/validate-cnpj', async (req: Request, res: Response) => {
    const { cnpj } = req.body;

    if (!cnpj) {
        return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }

    const result = await DocumentValidatorService.lookupCNPJ(cnpj);
    const formatted = DocumentValidatorService.formatCNPJ(cnpj);

    return res.json({
        valid: result.valid,
        formatted: result.valid ? formatted : null,
        razaoSocial: result.razaoSocial,
        nomeFantasia: result.nomeFantasia,
        situacao: result.situacao,
        message: result.error || (result.valid ? 'CNPJ válido' : 'CNPJ inválido'),
    });
});

export { router as documentsRoutes };
