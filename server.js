const express = require('express');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_TOKEN 
});

// RUTA 1: Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// RUTA 2: Crear pago
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio } = req.body;

        // Validación de datos
        if (!nombre_guia || !precio) {
            return res.status(400).json({ error: 'Faltan datos: nombre_guia y precio' });
        }

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [{
                    title: nombre_guia,
                    quantity: 1,
                    unit_price: Number(precio),
                    currency_id: 'MXN'
                }],
                back_urls: {
                    success: 'https://onrender.com',
                    failure: 'https://onrender.com',
                    pending: 'https://onrender.com'
                },
                auto_return: 'approved'
            }
        });

        res.json({ id: response.id, init_point: response.init_point });
    } catch (error) {
        console.error('Error en Mercado Pago:', error);
        res.status(500).json({ error: 'Error al procesar el botón de pago' });
    }
});

// RUTA 3: Login
app.post('/api/login', (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        if (usuario === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
            return res.json({ 
                success: true, 
                mensaje: "¡Bienvenido de nuevo, socio!",
                user: { usuario: usuario, guiasCompradas: [] }
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                error: "⚠️ Usuario o contraseña incorrectos." 
            });
        }
    } catch (error) {
        console.error('Error en el Login:', error);
        res.status(500).json({ error: 'Error interno en el servidor de inicio de sesión' });
    }
});

// Iniciar servidor (UNA SOLA VEZ AL FINAL)
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});