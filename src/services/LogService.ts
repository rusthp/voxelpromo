import { AuditLogModel } from '../models/AuditLog';
import { Request } from 'express';
import { IUser } from '../models/User';

export type LogCategory = 'AUTH' | 'OFFER' | 'USER' | 'SYSTEM' | 'BILLING';

interface LogOptions {
    req?: Request;
    actor?: IUser;
    action: string;
    category: LogCategory;
    resource?: {
        type: string;
        id: string; // or ObjectId
        name?: string;
    };
    details?: Record<string, any>;
    status?: 'SUCCESS' | 'FAILURE';
    errorMessage?: string;
}

export class LogService {
    /**
     * Records an action in the audit log
     */
    static async log(options: LogOptions): Promise<void> {
        try {
            const { req, actor, action, category, resource, details, status, errorMessage } = options;

            // Extract actor info from req if not provided specifically
            const user = actor || ((req as any)?.user); // Type assertion if req.user is not fully typed yet

            let actorData = {
                userId: user?._id,
                username: user?.username || 'system',
                email: user?.email || 'system@voxelpromo.com',
                role: user?.role || 'system',
                ip: this.getIp(req),
                userAgent: req?.headers['user-agent'] || 'unknown',
            };

            // If no valid user, and it's not a generic system action, we might log it as anonymous or fail?
            // For now, let's allow 'system' if no user is found.

            await AuditLogModel.create({
                actor: actorData,
                action,
                category,
                resource,
                details,
                status: status || 'SUCCESS',
                errorMessage,
            });

        } catch (error) {
            console.error('Failed to create audit log:', error);
            // We don't want to break the app if logging fails, just log to console
        }
    }

    private static getIp(req?: Request): string | undefined {
        if (!req) return undefined;
        return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    }

    /**
     * Retrieves logs with pagination and filtering
     */
    static async getLogs(
        page: number = 1,
        limit: number = 20,
        filter: any = {}
    ) {
        const skip = (page - 1) * limit;

        // Build query based on filters
        const query: any = {};
        if (filter.category) query.category = filter.category;
        if (filter.userId) query['actor.userId'] = filter.userId;
        if (filter.action) query.action = { $regex: filter.action, $options: 'i' };

        const [logs, total] = await Promise.all([
            AuditLogModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLogModel.countDocuments(query)
        ]);

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}
