import { Controller, All, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { GatewayForwardService } from '../services/gateway-forward.service';

@Controller()
export class GatewayController {
  constructor(private readonly forwardService: GatewayForwardService) {}

  @All(':service/*')
  async handle(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pattern = req.originalUrl.replace(`/${service}/`, '');

    try {
      const { host, port } = await this.forwardService.getServiceInstance(service);

      const client = this.forwardService.createTcpClient(host, port);

      const response = await firstValueFrom(
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
