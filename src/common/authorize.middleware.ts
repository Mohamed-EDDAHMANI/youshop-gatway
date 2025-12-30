import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GatewayForwardService } from './gateway-forward.service';
import { publicRoutes } from './public-routes';


@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {
    constructor(private readonly forwardService: GatewayForwardService) { }

    async use(req: Request, res: Response, next: NextFunction) {

        // Skip public routes
        if (publicRoutes.includes(req.originalUrl)) {
            return next();
        }

        // req.user should be set by AuthMiddleware
        const user = (req as any).user;
        if (!user || !user.role) {
            throw new ForbiddenException('No user role found');
        }

        const [, serviceKey, ...rest] = req.path.split('/');
        const endpointPath = '/' + rest.join('/');
        try {
            // Fetch service info from Redis
            const { endpoints } = await this.forwardService.getServiceInstance(serviceKey);

            // Find required roles for the endpoint
            const requiredRoles: string[] | undefined = endpoints?.[endpointPath];

            // If roles are specified and user role is not allowed, throw
            if (requiredRoles && !requiredRoles.includes(user.role)) {
                throw new ForbiddenException('You do not have permission to access this resource');
            }

            // If no roles specified, allow by default (or you can deny by default)
            next();
        } catch (err) {
            throw new ForbiddenException('Authorization failed');
        }

    }
}
