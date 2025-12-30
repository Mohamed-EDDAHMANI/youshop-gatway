import { Controller, All, Param, Req, Res, NotFoundException } from '@nestjs/common';
import express from 'express';
import { firstValueFrom } from 'rxjs';
import { GatewayForwardService } from '../common/gateway-forward.service';

@Controller()
export class GatewayController {
  constructor(private readonly forwardService: GatewayForwardService) { }

  @All('health')
  async healthCheck(@Res() res: express.Response) {
    res.status(200).json({ status: 'ok---' });
  }

  @All(':service/*')
  async handle(
    @Param('service') service: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const pattern = req.originalUrl.replace(`/${service}/`, '');

    try {
      const { randomInstance } = await this.forwardService.getServiceInstance(service);

      const client = this.forwardService.createTcpClient(randomInstance.host, randomInstance.port);
      console.log(`Forwarding request to ${service} at ${randomInstance.host}:${randomInstance.port} with pattern: ${pattern} --------------`);

      const response: any = await firstValueFrom(
        client.send(pattern, {
          body: req.body,
          headers: req.headers,
          query: req.query,
          method: req.method,
        }),
      );
      console.log('Response from service:', response);

      const refreshToken = response.refreshToken;

      if (req.originalUrl.includes('auth/refresh')) {
        if (!refreshToken) {
          throw new NotFoundException('Server Error: Missing refresh token in response');
        }

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        delete response.refreshToken;
      }

      const status = response?.status && typeof response.status === 'number' ? response.status : 200;

      res.status(status).json(response);
    } catch (err) {
      res.status(500).json({ message: 'Service error', error: err.message });
    }
  }
}
