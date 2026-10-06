import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ error: 'Já existe uma conta com este e-mail' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          settings: {
            create: {
              ignoreFirstN: 100,
              ignoreAdmins: true,
              ignoreDuplicates: true,
              ignoreAlreadyRegistered: true,
              ignoreAlreadyInDestination: true,
              ignoreWithoutIdentifier: true,
              defaultBatchSize: 50,
              demoModeActive: false
            }
          }
        }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ user: req.user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
