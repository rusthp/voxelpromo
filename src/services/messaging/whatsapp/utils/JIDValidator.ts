/**
 * JID Validator - Valida e formata JIDs do WhatsApp
 * Baseado em melhores práticas do projeto Iris
 */

export class JIDValidator {
  private static readonly JID_REGEX = /^(\d+)@(s\.whatsapp\.net|g\.us|c\.us)$/;
  private static readonly PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

  /**
   * Valida se um JID está no formato correto
   */
  static isValidJID(jid: string): boolean {
    if (!jid || typeof jid !== 'string') {
      return false;
    }
    return this.JID_REGEX.test(jid);
  }

  /**
   * Valida se um número de telefone está no formato correto
   */
  static isValidPhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    // Remove caracteres não numéricos exceto +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return this.PHONE_REGEX.test(cleanPhone);
  }

  /**
   * Formata um número para JID
   */
  static formatToJID(number: string, isGroup: boolean = false): string {
    if (!number) {
      throw new Error('Invalid number: empty');
    }

    // Remove todos os caracteres não numéricos
    const cleanNumber = number.replace(/\D/g, '');

    if (!cleanNumber) {
      throw new Error('Invalid number: empty after cleaning');
    }

    if (isGroup) {
      return `${cleanNumber}@g.us`;
    }
    return `${cleanNumber}@s.whatsapp.net`;
  }

  /**
   * Normaliza um JID (remove @c.us, converte para @s.whatsapp.net)
   */
  static normalizeJID(jid: string): string {
    if (!jid || typeof jid !== 'string') {
      throw new Error('Invalid JID: empty or not a string');
    }

    if (this.isValidJID(jid)) {
      // Se já é um JID válido, normaliza para @s.whatsapp.net ou mantém @g.us
      if (jid.includes('@g.us')) {
        return jid;
      }
      // Converte @c.us para @s.whatsapp.net
      return jid.replace('@c.us', '@s.whatsapp.net');
    }

    // Se não é JID, tenta formatar como número
    if (this.isValidPhoneNumber(jid)) {
      return this.formatToJID(jid);
    }

    throw new Error(`Invalid JID format: ${jid}`);
  }

  /**
   * Detecta se um JID é de grupo
   */
  static isGroupJID(jid: string): boolean {
    if (!jid || typeof jid !== 'string') {
      return false;
    }
    return jid.includes('@g.us');
  }

  /**
   * Extrai o número de um JID
   */
  static extractNumber(jid: string): string {
    if (!jid || typeof jid !== 'string') {
      return '';
    }
    const match = jid.match(/^(\d+)@/);
    return match ? match[1] : '';
  }

  /**
   * Detecta automaticamente se é grupo ou número individual baseado no formato
   */
  static detectAndFormat(target: string): string {
    // Se já é um JID válido, normaliza
    if (this.isValidJID(target)) {
      return this.normalizeJID(target);
    }

    // Se contém @g.us, é grupo
    if (target.includes('@g.us')) {
      const number = this.extractNumber(target) || target.replace('@g.us', '').replace(/\D/g, '');
      return this.formatToJID(number, true);
    }

    // Se é um número longo (mais de 15 dígitos) ou contém hífen, provavelmente é grupo
    const cleanNumber = target.replace(/\D/g, '');
    if (cleanNumber.length > 15 || target.includes('-')) {
      return this.formatToJID(cleanNumber, true);
    }

    // Caso contrário, é número individual
    return this.formatToJID(cleanNumber, false);
  }
}
