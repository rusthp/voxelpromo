# Testing Guide

## Overview

This project uses **Jest** with **ts-jest** for TypeScript testing. Tests are located alongside the code they test in `__tests__` directories.

## Test Structure

```
src/
├── services/
│   ├── offer/
│   │   ├── OfferService.ts
│   │   └── __tests__/
│   │       └── OfferService.test.ts
│   └── aliexpress/
│       ├── AliExpressService.ts
│       └── __tests__/
│           └── AliExpressService.test.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { ServiceName } from '../ServiceName';

describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing with Mocks

```typescript
import { Model } from '../../models/Model';

jest.mock('../../models/Model');

it('should mock database calls', async () => {
  const mockFind = jest.fn().mockResolvedValue([]);
  (Model.find as jest.Mock) = mockFind;
  
  const result = await service.getItems();
  expect(mockFind).toHaveBeenCalled();
});
```

## Test Categories

### Unit Tests
- Test individual functions/methods
- Mock external dependencies
- Fast execution
- High coverage

### Integration Tests
- Test multiple components together
- Use test database
- Slower execution
- Verify real workflows

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- OfferService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should save offer"
```

## Coverage Goals

- **Target:** 80%+ coverage
- **Critical paths:** 90%+ coverage
- **Utilities:** 80%+ coverage
- **Services:** 80%+ coverage

## Best Practices

1. **Arrange-Act-Assert (AAA) Pattern**
   ```typescript
   it('should calculate discount', () => {
     // Arrange
     const originalPrice = 100;
     const currentPrice = 80;
     
     // Act
     const discount = calculateDiscount(originalPrice, currentPrice);
     
     // Assert
     expect(discount).toBe(20);
   });
   ```

2. **Test One Thing Per Test**
   ```typescript
   // ❌ Bad
   it('should save and validate offer', () => { ... });
   
   // ✅ Good
   it('should save offer', () => { ... });
   it('should validate offer', () => { ... });
   ```

3. **Use Descriptive Test Names**
   ```typescript
   // ❌ Bad
   it('test1', () => { ... });
   
   // ✅ Good
   it('should return null when product URL is invalid', () => { ... });
   ```

4. **Mock External Dependencies**
   - Database calls
   - API requests
   - File system operations
   - Third-party services

5. **Test Edge Cases**
   - Null/undefined inputs
   - Empty arrays/strings
   - Invalid data types
   - Boundary values

## Example Test Files

See:
- `src/services/offer/__tests__/OfferService.test.ts`
- `src/services/aliexpress/__tests__/AliExpressService.test.ts`
- `src/utils/__tests__/logger.test.ts`

## Common Patterns

### Testing Database Operations

```typescript
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { OfferModel } from '../../models/Offer';

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

beforeEach(async () => {
  await OfferModel.deleteMany({});
});
```

### Testing API Services

```typescript
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

it('should fetch products', async () => {
  mockedAxios.get.mockResolvedValue({
    data: { products: [] }
  });
  
  const result = await service.getProducts();
  expect(result).toEqual([]);
});
```

### Testing Error Handling

```typescript
it('should throw error on invalid input', () => {
  expect(() => {
    service.processData(null);
  }).toThrow('Invalid input');
});
```

## Debugging Tests

```bash
# Run single test with verbose output
npm test -- --verbose OfferService.test.ts

# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Show coverage for specific file
npm run test:coverage -- --collectCoverageFrom='src/services/offer/**'
```

