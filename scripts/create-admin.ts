import { NestFactory } from '@nestjs/core';
import { GatewayModule } from '../src/gateway.module';
import { Repository } from 'typeorm';
import { Account } from '../src/auth/modules/account/account.entity';
import { Role } from '../src/auth/entities/role.entity';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

/**
 * Script to create an admin user
 * Usage: pnpm tsx scripts/create-admin.ts
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function questionHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    // Hide input
    (stdin as any).setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    stdin.on('data', (char: string) => {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          stdout.clearLine(0);
          stdout.cursorTo(0);
          stdout.write(query + '*'.repeat(password.length));
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function validateEmail(email: string): Promise<boolean> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function validatePassword(password: string): Promise<{ valid: boolean; message?: string }> {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

async function createAdminUser() {
  console.log('=====================================');
  console.log('Create Admin User');
  console.log('=====================================\n');

  try {
    // Bootstrap NestJS application
    const app = await NestFactory.createApplicationContext(GatewayModule.register(), {
      logger: false,
    });

    const accountRepository = app.get<Repository<Account>>('AccountRepository');
    const roleRepository = app.get<Repository<Role>>('RoleRepository');

    // Get user input
    let email: string;
    do {
      email = await question('Email: ');
      if (!await validateEmail(email)) {
        console.log('❌ Invalid email format. Please try again.\n');
      } else {
        // Check if email already exists
        const existingAccount = await accountRepository.findOne({ where: { email } });
        if (existingAccount) {
          console.log('❌ An account with this email already exists.\n');
          email = '';
        } else {
          break;
        }
      }
    } while (true);

    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');

    let password: string;
    let confirmPassword: string;
    do {
      password = await questionHidden('Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number): ');
      const validation = await validatePassword(password);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}\n`);
        continue;
      }

      confirmPassword = await questionHidden('Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match. Please try again.\n');
      } else {
        break;
      }
    } while (true);

    rl.close();

    console.log('\n🔄 Creating admin user...');

    // Find Admin role
    const adminRole = await roleRepository.findOne({
      where: { name: 'Admin' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      console.error('❌ Admin role not found. Please run database seed first:');
      console.error('   pnpm db:seed');
      await app.close();
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin account
    const adminAccount = accountRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isVerified: true,
      roles: [adminRole],
    });

    await accountRepository.save(adminAccount);

    console.log('\n=====================================');
    console.log('✅ Admin user created successfully!');
    console.log('=====================================');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Role: Admin`);
    console.log('\nYou can now login at: http://localhost:3000/auth/login');
    console.log('\nTest login with cURL:');
    console.log(`curl -X POST http://localhost:3000/auth/login \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"email":"${email}","password":"YOUR_PASSWORD"}'`);

    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error creating admin user:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdminUser();
