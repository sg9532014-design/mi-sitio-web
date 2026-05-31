const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Escudos de Ciberseguridad
app.use(helmet({
    contentSecurityPolicy: false // Permite conectar con Stripe y Amazon sin bloqueos
}));

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '🔒 Demasiados intentos desde esta IP. Bloqueado por seguridad.'
});
app.use('/api/', limitador);

// Base de Datos Local Simulada
const obtenerUsuarios = () => {
    return { "usuario_prueba": { guiasCompradas: [] } }; 
};

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// CATÁLOGO DE GUÍAS (PINTEREST DE REPARACIONES)
const guiasReparacion = {
    "reparar-abanico": {
        titulo: "Cómo reparar un abanico que no gira",
        esPremium: true,
        mensaje: "🔒 Esta guía es Premium. Adquiérela para desbloquear el video completo.",
        videoCortoUrl: "https://tu-almacenamiento.com",
        materialesAfiliado: [
            { nombre: "Capacitor de repuesto para abanico", enlace: "https://amazon.com" },
            { nombre: "Aceite lubricante multiusos", enlace: "https://amazon.com" },
            { nombre: "Juego de destornilladores de precisión", enlace: "https://amazon.com" }
        ]
    }
    
};

// Ruta para consultar la guía
app.get('/api/guias/:id', (req, res) => {
    const { id } = req.params;
    const { usuario } = req.query;
    const guia = guiasReparacion[id];
    if (!guia) return res.status(404).json({ error: '⚠️ La guía no existe.' });
    return res.json(guia);
});

// API para procesar pagos con Stripe
app.post('/api/crear-sesion-pago', (req, res) => {
    return res.json({ url: 'https://stripe.com' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo corriendo en http://localhost:${PORT}`);
});
