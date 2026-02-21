export class ErrorDetail {
    field: string;
    message: string;
  }
  
  export class ErrorResponseDto {
    statusCode: number;
    message: string;
    errors?: ErrorDetail[];
    timestamp: string;
    path: string;
  }