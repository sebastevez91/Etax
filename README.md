cat > ~/Desktop/etax/README.md << 'EOF'
# 🚕 ETax — App de Ride-Sharing

ETax es una aplicación de ride-sharing (similar a Uber) desarrollada como proyecto de portfolio, con backend completo en producción y app móvil nativa.

## 📱 Descargar APK (Android)

👉 [Descargar ETax APK](https://expo.dev/accounts/sebastevez91/projects/etax/builds/3191ce74-317f-4cd8-a217-4538ebf85be7)

## 🚀 Demo Backend

API en producción: `https://etax-backend-23a4.onrender.com`

## 🛠️ Stack tecnológico

### Backend
- Node.js + Express
- PostgreSQL (Render)
- Redis (Upstash)
- Socket.io (tiempo real)
- JWT + Refresh Tokens
- Sequelize ORM

### Mobile
- React Native + Expo (SDK 54)
- expo-router
- Mapbox (geocoding)
- MercadoPago (pagos)
- Expo Push Notifications
- Socket.io client

### Infraestructura
- Backend deployado en Render
- PostgreSQL en Render
- Redis en Upstash

## ✨ Funcionalidades

- ✅ Registro y login con JWT
- ✅ Roles: pasajero y conductor
- ✅ Solicitud y aceptación de viajes en tiempo real
- ✅ Tracking del conductor en el mapa (Socket.io)
- ✅ Geocoding real de direcciones (Mapbox)
- ✅ Sistema de calificaciones mutuas
- ✅ Historial de viajes con filtros y paginación
- ✅ Pagos con MercadoPago
- ✅ Push notifications
- ✅ Refresh tokens con blacklist en Redis

## 📂 Estructura del proyecto

\`\`\`
etax/
├── backend/          # API REST + Socket.io
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── sockets/
└── mobile/           # React Native + Expo
    ├── app/
    │   ├── (auth)/
    │   ├── (home)/
    │   └── (app)/
    ├── components/
    └── services/
\`\`\`

## 🔧 Correr localmente

### Backend
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

### Mobile
\`\`\`bash
cd mobile
npx expo start
\`\`\`
EOF