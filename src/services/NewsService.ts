import NewsItem, { INewsItem } from '../models/NewsItem';

export class NewsService {
    /**
     * Create a new news item
     */
    async create(data: Partial<INewsItem>): Promise<INewsItem> {
        const newsItem = new NewsItem(data);
        return await newsItem.save();
    }

    /**
     * Update an existing news item
     */
    async update(id: string, data: Partial<INewsItem>): Promise<INewsItem | null> {
        return await NewsItem.findByIdAndUpdate(id, data, { new: true });
    }

    /**
     * Delete a news item
     */
    async delete(id: string): Promise<INewsItem | null> {
        return await NewsItem.findByIdAndDelete(id);
    }

    /**
     * List news items
     * @param options.publishedOnly If true, returns only published items
     * @param options.limit Number of items to return
     * @param options.page Page number
     */
    async list(options: {
        publishedOnly?: boolean;
        limit?: number;
        page?: number;
        type?: string;
    } = {}): Promise<{ data: INewsItem[], total: number, pages: number }> {
        const {
            publishedOnly = true,
            limit = 10,
            page = 1,
            type
        } = options;

        const query: any = {};

        if (publishedOnly) {
            query.published = true;
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            NewsItem.find(query)
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            NewsItem.countDocuments(query)
        ]);

        return {
            data,
            total,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get a single news item by ID
     */
    async getById(id: string): Promise<INewsItem | null> {
        return await NewsItem.findById(id);
    }
}

export default new NewsService();
