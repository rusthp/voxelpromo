import { MessageTemplateModel, TemplateTone } from '../../models/MessageTemplate';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

export class TemplateService {
  /**
   * Get all templates
   */
  async getAllTemplates(activeOnly: boolean = false): Promise<any[]> {
    try {
      const query = activeOnly ? { isActive: true } : {};
      const templates = await MessageTemplateModel.find(query).sort({ createdAt: -1 }).lean();
      return templates;
    } catch (error) {
      logger.error('Error getting templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<any | null> {
    try {
      const template = await MessageTemplateModel.findById(id).lean();
      return template;
    } catch (error) {
      logger.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Get default template
   */
  async getDefaultTemplate(): Promise<any | null> {
    try {
      const template = await MessageTemplateModel.findOne({
        isDefault: true,
        isActive: true,
      }).lean();
      return template;
    } catch (error) {
      logger.error('Error getting default template:', error);
      return null;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(templateData: {
    name: string;
    tone: TemplateTone;
    content: string;
    isActive?: boolean;
    isDefault?: boolean;
  }): Promise<any> {
    try {
      const template = new MessageTemplateModel(templateData);
      await template.save();
      logger.info(`✅ Created template: ${template.name}`);
      return template.toObject();
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, updates: any): Promise<any | null> {
    try {
      const template = await MessageTemplateModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (template) {
        logger.info(`✅ Updated template: ${template.name}`);
        return template.toObject();
      }

      return null;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const result = await MessageTemplateModel.findByIdAndDelete(id);
      if (result) {
        logger.info(`✅ Deleted template: ${result.name}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting template:', error);
      return false;
    }
  }

  /**
   * Render template with offer data
   */
  renderTemplate(template: any, offer: Offer): string {
    try {
      let rendered = template.content;

      // Replace all variables
      const variables = {
        '{title}': offer.title,
        '{price}': `R$ ${offer.currentPrice.toFixed(2)}`,
        '{originalPrice}': `R$ ${offer.originalPrice.toFixed(2)}`,
        '{discount}': `R$ ${offer.discount.toFixed(2)}`,
        '{discountPercent}': `${offer.discountPercentage.toFixed(0)}%`,
        '{url}': offer.affiliateUrl || offer.productUrl,
        '{source}': this.formatSource(offer.source),
        '{category}': offer.category,
        '{rating}': offer.rating ? `⭐ ${offer.rating.toFixed(1)}` : '',
        '{reviews}': offer.reviewsCount ? `(${offer.reviewsCount} avaliações)` : '',
      };

      // Replace each variable
      for (const [variable, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      }

      // Update usage stats
      this.incrementUsage(template._id).catch((err) =>
        logger.error('Error incrementing template usage:', err)
      );

      return rendered;
    } catch (error) {
      logger.error('Error rendering template:', error);
      return this.renderDefaultTemplate(offer);
    }
  }

  /**
   * Render default template (fallback)
   */
  renderDefaultTemplate(offer: Offer): string {
    return `🔥 OFERTA IMPERDÍVEL! 🔥

${offer.title}

💰 De R$ ${offer.originalPrice.toFixed(2)} por R$ ${offer.currentPrice.toFixed(2)}
📉 ${offer.discountPercentage.toFixed(0)}% OFF (Economize R$ ${offer.discount.toFixed(2)})

${offer.rating ? `⭐ ${offer.rating.toFixed(1)} ${offer.reviewsCount ? `(${offer.reviewsCount} avaliações)` : ''}` : ''}

🛒 Compre agora: ${offer.affiliateUrl || offer.productUrl}

#Promoção #Desconto #${this.formatSource(offer.source)}`;
  }

  /**
   * Format source name
   */
  private formatSource(source: string): string {
    const sourceNames: Record<string, string> = {
      amazon: 'Amazon',
      aliexpress: 'AliExpress',
      shopee: 'Shopee',
      mercadolivre: 'MercadoLivre',
      rss: 'RSS',
      manual: 'Manual',
    };
    return sourceNames[source] || source;
  }

  /**
   * Increment template usage counter
   */
  private async incrementUsage(templateId: string): Promise<void> {
    try {
      await MessageTemplateModel.findByIdAndUpdate(templateId, {
        $inc: { timesUsed: 1 },
        lastUsedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error incrementing template usage:', error);
    }
  }

  /**
   * Initialize default templates
   */
  async initializeDefaults(): Promise<void> {
    try {
      const count = await MessageTemplateModel.countDocuments();
      if (count > 0) return;

      const defaults = [
        {
          name: 'Standard Viral',
          tone: 'viral' as TemplateTone,
          content:
            '🚨 <b>IMPERDÍVEL! BAIXOU MUITO!</b> 🚨\n\n📦 <b>{title}</b>\n\n🔥 De: <del>{originalPrice}</del>\n💰 <b>Por: {price}</b>\n📉 <b>{discountPercent} OFF</b>\n\n💳 <i>Pagamento seguro via {source}</i>\n\n🏃‍♂️ Corra antes que acabe:\n👉 {url}\n\n#{source} #Ofertas #Promoção',
          isActive: true,
          isDefault: true,
        },
        {
          name: 'Casual Friendly',
          tone: 'casual' as TemplateTone,
          content:
            'Gente, olha o que eu achei! 😱\n\n{title} tá com um preço surreal hoje!\n\nTava {originalPrice}, mas agora tá saindo por só <b>{price}</b>!\nIsso é {discountPercent} de desconto! 🤯\n\nAproveita aqui: {url}\n\nCorre que o estoque voa!',
          isActive: true,
          isDefault: false,
        },
        {
          name: 'História Narrativa',
          tone: 'storytelling' as TemplateTone,
          content:
            '📖 Deixa eu te contar uma coisa...\n\nEu estava navegando hoje e encontrei algo que precisei compartilhar com vocês.\n\n<b>{title}</b>\n\nSabe aquele produto que você fica de olho esperando baixar? Pois é, baixou! 🎉\n\nDe {originalPrice} para apenas <b>{price}</b> – são {discountPercent} de desconto real.\n\nNão sei até quando vai durar, mas se você estava esperando o momento certo... é agora.\n\n👉 {url}\n\n#Dica #Oportunidade',
          isActive: true,
          isDefault: false,
        },
      ];

      for (const t of defaults) {
        await new MessageTemplateModel(t).save();
      }
      logger.info('✅ Default templates initialized');
    } catch (error) {
      logger.error('Error initializing default templates:', error);
      throw error;
    }
  }

  /**
   * Get available variables for templates
   */
  getAvailableVariables(): Array<{ variable: string; description: string; example: string }> {
    return [
      { variable: '{title}', description: 'Título do produto', example: 'iPhone 13 Pro Max 256GB' },
      { variable: '{price}', description: 'Preço atual', example: 'R$ 4.999,00' },
      { variable: '{originalPrice}', description: 'Preço original', example: 'R$ 6.999,00' },
      { variable: '{discount}', description: 'Valor do desconto', example: 'R$ 2.000,00' },
      { variable: '{discountPercent}', description: 'Desconto percentual', example: '28%' },
      { variable: '{url}', description: 'URL de afiliado', example: 'https://...' },
      { variable: '{source}', description: 'Loja origem', example: 'Amazon' },
      { variable: '{category}', description: 'Categoria', example: 'Eletrônicos' },
      { variable: '{rating}', description: 'Avaliação', example: '⭐ 4.5' },
      { variable: '{reviews}', description: 'Número de avaliações', example: '(1234 avaliações)' },
    ];
  }
}
