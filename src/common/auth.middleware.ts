import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { publicRoutes } from './public-routes';
import path from 'path';

@Injectable()
export class AuthMiddleware implements NestMiddleware {

    use(req: Request, res: Response, next: NextFunction) {
        // 1️⃣ Allow public routes without token
        if (publicRoutes.includes(req.originalUrl)) return next();
        // res.send({ 
        //     status: 'working....',
        //     path: req.originalUrl,
        //     publicRoutes: publicRoutes,
        //     isinclude: publicRoutes.includes(req.originalUrl),

        //  });


        const authHeader = req.headers['authorization'];
        if (!authHeader) throw new UnauthorizedException('Missing token');

        const token = authHeader.split(' ')[1];
        if (!token) throw new UnauthorizedException('Invalid token');

        try {
            // hna bghit ntchicker wach request jat bach tdir refresh l acces token w bghit ntchicker wach refresh token kayen f'req 
            if (req.path.includes('s1/auth/refresh')) {
                const refreshToken = req.cookies['refreshToken']; // smiya li 3titiha f cookie
                if (!refreshToken) {
                    throw new UnauthorizedException('Missing refresh token in cookies');
                }
                (req as any).body = { ...req.body, refreshToken };
                return next();
            }


            // 2️⃣ verify JWT
            const secret = process.env.JWT_SECRET || 'secretkey'; // حط secret ديالك
            const payload = jwt.verify(token, secret);

            // 3️⃣ Optional: attach payload to request for further use
            (req as any).user = payload;

            next();
        } catch (err) {
            throw new UnauthorizedException('Token expired or invalid');
        }
    }
}
