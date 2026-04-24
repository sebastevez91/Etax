const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../services/jwtService');
const redis = require('../services/redisClient');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta con ese email',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'passenger',
      phone: phone || null,
    });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token        = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          rating: user.rating,
        },
      },
    });
  } catch (error) {
    console.error('[authController.register]', error);
    return res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contactá soporte.',
      });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const token        = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          rating: user.rating,
        },
      },
    });
  } catch (error) {
    console.error('[authController.login]', error);
    return res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('[authController.me]', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token requerido' });
    }

    // Verificar si está en la blacklist
    const isBlacklisted = await redis.get(`bl_refresh:${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }

    // Verificar y decodificar
    const decoded = verifyRefreshToken(refreshToken);

    // Generar nuevos tokens
    const payload      = { id: decoded.id, email: decoded.email, role: decoded.role };
    const newToken        = generateToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Invalidar el refresh token usado (rotación)
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setex(`bl_refresh:${refreshToken}`, ttl, '1');
    }

    return res.status(200).json({
      success: true,
      data: { token: newToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    console.error('[authController.refresh]', error);
    return res.status(401).json({ success: false, message: 'Refresh token inválido o expirado' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1];

    const { refreshToken } = req.body;

    // Blacklistear el access token
    if (accessToken) {
      const decoded = require('../services/jwtService').decodeToken(accessToken);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await redis.setex(`bl_access:${accessToken}`, ttl, '1');
      }
    }

    // Blacklistear el refresh token
    if (refreshToken) {
      const decoded = require('../services/jwtService').decodeToken(refreshToken);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await redis.setex(`bl_refresh:${refreshToken}`, ttl, '1');
      }
    }

    return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('[authController.logout]', error);
    return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
  }
};

module.exports = { register, login, me, refresh, logout };