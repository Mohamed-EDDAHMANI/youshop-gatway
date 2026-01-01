/**
 * Service instance in the registry
 */
export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
}

/**
 * Service information from Redis registry
 */
export interface ServiceInfo {
  serviceName: string;
  instances: ServiceInstance[];
  endpoints: Record<string, string[]>;
}

/**
 * Payload forwarded to microservice
 */
export interface ForwardPayload {
  body: any;
  headers: Record<string, any>;
  query: Record<string, any>;
  method: string;
  url: string;
  originalUrl: string;
  params: Record<string, any>;
  ip?: string;
  userAgent: string;
}

/**
 * Cookie options for setting refresh token
 */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}
