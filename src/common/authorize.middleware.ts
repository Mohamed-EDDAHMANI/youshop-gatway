import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GatewayForwardService } from './gateway-forward.service';
import { publicRoutes } from './public-routes';
import { Logger } from '@nestjs/common';


@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {

    private readonly logger = new Logger(GatewayForwardService.name)

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
        this.logger.debug(`path:: ${req.path}`);
        const [, serviceKey, ...rest] = req.path.split('/');
        const endpointPath = '/' + rest.join('/') + '/' + req.method.toLowerCase();

        try {
            // Fetch service info from Redis
            // const endpoints = await this.forwardService.getServiceInstance(serviceKey);
            const serviceInfo = await this.forwardService.getServiceInstance(serviceKey);

            // Find required roles for the endpoint
            const matchedEndpoint = serviceInfo.endpoints.find(e =>
                e.pattern.test(endpointPath),
            );

            const requiredRoles = matchedEndpoint?.roles;
            // this.logger.debug(`Selected instance for ${serviceName}: ${randomInstance.host}:${randomInstance.port}`);

            // const requiredRoles: string[] | undefined = endpoints?.[endpointPath];

            // If roles are specified and user role is not allowed, throw
            this.logger.debug(`Required Roles: ${requiredRoles}`);
            this.logger.debug(`User Role: ${user.role}`);
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
