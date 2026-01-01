import { Controller, All, Param, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import express from 'express';
import { GatewayForwardService } from '../common/gateway-forward.service';


  // const ser = {
  //   "serviceKey:s1": {
  //     "serviceName": "auth-service",
  //     "instances": [
  //       {
  //         "id": "auth-service:12345",
  //         "host": "auth-service",
  //         "port": 3001
  //       }
  //     ],
  //     "endpoints": {
  //       "/auth/login": ["user", "admin"],
  //       "/auth/register": ["user", "admin"],
  //       "/auth/profile": ["user"],
  //       "/auth/admin": ["admin"]
  //     }
  //   }
  // }


@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly forwardService: GatewayForwardService) {}

  @All('health')
  healthCheck(@Res() res: express.Response): void {
    res.status(HttpStatus.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }

  @All(':service/*')
  async forward(
    @Param('service') service: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      // Extract pattern from URL
      const pattern = req.originalUrl.replace(`/${service}/`, '');
      
      // Build payload
      const payload = this.forwardService.buildPayload(req);
      // this.logger.debug(`R====: ${JSON.stringify(payload)}`);

      // Forward request to microservice
      let response = await this.forwardService.forwardRequest(service, pattern, payload);

      // Handle refresh token for auth/refresh endpoint
      if (req.originalUrl.includes('auth/refresh')) {
        response = this.forwardService.handleRefreshToken(response, res);
      }

      // Get status code and send response
      const status = this.forwardService.getResponseStatus(response);
      res.status(status).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Centralized error handling
   */
  private handleError(error: any, res: express.Response): void {
    const status = error?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error?.message || 'Internal server error';

    this.logger.error(`Request failed: ${message}`, error?.stack);

    res.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
