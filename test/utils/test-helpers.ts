import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

/**
 * Clears all Jest mocks
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};

/**
 * Sets up a test module with provided providers
 * @param serviceClass The service class being tested
 * @param providers Array of providers for the test module
 * @returns The service instance
 */
export const setupTestModule = async <T>(
  serviceClass: new (...args: any[]) => T,
  providers: any[],
): Promise<T> => {
  const module: TestingModule = await Test.createTestingModule({
    providers,
  }).compile();

  return module.get<T>(serviceClass);
};

/**
 * Creates a test that verifies a service is defined
 * @param service The service instance to test
 */
export const testShouldBeDefined = (service: any) => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
};

/**
 * Helper to test error throwing scenarios
 * @param serviceMethod Async service method to test
 * @param errorMessage Expected error message
 * @param errorType Expected error type (default: Error)
 * @param mockReject Optional mock function to reject with error
 */
export const testErrorThrowing = async (
  serviceMethod: () => Promise<any>,
  errorMessage: string,
  errorType: new (message: string) => Error = Error,
  mockReject?: jest.Mock,
) => {
  const error = new errorType(errorMessage);
  if (mockReject) {
    mockReject.mockRejectedValue(error);
  }
  await expect(serviceMethod()).rejects.toThrow(errorMessage);
};

/**
 * Helper to test NotFoundException scenarios
 * @param serviceMethod Async service method to test
 * @param mockReject Mock function to reject with NotFoundException
 */
export const testNotFoundError = async (
  serviceMethod: () => Promise<any>,
  mockReject?: jest.Mock,
) => {
  await testErrorThrowing(
    serviceMethod,
    'Not found',
    NotFoundException,
    mockReject,
  );
};

/**
 * Creates a basic test setup for service tests
 * @param serviceClass Service class being tested
 * @param mockProviders Array of mock providers
 * @returns Object with service instance and clearMocks function
 */
export const createServiceTestSetup = async <T>(
  serviceClass: new (...args: any[]) => T,
  mockProviders: any[],
): Promise<{ service: T; clearMocks: () => void }> => {
  clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [serviceClass, ...mockProviders],
  }).compile();

  const service = module.get<T>(serviceClass);

  return {
    service,
    clearMocks: clearAllMocks,
  };
};

/**
 * Creates a basic test setup for controller tests
 * @param controllerClass Controller class being tested
 * @param mockProviders Array of mock providers
 * @returns Object with controller instance and clearMocks function
 */
export const createControllerTestSetup = async <T>(
  controllerClass: new (...args: any[]) => T,
  mockProviders: any[],
): Promise<{ controller: T; clearMocks: () => void }> => {
  clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [controllerClass],
    providers: mockProviders,
  }).compile();

  const controller = module.get<T>(controllerClass);

  return {
    controller,
    clearMocks: clearAllMocks,
  };
};
