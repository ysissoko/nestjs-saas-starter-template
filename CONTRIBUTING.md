# Contributing to NestJS SaaS Starter

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Issues

1. **Check existing issues** before creating a new one
2. **Use issue templates** when available
3. **Provide details**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Node version, etc.)
   - Error messages and logs

### Suggesting Features

1. **Search existing feature requests** first
2. **Describe the use case** clearly
3. **Explain the benefits** for other users
4. **Consider scope** - does it fit the template's purpose?

### Pull Requests

1. **Fork the repository** and create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the code style (see below)
   - Add tests if applicable
   - Update documentation

3. **Test your changes**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm backend:test
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new feature"
   ```
   Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Wait for review** - maintainers will review your PR

## Code Style

### TypeScript

- Use TypeScript for all code
- Enable strict mode options
- Add JSDoc comments for public APIs
- Use proper types, avoid `any`

### Naming Conventions

- **Files**: kebab-case (`example.service.ts`)
- **Classes**: PascalCase (`ExampleService`)
- **Variables/Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase, no `I` prefix (`User`, not `IUser`)

### Code Organization

```typescript
// 1. Imports (grouped: external, internal, types)
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@common';
import { Example } from './entities/example.entity';

// 2. Decorators
@Injectable()
// 3. Class definition
export class ExampleService extends BaseService<Example> {
  // 4. Properties
  private readonly logger: Logger;

  // 5. Constructor
  constructor(repository: Repository<Example>) {
    super(repository);
  }

  // 6. Public methods
  async findActive(): Promise<Example[]> {
    // ...
  }

  // 7. Private methods
  private validateExample(example: Example): boolean {
    // ...
  }
}
```

### Best Practices

1. **DRY (Don't Repeat Yourself)**
   - Use base classes
   - Extract common logic
   - Avoid duplication

2. **SOLID Principles**
   - Single Responsibility
   - Open/Closed
   - Liskov Substitution
   - Interface Segregation
   - Dependency Inversion

3. **Error Handling**
   - Use NestJS exceptions
   - Provide meaningful messages
   - Log errors appropriately

4. **Documentation**
   - Add JSDoc for public APIs
   - Update README if needed
   - Include code examples

## Testing

### Unit Tests

```typescript
describe('ExampleService', () => {
  let service: ExampleService;
  let repository: Repository<Example>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExampleService,
        {
          provide: getRepositoryToken(Example),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    repository = module.get<Repository<Example>>(getRepositoryToken(Example));
  });

  it('should find active examples', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```typescript
describe('Example (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Setup test app
  });

  it('/examples (POST)', () => {
    return request(app.getHttpServer())
      .post('/examples')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test' })
      .expect(201);
  });
});
```

## Documentation

### Code Comments

```typescript
/**
 * Find all active examples with optional filtering
 *
 * @param filters - Optional filters to apply
 * @returns Promise<Example[]> - Array of active examples
 * @throws NotFoundException - If no examples found and throwOnEmpty is true
 *
 * @example
 * const examples = await service.findActive({ limit: 10 });
 */
async findActive(filters?: FilterOptions): Promise<Example[]> {
  // Implementation
}
```

### README Updates

When adding features:
1. Update feature list in README
2. Add usage examples
3. Update configuration section if needed
4. Add to table of contents

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. Create GitHub release

## Development Workflow

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nestjs-saas-starter.git
cd nestjs-saas-starter

# Install dependencies
pnpm install

# Create .env
cp .env.example .env
# Edit .env with your settings

# Start database
docker-compose up -d mysql

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm backend:dev
```

### Making Changes

1. **Create feature branch**
2. **Make changes** with frequent commits
3. **Test locally**
4. **Update docs** if needed
5. **Run linter** before commit
6. **Push and create PR**

### Code Review

PRs are reviewed for:
- Code quality and style
- Test coverage
- Documentation
- Breaking changes
- Performance impact

## Questions?

- Open an issue for questions
- Join discussions
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
