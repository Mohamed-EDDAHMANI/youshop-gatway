import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../services/redis.service';
import {
  ServiceInstance,
  ServiceInfo,
  ForwardPayload,
  CookieOptions,
} from './interfaces/gateway.interfaces';
import express from 'express';

@Injectable()
export class GatewayForwardService {
  private readonly logger = new Logger(GatewayForwardService.name);

  constructor(private readonly redisService: RedisService) { }

  /**
   * Get service instance from Redis
   */
  async getServiceInstance(serviceKey: string): Promise<{
    serviceName: string;
    randomInstance: ServiceInstance;
    endpoints: Array<{
      pattern: RegExp;
      roles: string[]
    }>
  }> {
    const serviceInfoRaw = await this.redisService.get(`serviceKey:${serviceKey}`);


    if (!serviceInfoRaw) {
      this.logger.warn(`Service not found: ${serviceKey}`);
      throw new NotFoundException(`Service '${serviceKey}' not found in registry`);
    }

    const serviceInfo: ServiceInfo = JSON.parse(serviceInfoRaw);
    const { serviceName, instances, endpoints: endpointsRaw } = serviceInfo;

    if (!instances || instances.length === 0) {
      this.logger.error(`No instances available for service: ${serviceName}`);
      throw new NotFoundException(`Service '${serviceName}' has no available instances`);
    }

    // Load balancing: pick random instance
    const randomInstance = instances[Math.floor(Math.random() * instances.length)];
    // this.logger.debug(`Selected instance for ${serviceName}: ${randomInstance.host}:${randomInstance.port}`);

    const endpoints: { pattern: RegExp; roles: string[] }[] = Object.entries(endpointsRaw).map(
      ([path, roles]) => ({
        pattern: new RegExp(path.replace(/:[^/]+/g, '[^/]+')), // convert :id → regex
        roles,
      }),
    );
    // this.logger.debug(`Service info raw for ${randomInstance}: ${endpoints}`);
    return { serviceName, randomInstance, endpoints };
  }

  /**
   * Create TCP client for microservice communication
   */
  createTcpClient(host: string, port: number) {
    return ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host, port },
    });
  }

  /**
   * Build forwarding payload from express request
   */
  buildPayload(req: express.Request): ForwardPayload {
    return {
      body: req.body,
      headers: req.headers,
      query: req.query,
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      params: req.params,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    };
  }

  /**
   * Forward request to microservice
   */
  async forwardRequest(
    service: string,
    pattern: string,
    payload: ForwardPayload,
  ): Promise<any> {
    try {
      const { serviceName, randomInstance } = await this.getServiceInstance(service);
      
      if(pattern.split('/').length >= 3){
        pattern = pattern.split('/').slice(0, -1).join('/');
      }
      
      const client = this.createTcpClient(randomInstance.host, randomInstance.port);

      this.logger.log(
        `Forwarding [${service}][${payload.method}] ${pattern} → ${serviceName}@${randomInstance.host}:${randomInstance.port}`,
      );

      const response = await firstValueFrom(client.send(pattern, payload));

      // If microservice responded with an error payload (success === false or explicit status), bubble it up
      const statusFromResponse = response?.status ?? response?.statusCode;
      if (response?.success === false || (typeof statusFromResponse === 'number' && statusFromResponse >= 400)) {
        throw response;
      }

      // this.logger.debug(`Response: ${JSON.stringify(response, null, 2)}`);
      return response;
    } catch (error) {
      // Extract RPC error - getError() method returns the serialized error
      const rpcError = error?.getError?.() || error;
      
      this.logger.debug(`Extracted RPC Error: ${JSON.stringify(rpcError)}`);
      this.logger.error(
        `Failed to forward request to ${service}: ${error.message}`,
      );
      
      // Throw the extracted error so controller's ErrorHandlerService can format it
      throw rpcError;
    }
  }

  /**
   * Handle refresh token cookie
   */
  handleRefreshToken(response: any, res: express.Response): any {
    this.logger.debug(`Handling =====================e: ${JSON.stringify(response)}`);
    if (!response?.refreshToken) {
      this.logger.warn('Refresh token missing in response');
      throw new BadRequestException('Missing refresh token in response');
    }

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    res.cookie('refreshToken', response.refreshToken, cookieOptions);
    this.logger.log('Refresh token cookie set');

    // Remove token from response body
    const { refreshToken, ...responseWithoutToken } = response;
    return responseWithoutToken;
  }

  /**
   * Extract HTTP status from response
   */
  getResponseStatus(response: any): number {
    // Check for explicit status code
    if (typeof response?.status === 'number' && response.status >= 100 && response.status < 600) {
      return response.status;
    }
    
    if (typeof response?.statusCode === 'number' && response.statusCode >= 100 && response.statusCode < 600) {
      return response.statusCode;
    }

    // Check for error response format with statusCode in error object
    if (response?.success === false && response?.error?.statusCode) {
      const statusCode = response.error.statusCode;
      if (typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600) {
        return statusCode;
      }
    }

    // Default to 200 OK for successful responses
    return 200;
  }

}
