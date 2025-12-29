import { Controller, All, Param, Req, Res } from '@nestjs/common';
import express from 'express';
import { firstValueFrom } from 'rxjs';
import { GatewayForwardService } from '../common/gateway-forward.service';

@Controller()
export class GatewayController {
  constructor(private readonly forwardService: GatewayForwardService) {}

  @All('health')
  async healthCheck(@Res() res: express.Response) {
    res.status(200).json({ status: 'ok' });
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

      const response: any = await firstValueFrom(
        client.send(pattern, {
          body: req.body,
          headers: req.headers,
          query: req.query,
          method: req.method,
        }),
      );

      const status = response?.status && typeof response.status === 'number' ? response.status : 200;

      res.status(status).json(response);
    } catch (err) {
      res.status(500).json({ message: 'Service error', error: err.message });
    }
  }
}
