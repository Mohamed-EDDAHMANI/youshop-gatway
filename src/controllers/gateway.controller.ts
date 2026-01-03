import { Controller, All, Param, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import express from 'express';
import { GatewayForwardService } from '../common/gateway-forward.service';
import { ErrorHandlerService } from '../common/error-handler.service';


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

  constructor(
    private readonly forwardService: GatewayForwardService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

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
      const id = pattern.split('/').pop() || '';
      req.params = { id };
      const payload = this.forwardService.buildPayload(req);

      // Forward request to microservice
      let response = await this.forwardService.forwardRequest(service, pattern, payload);

      // Handle refresh token for auth/refresh endpoint
      if (req.originalUrl.includes('s1/auth/refresh') || req.originalUrl.includes('s1/auth/login') || req.originalUrl.includes('s1/auth/register')) {
        response = this.forwardService.handleRefreshToken(response, res);
      }

      // Check if response indicates an error
      if (response?.success === false) {
        this.logger.error(
          `|||||||||||||||||||||||||||||||||||||||||||||||||||||||||`,
        );
        const status = response.error?.statusCode || response.statusCode || HttpStatus.BAD_REQUEST;
        this.logger.warn(`Microservice returned error: ${response.error?.message || 'Unknown error'}`);
        
        res.status(status).json({
          success: false,
          error: response.error || {
            code: 'UNKNOWN_ERROR',
            message: response.message || 'Operation failed',
            statusCode: status,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get status code and send successful response
      const status = this.forwardService.getResponseStatus(response);
      res.status(status).json(response);
    } catch (error) {
      this.errorHandler.handleError(error, res);
    }
  }
}
