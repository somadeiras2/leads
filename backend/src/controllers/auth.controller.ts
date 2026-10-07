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

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { name, email, currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (email && email.trim() && email.trim() !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
        if (existing && existing.id !== userId) {
          res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário' });
          return;
        }
        updateData.email = email.trim();
      }

      if (newPassword && newPassword.trim()) {
        if (currentPassword) {
          const valid = await bcrypt.compare(currentPassword, user.passwordHash);
          if (!valid) {
            res.status(400).json({ error: 'Senha atual incorreta' });
            return;
          }
        }
        updateData.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      const token = jwt.sign(
        { id: updated.id, email: updated.email, name: updated.name },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      res.json({
        user: { id: updated.id, name: updated.name, email: updated.email },
        token,
        message: 'Dados atualizados com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: { contacts: true, groups: true, campaigns: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existing) {
        res.status(400).json({ error: 'Já existe uma conta com este e-mail' });
        return;
      }

      const passwordHash = await bcrypt.hash(password.trim(), 10);
      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
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
        },
        select: { id: true, name: true, email: true, createdAt: true }
      });

      res.status(201).json({
        user: newUser,
        message: 'Novo usuário criado com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      if (id === req.user?.id) {
        res.status(400).json({ error: 'Você não pode excluir a sua própria conta conectada' });
        return;
      }

      await prisma.user.delete({ where: { id } });
      res.json({ message: 'Usuário removido com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
