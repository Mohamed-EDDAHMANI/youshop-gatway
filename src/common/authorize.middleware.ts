import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GatewayForwardService } from './gateway-forward.service';
import { publicRoutes } from './public-routes';
import { Logger } from '@nestjs/common';


@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {

    private readonly logger = new Logger(AuthorizeMiddleware.name)

    constructor(private readonly forwardService: GatewayForwardService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {

        // Skip public routes
        // this.logger.debug(`Required Roles: ${publicRoutes}`);
        let originURL = req.originalUrl + '/' + req.method.toLowerCase();

        const isPublic = publicRoutes.some(route => route.test(originURL));
        if (isPublic) {
            this.logger.debug(`Public route allowed: ${originURL}`);
            return next();
        }

        // req.user should be set by AuthMiddleware
        const user = (req as any).user;
        if (!user || !user.role) {
            throw new ForbiddenException('No user role found');
        }
        const [, serviceKey, ...rest] = req.originalUrl.split('/');
        const endpointPath = '/' + rest.join('/') + '/' + req.method.toLowerCase();

        try {
            // Fetch service info from Redis
            const serviceInfo = await this.forwardService.getServiceInstance(serviceKey);
            // Find required roles for the endpoint
            const matchedEndpoint = serviceInfo.endpoints.find(e =>
                e.pattern.test(endpointPath),
            );
            
            // Extract the roles array - handle both object and array structures
            const rolesData = (matchedEndpoint?.roles as any);
            const requiredRoles = rolesData?.roles || (Array.isArray(rolesData) ? rolesData : undefined);

            // If roles are specified and user role is not allowed, throw
            this.logger.debug(`User Role: ${user.role}`);
            if (requiredRoles && Array.isArray(requiredRoles) && !requiredRoles.includes(user.role.toLowerCase())) {
                throw new ForbiddenException('You do not have permission to access this resource');
            }

            // If no roles specified, allow by default
            next();
        } catch (err) {
            this.logger.error(`Authorization failed: ${err.message}`);
            throw new ForbiddenException('Authorization failed');
        }

    }
}
