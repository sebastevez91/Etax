const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken } = require('../services/jwtService');

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

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS); // ← passwordHash

    const user = await User.create({
      name,
      email,
      passwordHash, // ← nombre real del campo en el modelo
      role: role || 'passenger',
      phone: phone || null,
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        token,
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash); // ← passwordHash
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contactá soporte.',
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
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
      attributes: { exclude: ['passwordHash'] }, // ← excluye passwordHash, no password
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

module.exports = { register, login, me };