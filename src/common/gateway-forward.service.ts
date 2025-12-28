import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { RedisService } from './redis.service';

@Injectable()
export class GatewayForwardService {
  constructor(private readonly redisService: RedisService) {}

  async getServiceInstance(serviceKey: string) {
    const redis = this.redisService.getClient();

    // get all service info from Redis
    const serviceInfoRaw = await this.redisService.get(`serviceKey:${serviceKey}`);
    if (!serviceInfoRaw) {
      throw new NotFoundException(`No service info mapped for key: ${serviceKey}`);
    }

    const serviceInfo = JSON.parse(serviceInfoRaw);
    const { serviceName, instances } = serviceInfo;

    if (!instances || !instances.length) {
      throw new NotFoundException(`Service ${serviceName} unavailable`);
    }

    // pick a random instance for load balancing
    const randomInstance = instances[Math.floor(Math.random() * instances.length)];
    return { host: randomInstance.host, port: randomInstance.port, serviceName };
  }

  createTcpClient(host: string, port: number) {
    return ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host, port },
    });
  }
}
