import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { publicRoutes } from './public-routes';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AuthMiddleware.name)

    constructor(
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
    ) {}

    use(req: Request, res: Response, next: NextFunction) {
        // 1️⃣ Allow public routes without token
        let originURL = req.originalUrl + '/' + req.method.toLowerCase();
        
        const isPublic = publicRoutes.some(route => route.test(originURL));
        this.logger.log(`Checking route: ${originURL}, isPublic: ${isPublic}`);
        if (isPublic) {
            this.logger.debug(`Public route allowed: ${originURL}`);
            return next();
        }
        
        const authHeader = req.headers['authorization'];
        this.logger.debug(`Authorization header: ${authHeader}`);
        if (!authHeader) {
            this.logger.error('Missing authorization header');
            throw new UnauthorizedException('Missing token');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            this.logger.error('Invalid authorization header format');
            throw new UnauthorizedException('Invalid token');
        }

        try {
            // Handle refresh token endpoint
            if (req.path.includes('s1/auth/refresh')) {
                const refreshToken = req.cookies['refreshToken'];
                if (!refreshToken) {
                    this.logger.error('Missing refresh token in cookies');
                    throw new UnauthorizedException('Missing refresh token in cookies');
                }
                (req as any).body = { ...req.body, refreshToken };
                return next();
            }

            // 2️⃣ Verify JWT using JwtService
            this.logger.log(`Token received: ${token.substring(0, 20)}...`);
            this.logger.log(`Attempting to verify token...`);
            
            const payload = this.jwtService.verify(token);
            this.logger.log(`✅ Token verified successfully`);
            this.logger.log(`Payload: ${JSON.stringify(payload)}`);

            // 3️⃣ Attach payload to request
            (req as any).user = payload;

            next();
        } catch (err) {
            this.logger.error(`❌ Token verification failed: ${err.message}`, err.stack);
            throw new UnauthorizedException('Token expired or invalid');
        }
    }
}
