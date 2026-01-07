import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import express from 'express';

interface ErrorDetails {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  serviceName?: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle and format error response
   */


  handleError(error: any, res: express.Response): void {
    const errorDetails = this.extractErrorDetails(error);
    this.logError(errorDetails);
    this.sendErrorResponse(errorDetails, res);
  }


  private extractErrorDetails(error: any): ErrorDetails {
    this.logger.debug(`Gateway received error: ${JSON.stringify(error)}`);

    if (error?.success === false || error?.error?.success === false && error?.error) {
      const serviceError = error.error;
      this.logger.debug(`Service error extracted: ${JSON.stringify(serviceError)}`);
      if(serviceError.code){
        return {
          code: serviceError.code || 'INTERNAL_SERVER_ERROR',
          message: serviceError.message || 'Internal server error',
          statusCode: serviceError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          details: serviceError.details,
          serviceName: serviceError.serviceName,
        };
      }else{
        return {
          code: serviceError.error.code || 'INTERNAL_SERVER_ERROR',
          message: serviceError.error.message || 'Internal server error',
          statusCode: serviceError.error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          details: serviceError.error.details,
          serviceName: serviceError.error.serviceName,
        };

      }
    }

    // Fallback for unexpected errors
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private logError(errorDetails: ErrorDetails): void {
    const service = errorDetails.serviceName ? `[${errorDetails.serviceName}]` : '';
    const logMessage = `${service} [${errorDetails.code}] ${errorDetails.message}`;

    if (errorDetails.statusCode >= 500) {
      this.logger.error(logMessage);
    } else if (errorDetails.statusCode >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }

  private sendErrorResponse(errorDetails: ErrorDetails, res: express.Response): void {

    res.status(errorDetails.statusCode).json({
      success: false,
      error: {
        type: errorDetails.code,
        message: errorDetails.message,
        code: errorDetails.statusCode,
        ...(errorDetails.serviceName && { serviceName: errorDetails.serviceName }),
        ...(errorDetails.details && { details: errorDetails.details }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
